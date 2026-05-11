import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { streamDifyChat, parseDifySources, DifySource, AGENT_INPUTS } from '@/lib/dify'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { message, agentSlug, sourceSlugs, conversationId, uploadedFileId, courseSessionId } = body as {
    message: string
    agentSlug?: string
    sourceSlugs?: string[]
    conversationId?: string
    uploadedFileId?: string
    courseSessionId?: string
  }

  // Resolve folder filters from #spaceSlug/folderSlug tokens
  const folderPaths: string[] = []
  const institutionalSlugs: string[] = []
  for (const slug of sourceSlugs ?? []) {
    if (slug.includes('/')) {
      folderPaths.push(slug) // e.g. "cours-traductologie-l3/cours-magistraux"
    } else {
      institutionalSlugs.push(slug)
    }
  }

  // Resolve agent API key and inputs
  let apiKey = process.env.DIFY_IIIAAS_API_KEY || ''
  let agentLabel: string | undefined
  let inputs: Record<string, string> = {}

  if (agentSlug) {
    const agent = await prisma.agent.findUnique({ where: { slug: agentSlug } })
    if (agent) {
      apiKey = agent.difyApiKey
      agentLabel = agent.label
      const inputBuilder = AGENT_INPUTS[agentSlug]
      if (inputBuilder) inputs = inputBuilder(message)
    }
  }

  // Pass folder path filter as input variable (for workflows that support it)
  if (folderPaths.length > 0) {
    inputs.folder_filter = folderPaths.join(',')
    console.log('[RAG] Folder filter requested:', folderPaths)
  }

  // Inject active meta-prompt as system context
  const activeMetaPrompt = await prisma.userActiveMetaPrompt.findFirst({
    where: { userId: session.user.id },
    include: { metaPrompt: true },
  })
  if (activeMetaPrompt?.metaPrompt?.content) {
    inputs.system_context = activeMetaPrompt.metaPrompt.content
  }

  // Get or create conversation in DB
  let dbConvId = conversationId
  let difyConvId: string | undefined

  if (dbConvId) {
    const existing = await prisma.conversation.findUnique({ where: { id: dbConvId } })
    difyConvId = existing?.difyConvId ?? undefined
  } else {
    const newConv = await prisma.conversation.create({
      data: {
        userId: session.user.id,
        agentSlug: agentSlug ?? null,
        title: message.slice(0, 60),
        courseSessionId: courseSessionId ?? null,
      },
    })
    dbConvId = newConv.id
  }

  // Save user message
  await prisma.message.create({
    data: {
      conversationId: dbConvId,
      role: 'USER',
      content: message,
    },
  })

  // Call Dify streaming API
  const difyResponse = await streamDifyChat({
    apiKey,
    query: message,
    conversationId: difyConvId,
    userId: session.user.id,
    inputs,
    uploadedFileId,
  })

  if (!difyResponse.ok || !difyResponse.body) {
    return NextResponse.json({ error: 'Dify API error', status: difyResponse.status }, { status: 502 })
  }

  const encoder = new TextEncoder()
  let fullText = ''
  let difyNewConvId: string | undefined
  let retrieverResources: DifySource[] = []
  let totalTokens: number | undefined

  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'conv_id', conversationId: dbConvId })}\n\n`))

      const reader = difyResponse.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            const raw = line.slice(6).trim()
            if (!raw || raw === '[DONE]') continue

            try {
              const event = JSON.parse(raw)

              if (event.event === 'message') {
                const chunk = event.answer || ''
                fullText += chunk
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'chunk', text: chunk })}\n\n`))
              } else if (event.event === 'message_end') {
                if (event.conversation_id) difyNewConvId = event.conversation_id
                if (event.metadata?.retriever_resources) {
                  retrieverResources = event.metadata.retriever_resources
                }
                if (event.metadata?.usage?.total_tokens) {
                  totalTokens = event.metadata.usage.total_tokens
                }
              } else if (event.event === 'error') {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', message: event.message })}\n\n`))
              }
            } catch {
              // skip malformed SSE
            }
          }
        }
      } finally {
        reader.releaseLock()
      }

      const sources = parseDifySources(retrieverResources)

      const savedMsg = await prisma.message.create({
        data: {
          conversationId: dbConvId!,
          role: 'ASSISTANT',
          content: fullText,
          agentUsed: agentSlug ?? null,
          sources: sources.length > 0 ? JSON.stringify(sources) : null,
          tokenCount: totalTokens ?? null,
        },
      })

      if (difyNewConvId) {
        await prisma.conversation.update({
          where: { id: dbConvId! },
          data: { difyConvId: difyNewConvId },
        })
      }

      controller.enqueue(
        encoder.encode(
          `data: ${JSON.stringify({
            type: 'done',
            messageId: savedMsg.id,
            sources,
            agentLabel,
          })}\n\n`
        )
      )
      controller.close()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
