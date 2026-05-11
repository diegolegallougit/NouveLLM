import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  const session = await auth()
  const user = session?.user as { role?: string } | undefined
  if (user?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const metaPrompts = await prisma.metaPrompt.findMany({
    orderBy: [{ level: 'asc' }, { uses: 'desc' }],
    include: { author: { select: { name: true, email: true } }, _count: { select: { activeFor: true } } },
  })

  return NextResponse.json({ metaPrompts })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  const user = session?.user as { role?: string; id?: string } | undefined
  if (user?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json() as {
    title: string; description?: string; content: string; isPublic?: boolean
  }

  const mp = await prisma.metaPrompt.create({
    data: {
      title: body.title.trim(),
      description: body.description?.trim() ?? null,
      content: body.content.trim(),
      level: 'INSTITUTIONAL',
      authorId: user.id ?? null,
      isPublic: body.isPublic ?? true,
    },
  })

  return NextResponse.json({ metaPrompt: mp }, { status: 201 })
}
