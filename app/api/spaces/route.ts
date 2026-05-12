import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

function slugify(name: string) {
  return name.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '')
}

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const spaces = await prisma.documentSpace.findMany({
    where: { ownerId: session.user.id },
    orderBy: { createdAt: 'asc' },
    include: {
      folders: {
        orderBy: { createdAt: 'asc' },
        include: {
          _count: { select: { documents: true } },
          children: {
            orderBy: { createdAt: 'asc' },
            include: { _count: { select: { documents: true } } },
          },
        },
        where: { parentId: null },
      },
      _count: { select: { documents: true } },
    },
  })

  return NextResponse.json({ spaces })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { name, description, icon, audience } = body as { name: string; description?: string; icon?: string; audience?: string }
  if (!name?.trim()) return NextResponse.json({ error: 'name requis' }, { status: 400 })

  const baseSlug = slugify(name)
  let slug = baseSlug
  let i = 2
  while (await prisma.documentSpace.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${i++}`
  }

  const space = await prisma.documentSpace.create({
    data: {
      slug,
      name: name.trim(),
      description: description?.trim() ?? null,
      icon: icon ?? '📁',
      ownerId: session.user.id,
      ...(audience && { audience: audience as never }),
    },
  })

  return NextResponse.json({ space }, { status: 201 })
}
