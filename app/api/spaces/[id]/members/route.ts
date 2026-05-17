import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getSpaceAccess, hasMinimumRole } from '@/lib/space-access'
import { AddMemberSchema, RemoveMemberSchema } from '@/lib/schemas/spaces.schema'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: spaceId } = await params
  const access = await getSpaceAccess(spaceId, session.user.id)
  if (!access) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!hasMinimumRole(access.role, 'MANAGER')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const [userMembers, groupMembers] = await Promise.all([
    prisma.spaceUserMember.findMany({
      where: { spaceId },
      include: { user: { select: { id: true, name: true, email: true, role: true } } },
      orderBy: { addedAt: 'asc' },
    }),
    prisma.spaceGroupMember.findMany({
      where: { spaceId },
      include: { group: { select: { id: true, slug: true, label: true, type: true } } },
      orderBy: { addedAt: 'asc' },
    }),
  ])

  return NextResponse.json({ userMembers, groupMembers })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: spaceId } = await params
  const access = await getSpaceAccess(spaceId, session.user.id)
  if (!access) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!hasMinimumRole(access.role, 'MANAGER')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const parsed = AddMemberSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 })

  const { userId, groupId, role } = parsed.data

  if (userId) {
    if (userId === access.space.ownerId) {
      return NextResponse.json({ error: 'Le propriétaire ne peut pas être ajouté comme membre' }, { status: 400 })
    }
    const member = await prisma.spaceUserMember.upsert({
      where: { spaceId_userId: { spaceId, userId } },
      create: { spaceId, userId, role, addedById: session.user.id },
      update: { role },
      include: { user: { select: { id: true, name: true, email: true, role: true } } },
    })
    return NextResponse.json({ member }, { status: 201 })
  }

  // groupId branch
  const member = await prisma.spaceGroupMember.upsert({
    where: { spaceId_groupId: { spaceId, groupId: groupId! } },
    create: { spaceId, groupId: groupId!, role, addedById: session.user.id },
    update: { role },
    include: { group: { select: { id: true, slug: true, label: true, type: true } } },
  })
  return NextResponse.json({ member }, { status: 201 })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: spaceId } = await params
  const access = await getSpaceAccess(spaceId, session.user.id)
  if (!access) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!hasMinimumRole(access.role, 'MANAGER')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const parsed = RemoveMemberSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 })

  const { userId, groupId } = parsed.data

  if (userId) {
    await prisma.spaceUserMember.delete({
      where: { spaceId_userId: { spaceId, userId } },
    }).catch(() => {})
    return NextResponse.json({ ok: true })
  }

  await prisma.spaceGroupMember.delete({
    where: { spaceId_groupId: { spaceId, groupId: groupId! } },
  }).catch(() => {})
  return NextResponse.json({ ok: true })
}
