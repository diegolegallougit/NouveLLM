'use client'

import { useEffect, useState } from 'react'

interface Group { id: string; slug: string; label: string }
interface Source {
  id: string
  slug: string
  label: string
  icon: string
  difyDatasetId: string
  docCount: number | null
  access: string
  groups: { group: Group }[]
}

export default function AdminSourcesPage() {
  const [sources, setSources] = useState<Source[]>([])
  const [allGroups, setAllGroups] = useState<Group[]>([])
  const [editing, setEditing] = useState<string | null>(null)
  const [form, setForm] = useState<Partial<Source & { groupIds: string[] }>>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/sources').then(r => r.json()).then(d => {
      setSources(d.sources || [])
      const groups = new Map<string, Group>()
      for (const s of (d.sources || [])) {
        for (const gs of s.groups) groups.set(gs.group.id, gs.group)
      }
      setAllGroups(Array.from(groups.values()))
    })
  }, [])

  function startEdit(s: Source) {
    setEditing(s.slug)
    setForm({
      difyDatasetId: s.difyDatasetId,
      label: s.label,
      docCount: s.docCount ?? undefined,
      access: s.access,
      groupIds: s.groups.map(g => g.group.id),
    })
    setSaved(null)
  }

  async function handleSave(slug: string) {
    setSaving(true)
    try {
      const r = await fetch(`/api/admin/sources/${slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (r.ok) {
        setSaved(slug)
        setEditing(null)
        const updated = await fetch('/api/admin/sources').then(r => r.json())
        setSources(updated.sources || [])
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5 max-w-5xl">
      <div>
        <h1 style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '1.3rem', color: '#0D0D0D' }}>
          Gestion des sources
        </h1>
        <p style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: '0.82rem', color: '#8A8A8A' }}>
          Modifier le Dify Dataset ID sans redéploiement · {sources.length} sources
        </p>
      </div>

      <div className="bg-white rounded-xl border border-[#D8D8D8] overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#D8D8D8] bg-[#FAFAFA]">
              {['Source', 'Dataset ID', 'Docs', 'Accès', 'Groupes', 'Actions'].map(h => (
                <th key={h} className="px-4 py-3 text-left" style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '0.62rem', letterSpacing: '0.04em', textTransform: 'uppercase', color: '#8A8A8A' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sources.map(source => (
              <>
                <tr key={source.slug} className="border-b border-[#F2F2F2] hover:bg-[#FAFAFA]">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span>{source.icon}</span>
                      <div>
                        <p style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '0.82rem', color: '#0D0D0D' }}>{source.label}</p>
                        <span className="nl-token-source text-[10px]">#{source.slug}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <code style={{ fontFamily: 'monospace', fontSize: '0.72rem', color: '#5A5A5A', background: '#F2F2F2', padding: '2px 6px', borderRadius: 4 }}>
                      {source.difyDatasetId.slice(0, 8)}…
                    </code>
                  </td>
                  <td className="px-4 py-3" style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: '0.82rem', color: '#5A5A5A' }}>
                    {source.docCount ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border ${source.access === 'PUBLIC' ? 'bg-[#E8F5E9] text-[#2E7D32] border-[#A5D6A7]' : 'bg-[#FFF8E1] text-[#F57F17] border-[#FFD54F]'}`} style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800 }}>
                      {source.access}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {source.groups.map(g => (
                        <span key={g.group.id} className="text-[10px] px-1.5 py-0.5 rounded bg-[#e8f5e9] text-[#2e7d32] border border-[#a5d6a7]" style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 300 }}>
                          {g.group.label}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => editing === source.slug ? setEditing(null) : startEdit(source)}
                        className="px-2.5 py-1.5 rounded-lg border border-[#D8D8D8] text-[10px] hover:bg-[#F0F1FB] hover:border-[#2B2EB8] transition-all"
                        style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, letterSpacing: '0.04em', color: '#0D0D0D' }}
                      >
                        {editing === source.slug ? 'ANNULER' : 'MODIFIER'}
                      </button>
                      {saved === source.slug && <span className="text-[10px] text-[#2E7D32]" style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800 }}>✓</span>}
                    </div>
                  </td>
                </tr>
                {editing === source.slug && (
                  <tr key={`${source.slug}-edit`} className="bg-[#F8F8FF] border-b border-[#D8D8D8]">
                    <td colSpan={6} className="px-4 py-4">
                      <div className="grid grid-cols-4 gap-4 mb-4">
                        <div className="col-span-2">
                          <label style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '0.65rem', letterSpacing: '0.04em', textTransform: 'uppercase', color: '#8A8A8A' }} className="block mb-1">
                            Dify Dataset ID
                          </label>
                          <input
                            value={form.difyDatasetId ?? ''}
                            onChange={e => setForm(f => ({ ...f, difyDatasetId: e.target.value }))}
                            className="w-full px-3 py-2 rounded-lg border border-[#D8D8D8] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#2B2EB8] font-mono"
                          />
                        </div>
                        <div>
                          <label style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '0.65rem', letterSpacing: '0.04em', textTransform: 'uppercase', color: '#8A8A8A' }} className="block mb-1">
                            Accès
                          </label>
                          <select
                            value={form.access ?? 'PUBLIC'}
                            onChange={e => setForm(f => ({ ...f, access: e.target.value }))}
                            className="w-full px-3 py-2 rounded-lg border border-[#D8D8D8] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#2B2EB8]"
                            style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800 }}
                          >
                            <option value="PUBLIC">PUBLIC</option>
                            <option value="RESTRICTED">RESTRICTED</option>
                          </select>
                        </div>
                        <div>
                          <label style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '0.65rem', letterSpacing: '0.04em', textTransform: 'uppercase', color: '#8A8A8A' }} className="block mb-1">
                            Nb documents
                          </label>
                          <input
                            type="number"
                            value={form.docCount ?? ''}
                            onChange={e => setForm(f => ({ ...f, docCount: Number(e.target.value) || undefined }))}
                            className="w-full px-3 py-2 rounded-lg border border-[#D8D8D8] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#2B2EB8]"
                          />
                        </div>
                      </div>
                      <div className="mb-4">
                        <label style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '0.65rem', letterSpacing: '0.04em', textTransform: 'uppercase', color: '#8A8A8A' }} className="block mb-2">
                          Groupes actifs
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {allGroups.map(g => {
                            const enabled = form.groupIds?.includes(g.id) ?? false
                            return (
                              <button
                                key={g.id}
                                onClick={() => setForm(f => ({
                                  ...f,
                                  groupIds: enabled
                                    ? (f.groupIds ?? []).filter(id => id !== g.id)
                                    : [...(f.groupIds ?? []), g.id]
                                }))}
                                className={`px-2.5 py-1 rounded-lg border text-[10px] transition-all ${enabled ? 'bg-[#e8f5e9] border-[#a5d6a7] text-[#2e7d32]' : 'bg-white border-[#D8D8D8] text-[#8A8A8A]'}`}
                                style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800 }}
                              >
                                {enabled ? '✓ ' : ''}{g.label}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                      <button
                        onClick={() => handleSave(source.slug)}
                        disabled={saving}
                        className="px-4 py-2 rounded-lg bg-[#00068D] text-white text-[11px] disabled:opacity-50 hover:bg-[#2B2EB8] transition-all"
                        style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, letterSpacing: '0.04em' }}
                      >
                        {saving ? 'SAUVEGARDE…' : 'SAUVEGARDER'}
                      </button>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
