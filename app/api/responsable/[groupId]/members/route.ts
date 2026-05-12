import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logAction } from '@/lib/audit'
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'

async function requireScopeAccess(groupId: string) {
  const session = await auth()
  const user = session?.user as { id?: string; role?: string } | undefined
  if (!user?.id) return null
  if (user.role === 'ADMIN') return user

  if (user.role !== 'RESPONSABLE') return null

  const scope = await prisma.scope.findFirst({
    where: { userId: user.id, groupId },
  })
  if (!scope) return null
  return user
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const { groupId } = await params
  const actor = await requireScopeAccess(groupId)
  if (!actor) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const members = await prisma.userGroup.findMany({
    where: { groupId },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
          conversations: { orderBy: { updatedAt: 'desc' }, take: 1, select: { updatedAt: true } },
        },
      },
    },
    orderBy: { user: { name: 'asc' } },
  })

  return NextResponse.json({
    members: members.map((m) => ({
      id: m.user.id,
      email: m.user.email,
      name: m.user.name,
      role: m.user.role,
      createdAt: m.user.createdAt,
      lastActivity: m.user.conversations[0]?.updatedAt ?? null,
    })),
  })
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const { groupId } = await params
  const actor = await requireScopeAccess(groupId)
  if (!actor) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json() as { email: string; name: string; role?: string }
  if (!body.email || !body.name) {
    return NextResponse.json({ error: 'email et name requis' }, { status: 400 })
  }

  const role = body.role ?? 'STUDENT'
  let user = await prisma.user.findUnique({ where: { email: body.email } })

  if (!user) {
    const tempPassword = `Temp-${Math.random().toString(36).slice(2, 10)}`
    user = await prisma.user.create({
      data: {
        email: body.email,
        name: body.name,
        role: role as never,
        password: await bcrypt.hash(tempPassword, 10),
      },
    })
  }

  await prisma.userGroup.upsert({
    where: { userId_groupId: { userId: user.id, groupId } },
    update: {},
    create: { userId: user.id, groupId },
  })

  await logAction({
    userId: actor.id!,
    action: 'USER_INVITED',
    entityType: 'User',
    entityId: user.id,
    entityName: user.email,
    groupId,
  })

  return NextResponse.json({ ok: true, userId: user.id })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const { groupId } = await params
  const actor = await requireScopeAccess(groupId)
  if (!actor) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { userId } = await req.json() as { userId: string }
  if (!userId) return NextResponse.json({ error: 'userId requis' }, { status: 400 })

  await prisma.userGroup.deleteMany({ where: { userId, groupId } })
  return NextResponse.json({ ok: true })
}
