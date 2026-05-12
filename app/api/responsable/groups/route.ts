import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
  const session = await auth()
  const user = session?.user as { id?: string; role?: string } | undefined
  if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let groups

  if (user.role === 'ADMIN') {
    groups = await prisma.group.findMany({
      include: { _count: { select: { users: true } } },
      orderBy: { label: 'asc' },
    })
  } else if (user.role === 'RESPONSABLE') {
    const scopes = await prisma.scope.findMany({
      where: { userId: user.id },
      include: {
        group: { include: { _count: { select: { users: true } } } },
      },
    })
    groups = scopes.map((s) => s.group)
  } else {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  return NextResponse.json({ groups })
}
