import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

async function requireAdmin() {
  const session = await auth()
  const user = session?.user as { id?: string; role?: string } | undefined
  if (!user?.id || user.role !== 'ADMIN') return null
  return user
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const body = await req.json() as { action: 'disable' | 'enable' | 'set_role' | 'set_groups'; role?: string; groupIds?: string[] }

  const target = await prisma.user.findUnique({ where: { id }, select: { id: true } })
  if (!target) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (body.action === 'disable') {
    await prisma.user.update({ where: { id }, data: { deletedAt: new Date() } })
  } else if (body.action === 'enable') {
    await prisma.user.update({ where: { id }, data: { deletedAt: null } })
  } else if (body.action === 'set_role' && body.role) {
    await prisma.user.update({ where: { id }, data: { role: body.role as 'STUDENT' | 'EC' | 'ADMIN' } })
  } else if (body.action === 'set_groups' && body.groupIds !== undefined) {
    await prisma.userGroup.deleteMany({ where: { userId: id } })
    if (body.groupIds.length > 0) {
      for (const groupId of body.groupIds) {
        await prisma.userGroup.upsert({
          where: { userId_groupId: { userId: id, groupId } },
          create: { userId: id, groupId },
          update: {},
        })
      }
    }
  }

  return NextResponse.json({ ok: true })
}
