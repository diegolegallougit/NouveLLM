import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  const user = session?.user as { id?: string; role?: string } | undefined
  if (!user?.id || user.role !== 'ADMIN') {
    return new Response('Forbidden', { status: 403 })
  }

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  // Build user→groups map
  const userGroups = await prisma.userGroup.findMany({
    select: {
      userId: true,
      group: { select: { slug: true, label: true } },
    },
  })
  const userToGroups = new Map<string, string>()
  for (const ug of userGroups) {
    if (!userToGroups.has(ug.userId)) {
      userToGroups.set(ug.userId, ug.group.label)
    }
  }

  // Conversations this month — no content, aggregated per user/agent/group
  const conversations = await prisma.conversation.findMany({
    where: { updatedAt: { gte: monthStart } },
    select: {
      userId: true,
      agentSlug: true,
      messages: {
        where: { role: 'ASSISTANT' },
        select: { tokenCount: true },
      },
    },
  })

  // Aggregate: group × agent → { sessions, tokens }
  type Key = string
  const agg = new Map<Key, { sessions: number; tokens: number }>()

  for (const conv of conversations) {
    const group = userToGroups.get(conv.userId) ?? 'Non assigné'
    const agent = conv.agentSlug ?? 'libre'
    const key: Key = `${group}||${agent}`
    const tokens = conv.messages.reduce((s, m) => s + (m.tokenCount ?? 0), 0)
    const existing = agg.get(key) ?? { sessions: 0, tokens: 0 }
    agg.set(key, { sessions: existing.sessions + 1, tokens: existing.tokens + tokens })
  }

  const rows: string[] = ['periode,groupe,agent,nb_sessions,tokens_total']
  for (const [key, val] of agg.entries()) {
    const [group, agent] = key.split('||')
    rows.push(`${period},"${group}","${agent}",${val.sessions},${val.tokens}`)
  }

  return new Response(rows.join('\n'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="nouvellm-metrics-${period}.csv"`,
    },
  })
}
