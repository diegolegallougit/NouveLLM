import { prisma } from '@/lib/prisma'
import dynamic from 'next/dynamic'
import AdminLoading from './loading'
import type { AdminDashboardProps } from './AdminDashboardClient'

const AdminDashboardClient = dynamic(() => import('./AdminDashboardClient'), {
  ssr: false,
  loading: () => <AdminLoading />,
})

export default async function AdminDashboard() {
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const today = new Date(now); today.setHours(0, 0, 0, 0)

  const [queuedJobs, processingJobs, completedToday, failedJobs] = await Promise.all([
    prisma.indexingJob.count({ where: { status: 'queued' } }),
    prisma.indexingJob.count({ where: { status: 'processing' } }),
    prisma.indexingJob.count({ where: { status: 'completed', completedAt: { gte: today } } }),
    prisma.indexingJob.count({ where: { status: 'failed' } }),
  ])

  const [activeConvs, totalUsers, monthMessages, agentStatsRaw, feedbackRaw] = await Promise.all([
    prisma.conversation.findMany({
      where: { updatedAt: { gte: monthStart } },
      select: { userId: true },
    }),
    prisma.user.count({ where: { deletedAt: null } }),
    prisma.message.findMany({
      where: { role: 'ASSISTANT', createdAt: { gte: monthStart } },
      select: { tokenCount: true, agentUsed: true },
    }),
    prisma.message.groupBy({
      by: ['agentUsed'],
      where: { role: 'ASSISTANT', agentUsed: { not: null }, createdAt: { gte: monthStart } },
      _sum: { tokenCount: true },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 5,
    }),
    prisma.message.groupBy({
      by: ['agentUsed', 'feedback'],
      where: { role: 'ASSISTANT', feedback: { not: null }, agentUsed: { not: null } },
      _count: { id: true },
    }),
  ])

  const activeUserCount = new Set(activeConvs.map((c) => c.userId)).size
  const totalTokens = monthMessages.reduce((s, m) => s + (m.tokenCount ?? 0), 0)

  const feedbackByAgent: Record<string, { positive: number; negative: number }> = {}
  for (const row of feedbackRaw) {
    if (!row.agentUsed) continue
    if (!feedbackByAgent[row.agentUsed]) feedbackByAgent[row.agentUsed] = { positive: 0, negative: 0 }
    if (row.feedback === 'positive') feedbackByAgent[row.agentUsed].positive += row._count.id
    if (row.feedback === 'negative') feedbackByAgent[row.agentUsed].negative += row._count.id
  }

  const userGroups = await prisma.userGroup.findMany({
    select: { userId: true, group: { select: { label: true } } },
  })
  const userToGroup = new Map<string, string>()
  for (const ug of userGroups) {
    if (!userToGroup.has(ug.userId)) userToGroup.set(ug.userId, ug.group.label)
  }

  const convsByUser = await prisma.conversation.findMany({
    where: { updatedAt: { gte: monthStart } },
    select: {
      userId: true,
      messages: { where: { role: 'ASSISTANT' }, select: { tokenCount: true } },
    },
  })
  const tokensByGroup: Record<string, number> = {}
  for (const conv of convsByUser) {
    const grp = userToGroup.get(conv.userId) ?? 'Non assigné'
    const t = conv.messages.reduce((s, m) => s + (m.tokenCount ?? 0), 0)
    tokensByGroup[grp] = (tokensByGroup[grp] ?? 0) + t
  }

  const agentStats: AdminDashboardProps['agentStats'] = agentStatsRaw.map(s => ({
    agentUsed: s.agentUsed,
    sessionsCount: s._count.id,
    tokensSum: s._sum.tokenCount ?? 0,
  }))

  const monthLabel = now.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })

  return (
    <AdminDashboardClient
      queuedJobs={queuedJobs}
      processingJobs={processingJobs}
      completedToday={completedToday}
      failedJobs={failedJobs}
      activeUserCount={activeUserCount}
      totalUsers={totalUsers}
      convCount={activeConvs.length}
      totalTokens={totalTokens}
      agentStats={agentStats}
      feedbackByAgent={feedbackByAgent}
      tokensByGroup={tokensByGroup}
      monthLabel={monthLabel}
    />
  )
}
