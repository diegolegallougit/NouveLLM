'use client'

import { useEffect, useState } from 'react'

interface MetaPrompt {
  id: string
  title: string
  description: string | null
  content: string
  level: 'INSTITUTIONAL' | 'SHARED' | 'PERSONAL'
  isPublic: boolean
  uses: number
  author?: { name: string | null } | null
}

interface MetaPromptsData {
  institutional: MetaPrompt[]
  shared: MetaPrompt[]
  personal: MetaPrompt[]
  active: MetaPrompt | null
}

export default function MetaPromptsPanel() {
  const [data, setData] = useState<MetaPromptsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ title: '', description: '', content: '', isPublic: false })

  async function load() {
    const r = await fetch('/api/meta-prompts')
    const d = await r.json()
    setData(d)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function activate(id: string) {
    setWorking(id)
    try {
      await fetch(`/api/meta-prompts/${id}/activate`, { method: 'POST' })
      await load()
    } finally { setWorking(null) }
  }

  async function deactivate(id: string) {
    setWorking(id)
    try {
      await fetch(`/api/meta-prompts/${id}/activate`, { method: 'DELETE' })
      await load()
    } finally { setWorking(null) }
  }

  async function duplicate(id: string) {
    setWorking(id)
    try {
      await fetch(`/api/meta-prompts/${id}/duplicate`, { method: 'POST' })
      await load()
    } finally { setWorking(null) }
  }

  async function deleteMP(id: string) {
    if (!confirm('Supprimer ce méta-prompt ?')) return
    setWorking(id)
    try {
      await fetch(`/api/meta-prompts/${id}`, { method: 'DELETE' })
      await load()
    } finally { setWorking(null) }
  }

  async function saveCreate() {
    if (!form.title.trim() || !form.content.trim()) return
    setWorking('create')
    try {
      await fetch('/api/meta-prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      setCreating(false)
      setForm({ title: '', description: '', content: '', isPublic: false })
      await load()
    } finally { setWorking(null) }
  }

  async function saveEdit(id: string) {
    setWorking('edit')
    try {
      await fetch(`/api/meta-prompts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      setEditingId(null)
      await load()
    } finally { setWorking(null) }
  }

  if (loading) return <div className="flex justify-center py-8"><span className="nl-spinner" /></div>
  if (!data) return null

  const activeId = data.active?.id ?? null

  function MPRow({ mp, canEdit = false, canDuplicate = true }: { mp: MetaPrompt; canEdit?: boolean; canDuplicate?: boolean }) {
    const isActive = activeId === mp.id
    const isWorking = working === mp.id

    if (editingId === mp.id) {
      return (
        <div className="border border-[#2B2EB8] rounded-xl p-3 space-y-2 bg-[#F8F8FF]">
          <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            placeholder="Titre" className="w-full px-3 py-1.5 text-sm rounded-lg border border-[#D8D8D8] focus:outline-none focus:ring-1 focus:ring-[#2B2EB8]"
            style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800 }} />
          <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder="Description (optionnelle)" className="w-full px-3 py-1.5 text-sm rounded-lg border border-[#D8D8D8] focus:outline-none"
            style={{ fontFamily: 'Source Serif Pro, Georgia, serif' }} />
          <textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
            placeholder="Contenu du méta-prompt…" rows={4}
            className="w-full px-3 py-1.5 text-sm rounded-lg border border-[#D8D8D8] focus:outline-none resize-none"
            style={{ fontFamily: 'Source Serif Pro, Georgia, serif' }} />
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 text-xs text-[#5A5A5A]" style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 300 }}>
              <input type="checkbox" checked={form.isPublic} onChange={e => setForm(f => ({ ...f, isPublic: e.target.checked }))} />
              Partager avec la communauté
            </label>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setEditingId(null)}
              className="px-3 py-1.5 rounded-lg border border-[#D8D8D8] text-xs text-[#5A5A5A] hover:bg-[#F2F2F2]"
              style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 300 }}>Annuler</button>
            <button onClick={() => saveEdit(mp.id)} disabled={working === 'edit'}
              className="px-4 py-1.5 rounded-lg text-xs text-white disabled:opacity-50"
              style={{ background: '#00068D', fontFamily: 'Gilroy, sans-serif', fontWeight: 800 }}>
              {working === 'edit' ? '…' : 'ENREGISTRER'}
            </button>
          </div>
        </div>
      )
    }

    return (
      <div className={`flex items-start gap-3 px-3 py-2.5 rounded-xl border transition-all ${isActive ? 'bg-[#E8E9F8] border-[#2B2EB8]' : 'bg-white border-[#D8D8D8] hover:bg-[#FAFAFA]'}`}>
        <span className="text-base flex-shrink-0 mt-0.5">
          {mp.level === 'INSTITUTIONAL' ? '📌' : mp.level === 'SHARED' ? '👤' : '✏️'}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '0.85rem', color: isActive ? '#00068D' : '#0D0D0D' }}>
              {mp.title}
            </span>
            {isActive && (
              <span className="text-[9px] px-2 py-0.5 rounded-full bg-[#00068D] text-white"
                style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800 }}>ACTIF</span>
            )}
            {mp.uses > 0 && (
              <span style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 300, fontSize: '0.7rem', color: '#8A8A8A' }}>
                {mp.uses} utilisation{mp.uses > 1 ? 's' : ''}
              </span>
            )}
          </div>
          {mp.description && (
            <p style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: '0.75rem', color: '#8A8A8A', marginTop: '1px' }}>
              {mp.description}
            </p>
          )}
          {!mp.description && (
            <p className="truncate" style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: '0.72rem', color: '#C8C8C8', marginTop: '1px', fontStyle: 'italic' }}>
              {mp.content.slice(0, 80)}…
            </p>
          )}
          {mp.author?.name && mp.level === 'SHARED' && (
            <p style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 300, fontSize: '0.68rem', color: '#8A8A8A', marginTop: '2px' }}>
              Par {mp.author.name}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {isActive ? (
            <button onClick={() => deactivate(mp.id)} disabled={isWorking}
              className="text-[10px] px-2.5 py-1 rounded-lg border border-[#D8D8D8] text-[#5A5A5A] hover:bg-[#F2F2F2] disabled:opacity-50"
              style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800 }}>
              {isWorking ? '…' : 'DÉSACTIVER'}
            </button>
          ) : (
            <button onClick={() => activate(mp.id)} disabled={isWorking}
              className="text-[10px] px-2.5 py-1 rounded-lg border border-[#00068D] text-[#00068D] hover:bg-[#E8E9F8] disabled:opacity-50"
              style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800 }}>
              {isWorking ? '…' : 'ACTIVER'}
            </button>
          )}
          {canDuplicate && (
            <button onClick={() => duplicate(mp.id)} disabled={isWorking}
              className="text-[10px] px-2.5 py-1 rounded-lg border border-[#D8D8D8] text-[#5A5A5A] hover:bg-[#F2F2F2] disabled:opacity-50"
              style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 300 }}>
              Dupliquer
            </button>
          )}
          {canEdit && (
            <>
              <button onClick={() => { setEditingId(mp.id); setForm({ title: mp.title, description: mp.description ?? '', content: mp.content, isPublic: mp.isPublic }) }}
                className="text-[10px] px-2.5 py-1 rounded-lg border border-[#D8D8D8] text-[#5A5A5A] hover:bg-[#F2F2F2]"
                style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 300 }}>
                Modifier
              </button>
              <button onClick={() => deleteMP(mp.id)} disabled={isWorking}
                className="text-[10px] px-2.5 py-1 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 disabled:opacity-50"
                style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800 }}>
                ✕
              </button>
            </>
          )}
        </div>
      </div>
    )
  }

  function SectionHeader({ label }: { label: string }) {
    return (
      <p className="px-1 text-[9px] uppercase tracking-widest text-[#8A8A8A] mt-3 mb-1"
        style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800 }}>
        {label}
      </p>
    )
  }

  return (
    <div className="space-y-1">
      {/* Active banner */}
      {data.active && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#E8E9F8] border border-[#C5C7F0] mb-2">
          <div className="w-2 h-2 rounded-full bg-[#00068D] flex-shrink-0" />
          <span style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '0.78rem', color: '#00068D' }}>
            Actif : {data.active.title}
          </span>
          <button onClick={() => deactivate(data.active!.id)} disabled={!!working}
            className="ml-auto text-[10px] text-[#00068D] hover:underline disabled:opacity-50"
            style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800 }}>
            Désactiver
          </button>
        </div>
      )}

      {/* Institutional */}
      {data.institutional.length > 0 && (
        <>
          <SectionHeader label="─── Bibliothèque institutionnelle ───" />
          {data.institutional.map(mp => <MPRow key={mp.id} mp={mp} canEdit={false} canDuplicate />)}
        </>
      )}

      {/* Shared */}
      {data.shared.length > 0 && (
        <>
          <SectionHeader label="─── Partagés par la communauté ───" />
          {data.shared.map(mp => <MPRow key={mp.id} mp={mp} canEdit={false} canDuplicate />)}
        </>
      )}

      {/* Personal */}
      <SectionHeader label="─── Mes méta-prompts ───" />
      {data.personal.length === 0 && !creating && (
        <p style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: '0.78rem', color: '#C8C8C8', fontStyle: 'italic' }}
          className="px-1">
          Aucun méta-prompt personnel — créez-en un ci-dessous.
        </p>
      )}
      {data.personal.map(mp => <MPRow key={mp.id} mp={mp} canEdit canDuplicate={false} />)}

      {/* Create form */}
      {creating ? (
        <div className="border border-[#2B2EB8] rounded-xl p-3 space-y-2 bg-[#F8F8FF] mt-2">
          <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            placeholder="Titre du méta-prompt *"
            className="w-full px-3 py-1.5 text-sm rounded-lg border border-[#D8D8D8] focus:outline-none focus:ring-1 focus:ring-[#2B2EB8]"
            style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800 }} autoFocus />
          <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder="Description courte (optionnelle)"
            className="w-full px-3 py-1.5 text-sm rounded-lg border border-[#D8D8D8] focus:outline-none"
            style={{ fontFamily: 'Source Serif Pro, Georgia, serif' }} />
          <textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
            placeholder="Contenu du méta-prompt — instructions, contexte, rôle…" rows={5}
            className="w-full px-3 py-1.5 text-sm rounded-lg border border-[#D8D8D8] focus:outline-none resize-none"
            style={{ fontFamily: 'Source Serif Pro, Georgia, serif' }} />
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-1.5 text-xs text-[#5A5A5A] cursor-pointer"
              style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 300 }}>
              <input type="checkbox" checked={form.isPublic} onChange={e => setForm(f => ({ ...f, isPublic: e.target.checked }))} />
              Partager avec la communauté
            </label>
            <div className="flex gap-2">
              <button onClick={() => setCreating(false)}
                className="px-3 py-1.5 rounded-lg border border-[#D8D8D8] text-xs text-[#5A5A5A] hover:bg-[#F2F2F2]"
                style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 300 }}>Annuler</button>
              <button onClick={saveCreate} disabled={working === 'create'}
                className="px-4 py-1.5 rounded-lg text-xs text-white disabled:opacity-50"
                style={{ background: '#00068D', fontFamily: 'Gilroy, sans-serif', fontWeight: 800 }}>
                {working === 'create' ? '…' : 'CRÉER'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button onClick={() => { setCreating(true); setEditingId(null); setForm({ title: '', description: '', content: '', isPublic: false }) }}
          className="w-full mt-2 py-2 rounded-xl border-2 border-dashed border-[#D8D8D8] text-xs text-[#8A8A8A] hover:border-[#2B2EB8] hover:text-[#00068D] transition-all"
          style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800 }}>
          + Créer un méta-prompt
        </button>
      )}
    </div>
  )
}
