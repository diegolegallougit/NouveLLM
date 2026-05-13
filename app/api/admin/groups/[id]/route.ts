import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { currentAnneeUniv, defaultVisibleUntil } from '@/lib/academic-calendar'
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
    action?: 'remove_member' | 'archive_year' | 'new_year'
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

  if (body.action === 'archive_year') {
    // Get all spaces linked to this group, archive their docs
    const spaces = await prisma.documentSpace.findMany({
      where: { enrichmentGroups: { contains: id } },
      select: { id: true },
    })
    const spaceIds = spaces.map(s => s.id)
    if (spaceIds.length > 0) {
      await prisma.spaceDocument.updateMany({
        where: { spaceId: { in: spaceIds } },
        data: { isVisible: false, visibleUntil: new Date() },
      })
    }
    return NextResponse.json({ ok: true, archived: spaceIds.length, anneeUniv: currentAnneeUniv() })
  }

  if (body.action === 'new_year') {
    const nextUntil = defaultVisibleUntil()
    const spaces = await prisma.documentSpace.findMany({
      where: { enrichmentGroups: { contains: id } },
      select: { id: true },
    })
    const spaceIds = spaces.map(s => s.id)
    if (spaceIds.length > 0) {
      await prisma.spaceDocument.updateMany({
        where: { spaceId: { in: spaceIds } },
        data: { isVisible: true, visibleFrom: new Date(), visibleUntil: nextUntil },
      })
    }
    return NextResponse.json({ ok: true, reset: spaceIds.length })
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
