import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
  const session = await auth()
  const user = session?.user as { id?: string; role?: string } | undefined
  if (!user?.id || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const agents = await prisma.agent.findMany({
    orderBy: { slug: 'asc' },
    include: {
      groups: {
        include: { group: { select: { id: true, slug: true, label: true } } },
      },
    },
  })

  return NextResponse.json({ agents })
}
