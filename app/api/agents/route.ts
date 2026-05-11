import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
  const session = await auth()
  const user = session?.user as { id?: string; role?: string } | undefined
  if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // EC/ADMIN see all active agents; students see group-filtered agents
  if (user.role === 'EC' || user.role === 'ADMIN') {
    const agents = await prisma.agent.findMany({
      where: { status: { not: 'DISABLED' } },
      select: { id: true, slug: true, label: true, icon: true, description: true, status: true },
      orderBy: { label: 'asc' },
    })
    return NextResponse.json({ agents })
  }

  const userGroups = await prisma.userGroup.findMany({
    where: { userId: user.id },
    select: { groupId: true },
  })
  const groupIds = userGroups.map(g => g.groupId)

  const groupAgents = await prisma.groupAgent.findMany({
    where: { groupId: { in: groupIds } },
    include: {
      agent: {
        select: { id: true, slug: true, label: true, icon: true, description: true, status: true },
      },
    },
  })

  const seen = new Set<string>()
  const agents = groupAgents
    .map(ga => ga.agent)
    .filter(a => a.status !== 'DISABLED' && !seen.has(a.id) && seen.add(a.id))

  return NextResponse.json({ agents })
}
