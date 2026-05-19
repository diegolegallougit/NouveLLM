import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { streamDifyChat, parseDifySources, DifySource, AGENT_INPUTS } from '@/lib/dify'
import { checkRateLimit } from '@/lib/ratelimit'
import { ChatBodySchema } from '@/lib/schemas/chat.schema'
import { buildUserContext } from '@/lib/user-context'
import { NextRequest, NextResponse } from 'next/server'

const IDLE_TIMEOUT_MS = 60_000

function mapDifyError(status: number, body: string): string {
  let detail = ''
  try {
    const parsed = JSON.parse(body) as { message?: string; code?: string }
    detail = parsed.message || parsed.code || ''
  } catch {
    // body wasn't JSON
  }

  if (status === 400 || status === 422) {
    return `Les paramètres envoyés à l'agent sont invalides${detail ? ` (${detail})` : ''} — contactez un administrateur.`
  }
  if (status === 401 || status === 403) {
    return 'Clé API Dify expirée ou révoquée — contactez un administrateur.'
  }
  if (status === 404) {
    return 'Workflow Dify introuvable ou non publié.'
  }
  if (status === 429) {
    return 'Service IA saturé — réessayez dans un instant.'
  }
  if (status >= 500) {
    return "Service IA en erreur — l'incident a été enregistré."
  }
  return `Erreur Dify (HTTP ${status}).`
}

function sseErrorResponse(message: string, status: number): Response {
  const encoder = new TextEncoder()
  const body = new ReadableStream({
    start(controller) {
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: 'error', message, status })}\n\n`)
      )
      controller.close()
    },
  })
  return new Response(body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}

async function readWithIdleTimeout<T>(
  reader: ReadableStreamDefaultReader<T>,
  ms: number
): Promise<ReadableStreamReadResult<T>> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error('IDLE_TIMEOUT')), ms)
  })
  try {
    return await Promise.race([reader.read(), timeout])
  } finally {
    if (timeoutId) clearTimeout(timeoutId)
  }
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!checkRateLimit(session.user.id)) {
    return NextResponse.json(
      { error: 'Trop de requêtes — réessayez dans une minute.' },
      { status: 429, headers: { 'Retry-After': '60', 'X-RateLimit-Remaining': '0' } }
    )
  }

  const parsed = ChatBodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  const { message, agentSlug, sourceSlugs, conversationId, uploadedFileId, courseSessionId, prebuiltInputs } = parsed.data

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
  let inputs: Record<string, unknown> = {}

  if (agentSlug) {
    const agent = await prisma.agent.findUnique({ where: { slug: agentSlug } })
    if (agent) {
      apiKey = agent.difyApiKey
      agentLabel = agent.label
      if (prebuiltInputs && Object.keys(prebuiltInputs).length > 0) {
        inputs = prebuiltInputs
      } else {
        const inputBuilder = AGENT_INPUTS[agentSlug]
        if (inputBuilder) inputs = inputBuilder(message, uploadedFileId)
      }
    }
  }

  // If the session's scenario has a difyWorkflowOverride, resolve its API key
  if (courseSessionId) {
    const courseSession = await prisma.courseSession.findUnique({
      where: { id: courseSessionId },
      select: { scenarioSlug: true },
    })
    if (courseSession?.scenarioSlug) {
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
  }

  // Resolve institutional source slugs → Dify dataset IDs
  let datasetIds: string[] = []
  if (institutionalSlugs.length > 0) {
    const sources = await prisma.source.findMany({
      where: { slug: { in: institutionalSlugs } },
      select: { difyDatasetId: true },
    })
    datasetIds = sources.map((s) => s.difyDatasetId).filter(Boolean)
  }

  // Pass folder path filter as input variable (for workflows that support it)
  if (folderPaths.length > 0) {
    inputs.folder_filter = folderPaths.join(',')
  }

  // Inject active meta-prompt as system context
  const activeMetaPrompt = await prisma.userActiveMetaPrompt.findFirst({
    where: { userId: session.user.id },
    include: { metaPrompt: true },
  })
  if (activeMetaPrompt?.metaPrompt?.content) {
    inputs.system_context = activeMetaPrompt.metaPrompt.content
  }

  // Inject professional profile as user context
  const userProfile = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
      roleExact: true,
      discipline: true,
      ufr: true,
      niveauxEnseignement: true,
      languesTravail: true,
      sourcesAcademiques: true,
    },
  })
  if (userProfile) {
    const userContext = buildUserContext(userProfile)
    if (userContext) inputs.user_context = userContext
  }

  // Get or create conversation in DB
  let dbConvId = conversationId
  let difyConvId: string | undefined

  if (dbConvId) {
    const existing = await prisma.conversation.findFirst({
      where: { id: dbConvId, userId: session.user.id },
    })
    if (!existing) return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    difyConvId = existing.difyConvId ?? undefined
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

  // For Chatflow continuation, Dify holds session vars from the first turn
  if (difyConvId) inputs = {}

  // Save user message
  await prisma.message.create({
    data: {
      conversationId: dbConvId,
      role: 'USER',
      content: message,
    },
  })

  // Call Dify streaming API
  let difyResponse: Response
  try {
    difyResponse = await streamDifyChat({
      apiKey,
      query: message,
      conversationId: difyConvId,
      userId: session.user.id,
      inputs,
      uploadedFileId,
      datasetIds: datasetIds.length > 0 ? datasetIds : undefined,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'network error'
    console.error('[chat] Dify unreachable:', msg)
    const message = msg.includes('TTFB_TIMEOUT')
      ? 'Le service IA met trop de temps à répondre — réessayez dans un instant.'
      : 'Service IA indisponible — réessayez dans un instant.'
    return sseErrorResponse(message, 503)
  }

  if (!difyResponse.ok || !difyResponse.body) {
    const errorBody = await difyResponse.text().catch(() => '')
    console.error('[chat] Dify HTTP error:', difyResponse.status, errorBody.slice(0, 500))
    return sseErrorResponse(mapDifyError(difyResponse.status, errorBody), 502)
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
      let streamError: string | undefined

      try {
        while (true) {
          const { done, value } = await readWithIdleTimeout(reader, IDLE_TIMEOUT_MS)
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
        reader.releaseLock()
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'unknown'
        streamError =
          msg === 'IDLE_TIMEOUT'
            ? 'Le service IA met trop de temps à répondre.'
            : 'Interruption du flux IA.'
        console.error('[chat] stream error:', msg)
        try {
          await reader.cancel()
        } catch {
          // reader may already be released
        }
      }

      if (streamError) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: 'error', message: streamError })}\n\n`)
        )
      }

      const sources = parseDifySources(retrieverResources)

      // Enrich sources with source_url stored in NouveLLM DB (Dify doesn't expose doc metadata in retriever_resources)
      const difyDocIds = sources.map(s => s.difyDocumentId).filter((id): id is string => !!id)
      if (difyDocIds.length > 0) {
        try {
          const dbDocs = await prisma.spaceDocument.findMany({
            where: { difyFileId: { in: difyDocIds } },
            select: { difyFileId: true, metadata: true },
          })
          const urlMap = new Map<string, string>()
          for (const d of dbDocs) {
            if (!d.difyFileId || !d.metadata) continue
            try {
              const meta = JSON.parse(d.metadata) as Record<string, unknown>
              if (typeof meta.source_url === 'string' && meta.source_url) {
                urlMap.set(d.difyFileId, meta.source_url)
              }
            } catch { /* metadata malformé */ }
          }
          for (const s of sources) {
            if (s.difyDocumentId && urlMap.has(s.difyDocumentId)) {
              s.url = urlMap.get(s.difyDocumentId)
              s.icon = '🌐'
            }
          }
        } catch { /* non-bloquant */ }
      }

      let savedMsgId: string | undefined
      if (fullText.length > 0) {
        const savedMsg = await prisma.message.create({
          data: {
            conversationId: dbConvId!,
            role: 'ASSISTANT',
            content: streamError ? `${fullText}\n\n_[Réponse interrompue]_` : fullText,
            agentUsed: agentSlug ?? null,
            sources: sources.length > 0 ? JSON.stringify(sources) : null,
            tokenCount: totalTokens ?? null,
          },
        })
        savedMsgId = savedMsg.id
      }

      if (difyNewConvId) {
        await prisma.conversation.update({
          where: { id: dbConvId! },
          data: { difyConvId: difyNewConvId },
        })
      }

      if (!streamError) {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: 'done',
              messageId: savedMsgId,
              sources,
              agentLabel,
              hasProcessedFile: !!uploadedFileId,
            })}\n\n`
          )
        )
      }
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
