import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: spaceId } = await params
  const space = await prisma.documentSpace.findFirst({
    where: { id: spaceId, ownerId: session.user.id },
    select: { id: true },
  })
  if (!space) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const documentCount = await prisma.spaceDocument.count({ where: { spaceId } })

  return NextResponse.json({ documentCount })
}
