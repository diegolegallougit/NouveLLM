import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: metaPromptId } = await params
  const mp = await prisma.metaPrompt.findUnique({ where: { id: metaPromptId } })
  if (!mp) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!mp.isPublic && mp.authorId !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Deactivate all current (single active at a time)
  await prisma.userActiveMetaPrompt.deleteMany({ where: { userId: session.user.id } })

  await prisma.userActiveMetaPrompt.create({
    data: { userId: session.user.id, metaPromptId },
  })

  await prisma.metaPrompt.update({ where: { id: metaPromptId }, data: { uses: { increment: 1 } } })

  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: metaPromptId } = await params
  await prisma.userActiveMetaPrompt.deleteMany({
    where: { userId: session.user.id, metaPromptId },
  })

  return NextResponse.json({ ok: true })
}
