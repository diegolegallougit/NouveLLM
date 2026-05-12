import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  const user = session?.user as { id?: string; role?: string } | undefined
  if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const courseSession = await prisma.courseSession.findFirst({
    where: { id, ecUserId: user.id },
    include: {
      agents: { include: { agent: { select: { slug: true, label: true, icon: true } } } },
      sources: { include: { source: { select: { slug: true, label: true, icon: true } } } },
      participants: true,
      conversations: {
        include: {
          messages: { select: { role: true, tokenCount: true, createdAt: true } },
        },
      },
    },
  })
  if (!courseSession) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const tokens = courseSession.conversations.flatMap(c => c.messages).reduce((sum, m) => sum + (m.tokenCount ?? 0), 0)
  const messageCount = courseSession.conversations.flatMap(c => c.messages).filter(m => m.role === 'USER').length

  return NextResponse.json({
    session: {
      id: courseSession.id,
      code: courseSession.code,
      name: courseSession.name,
      description: courseSession.description,
      systemPrompt: courseSession.systemPrompt,
      studentConsigne: courseSession.studentConsigne,
      scenarioSlug: courseSession.scenarioSlug,
      visibility: courseSession.visibility,
      validUntil: courseSession.validUntil,
      maxParticipants: courseSession.maxParticipants,
      access: courseSession.access,
      status: courseSession.status,
      participantCount: courseSession.participants.length,
      conversationCount: courseSession.conversations.length,
      tokens,
      messageCount,
      agents: courseSession.agents.map(a => a.agent),
      sources: courseSession.sources.map(s => s.source),
      createdAt: courseSession.createdAt,
    },
  })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  const user = session?.user as { id?: string; role?: string } | undefined
  if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json() as { action: 'suspend' | 'close' | 'duplicate' }

  const courseSession = await prisma.courseSession.findFirst({
    where: { id, ecUserId: user.id },
    include: {
      agents: true,
      sources: true,
    },
  })
  if (!courseSession) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (body.action === 'suspend') {
    const updated = await prisma.courseSession.update({
      where: { id },
      data: { status: courseSession.status === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED' },
    })
    return NextResponse.json({ session: updated })
  }

  if (body.action === 'close') {
    const updated = await prisma.courseSession.update({
      where: { id },
      data: { status: 'CLOSED' },
    })
    return NextResponse.json({ session: updated })
  }

  if (body.action === 'duplicate') {
    const words = courseSession.name.toUpperCase().replace(/[^A-Z0-9 ]/g, '').split(' ').filter(Boolean)
    const prefix = words.slice(0, 2).map((w: string) => w.slice(0, 4)).join('-')
    const rand = Math.floor(Math.random() * 900) + 100
    const newCode = `${prefix || 'SES'}-${new Date().getFullYear()}-${rand}`

    const duplicated = await prisma.courseSession.create({
      data: {
        code: newCode,
        name: `${courseSession.name} (copie)`,
        description: courseSession.description,
        systemPrompt: courseSession.systemPrompt,
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        maxParticipants: courseSession.maxParticipants,
        access: courseSession.access,
        ecUserId: user.id,
        agents: { create: courseSession.agents.map(a => ({ agentId: a.agentId })) },
        sources: { create: courseSession.sources.map(s => ({ sourceId: s.sourceId })) },
      },
    })
    return NextResponse.json({ session: duplicated })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
