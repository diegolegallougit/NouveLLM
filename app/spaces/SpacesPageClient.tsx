'use client'

import { useState } from 'react'
import Link from 'next/link'
import SpaceTree, { SpaceData } from '@/components/spaces/SpaceTree'

export default function SpacesPageClient({ initialSpaces }: { initialSpaces: SpaceData[] }) {
  const [spaces, setSpaces] = useState<SpaceData[]>(initialSpaces)
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newIcon, setNewIcon] = useState('📁')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  async function loadSpaces() {
    const r = await fetch('/api/spaces')
    const data = await r.json()
    setSpaces(data.spaces ?? [])
  }

  async function handleCreate() {
    if (!newName.trim()) { setError('Nom requis'); return }
    setCreating(true)
    setError('')
    try {
      const r = await fetch('/api/spaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), description: newDesc.trim() || undefined, icon: newIcon }),
      })
      if (!r.ok) { const d = await r.json(); setError(d.error ?? 'Erreur'); return }
      setNewName('')
      setNewDesc('')
      setNewIcon('📁')
      setShowCreate(false)
      await loadSpaces()
    } finally { setCreating(false) }
  }

  async function handleDeleteSpace(id: string) {
    if (!confirm('Supprimer cet espace et tous ses documents ?')) return
    await fetch(`/api/spaces/${id}`, { method: 'DELETE' })
    await loadSpaces()
  }

  const totalDocs = spaces.reduce((sum, s) => sum + s._count.documents, 0)

  return (
    <div className="min-h-screen bg-[#F8F8FF]">
      {/* Header */}
      <header className="bg-white border-b border-[#D8D8D8] px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#00068D]">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
              <path d="M12 3v18M3 12h18" /><path d="M5.6 5.6l12.8 12.8M5.6 18.4l12.8-12.8" />
            </svg>
          </Link>
          <span style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '1rem', color: '#00068D' }}>NouveLLM</span>
          <span className="w-px h-4 bg-[#D8D8D8]" />
          <span style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '0.8rem', color: '#0D0D0D' }}>
            Espaces documentaires
          </span>
        </div>
        <Link href="/" className="text-[10px] text-[#8A8A8A] hover:text-[#00068D] transition-colors"
          style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 300, letterSpacing: '0.04em' }}>
          ← Retour à la conversation
        </Link>
      </header>

      <div className="max-w-4xl mx-auto px-8 py-8 space-y-6">
        {/* Stats bar */}
        <div className="flex items-center justify-between">
          <div>
            <h1 style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '1.3rem', color: '#0D0D0D' }}>
              Mes espaces documentaires
            </h1>
            <p style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: '0.82rem', color: '#8A8A8A' }}>
              {spaces.length} espace{spaces.length !== 1 ? 's' : ''} — {totalDocs} document{totalDocs !== 1 ? 's' : ''} au total
            </p>
          </div>
          <button
            onClick={() => setShowCreate(v => !v)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm transition-all hover:opacity-90"
            style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, background: '#00068D', color: '#fff' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
            NOUVEL ESPACE
          </button>
        </div>

        {/* Create form */}
        {showCreate && (
          <div className="bg-white rounded-xl border border-[#D8D8D8] p-5 space-y-3">
            <h3 style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '0.85rem', color: '#0D0D0D' }}>
              Nouvel espace documentaire
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block mb-1 text-[10px] text-[#5A5A5A] uppercase tracking-wider"
                  style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800 }}>Icône</label>
                <div className="flex flex-wrap gap-1 p-2 rounded-lg border border-[#D8D8D8] bg-white">
                  {['📁','📂','📚','📖','📝','📄','🗂️','🔬','🎓','🏛️','🌍','🎭','🔍','✍️','📊','🎨','💡','🗞️','📰','🧪'].map(emoji => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setNewIcon(emoji)}
                      className={`w-7 h-7 flex items-center justify-center rounded text-base transition-colors ${newIcon === emoji ? 'bg-[#E8E9F8] ring-1 ring-[#2B2EB8]' : 'hover:bg-[#F2F2F2]'}`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block mb-1 text-[10px] text-[#5A5A5A] uppercase tracking-wider"
                  style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800 }}>Nom *</label>
                <input value={newName} onChange={e => setNewName(e.target.value)}
                  placeholder="ex: Cours Traductologie L3"
                  className="w-full px-3 py-2 rounded-lg border border-[#D8D8D8] text-sm focus:outline-none focus:ring-2 focus:ring-[#2B2EB8]"
                  style={{ fontFamily: 'Source Serif Pro, Georgia, serif' }} />
              </div>
              <div className="col-span-2">
                <label className="block mb-1 text-[10px] text-[#5A5A5A] uppercase tracking-wider"
                  style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800 }}>Description</label>
                <input value={newDesc} onChange={e => setNewDesc(e.target.value)}
                  placeholder="Description courte de l'espace"
                  className="w-full px-3 py-2 rounded-lg border border-[#D8D8D8] text-sm focus:outline-none focus:ring-2 focus:ring-[#2B2EB8]"
                  style={{ fontFamily: 'Source Serif Pro, Georgia, serif' }} />
              </div>
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowCreate(false)}
                className="px-4 py-2 rounded-lg border border-[#D8D8D8] text-sm hover:bg-[#F2F2F2]"
                style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 300, color: '#5A5A5A' }}>
                Annuler
              </button>
              <button onClick={handleCreate} disabled={creating}
                className="px-5 py-2 rounded-lg text-sm disabled:opacity-50"
                style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, background: '#00068D', color: '#fff' }}>
                {creating ? '…' : 'CRÉER'}
              </button>
            </div>
          </div>
        )}

        {/* Spaces list */}
        {spaces.length === 0 && !showCreate ? (
          <div className="bg-white rounded-xl border border-[#D8D8D8] p-10 text-center">
            <span className="text-4xl block mb-3">📁</span>
            <p style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '0.9rem', color: '#0D0D0D' }}>
              Aucun espace documentaire
            </p>
            <p style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: '0.82rem', color: '#8A8A8A', marginTop: '0.5rem' }}>
              Créez un espace pour organiser vos documents pédagogiques et les utiliser comme sources.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {spaces.map(space => (
              <div key={space.id} className="bg-white rounded-xl border border-[#D8D8D8] p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{space.icon}</span>
                    <div>
                      <h3 style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '1rem', color: '#0D0D0D' }}>
                        {space.name}
                      </h3>
                      {space.description && (
                        <p style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: '0.78rem', color: '#8A8A8A' }}>
                          {space.description}
                        </p>
                      )}
                      <div className="flex items-center gap-3 mt-1">
                        <span className="font-mono text-[10px] bg-[#F2F2F2] px-1.5 py-0.5 rounded text-[#5A5A5A]">
                          #{space.slug}
                        </span>
                        <span style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 300, fontSize: '0.7rem', color: '#8A8A8A' }}>
                          {space._count.documents} doc{space._count.documents !== 1 ? 's' : ''}
                          {' · '}{space.folders.length} dossier{space.folders.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button onClick={() => handleDeleteSpace(space.id)}
                    className="text-[11px] px-3 py-1.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition-colors"
                    style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800 }}>
                    SUPPR.
                  </button>
                </div>

                {/* Space tree (full version) */}
                <div className="border-t border-[#F2F2F2] pt-3">
                  <SpaceTree space={space} onRefresh={loadSpaces} />
                </div>

                {/* Enrichment groups */}
                <div className="border-t border-[#F2F2F2] mt-3 pt-3">
                  <p style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '0.65rem', letterSpacing: '0.06em', textTransform: 'uppercase', color: '#8A8A8A' }}
                    className="mb-1.5">
                    Qui peut enrichir cet espace ?
                  </p>
                  <EnrichmentGroups spaceId={space.id} value={JSON.parse(space.enrichmentGroups)} onSaved={loadSpaces} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function EnrichmentGroups({ spaceId, value, onSaved }: { spaceId: string; value: string[]; onSaved: () => void }) {
  const [groups, setGroups] = useState<string[]>(value)
  const [input, setInput] = useState('')
  const [saving, setSaving] = useState(false)

  async function save(newGroups: string[]) {
    setSaving(true)
    try {
      await fetch(`/api/spaces/${spaceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enrichmentGroups: newGroups }),
      })
      onSaved()
    } finally { setSaving(false) }
  }

  function addGroup() {
    const slug = input.trim().toLowerCase().replace(/\s/g, '_')
    if (!slug || groups.includes(slug)) { setInput(''); return }
    const next = [...groups, slug]
    setGroups(next)
    setInput('')
    save(next)
  }

  function removeGroup(slug: string) {
    const next = groups.filter(g => g !== slug)
    setGroups(next)
    save(next)
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {groups.length === 0 && (
        <span style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: '0.75rem', color: '#C8C8C8', fontStyle: 'italic' }}>
          Seul le créateur pour l&apos;instant
        </span>
      )}
      {groups.map(g => (
        <span key={g} className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#E8E9F8] border border-[#C5C7F0] text-[10px] text-[#00068D]"
          style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800 }}>
          {g}
          <button onClick={() => removeGroup(g)} className="text-[#8A8A8A] hover:text-red-500 ml-0.5">×</button>
        </span>
      ))}
      <div className="flex items-center gap-1">
        <input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') addGroup() }}
          placeholder="+ groupe"
          className="text-[11px] w-24 px-1.5 py-0.5 rounded border border-[#D8D8D8] focus:outline-none focus:ring-1 focus:ring-[#2B2EB8]"
          style={{ fontFamily: 'Gilroy, sans-serif' }} />
        {input && (
          <button onClick={addGroup} disabled={saving}
            className="text-[9px] px-2 py-0.5 rounded bg-[#00068D] text-white disabled:opacity-50"
            style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800 }}>
            {saving ? '…' : 'OK'}
          </button>
        )}
      </div>
    </div>
  )
}
