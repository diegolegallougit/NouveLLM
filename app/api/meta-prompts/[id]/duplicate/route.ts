import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const mp = await prisma.metaPrompt.findUnique({ where: { id } })
  if (!mp) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!mp.isPublic && mp.authorId !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const copy = await prisma.metaPrompt.create({
    data: {
      title: `${mp.title} (copie)`,
      description: mp.description,
      content: mp.content,
      level: 'PERSONAL',
      authorId: session.user.id,
      isPublic: false,
    },
  })

  return NextResponse.json({ metaPrompt: copy }, { status: 201 })
}
