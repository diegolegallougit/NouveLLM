import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

const DIFY_BASE_URL = process.env.DIFY_BASE_URL || 'http://172.19.0.13:5001'

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
      scopes: { include: { user: { select: { id: true, name: true, email: true } } } },
      diplomeRef: true,
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
      responsables: g.scopes.map((s) => ({ id: s.user.id, name: s.user.name, email: s.user.email })),
      diplomeRef: g.diplomeRef ?? null,
      hasKB: g.hasKB,
      difyDatasetId: g.difyDatasetId ?? null,
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
    diplomeRefId?: string
    hasKB?: boolean
  }

  if (!body.slug || !body.label) {
    return NextResponse.json({ error: 'slug et label sont requis' }, { status: 400 })
  }

  const existing = await prisma.group.findUnique({ where: { slug: body.slug } })
  if (existing) return NextResponse.json({ error: 'Slug déjà utilisé' }, { status: 409 })

  // Create Dify KB if UFR group with hasKB
  let difyDatasetId: string | null = null
  if (body.type === 'UFR' && body.hasKB) {
    try {
      const res = await fetch(`${DIFY_BASE_URL}/v1/datasets`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.DIFY_DATASET_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: `ufr-${body.slug}`,
          permission: 'only_me',
          indexing_technique: 'high_quality',
        }),
        signal: AbortSignal.timeout(10000),
      })
      if (res.ok) {
        const kb = await res.json()
        difyDatasetId = kb.id ?? null
      }
    } catch (err) {
      console.warn('Dify KB creation failed (non-blocking):', err)
    }
  }

  const group = await prisma.group.create({
    data: {
      slug: body.slug,
      label: body.label,
      type: body.type ?? 'SYSTEME',
      quotaTokens: body.quotaTokens ?? 500000,
      allowPersonalSources: body.allowPersonalSources ?? false,
      systemPromptExtra: body.description ?? null,
      diplomeRefId: body.diplomeRefId ?? null,
      hasKB: body.hasKB ?? false,
      difyDatasetId,
    },
  })

  return NextResponse.json({ group }, { status: 201 })
}
