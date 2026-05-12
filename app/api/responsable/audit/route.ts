import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const session = await auth()
  const user = session?.user as { id?: string; role?: string } | undefined
  if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(req.url)
  const groupId = url.searchParams.get('groupId') ?? undefined
  const page = parseInt(url.searchParams.get('page') ?? '1')
  const pageSize = 20

  let groupIds: string[] | undefined

  if (user.role === 'ADMIN') {
    if (groupId) groupIds = [groupId]
  } else if (user.role === 'RESPONSABLE') {
    const scopes = await prisma.scope.findMany({ where: { userId: user.id } })
    const allowed = scopes.map((s) => s.groupId)
    if (groupId && !allowed.includes(groupId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    groupIds = groupId ? [groupId] : allowed
  } else {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const where = groupIds ? { groupId: { in: groupIds } } : {}

  const entries = await prisma.auditLog.findMany({
    where,
    include: { user: { select: { name: true, email: true } } },
    orderBy: { createdAt: 'desc' },
    skip: (page - 1) * pageSize,
    take: pageSize,
  })

  return NextResponse.json({ entries })
}
