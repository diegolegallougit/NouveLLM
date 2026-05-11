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
  const { message, agentSlug, conversationId } = body as {
    message: string
    agentSlug?: string
    sourceSlugs?: string[]
    conversationId?: string
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
  })

  if (!difyResponse.ok || !difyResponse.body) {
    return NextResponse.json({ error: 'Dify API error', status: difyResponse.status }, { status: 502 })
  }

  const encoder = new TextEncoder()
  let fullText = ''
  let difyNewConvId: string | undefined
  let retrieverResources: DifySource[] = []

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
