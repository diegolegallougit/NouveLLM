import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [institutional, shared, personal] = await Promise.all([
    prisma.metaPrompt.findMany({
      where: { level: 'INSTITUTIONAL', isPublic: true },
      orderBy: { uses: 'desc' },
      include: { author: { select: { name: true } } },
    }),
    prisma.metaPrompt.findMany({
      where: { level: 'SHARED', isPublic: true },
      orderBy: { uses: 'desc' },
      include: { author: { select: { name: true } } },
    }),
    prisma.metaPrompt.findMany({
      where: { level: 'PERSONAL', authorId: session.user.id },
      orderBy: { createdAt: 'desc' },
      include: { author: { select: { name: true } } },
    }),
  ])

  // Get active meta-prompt for current user
  const activeEntry = await prisma.userActiveMetaPrompt.findFirst({
    where: { userId: session.user.id },
    include: { metaPrompt: true },
    orderBy: { activatedAt: 'desc' },
  })

  return NextResponse.json({
    institutional,
    shared,
    personal,
    active: activeEntry?.metaPrompt ?? null,
  })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as {
    title: string
    description?: string
    content: string
    isPublic?: boolean
  }

  if (!body.title?.trim() || !body.content?.trim()) {
    return NextResponse.json({ error: 'title et content requis' }, { status: 400 })
  }

  const mp = await prisma.metaPrompt.create({
    data: {
      title: body.title.trim(),
      description: body.description?.trim() ?? null,
      content: body.content.trim(),
      level: body.isPublic ? 'SHARED' : 'PERSONAL',
      authorId: session.user.id,
      isPublic: body.isPublic ?? false,
    },
  })

  return NextResponse.json({ metaPrompt: mp }, { status: 201 })
}
