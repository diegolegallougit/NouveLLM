import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: spaceId } = await params
  const space = await prisma.documentSpace.findFirst({
    where: { id: spaceId, ownerId: session.user.id },
    select: { id: true },
  })
  if (!space) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const url = new URL(req.url)
  const page = parseInt(url.searchParams.get('page') ?? '1')
  const pageSize = 20

  const entries = await prisma.auditLog.findMany({
    where: { spaceId },
    include: { user: { select: { name: true, email: true } } },
    orderBy: { createdAt: 'desc' },
    skip: (page - 1) * pageSize,
    take: pageSize,
  })

  const total = await prisma.auditLog.count({ where: { spaceId } })

  return NextResponse.json({ entries, total, page, pageSize })
}
