import { prisma } from '@/lib/prisma'

function StatCard({ label, value, sub, color = '#00068D' }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="bg-white rounded-xl border border-[#D8D8D8] px-5 py-4">
      <p style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 300, fontSize: '0.65rem', letterSpacing: '0.06em', textTransform: 'uppercase', color: '#8A8A8A' }}>
        {label}
      </p>
      <p style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '1.8rem', color, letterSpacing: '-0.02em' }} className="mt-1">
        {value}
      </p>
      {sub && (
        <p style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: '0.75rem', color: '#8A8A8A' }} className="mt-0.5">
          {sub}
        </p>
      )}
    </div>
  )
}

export default async function AdminDashboard() {
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  // Aggregated — no content ever fetched
  const [activeConvs, totalUsers, monthMessages, agentStats, feedbackRaw] = await Promise.all([
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

  // Tokens by group
  const userGroups = await prisma.userGroup.findMany({
    select: { userId: true, group: { select: { label: true } } },
  })
  const userToGroup = new Map<string, string>()
  for (const ug of userGroups) {
    if (!userToGroup.has(ug.userId)) userToGroup.set(ug.userId, ug.group.label)
  }

  const tokensByGroup: Record<string, number> = {}
  for (const msg of monthMessages) {
    const group = userToGroup.get('') ?? 'Non assigné'
    tokensByGroup[group] = (tokensByGroup[group] ?? 0) + (msg.tokenCount ?? 0)
  }

  // Get tokens by group via conversations
  const convsByUser = await prisma.conversation.findMany({
    where: { updatedAt: { gte: monthStart } },
    select: {
      userId: true,
      messages: { where: { role: 'ASSISTANT' }, select: { tokenCount: true } },
    },
  })
  const tokensByGroupCalc: Record<string, number> = {}
  for (const conv of convsByUser) {
    const grp = userToGroup.get(conv.userId) ?? 'Non assigné'
    const t = conv.messages.reduce((s, m) => s + (m.tokenCount ?? 0), 0)
    tokensByGroupCalc[grp] = (tokensByGroupCalc[grp] ?? 0) + t
  }

  const monthLabel = now.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '1.3rem', color: '#0D0D0D' }}>
            Tableau de bord
          </h1>
          <p style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: '0.82rem', color: '#8A8A8A' }}>
            Métriques agrégées · {monthLabel}
          </p>
        </div>
        <a
          href="/api/admin/metrics/export"
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#D8D8D8] bg-white hover:bg-[#F0F1FB] hover:border-[#2B2EB8] transition-all text-xs"
          style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, letterSpacing: '0.04em', color: '#0D0D0D' }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
          </svg>
          EXPORT CSV ANR
        </a>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Utilisateurs actifs ce mois" value={activeUserCount} sub={`sur ${totalUsers} inscrits`} />
        <StatCard label="Sessions ce mois" value={activeConvs.length} />
        <StatCard label="Tokens consommés ce mois" value={totalTokens > 1000 ? `${(totalTokens / 1000).toFixed(0)}k` : totalTokens} />
        <StatCard label="Agents utilisés" value={agentStats.length} sub="ce mois" color="#2B2EB8" />
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Top 5 agents */}
        <div className="bg-white rounded-xl border border-[#D8D8D8] overflow-hidden">
          <div className="px-5 py-3 border-b border-[#D8D8D8]">
            <h2 style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '0.75rem', letterSpacing: '0.04em', color: '#0D0D0D', textTransform: 'uppercase' }}>
              Top 5 agents
            </h2>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#F2F2F2]">
                {['Agent', 'Sessions', 'Tokens', '👍 / 👎'].map((h) => (
                  <th key={h} className="px-4 py-2 text-left" style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '0.62rem', letterSpacing: '0.04em', textTransform: 'uppercase', color: '#8A8A8A' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {agentStats.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-6 text-center text-xs text-[#8A8A8A]" style={{ fontFamily: 'Source Serif Pro, Georgia, serif' }}>Aucune donnée ce mois</td></tr>
              ) : (
                agentStats.map((s) => {
                  const fb = feedbackByAgent[s.agentUsed!] ?? { positive: 0, negative: 0 }
                  const total = fb.positive + fb.negative
                  return (
                    <tr key={s.agentUsed} className="border-b border-[#F2F2F2] hover:bg-[#FAFAFA]">
                      <td className="px-4 py-2.5">
                        <span className="nl-token-agent text-[10px]">@{s.agentUsed}</span>
                      </td>
                      <td className="px-4 py-2.5" style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '0.85rem', color: '#0D0D0D' }}>
                        {s._count.id}
                      </td>
                      <td className="px-4 py-2.5" style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: '0.82rem', color: '#5A5A5A' }}>
                        {(s._sum.tokenCount ?? 0) > 1000 ? `${((s._sum.tokenCount ?? 0) / 1000).toFixed(0)}k` : (s._sum.tokenCount ?? 0)}
                      </td>
                      <td className="px-4 py-2.5">
                        {total > 0 ? (
                          <span style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: '0.8rem', color: '#5A5A5A' }}>
                            {fb.positive} / {fb.negative}
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: '#C8C8C8' }}>—</span>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Tokens by group */}
        <div className="bg-white rounded-xl border border-[#D8D8D8] overflow-hidden">
          <div className="px-5 py-3 border-b border-[#D8D8D8]">
            <h2 style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '0.75rem', letterSpacing: '0.04em', color: '#0D0D0D', textTransform: 'uppercase' }}>
              Tokens par groupe
            </h2>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#F2F2F2]">
                {['Groupe', 'Tokens ce mois'].map((h) => (
                  <th key={h} className="px-4 py-2 text-left" style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '0.62rem', letterSpacing: '0.04em', textTransform: 'uppercase', color: '#8A8A8A' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.keys(tokensByGroupCalc).length === 0 ? (
                <tr><td colSpan={2} className="px-4 py-6 text-center text-xs text-[#8A8A8A]" style={{ fontFamily: 'Source Serif Pro, Georgia, serif' }}>Aucune donnée ce mois</td></tr>
              ) : (
                Object.entries(tokensByGroupCalc)
                  .sort((a, b) => b[1] - a[1])
                  .map(([grp, tokens]) => (
                    <tr key={grp} className="border-b border-[#F2F2F2] hover:bg-[#FAFAFA]">
                      <td className="px-4 py-2.5" style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: '0.85rem', color: '#0D0D0D' }}>
                        {grp}
                      </td>
                      <td className="px-4 py-2.5" style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '0.85rem', color: '#2B2EB8' }}>
                        {tokens > 1000 ? `${(tokens / 1000).toFixed(0)}k` : tokens}
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Intégrations */}
      <div className="bg-white rounded-xl border border-[#D8D8D8] overflow-hidden">
        <div className="px-5 py-3 border-b border-[#D8D8D8]">
          <h2 style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '0.75rem', letterSpacing: '0.04em', color: '#0D0D0D', textTransform: 'uppercase' }}>
            Intégrations
          </h2>
        </div>
        <div className="px-5 py-4 flex flex-wrap gap-3">
          <a
            href="/api/docs/ui"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-[#D8D8D8] bg-white hover:bg-[#F0F1FB] hover:border-[#2B2EB8] transition-all text-xs"
            style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, letterSpacing: '0.04em', color: '#0D0D0D' }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
            API OpenAPI / Swagger UI
          </a>
          <a
            href="/api/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-[#D8D8D8] bg-white hover:bg-[#F0F1FB] hover:border-[#2B2EB8] transition-all text-xs"
            style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, letterSpacing: '0.04em', color: '#5A5A5A' }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
            Spec JSON brute
          </a>
        </div>
      </div>
    </div>
  )
}
