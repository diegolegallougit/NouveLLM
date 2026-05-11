import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const session = await auth()
  const user = session?.user as { id?: string } | undefined
  if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { code } = await params

  const courseSession = await prisma.courseSession.findUnique({
    where: { code },
  })
  if (!courseSession) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (courseSession.status !== 'ACTIVE') {
    return NextResponse.json({ error: 'Cette session n\'est plus active' }, { status: 403 })
  }

  if (new Date() > courseSession.validUntil) {
    return NextResponse.json({ error: 'Cette session a expiré' }, { status: 410 })
  }

  const existing = await prisma.courseSessionParticipant.findUnique({
    where: { sessionId_userId: { sessionId: courseSession.id, userId: user.id } },
  })
  if (existing) return NextResponse.json({ sessionId: courseSession.id, alreadyJoined: true })

  if (courseSession.maxParticipants) {
    const count = await prisma.courseSessionParticipant.count({ where: { sessionId: courseSession.id } })
    if (count >= courseSession.maxParticipants) {
      return NextResponse.json({ error: 'Capacité maximale atteinte' }, { status: 409 })
    }
  }

  await prisma.courseSessionParticipant.create({
    data: { sessionId: courseSession.id, userId: user.id },
  })

  return NextResponse.json({ sessionId: courseSession.id })
}
