import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const body = await req.json()
  const feedback = body.feedback as string

  if (!['positive', 'negative'].includes(feedback)) {
    return NextResponse.json({ error: 'Invalid feedback value' }, { status: 400 })
  }

  // Verify the message belongs to this user's conversation
  const message = await prisma.message.findFirst({
    where: {
      id,
      conversation: { userId: session.user.id },
    },
    select: { id: true },
  })

  if (!message) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  await prisma.message.update({
    where: { id },
    data: { feedback },
  })

  return NextResponse.json({ ok: true })
}
