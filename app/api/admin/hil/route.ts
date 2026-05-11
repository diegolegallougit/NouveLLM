import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
  const session = await auth()
  const user = session?.user as { id?: string; role?: string } | undefined
  if (!user?.id || user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const requests = await prisma.hILRequest.findMany({
    include: {
      expert: { select: { name: true, role: true } },
      user: { select: { name: true, email: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  const shaped = requests.map(r => ({
    id: r.id,
    status: r.status,
    createdAt: r.createdAt,
    expert: r.expert,
    userName: r.user.name,
    userEmail: r.user.email,
    contextSummary: r.contextSummary,
  }))

  return NextResponse.json({ requests: shaped })
}
