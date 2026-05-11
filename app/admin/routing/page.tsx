'use client'

import { useEffect, useState } from 'react'

interface RoutingOption {
  id: string
  label: string
  agentSlug: string | null
  comingSoon: boolean
  order: number
}

interface RoutingQuestion {
  id: string
  question: string
  order: number
  options: RoutingOption[]
}

interface RoutingFamily {
  id: string
  slug: string
  label: string
  icon: string
  description: string
  order: number
  active: boolean
  questions: RoutingQuestion[]
}

interface Agent {
  slug: string
  label: string
  icon: string
}

export default function AdminRoutingPage() {
  const [families, setFamilies] = useState<RoutingFamily[]>([])
  const [agents, setAgents] = useState<Agent[]>([])
  const [expanded, setExpanded] = useState<string | null>(null)
  const [working, setWorking] = useState<string | null>(null)
  const [showNewForm, setShowNewForm] = useState(false)
  const [newFamily, setNewFamily] = useState({ slug: '', label: '', icon: '📁', description: '' })
  const [newError, setNewError] = useState('')

  async function load() {
    const [fd, ad] = await Promise.all([
      fetch('/api/admin/routing').then(r => r.json()),
      fetch('/api/agents').then(r => r.json()),
    ])
    setFamilies(fd.families ?? [])
    setAgents(ad.agents ?? [])
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps, react-hooks/set-state-in-effect
  useEffect(() => { load() }, [])

  async function toggleActive(id: string, active: boolean) {
    setWorking(id)
    try {
      await fetch(`/api/admin/routing/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !active }),
      })
      await load()
    } finally { setWorking(null) }
  }

  async function deleteFamily(id: string) {
    if (!confirm('Supprimer cette famille de routing ?')) return
    setWorking(id)
    try {
      await fetch(`/api/admin/routing/${id}`, { method: 'DELETE' })
      await load()
    } finally { setWorking(null) }
  }

  async function createFamily() {
    if (!newFamily.slug || !newFamily.label) { setNewError('Slug et label requis'); return }
    setWorking('new')
    setNewError('')
    try {
      const res = await fetch('/api/admin/routing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newFamily, order: families.length + 1 }),
      })
      if (!res.ok) { const d = await res.json(); setNewError(d.error ?? 'Erreur'); return }
      setNewFamily({ slug: '', label: '', icon: '📁', description: '' })
      setShowNewForm(false)
      await load()
    } finally { setWorking(null) }
  }

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '1.3rem', color: '#0D0D0D' }}>
            Routing intelligent
          </h1>
          <p style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: '0.82rem', color: '#8A8A8A' }}>
            {families.filter(f => f.active).length} familles actives — modifiable sans redéploiement
          </p>
        </div>
        <button onClick={() => setShowNewForm(v => !v)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm transition-all hover:opacity-90"
          style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, background: '#00068D', color: '#fff' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
          NOUVELLE FAMILLE
        </button>
      </div>

      {/* New family form */}
      {showNewForm && (
        <div className="bg-white rounded-xl border border-[#D8D8D8] p-5 space-y-3">
          <h3 style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '0.8rem', color: '#0D0D0D' }}>
            Nouvelle famille de tâches
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block mb-1 text-[10px] text-[#5A5A5A] uppercase tracking-wider"
                style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800 }}>Slug *</label>
              <input value={newFamily.slug} onChange={e => setNewFamily(p => ({ ...p, slug: e.target.value.toLowerCase().replace(/\s/g, '-') }))}
                placeholder="ex: analyser-donnees"
                className="w-full px-3 py-2 rounded-lg border border-[#D8D8D8] text-sm focus:outline-none focus:ring-2 focus:ring-[#2B2EB8]"
                style={{ fontFamily: 'Source Serif Pro, Georgia, serif' }} />
            </div>
            <div>
              <label className="block mb-1 text-[10px] text-[#5A5A5A] uppercase tracking-wider"
                style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800 }}>Icône</label>
              <input value={newFamily.icon} onChange={e => setNewFamily(p => ({ ...p, icon: e.target.value }))}
                placeholder="📊"
                className="w-full px-3 py-2 rounded-lg border border-[#D8D8D8] text-sm focus:outline-none focus:ring-2 focus:ring-[#2B2EB8]"
                style={{ fontFamily: 'Source Serif Pro, Georgia, serif' }} />
            </div>
            <div className="col-span-2">
              <label className="block mb-1 text-[10px] text-[#5A5A5A] uppercase tracking-wider"
                style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800 }}>Label *</label>
              <input value={newFamily.label} onChange={e => setNewFamily(p => ({ ...p, label: e.target.value }))}
                placeholder="Analyser des données"
                className="w-full px-3 py-2 rounded-lg border border-[#D8D8D8] text-sm focus:outline-none focus:ring-2 focus:ring-[#2B2EB8]"
                style={{ fontFamily: 'Source Serif Pro, Georgia, serif' }} />
            </div>
            <div className="col-span-2">
              <label className="block mb-1 text-[10px] text-[#5A5A5A] uppercase tracking-wider"
                style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800 }}>Description</label>
              <input value={newFamily.description} onChange={e => setNewFamily(p => ({ ...p, description: e.target.value }))}
                placeholder="Courte description affichée sous le label"
                className="w-full px-3 py-2 rounded-lg border border-[#D8D8D8] text-sm focus:outline-none focus:ring-2 focus:ring-[#2B2EB8]"
                style={{ fontFamily: 'Source Serif Pro, Georgia, serif' }} />
            </div>
          </div>
          {newError && <p className="text-sm text-red-500">{newError}</p>}
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowNewForm(false)}
              className="px-4 py-2 rounded-lg border border-[#D8D8D8] text-sm hover:bg-[#F2F2F2]"
              style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 300, color: '#5A5A5A' }}>
              Annuler
            </button>
            <button onClick={createFamily} disabled={working === 'new'}
              className="px-5 py-2 rounded-lg text-sm disabled:opacity-50"
              style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, background: '#00068D', color: '#fff' }}>
              {working === 'new' ? '…' : 'CRÉER'}
            </button>
          </div>
        </div>
      )}

      {/* Families list */}
      <div className="space-y-2">
        {families.map(family => (
          <div key={family.id}
            className={`bg-white rounded-xl border border-[#D8D8D8] overflow-hidden ${!family.active ? 'opacity-50' : ''}`}>
            <div className="flex items-center gap-3 px-5 py-3.5">
              <span className="text-lg w-7 text-center flex-shrink-0">{family.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '0.9rem', color: '#0D0D0D' }}>
                    {family.label}
                  </span>
                  <span className="font-mono text-[10px] bg-[#F2F2F2] px-1.5 py-0.5 rounded text-[#5A5A5A]">
                    {family.slug}
                  </span>
                  {!family.active && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#F2F2F2] text-[#8A8A8A]"
                      style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800 }}>Inactif</span>
                  )}
                </div>
                <p style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: '0.75rem', color: '#8A8A8A', marginTop: '0.1rem' }}>
                  {family.description} · {family.questions.reduce((s, q) => s + q.options.length, 0)} options
                </p>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={() => setExpanded(expanded === family.id ? null : family.id)}
                  className="text-[11px] px-3 py-1.5 rounded-lg border border-[#D8D8D8] hover:bg-[#F2F2F2] transition-colors"
                  style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 300, color: '#5A5A5A' }}>
                  {expanded === family.id ? 'Réduire' : 'Détails'}
                </button>
                <button onClick={() => toggleActive(family.id, family.active)} disabled={working === family.id}
                  className={`text-[11px] px-3 py-1.5 rounded-lg border disabled:opacity-50 transition-colors ${family.active ? 'border-[#D8D8D8] text-[#5A5A5A] hover:bg-[#F2F2F2]' : 'border-[#A5D6A7] text-[#2E7D32] hover:bg-[#E8F5E9]'}`}
                  style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800 }}>
                  {family.active ? 'DÉSACTIVER' : 'ACTIVER'}
                </button>
                <button onClick={() => deleteFamily(family.id)} disabled={working === family.id}
                  className="text-[11px] px-3 py-1.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 disabled:opacity-50 transition-colors"
                  style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800 }}>
                  SUPPR.
                </button>
              </div>
            </div>

            {/* Expanded questions/options */}
            {expanded === family.id && (
              <div className="border-t border-[#F2F2F2] px-5 py-4 space-y-4 bg-[#FAFAFA]">
                {family.questions.length === 0 ? (
                  <p style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: '0.82rem', color: '#C8C8C8', fontStyle: 'italic' }}>
                    Aucune question — cette famille sera gérée par un composant dédié.
                  </p>
                ) : (
                  family.questions.map(q => (
                    <div key={q.id}>
                      <p style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '0.75rem', color: '#5A5A5A', marginBottom: '0.5rem' }}>
                        {q.question}
                      </p>
                      <div className="space-y-1.5">
                        {q.options.map(opt => (
                          <div key={opt.id}
                            className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white border border-[#D8D8D8]">
                            <span style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: '0.82rem', color: '#0D0D0D', flex: 1 }}>
                              {opt.label}
                            </span>
                            <div className="flex items-center gap-2">
                              {opt.comingSoon && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#FFF8E1] text-[#F57F17] border border-[#FFD54F]"
                                  style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800 }}>Bientôt</span>
                              )}
                              {opt.agentSlug ? (
                                <span className="nl-token-agent text-[10px]">@{opt.agentSlug}</span>
                              ) : !opt.comingSoon ? (
                                <span style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 300, fontSize: '0.7rem', color: '#8A8A8A' }}>Général</span>
                              ) : null}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Agent reference */}
      <div className="bg-white rounded-xl border border-[#D8D8D8] p-5">
        <p style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '0.72rem', letterSpacing: '0.04em', textTransform: 'uppercase', color: '#8A8A8A', marginBottom: '0.75rem' }}>
          Agents disponibles pour les options
        </p>
        <div className="flex flex-wrap gap-2">
          {agents.map(a => (
            <span key={a.slug} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#E8E9F8] text-[#00068D] text-[11px]"
              style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 300 }}>
              {a.icon} <code className="text-[10px]">{a.slug}</code>
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
