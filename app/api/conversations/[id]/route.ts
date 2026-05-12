import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  // Strict ownership: conversation.userId must equal session.user.id.
  // Combining both in the where clause means any mismatch returns null → 404,
  // which is indistinguishable from a missing resource (no information leak).
  const conversation = await prisma.conversation.findFirst({
    where: { id, userId: session.user.id },
    include: {
      messages: { orderBy: { createdAt: 'asc' } },
    },
  })

  if (!conversation) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Belt-and-suspenders: double-check ownership even if findFirst was correct.
  if (conversation.userId !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  return NextResponse.json({ conversation })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const conversation = await prisma.conversation.findFirst({
    where: { id, userId: session.user.id },
    select: { id: true },
  })

  if (!conversation) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.conversation.delete({ where: { id } })

  return NextResponse.json({ ok: true })
}
