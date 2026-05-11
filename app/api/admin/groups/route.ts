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
  if (!await requireAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const groups = await prisma.group.findMany({
    orderBy: { label: 'asc' },
    include: {
      _count: { select: { users: true } },
    },
  })

  return NextResponse.json({
    groups: groups.map((g) => ({
      id: g.id,
      slug: g.slug,
      label: g.label,
      type: g.type,
      quotaTokens: g.quotaTokens,
      allowPersonalSources: g.allowPersonalSources,
      description: g.systemPromptExtra ?? null,
      memberCount: g._count.users,
    })),
  })
}

export async function POST(req: NextRequest) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json() as {
    slug: string
    label: string
    type?: string
    quotaTokens?: number
    allowPersonalSources?: boolean
    description?: string
  }

  if (!body.slug || !body.label) {
    return NextResponse.json({ error: 'slug et label sont requis' }, { status: 400 })
  }

  const existing = await prisma.group.findUnique({ where: { slug: body.slug } })
  if (existing) return NextResponse.json({ error: 'Slug déjà utilisé' }, { status: 409 })

  const group = await prisma.group.create({
    data: {
      slug: body.slug,
      label: body.label,
      type: body.type ?? 'SYSTEME',
      quotaTokens: body.quotaTokens ?? 500000,
      allowPersonalSources: body.allowPersonalSources ?? false,
      systemPromptExtra: body.description ?? null,
    },
  })

  return NextResponse.json({ group }, { status: 201 })
}
