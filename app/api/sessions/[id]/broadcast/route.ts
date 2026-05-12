import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

const DIFY_BASE_URL = process.env.DIFY_BASE_URL || 'http://172.19.0.5:5001'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  const user = session?.user as { id?: string } | undefined
  if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { signal } = await req.json() as { signal?: string }
  if (!signal?.trim()) return NextResponse.json({ error: 'signal requis' }, { status: 400 })

  const courseSession = await prisma.courseSession.findFirst({
    where: { id, ecUserId: user.id },
    include: {
      conversations: { select: { id: true, difyConvId: true } },
      agents: { include: { agent: { select: { difyApiKey: true } } } },
    },
  })
  if (!courseSession) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const apiKey = courseSession.agents[0]?.agent?.difyApiKey || process.env.DIFY_IIIAAS_API_KEY || ''
  const activeConvs = courseSession.conversations.filter(c => c.difyConvId)

  let sent = 0
  const errors: string[] = []

  for (const conv of activeConvs) {
    try {
      // Save signal message in DB
      await prisma.message.create({
        data: {
          conversationId: conv.id,
          role: 'USER',
          content: signal,
        },
      })

      // Send to Dify (non-blocking — fire and forget for each conversation)
      fetch(`${DIFY_BASE_URL}/v1/chat-messages`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inputs: {},
          query: signal,
          conversation_id: conv.difyConvId,
          response_mode: 'blocking',
          user: `system-broadcast-${id}`,
        }),
        signal: AbortSignal.timeout(30000),
      }).then(async r => {
        if (r.ok) {
          const data = await r.json()
          if (data.answer) {
            await prisma.message.create({
              data: { conversationId: conv.id, role: 'ASSISTANT', content: data.answer },
            })
          }
        }
      }).catch(() => { /* silent — fire and forget */ })

      sent++
    } catch {
      errors.push(conv.id)
    }
  }

  return NextResponse.json({ ok: true, sent, total: activeConvs.length, errors })
}
