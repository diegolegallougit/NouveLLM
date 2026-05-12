import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import QRCode from 'qrcode'

function generateCode(name: string): string {
  const words = name.toUpperCase().replace(/[^A-Z0-9 ]/g, '').split(' ').filter(Boolean)
  const prefix = words.slice(0, 2).map(w => w.slice(0, 4)).join('-')
  const suffix = new Date().getFullYear()
  const rand = Math.floor(Math.random() * 900) + 100
  return `${prefix || 'SES'}-${suffix}-${rand}`
}

export async function GET(_req: NextRequest) {
  const session = await auth()
  const user = session?.user as { id?: string; role?: string } | undefined
  if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (user.role !== 'EC' && user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const sessions = await prisma.courseSession.findMany({
    where: { ecUserId: user.id },
    include: {
      agents: { include: { agent: { select: { slug: true, label: true, icon: true } } } },
      sources: { include: { source: { select: { slug: true, label: true, icon: true } } } },
      participants: true,
      conversations: {
        include: {
          messages: { where: { role: 'ASSISTANT' }, select: { tokenCount: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  const result = sessions.map(s => {
    const tokens = s.conversations.flatMap(c => c.messages).reduce((sum, m) => sum + (m.tokenCount ?? 0), 0)
    return {
      id: s.id,
      code: s.code,
      name: s.name,
      description: s.description,
      validUntil: s.validUntil,
      maxParticipants: s.maxParticipants,
      access: s.access,
      status: s.status,
      participantCount: s.participants.length,
      tokens,
      agents: s.agents.map(a => a.agent),
      sources: s.sources.map(s => s.source),
      createdAt: s.createdAt,
    }
  })

  return NextResponse.json({ sessions: result })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  const user = session?.user as { id?: string; role?: string } | undefined
  if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (user.role !== 'EC' && user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json() as {
    name: string
    description?: string
    systemPrompt?: string
    studentConsigne?: string
    scenarioSlug?: string
    visibility?: number
    validUntil: string
    maxParticipants?: number
    access?: 'OPEN' | 'CLOSED'
    agentSlugs?: string[]
    sourceSlugs?: string[]
  }

  if (!body.name || !body.validUntil) {
    return NextResponse.json({ error: 'name and validUntil required' }, { status: 400 })
  }

  const code = generateCode(body.name)

  const agentIds = body.agentSlugs?.length
    ? await prisma.agent.findMany({ where: { slug: { in: body.agentSlugs } }, select: { id: true } })
    : []

  const sourceIds = body.sourceSlugs?.length
    ? await prisma.source.findMany({ where: { slug: { in: body.sourceSlugs } }, select: { id: true } })
    : []

  const courseSession = await prisma.courseSession.create({
    data: {
      code,
      name: body.name,
      description: body.description,
      systemPrompt: body.systemPrompt,
      studentConsigne: body.studentConsigne,
      scenarioSlug: body.scenarioSlug,
      visibility: body.visibility ?? 0,
      validUntil: new Date(body.validUntil),
      maxParticipants: body.maxParticipants,
      access: body.access ?? 'OPEN',
      ecUserId: user.id,
      agents: {
        create: agentIds.map(a => ({ agentId: a.id })),
      },
      sources: {
        create: sourceIds.map(s => ({ sourceId: s.id })),
      },
    },
  })

  const host = req.headers.get('host') ?? 'localhost:3001'
  const proto = req.headers.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'http')
  const baseUrl = `${proto}://${host}`
  const link = `${baseUrl}/session/${code}`

  const qrSvg = await QRCode.toString(link, { type: 'svg', width: 256, margin: 2 })

  return NextResponse.json({ session: courseSession, link, qrSvg })
}
