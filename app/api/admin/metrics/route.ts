import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

function requireAdmin(role?: string) {
  return role === 'ADMIN'
}

export async function GET() {
  const session = await auth()
  const user = session?.user as { id?: string; role?: string } | undefined
  if (!user?.id || !requireAdmin(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  // Active users this month (distinct users with ≥1 conversation updated this month)
  const activeConvs = await prisma.conversation.findMany({
    where: { updatedAt: { gte: monthStart } },
    select: { userId: true },
  })
  const activeUserCount = new Set(activeConvs.map((c) => c.userId)).size

  // Total users (not deleted)
  const totalUsers = await prisma.user.count({ where: { deletedAt: null } })

  // Tokens & sessions by agent (no content exposed)
  const agentStats = await prisma.message.groupBy({
    by: ['agentUsed'],
    where: {
      role: 'ASSISTANT',
      agentUsed: { not: null },
      createdAt: { gte: monthStart },
    },
    _sum: { tokenCount: true },
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
    take: 10,
  })

  // Feedback ratio by agent (no content)
  const feedbackStats = await prisma.message.groupBy({
    by: ['agentUsed', 'feedback'],
    where: {
      role: 'ASSISTANT',
      feedback: { not: null },
      agentUsed: { not: null },
    },
    _count: { id: true },
  })

  const feedbackByAgent: Record<string, { positive: number; negative: number }> = {}
  for (const row of feedbackStats) {
    if (!row.agentUsed) continue
    if (!feedbackByAgent[row.agentUsed]) feedbackByAgent[row.agentUsed] = { positive: 0, negative: 0 }
    if (row.feedback === 'positive') feedbackByAgent[row.agentUsed].positive = row._count.id
    if (row.feedback === 'negative') feedbackByAgent[row.agentUsed].negative = row._count.id
  }

  // Tokens by group (join via user groups — aggregated, no PII)
  const userGroups = await prisma.userGroup.findMany({
    select: {
      userId: true,
      group: { select: { slug: true, label: true } },
    },
  })
  const userToGroups = new Map<string, { slug: string; label: string }[]>()
  for (const ug of userGroups) {
    if (!userToGroups.has(ug.userId)) userToGroups.set(ug.userId, [])
    userToGroups.get(ug.userId)!.push(ug.group)
  }

  // Fetch messages this month — no content field selected
  const monthMessages = await prisma.message.findMany({
    where: { role: 'ASSISTANT', createdAt: { gte: monthStart } },
    select: {
      tokenCount: true,
      content: false,
      conversation: { select: { userId: true } },
    },
  })

  const tokensByGroup: Record<string, number> = {}
  for (const msg of monthMessages) {
    const groups = userToGroups.get(msg.conversation.userId) ?? [{ slug: 'unassigned', label: 'Non assigné' }]
    for (const g of groups) {
      tokensByGroup[g.label] = (tokensByGroup[g.label] ?? 0) + (msg.tokenCount ?? 0)
    }
  }

  // Total tokens this month
  const totalTokensMonth = monthMessages.reduce((s, m) => s + (m.tokenCount ?? 0), 0)

  return NextResponse.json({
    activeUserCount,
    totalUsers,
    totalTokensMonth,
    agentStats: agentStats.map((s) => ({
      agent: s.agentUsed,
      sessions: s._count.id,
      tokens: s._sum.tokenCount ?? 0,
      feedback: feedbackByAgent[s.agentUsed!] ?? { positive: 0, negative: 0 },
    })),
    tokensByGroup,
  })
}
