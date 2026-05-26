'use client'

import Link from 'next/link'

interface AgentStat {
  agentUsed: string | null
  sessionsCount: number
  tokensSum: number
}

export interface AdminDashboardProps {
  queuedJobs: number
  processingJobs: number
  completedToday: number
  failedJobs: number
  activeUserCount: number
  totalUsers: number
  convCount: number
  totalTokens: number
  agentStats: AgentStat[]
  feedbackByAgent: Record<string, { positive: number; negative: number }>
  tokensByGroup: Record<string, number>
  monthLabel: string
}

function StatCard({ label, value, sub, color = '#00068D' }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="bg-white rounded-xl border border-[#D8D8D8] px-5 py-4">
      <p style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 300, fontSize: 'var(--text-2xs)', letterSpacing: '0.06em', textTransform: 'uppercase', color: '#8A8A8A' }}>
        {label}
      </p>
      <p style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-xl)', color, letterSpacing: '-0.02em' }} className="mt-1">
        {value}
      </p>
      {sub && (
        <p style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: 'var(--text-xs)', color: '#8A8A8A' }} className="mt-0.5">
          {sub}
        </p>
      )}
    </div>
  )
}

export default function AdminDashboardClient({
  queuedJobs, processingJobs, completedToday, failedJobs,
  activeUserCount, totalUsers, convCount, totalTokens,
  agentStats, feedbackByAgent, tokensByGroup, monthLabel,
}: AdminDashboardProps) {
  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-lg)', color: '#0D0D0D' }}>
            Tableau de bord
          </h1>
          <p style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: 'var(--text-sm)', color: '#8A8A8A' }}>
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
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <StatCard label="Utilisateurs actifs ce mois" value={activeUserCount} sub={`sur ${totalUsers} inscrits`} />
        <StatCard label="Sessions ce mois" value={convCount} />
        <StatCard label="Tokens consommés ce mois" value={totalTokens > 1000 ? `${(totalTokens / 1000).toFixed(0)}k` : totalTokens} />
        <StatCard label="Agents utilisés" value={agentStats.length} sub="ce mois" color="#2B2EB8" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
        {/* Top 5 agents */}
        <div className="bg-white rounded-xl border border-[#D8D8D8] overflow-hidden">
          <div className="px-5 py-3 border-b border-[#D8D8D8]">
            <h2 style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-xs)', letterSpacing: '0.04em', color: '#0D0D0D', textTransform: 'uppercase' }}>
              Top 5 agents
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#F2F2F2]">
                  {['Agent', 'Sessions', 'Tokens', '👍 / 👎'].map((h) => (
                    <th key={h} className="px-4 py-2 text-left" style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-2xs)', letterSpacing: '0.04em', textTransform: 'uppercase', color: '#8A8A8A' }}>
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
                          <span className="nl-token-agent" style={{ fontSize: 'var(--text-2xs)' }}>@{s.agentUsed}</span>
                        </td>
                        <td className="px-4 py-2.5" style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-sm)', color: '#0D0D0D' }}>
                          {s.sessionsCount}
                        </td>
                        <td className="px-4 py-2.5" style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: 'var(--text-sm)', color: '#5A5A5A' }}>
                          {s.tokensSum > 1000 ? `${(s.tokensSum / 1000).toFixed(0)}k` : s.tokensSum}
                        </td>
                        <td className="px-4 py-2.5">
                          {total > 0 ? (
                            <span style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: 'var(--text-sm)', color: '#5A5A5A' }}>
                              {fb.positive} / {fb.negative}
                            </span>
                          ) : (
                            <span style={{ fontSize: 'var(--text-xs)', color: '#C8C8C8' }}>—</span>
                          )}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Tokens by group */}
        <div className="bg-white rounded-xl border border-[#D8D8D8] overflow-hidden">
          <div className="px-5 py-3 border-b border-[#D8D8D8]">
            <h2 style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-xs)', letterSpacing: '0.04em', color: '#0D0D0D', textTransform: 'uppercase' }}>
              Tokens par groupe
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#F2F2F2]">
                  {['Groupe', 'Tokens ce mois'].map((h) => (
                    <th key={h} className="px-4 py-2 text-left" style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-2xs)', letterSpacing: '0.04em', textTransform: 'uppercase', color: '#8A8A8A' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.keys(tokensByGroup).length === 0 ? (
                  <tr><td colSpan={2} className="px-4 py-6 text-center text-xs text-[#8A8A8A]" style={{ fontFamily: 'Source Serif Pro, Georgia, serif' }}>Aucune donnée ce mois</td></tr>
                ) : (
                  Object.entries(tokensByGroup)
                    .sort((a, b) => b[1] - a[1])
                    .map(([grp, tokens]) => (
                      <tr key={grp} className="border-b border-[#F2F2F2] hover:bg-[#FAFAFA]">
                        <td className="px-4 py-2.5" style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: 'var(--text-sm)', color: '#0D0D0D' }}>
                          {grp}
                        </td>
                        <td className="px-4 py-2.5" style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-sm)', color: '#2B2EB8' }}>
                          {tokens > 1000 ? `${(tokens / 1000).toFixed(0)}k` : tokens}
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Queue d'indexation */}
      <div className="bg-white rounded-xl border border-[#D8D8D8] overflow-hidden">
        <div className="px-5 py-3 border-b border-[#D8D8D8] flex items-center justify-between">
          <h2 style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-xs)', letterSpacing: '0.04em', color: '#0D0D0D', textTransform: 'uppercase' }}>
            Queue d&apos;indexation
          </h2>
          <Link href="/api/admin/indexing-queue" style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-2xs)', color: '#8A8A8A', letterSpacing: '0.04em' }}>
            JSON →
          </Link>
        </div>
        <div className="grid grid-cols-4 divide-x divide-[#F2F2F2] px-0">
          {[
            { label: 'En attente', value: queuedJobs, color: '#2B2EB8' },
            { label: 'En cours', value: processingJobs, color: '#d97706' },
            { label: 'Indexés aujourd\'hui', value: completedToday, color: '#2e7d32' },
            { label: 'Échecs cumulés', value: failedJobs, color: failedJobs > 0 ? '#EF4444' : '#8A8A8A' },
          ].map(({ label, value, color }) => (
            <div key={label} className="px-5 py-4">
              <p style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 300, fontSize: 'var(--text-2xs)', letterSpacing: '0.06em', textTransform: 'uppercase', color: '#8A8A8A' }}>{label}</p>
              <p style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-xl)', color, letterSpacing: '-0.02em' }} className="mt-1">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Intégrations */}
      <div className="bg-white rounded-xl border border-[#D8D8D8] overflow-hidden">
        <div className="px-5 py-3 border-b border-[#D8D8D8]">
          <h2 style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-xs)', letterSpacing: '0.04em', color: '#0D0D0D', textTransform: 'uppercase' }}>
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
