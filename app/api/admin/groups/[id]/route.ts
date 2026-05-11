import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

async function requireAdmin() {
  const session = await auth()
  const user = session?.user as { id?: string; role?: string } | undefined
  if (!user?.id || user.role !== 'ADMIN') return null
  return user
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const group = await prisma.group.findUnique({
    where: { id },
    include: {
      users: {
        include: { user: { select: { id: true, name: true, email: true, role: true } } },
        orderBy: { user: { name: 'asc' } },
      },
    },
  })

  if (!group) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({
    group: {
      id: group.id,
      slug: group.slug,
      label: group.label,
      type: group.type,
      quotaTokens: group.quotaTokens,
      allowPersonalSources: group.allowPersonalSources,
      description: group.systemPromptExtra ?? null,
    },
    members: group.users.map((ug) => ({
      id: ug.user.id,
      name: ug.user.name,
      email: ug.user.email,
      role: ug.user.role,
    })),
  })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const body = await req.json() as {
    action?: 'remove_member'
    userId?: string
    label?: string
    type?: string
    quotaTokens?: number
    allowPersonalSources?: boolean
    description?: string
  }

  const group = await prisma.group.findUnique({ where: { id }, select: { id: true } })
  if (!group) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (body.action === 'remove_member' && body.userId) {
    await prisma.userGroup.delete({ where: { userId_groupId: { userId: body.userId, groupId: id } } })
    return NextResponse.json({ ok: true })
  }

  await prisma.group.update({
    where: { id },
    data: {
      ...(body.label !== undefined && { label: body.label }),
      ...(body.type !== undefined && { type: body.type }),
      ...(body.quotaTokens !== undefined && { quotaTokens: body.quotaTokens }),
      ...(body.allowPersonalSources !== undefined && { allowPersonalSources: body.allowPersonalSources }),
      ...(body.description !== undefined && { systemPromptExtra: body.description }),
    },
  })

  return NextResponse.json({ ok: true })
}
