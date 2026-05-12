import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logAction } from '@/lib/audit'
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'

async function requireAdmin() {
  const session = await auth()
  const user = session?.user as { id?: string; role?: string } | undefined
  if (!user?.id || user.role !== 'ADMIN') return null
  return user
}

export async function GET() {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      onboarded: true,
      deletedAt: true,
      createdAt: true,
      groups: { select: { group: { select: { id: true, slug: true, label: true } } } },
      conversations: { orderBy: { updatedAt: 'desc' }, take: 1, select: { updatedAt: true } },
    },
  })

  const shaped = users.map((u) => ({
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    onboarded: u.onboarded,
    disabled: u.deletedAt !== null,
    createdAt: u.createdAt,
    groups: u.groups.map((g) => ({ id: g.group.id, slug: g.group.slug, label: g.group.label })),
    lastActivity: u.conversations[0]?.updatedAt ?? null,
  }))

  return NextResponse.json({ users: shaped })
}

export async function POST(req: NextRequest) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json() as { email: string; name: string; role: string; groupIds?: string[] }

  if (!body.email || !body.name || !body.role) {
    return NextResponse.json({ error: 'email, name et role sont requis' }, { status: 400 })
  }

  const existing = await prisma.user.findUnique({ where: { email: body.email } })
  if (existing) return NextResponse.json({ error: 'Email déjà utilisé' }, { status: 409 })

  const tempPassword = `Temp-${Math.random().toString(36).slice(2, 10)}`
  const hashed = await bcrypt.hash(tempPassword, 10)

  const user = await prisma.user.create({
    data: {
      email: body.email,
      name: body.name,
      role: body.role as 'STUDENT' | 'EC' | 'ADMIN',
      password: hashed,
    },
  })

  if (body.groupIds && body.groupIds.length > 0) {
    for (const groupId of body.groupIds) {
      await prisma.userGroup.upsert({
        where: { userId_groupId: { userId: user.id, groupId } },
        create: { userId: user.id, groupId },
        update: {},
      })
    }
  }

  const adminUser = await auth().then((s) => s?.user as { id?: string } | undefined)
  if (adminUser?.id) {
    await logAction({
      userId: adminUser.id,
      action: 'USER_INVITED',
      entityType: 'User',
      entityId: user.id,
      entityName: user.email,
    })
  }

  return NextResponse.json({ user: { id: user.id, email: user.email }, tempPassword }, { status: 201 })
}
