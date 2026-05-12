import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(_req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const scenarios = await prisma.sessionScenario.findMany({
    where: { active: true },
    orderBy: { order: 'asc' },
  })

  const result = scenarios.map(sc => ({
    ...sc,
    defaultAgentSlugs: JSON.parse(sc.defaultAgentSlugs || '[]') as string[],
  }))

  return NextResponse.json({ scenarios: result })
}
