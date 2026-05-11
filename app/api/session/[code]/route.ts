import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const session = await auth()
  const user = session?.user as { id?: string } | undefined
  if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { code } = await params

  const courseSession = await prisma.courseSession.findUnique({
    where: { code },
    include: {
      agents: { include: { agent: { select: { id: true, slug: true, label: true, icon: true, description: true } } } },
      sources: { include: { source: { select: { id: true, slug: true, label: true, icon: true } } } },
      participants: { where: { userId: user.id } },
      ec: { select: { name: true } },
    },
  })

  if (!courseSession) return NextResponse.json({ error: 'Session not found' }, { status: 404 })

  if (courseSession.status === 'CLOSED') {
    return NextResponse.json({ error: 'Cette session est fermée' }, { status: 410 })
  }

  const participantCount = await prisma.courseSessionParticipant.count({ where: { sessionId: courseSession.id } })

  if (
    courseSession.maxParticipants &&
    participantCount >= courseSession.maxParticipants &&
    courseSession.participants.length === 0
  ) {
    return NextResponse.json({ error: 'Capacité maximale atteinte' }, { status: 409 })
  }

  return NextResponse.json({
    session: {
      id: courseSession.id,
      code: courseSession.code,
      name: courseSession.name,
      description: courseSession.description,
      systemPrompt: courseSession.systemPrompt,
      validUntil: courseSession.validUntil,
      access: courseSession.access,
      status: courseSession.status,
      ecName: courseSession.ec.name,
      agents: courseSession.agents.map(a => a.agent),
      sources: courseSession.sources.map(s => s.source),
      isParticipant: courseSession.participants.length > 0,
      participantCount,
    },
  })
}
