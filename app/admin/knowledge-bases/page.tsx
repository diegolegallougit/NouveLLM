'use client'

import React, { useEffect, useState } from 'react'

interface KBStatus {
  id: string
  slug: string
  label: string
  icon: string
  difyDatasetId: string
  access: string
  docCountDb: number | null
  docCountDify: number | null
  difyOk: boolean
  category?: 'institutional' | 'shared' | 'ufr'
  description?: string
  warning?: string | null
}

const DIFY_WEB_URL = process.env.NEXT_PUBLIC_DIFY_WEB_URL ?? 'http://localhost:8090'

export default function AdminKnowledgeBasesPage() {
  const [kbs, setKbs] = useState<KBStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  async function load() {
    setRefreshing(true)
    try {
      const r = await fetch('/api/admin/knowledge-bases')
      const data = await r.json()
      setKbs(data.knowledgeBases ?? [])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps, react-hooks/set-state-in-effect
  useEffect(() => { load() }, [])

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-lg)', color: '#0D0D0D' }}>
            Bases de connaissances
          </h1>
          <p style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: 'var(--text-sm)', color: '#8A8A8A' }}>
            {loading ? 'Chargement…' : `${kbs.length} bases configurées`}
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
        <div className="flex items-center justify-center py-16"><span className="nl-spinner" /></div>
      ) : (
        <div className="bg-white rounded-xl border border-[#D8D8D8] overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#D8D8D8] bg-[#FAFAFA]">
                {['Base', 'Dataset ID', 'Docs DB', 'Docs Dify', 'Accès', 'Statut', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left"
                    style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-2xs)', letterSpacing: '0.04em', textTransform: 'uppercase', color: '#8A8A8A' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {kbs.map(kb => (
                <React.Fragment key={kb.id}>
                {kb.warning && (
                  <tr className="bg-orange-50 border-b border-orange-100">
                    <td colSpan={7} className="px-4 py-2">
                      <span style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-xs)', color: '#ea580c' }}>
                        ⚠ {kb.warning}
                      </span>
                    </td>
                  </tr>
                )}
                <tr className="border-b border-[#F2F2F2] hover:bg-[#FAFAFA]">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span>{kb.icon}</span>
                      <div>
                        <span style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-sm)', color: '#0D0D0D' }}>
                          {kb.label}
                        </span>
                        <div className="mt-0.5 flex items-center gap-1.5">
                          <span className="nl-token-source">#{kb.slug}</span>
                          {kb.description && <span style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: 'var(--text-2xs)', color: '#8A8A8A' }}>{kb.description}</span>}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <code className="bg-[#F2F2F2] px-1.5 py-0.5 rounded text-[#5A5A5A] break-all" style={{ fontSize: 'var(--text-2xs)' }}>
                      {kb.difyDatasetId.slice(0, 18)}…
                    </code>
                  </td>
                  <td className="px-4 py-3" style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-sm)', color: '#0D0D0D' }}>
                    {kb.docCountDb ?? '—'}
                  </td>
                  <td className="px-4 py-3" style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-sm)', color: '#2B2EB8' }}>
                    {kb.docCountDify ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full border ${kb.access === 'PUBLIC' ? 'bg-[#e8f5e9] text-[#2e7d32] border-[#a5d6a7]' : 'bg-[#fff3e0] text-[#e65100] border-[#ffcc02]'}`}
                      style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-2xs)' }}>
                      {kb.access === 'PUBLIC' ? 'Public' : 'Restreint'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className={`flex items-center gap-1.5`}>
                      <div className={`w-2 h-2 rounded-full ${kb.difyOk ? 'bg-green-500' : 'bg-red-500'}`} />
                      <span style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-xs)', color: kb.difyOk ? '#2E7D32' : '#dc2626' }}>
                        {kb.difyOk ? 'OK' : 'ERREUR'}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <a
                      href={`${DIFY_WEB_URL}/datasets/${kb.difyDatasetId}/documents`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#00068D] hover:underline"
                      style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-xs)' }}
                    >
                      Gérer dans Dify →
                    </a>
                  </td>
                </tr>
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
