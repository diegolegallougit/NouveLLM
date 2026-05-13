'use client'

import React, { useEffect, useState } from 'react'

interface DiplomeRef {
  id: string
  slug: string
  label: string
  niveau: string
  ufr: string
  actif: boolean
}

const NIVEAUX = ['L1', 'L2', 'L3', 'M1', 'M2', 'DOC']
const UFRS = [
  { value: 'langues', label: 'Langues' },
  { value: 'dfle', label: 'DFLE' },
  { value: 'cav', label: 'Cinéma-Audiovisuel' },
  { value: 'lld', label: 'Lettres & Langages' },
  { value: 'autre', label: 'Autre' },
]

const EMPTY_FORM = { slug: '', label: '', niveau: 'M1', ufr: 'langues' }

export default function AdminDiplomesPage() {
  const [diplomes, setDiplomes] = useState<DiplomeRef[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<{ ufr: string; niveau: string }>({ ufr: '', niveau: '' })

  const [form, setForm] = useState(EMPTY_FORM)
  const [editId, setEditId] = useState<string | null>(null)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    const d = await fetch('/api/admin/diplomes').then(r => r.json())
    setDiplomes(d.diplomes ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function startEdit(d: DiplomeRef) {
    setEditId(d.id)
    setForm({ slug: d.slug, label: d.label, niveau: d.niveau, ufr: d.ufr })
    setFormError('')
  }

  function cancelEdit() {
    setEditId(null)
    setForm(EMPTY_FORM)
    setFormError('')
  }

  async function handleSave() {
    setFormError('')
    if (!form.label.trim() || !form.niveau || !form.ufr) {
      setFormError('Tous les champs sont requis.')
      return
    }
    setSaving(true)
    try {
      if (editId) {
        await fetch(`/api/admin/diplomes/${editId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ label: form.label, niveau: form.niveau, ufr: form.ufr }),
        })
      } else {
        if (!form.slug.trim()) { setFormError('Slug requis.'); return }
        if (!/^[a-z0-9-]+$/.test(form.slug)) { setFormError('Slug : minuscules, chiffres, - uniquement.'); return }
        const r = await fetch('/api/admin/diplomes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        })
        const data = await r.json()
        if (!r.ok) { setFormError(data.error ?? 'Erreur'); return }
      }
      cancelEdit()
      await load()
    } finally { setSaving(false) }
  }

  async function handleToggle(d: DiplomeRef) {
    await fetch(`/api/admin/diplomes/${d.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actif: !d.actif }),
    })
    await load()
  }

  async function handleDelete(d: DiplomeRef) {
    if (!confirm(`Supprimer "${d.label}" ?`)) return
    await fetch(`/api/admin/diplomes/${d.id}`, { method: 'DELETE' })
    await load()
  }

  const filtered = diplomes.filter(d =>
    (!filter.ufr || d.ufr === filter.ufr) &&
    (!filter.niveau || d.niveau === filter.niveau)
  )

  const byUfr: Record<string, DiplomeRef[]> = {}
  for (const d of filtered) {
    if (!byUfr[d.ufr]) byUfr[d.ufr] = []
    byUfr[d.ufr].push(d)
  }

  const NIVEAU_COLOR: Record<string, string> = {
    L1: 'bg-green-50 text-green-700 border-green-200',
    L2: 'bg-green-50 text-green-700 border-green-200',
    L3: 'bg-green-50 text-green-700 border-green-200',
    M1: 'bg-blue-50 text-blue-700 border-blue-200',
    M2: 'bg-blue-50 text-blue-700 border-blue-200',
    DOC: 'bg-purple-50 text-purple-700 border-purple-200',
  }

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '1.3rem', color: '#0D0D0D' }}>
            Nomenclature des diplômes
          </h1>
          <p style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: '0.82rem', color: '#8A8A8A' }}>
            {diplomes.length} diplômes · référentiel utilisé lors de la création de groupes
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <select
          value={filter.ufr}
          onChange={e => setFilter(f => ({ ...f, ufr: e.target.value }))}
          className="px-3 py-1.5 rounded-lg border border-[#D8D8D8] text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#2B2EB8]"
          style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800 }}
        >
          <option value="">Toutes les UFR</option>
          {UFRS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
        </select>
        <select
          value={filter.niveau}
          onChange={e => setFilter(f => ({ ...f, niveau: e.target.value }))}
          className="px-3 py-1.5 rounded-lg border border-[#D8D8D8] text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#2B2EB8]"
          style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800 }}
        >
          <option value="">Tous les niveaux</option>
          {NIVEAUX.map(n => <option key={n} value={n}>{n}</option>)}
        </select>
      </div>

      {/* Add form */}
      <div className="bg-white rounded-xl border border-[#D8D8D8] p-4">
        <p style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '0.75rem', letterSpacing: '0.06em', color: '#8A8A8A', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
          {editId ? 'Modifier' : 'Ajouter un diplôme'}
        </p>
        <div className="flex items-end gap-3 flex-wrap">
          {!editId && (
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-[#8A8A8A] mb-1" style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800 }}>Slug</label>
              <input
                type="text" placeholder="m2-traductologie"
                value={form.slug}
                onChange={e => setForm(f => ({ ...f, slug: e.target.value }))}
                className="px-3 py-1.5 rounded-lg border border-[#D8D8D8] text-sm w-44 focus:outline-none focus:ring-2 focus:ring-[#2B2EB8]"
                style={{ fontFamily: 'Source Serif Pro, Georgia, serif' }}
              />
            </div>
          )}
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-[#8A8A8A] mb-1" style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800 }}>Label</label>
            <input
              type="text" placeholder="Master 2 Traductologie"
              value={form.label}
              onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
              className="px-3 py-1.5 rounded-lg border border-[#D8D8D8] text-sm w-64 focus:outline-none focus:ring-2 focus:ring-[#2B2EB8]"
              style={{ fontFamily: 'Source Serif Pro, Georgia, serif' }}
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-[#8A8A8A] mb-1" style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800 }}>Niveau</label>
            <select
              value={form.niveau}
              onChange={e => setForm(f => ({ ...f, niveau: e.target.value }))}
              className="px-3 py-1.5 rounded-lg border border-[#D8D8D8] text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#2B2EB8]"
              style={{ fontFamily: 'Source Serif Pro, Georgia, serif' }}
            >
              {NIVEAUX.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-[#8A8A8A] mb-1" style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800 }}>UFR</label>
            <select
              value={form.ufr}
              onChange={e => setForm(f => ({ ...f, ufr: e.target.value }))}
              className="px-3 py-1.5 rounded-lg border border-[#D8D8D8] text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#2B2EB8]"
              style={{ fontFamily: 'Source Serif Pro, Georgia, serif' }}
            >
              {UFRS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSave} disabled={saving}
              className="px-4 py-1.5 rounded-lg text-white text-xs disabled:opacity-60"
              style={{ background: '#00068D', fontFamily: 'Gilroy, sans-serif', fontWeight: 800, letterSpacing: '0.04em' }}
            >
              {saving ? '…' : editId ? 'ENREGISTRER' : 'AJOUTER'}
            </button>
            {editId && (
              <button onClick={cancelEdit} className="px-3 py-1.5 rounded-lg border border-[#D8D8D8] text-xs text-[#5A5A5A]" style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800 }}>
                ANNULER
              </button>
            )}
          </div>
        </div>
        {formError && <p className="mt-2 text-xs text-red-600" style={{ fontFamily: 'Source Serif Pro, Georgia, serif' }}>{formError}</p>}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-12"><span className="nl-spinner" /></div>
      ) : (
        <div className="space-y-4">
          {Object.entries(byUfr).sort().map(([ufr, items]) => (
            <div key={ufr} className="bg-white rounded-xl border border-[#D8D8D8] overflow-hidden">
              <div className="px-4 py-2.5 bg-[#FAFAFA] border-b border-[#D8D8D8]">
                <span style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '0.7rem', letterSpacing: '0.06em', textTransform: 'uppercase', color: '#5A5A5A' }}>
                  UFR — {UFRS.find(u => u.value === ufr)?.label ?? ufr}
                </span>
              </div>
              <table className="w-full">
                <tbody>
                  {items.map(d => (
                    <tr key={d.id} className={`border-b border-[#F2F2F2] hover:bg-[#FAFAFA] ${!d.actif ? 'opacity-50' : ''}`}>
                      <td className="px-4 py-2.5 w-32">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border ${NIVEAU_COLOR[d.niveau] ?? 'bg-[#F2F2F2] text-[#5A5A5A] border-[#D8D8D8]'}`} style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800 }}>
                          {d.niveau}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 flex-1">
                        <p style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '0.85rem', color: '#0D0D0D' }}>{d.label}</p>
                        <p style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 300, fontSize: '0.7rem', color: '#8A8A8A' }}>{d.slug}</p>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleToggle(d)}
                            className={`px-2 py-1 rounded border text-[10px] transition-all ${d.actif ? 'border-[#D8D8D8] text-[#5A5A5A] hover:bg-[#F2F2F2]' : 'border-green-200 text-green-700 hover:bg-green-50'}`}
                            style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800 }}
                          >
                            {d.actif ? 'DÉSACTIVER' : 'ACTIVER'}
                          </button>
                          <button
                            onClick={() => startEdit(d)}
                            className="px-2 py-1 rounded border border-[#2B2EB8] text-[#00068D] text-[10px] hover:bg-[#E8E9F8] transition-all"
                            style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800 }}
                          >
                            ✏
                          </button>
                          <button
                            onClick={() => handleDelete(d)}
                            className="px-2 py-1 rounded border border-red-200 text-red-600 text-[10px] hover:bg-red-50 transition-all"
                            style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800 }}
                          >
                            ✕
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
