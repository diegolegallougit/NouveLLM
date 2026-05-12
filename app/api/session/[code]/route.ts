import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const session = await auth()
  const user = session?.user as { id?: string } | undefined

  const { code } = await params

  const courseSession = await prisma.courseSession.findUnique({
    where: { code },
    include: {
      agents: { include: { agent: { select: { id: true, slug: true, label: true, icon: true, description: true } } } },
      sources: { include: { source: { select: { id: true, slug: true, label: true, icon: true } } } },
      participants: user?.id ? { where: { userId: user.id } } : false,
      ec: { select: { name: true } },
    },
  })

  if (!courseSession) return NextResponse.json({ error: 'Session not found' }, { status: 404 })

  if (courseSession.status === 'CLOSED') {
    return NextResponse.json({ error: 'Cette session est fermée' }, { status: 410 })
  }

  const isOwner = user?.id ? courseSession.ecUserId === user.id : false
  const participantCount = await prisma.courseSessionParticipant.count({ where: { sessionId: courseSession.id } })
  const participants = Array.isArray(courseSession.participants) ? courseSession.participants : []

  if (
    courseSession.maxParticipants &&
    participantCount >= courseSession.maxParticipants &&
    participants.length === 0
  ) {
    return NextResponse.json({ error: 'Capacité maximale atteinte' }, { status: 409 })
  }

  return NextResponse.json({
    session: {
      id: courseSession.id,
      code: courseSession.code,
      name: courseSession.name,
      description: courseSession.description,
      studentConsigne: courseSession.studentConsigne,
      visibility: courseSession.visibility ?? 0,
      systemPrompt: isOwner ? courseSession.systemPrompt : undefined,
      validUntil: courseSession.validUntil,
      access: courseSession.access,
      status: courseSession.status,
      ecName: courseSession.ec.name,
      agents: courseSession.agents.map(a => a.agent),
      sources: courseSession.sources.map(s => s.source),
      isParticipant: participants.length > 0,
      participantCount,
      isGuest: !user?.id,
    },
  })
}
