'use client'

import { useEffect, useState } from 'react'

interface WorkflowStatus {
  slug: string
  label: string
  icon: string
  difyAppId: string
  difyApiKey: string
  agentStatus: string
  difyOk: boolean
  difyName?: string
  latency?: number
}

const DIFY_WEB_URL = 'http://100.120.16.114:8090'

export default function AdminWorkflowsPage() {
  const [workflows, setWorkflows] = useState<WorkflowStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [lastCheck, setLastCheck] = useState<Date | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  async function load() {
    setRefreshing(true)
    try {
      const r = await fetch('/api/admin/workflows')
      const data = await r.json()
      setWorkflows(data.workflows ?? [])
      setLastCheck(new Date())
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps, react-hooks/set-state-in-effect
  useEffect(() => { load() }, [])

  const upCount = workflows.filter(w => w.difyOk).length
  const totalCount = workflows.length

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '1.3rem', color: '#0D0D0D' }}>
            Workflows Dify
          </h1>
          <p style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: '0.82rem', color: '#8A8A8A' }}>
            {loading ? 'Vérification en cours…' : `${upCount}/${totalCount} workflows actifs`}
            {lastCheck && (
              <span className="ml-2">· vérifié à {lastCheck.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
            )}
          </p>
        </div>
        <button
          onClick={load}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm border border-[#D8D8D8] bg-white hover:bg-[#F0F1FB] hover:border-[#2B2EB8] transition-all disabled:opacity-50"
          style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, color: '#0D0D0D' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
            className={refreshing ? 'animate-spin' : ''}>
            <path d="M23 4v6h-6M1 20v-6h6" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
          RAFRAÎCHIR
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <span className="nl-spinner" />
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-[#D8D8D8] overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#D8D8D8] bg-[#FAFAFA]">
                {['Workflow', 'App ID', 'Statut', 'Latence', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left"
                    style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '0.62rem', letterSpacing: '0.04em', textTransform: 'uppercase', color: '#8A8A8A' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {workflows.map(w => (
                <tr key={w.slug} className="border-b border-[#F2F2F2] hover:bg-[#FAFAFA]">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span>{w.icon}</span>
                      <div>
                        <span style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '0.85rem', color: '#0D0D0D' }}>
                          {w.label}
                        </span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="nl-token-agent text-[10px]">@{w.slug}</span>
                          {w.agentStatus !== 'ACTIVE' && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-orange-100 text-orange-700"
                              style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800 }}>
                              {w.agentStatus}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <code className="text-[11px] bg-[#F2F2F2] px-1.5 py-0.5 rounded text-[#5A5A5A]">
                      {w.difyAppId}
                    </code>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${w.difyOk ? 'bg-green-500' : 'bg-red-500'}`} />
                      <span style={{
                        fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '0.72rem',
                        color: w.difyOk ? '#2E7D32' : '#dc2626',
                      }}>
                        {w.difyOk ? 'ACTIF' : 'INJOIGNABLE'}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: '0.8rem', color: '#8A8A8A' }}>
                      {w.latency ? `${w.latency} ms` : '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <a
                      href={`${DIFY_WEB_URL}/app/${w.difyAppId}/overview`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-[#00068D] hover:underline"
                      style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800 }}
                    >
                      Ouvrir dans Dify →
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="bg-[#F2F2F2] rounded-xl p-4">
        <p style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '0.7rem', color: '#8A8A8A', marginBottom: '0.5rem' }}>
          WEBHOOK ERREURS DIFY
        </p>
        <code className="text-[11px] text-[#5A5A5A] break-all">
          POST /api/admin/webhook/dify
        </code>
        <p style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: '0.75rem', color: '#8A8A8A', marginTop: '0.4rem' }}>
          Configurer ce endpoint dans Dify → Paramètres → Webhooks pour recevoir les erreurs de workflow.
        </p>
      </div>
    </div>
  )
}
