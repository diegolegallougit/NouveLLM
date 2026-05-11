import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  const session = await auth()
  const user = session?.user as { role?: string } | undefined
  if (user?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const alerts = await prisma.systemAlert.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50,
  })
  const unreadCount = await prisma.systemAlert.count({ where: { read: false } })

  return NextResponse.json({ alerts, unreadCount })
}

export async function PATCH(req: NextRequest) {
  const session = await auth()
  const user = session?.user as { role?: string } | undefined
  if (user?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { ids } = await req.json() as { ids?: string[] }
  if (ids?.length) {
    await prisma.systemAlert.updateMany({ where: { id: { in: ids } }, data: { read: true } })
  } else {
    await prisma.systemAlert.updateMany({ where: {}, data: { read: true } })
  }

  return NextResponse.json({ ok: true })
}
