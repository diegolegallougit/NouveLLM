import { prisma } from '@/lib/prisma'
import { streamDifyChat, parseDifySources, DifySource, AGENT_INPUTS } from '@/lib/dify'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params

  const courseSession = await prisma.courseSession.findUnique({
    where: { code },
    select: {
      id: true,
      status: true,
      scenarioSlug: true,
      agents: { include: { agent: { select: { slug: true, difyApiKey: true, label: true } } } },
      sources: { include: { source: { select: { difyDatasetId: true } } } },
    },
  })

  if (!courseSession) return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  if (courseSession.status === 'CLOSED') return NextResponse.json({ error: 'Session fermée' }, { status: 410 })

  const body = await req.json() as {
    message: string
    agentSlug?: string
    conversationId?: string
    guestId: string
  }

  const { message, agentSlug, conversationId, guestId } = body
  if (!message?.trim()) return NextResponse.json({ error: 'message required' }, { status: 400 })
  if (!guestId) return NextResponse.json({ error: 'guestId required' }, { status: 400 })

  let apiKey = process.env.DIFY_IIIAAS_API_KEY || ''
  let agentLabel: string | undefined
  let inputs: Record<string, unknown> = {}

  if (agentSlug) {
    const agentRel = courseSession.agents.find(a => a.agent.slug === agentSlug)
    if (agentRel) {
      apiKey = agentRel.agent.difyApiKey
      agentLabel = agentRel.agent.label
      const inputBuilder = AGENT_INPUTS[agentSlug]
      if (inputBuilder) inputs = inputBuilder(message)
    }
  }

  // Check for scenario workflow override
  if (courseSession.scenarioSlug) {
    const scenario = await prisma.sessionScenario.findUnique({
      where: { slug: courseSession.scenarioSlug },
      select: { difyWorkflowOverride: true, slug: true },
    })
    if (scenario?.difyWorkflowOverride) {
      const envKey = `DIFY_${scenario.slug.replace(/-/g, '_').toUpperCase()}_API_KEY`
      const overrideKey = process.env[envKey]
      if (overrideKey) apiKey = overrideKey
    }
  }

  // ── Persist conversation + user message ──────────────────────
  let dbConvId = conversationId
  let dbConversation: { id: string; difyConvId: string | null } | null = null

  // Ensure the guest user exists in DB (prevents FK violation)
  if (guestId) {
    await prisma.user.upsert({
      where: { id: guestId },
      create: {
        id: guestId,
        email: `${guestId}@guest.nouvellm`,
        name: 'Invité',
        role: 'EC',
      },
      update: {},
    })
  }

  if (dbConvId) {
    dbConversation = await prisma.conversation.findUnique({ where: { id: dbConvId }, select: { id: true, difyConvId: true } })
  }
  if (!dbConversation) {
    dbConversation = await prisma.conversation.create({
      data: {
        userId: guestId,
        title: message.slice(0, 60),
        courseSessionId: courseSession.id,
      },
    })
    dbConvId = dbConversation.id
  }

  await prisma.message.create({
    data: {
      conversationId: dbConvId!,
      role: 'USER',
      content: message,
    },
  })

  // Pass the Dify conversation id if we already know one
  const difyConversationId = dbConversation?.difyConvId ?? conversationId

  const sourceDatasetIds = courseSession.sources
    .map(s => s.source.difyDatasetId)
    .filter(Boolean) as string[]

  const difyResponse = await streamDifyChat({
    apiKey,
    query: message,
    conversationId: difyConversationId,
    userId: guestId,
    inputs,
    datasetIds: sourceDatasetIds.length > 0 ? sourceDatasetIds : undefined,
  })

  if (!difyResponse.ok || !difyResponse.body) {
    return NextResponse.json({ error: 'Dify API error' }, { status: 502 })
  }

  const encoder = new TextEncoder()
  let fullText = ''
  let difyNewConvId: string | undefined
  let retrieverResources: DifySource[] = []
  let totalTokens: number | undefined

  const stream = new ReadableStream({
    async start(controller) {
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
                if (event.metadata?.retriever_resources) retrieverResources = event.metadata.retriever_resources
                if (event.metadata?.usage?.total_tokens) totalTokens = event.metadata.usage.total_tokens
              } else if (event.event === 'error') {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', message: event.message })}\n\n`))
              }
            } catch { /* skip */ }
          }
        }
      } finally {
        reader.releaseLock()
      }

      const sources = parseDifySources(retrieverResources)

      // ── Persist assistant message ────────────────────────────
      if (fullText.length > 0) {
        const tokenCount = totalTokens ?? Math.ceil(fullText.length / 4)
        await prisma.message.create({
          data: {
            conversationId: dbConvId!,
            role: 'ASSISTANT',
            content: fullText,
            agentUsed: agentSlug ?? null,
            sources: sources.length > 0 ? JSON.stringify(sources) : null,
            tokenCount,
          },
        })
      }

      if (difyNewConvId) {
        await prisma.conversation.update({
          where: { id: dbConvId! },
          data: { difyConvId: difyNewConvId },
        })
      }

      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: 'done', conversationId: dbConvId, difyConvId: difyNewConvId, sources, agentLabel })}\n\n`)
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
