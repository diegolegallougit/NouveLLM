import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
  const session = await auth()
  const user = session?.user as { id?: string; role?: string } | undefined
  if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (user.role === 'EC' || user.role === 'ADMIN') {
    const sources = await prisma.source.findMany({
      select: { id: true, slug: true, label: true, icon: true, description: true, access: true },
      orderBy: { label: 'asc' },
    })
    return NextResponse.json({ sources })
  }

  const userGroups = await prisma.userGroup.findMany({
    where: { userId: user.id },
    select: { groupId: true },
  })
  const groupIds = userGroups.map(g => g.groupId)

  const publicSources = await prisma.source.findMany({
    where: { access: 'PUBLIC' },
    select: { id: true, slug: true, label: true, icon: true, description: true, access: true },
  })

  const restrictedGroupSources = await prisma.groupSource.findMany({
    where: { groupId: { in: groupIds } },
    include: {
      source: {
        select: { id: true, slug: true, label: true, icon: true, description: true, access: true },
      },
    },
  })

  const seen = new Set<string>()
  const sources = [
    ...publicSources.filter(s => !seen.has(s.id) && seen.add(s.id)),
    ...restrictedGroupSources.map(gs => gs.source).filter(s => !seen.has(s.id) && seen.add(s.id)),
  ]

  return NextResponse.json({ sources })
}
