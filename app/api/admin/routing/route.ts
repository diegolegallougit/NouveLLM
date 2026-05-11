import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

async function requireAdmin() {
  const session = await auth()
  const user = session?.user as { id?: string; role?: string } | undefined
  if (!user?.id || user.role !== 'ADMIN') return null
  return user
}

export async function GET() {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const families = await prisma.routingFamily.findMany({
    orderBy: { order: 'asc' },
    include: {
      questions: {
        orderBy: { order: 'asc' },
        include: { options: { orderBy: { order: 'asc' } } },
      },
    },
  })

  return NextResponse.json({ families })
}

export async function POST(req: NextRequest) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json() as {
    slug: string
    label: string
    icon: string
    description: string
    order?: number
  }

  if (!body.slug || !body.label) {
    return NextResponse.json({ error: 'slug and label required' }, { status: 400 })
  }

  const family = await prisma.routingFamily.create({
    data: {
      slug: body.slug,
      label: body.label,
      icon: body.icon || '📁',
      description: body.description || '',
      order: body.order ?? 99,
    },
  })

  return NextResponse.json({ family })
}
