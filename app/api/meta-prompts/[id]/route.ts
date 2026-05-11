import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const mp = await prisma.metaPrompt.findUnique({ where: { id } })
  if (!mp || mp.authorId !== session.user.id) {
    return NextResponse.json({ error: 'Not found or not authorized' }, { status: 404 })
  }

  const body = await req.json() as { title?: string; description?: string; content?: string; isPublic?: boolean }
  const updated = await prisma.metaPrompt.update({
    where: { id },
    data: {
      ...(body.title && { title: body.title.trim() }),
      ...(body.description !== undefined && { description: body.description?.trim() ?? null }),
      ...(body.content && { content: body.content.trim() }),
      ...(body.isPublic !== undefined && {
        isPublic: body.isPublic,
        level: body.isPublic ? 'SHARED' : 'PERSONAL',
      }),
    },
  })

  return NextResponse.json({ metaPrompt: updated })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const mp = await prisma.metaPrompt.findUnique({ where: { id } })
  if (!mp || mp.authorId !== session.user.id) {
    return NextResponse.json({ error: 'Not found or not authorized' }, { status: 404 })
  }

  await prisma.metaPrompt.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
