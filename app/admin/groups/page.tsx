'use client'

import { useEffect, useState } from 'react'

interface DiplomeRef {
  id: string
  slug: string
  label: string
  niveau: string
  ufr: string
  actif?: boolean
}

interface Group {
  id: string
  slug: string
  label: string
  type: string
  quotaTokens: number
  allowPersonalSources: boolean
  description: string | null
  memberCount: number
  responsables: { id: string; name: string | null; email: string }[]
  diplomeRef: DiplomeRef | null
  hasKB: boolean
  difyDatasetId: string | null
}

interface Member {
  id: string
  name: string | null
  email: string
  role: string
}

const TYPE_LABELS: Record<string, string> = {
  SYSTEME: 'Système',
  UFR: 'UFR',
  DIPLOME: 'Diplôme',
  PROJET: 'Projet',
}
const TYPE_COLORS: Record<string, string> = {
  SYSTEME: 'bg-[#F2F2F2] text-[#5A5A5A] border-[#D8D8D8]',
  UFR: 'bg-[#E8E9F8] text-[#00068D] border-[#2B2EB8]',
  DIPLOME: 'bg-[#E8F5E9] text-[#2E7D32] border-[#A5D6A7]',
  PROJET: 'bg-[#FFF8E1] text-[#F57F17] border-[#FFD54F]',
}

function fmtTokens(n: number) {
  return n >= 1000000 ? `${(n / 1000000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(0)}k` : String(n)
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#D8D8D8] flex-shrink-0">
          <h3 style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '1rem', color: '#0D0D0D' }}>{title}</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-[#8A8A8A] hover:bg-[#F2F2F2]">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="px-6 py-5 overflow-y-auto nl-scroll flex-1">{children}</div>
      </div>
    </div>
  )
}

const EMPTY_FORM = { slug: '', label: '', type: 'SYSTEME', quotaTokens: 500000, allowPersonalSources: false, description: '', diplomeRefId: '', hasKB: false }

export default function AdminGroupsPage() {
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [diplomes, setDiplomes] = useState<DiplomeRef[]>([])

  // Create modal
  const [createOpen, setCreateOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [createError, setCreateError] = useState('')
  const [creating, setCreating] = useState(false)

  // Members modal
  const [membersGroup, setMembersGroup] = useState<Group | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [membersLoading, setMembersLoading] = useState(false)
  const [removingMember, setRemovingMember] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    try {
      const d = await fetch('/api/admin/groups').then(r => r.json())
      setGroups(d.groups || [])
    } finally { setLoading(false) }
  }

  useEffect(() => {
    fetch('/api/admin/diplomes').then(r => r.json()).then(d => setDiplomes(d.diplomes ?? []))
  }, [])

  // eslint-disable-next-line react-hooks/exhaustive-deps, react-hooks/set-state-in-effect
  useEffect(() => { load() }, [])

  async function handleCreate() {
    setCreateError('')
    if (!form.slug || !form.label) { setCreateError('Slug et label sont requis.'); return }
    if (!/^[a-z0-9_-]+$/.test(form.slug)) { setCreateError('Slug : lettres minuscules, chiffres, _ et - uniquement.'); return }
    setCreating(true)
    try {
      const r = await fetch('/api/admin/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          quotaTokens: Number(form.quotaTokens),
          diplomeRefId: form.diplomeRefId || null,
        }),
      })
      const data = await r.json()
      if (!r.ok) { setCreateError(data.error ?? 'Erreur'); return }
      setCreateOpen(false)
      setForm(EMPTY_FORM)
      await load()
    } finally { setCreating(false) }
  }

  async function openMembers(g: Group) {
    setMembersGroup(g)
    setMembersLoading(true)
    try {
      const d = await fetch(`/api/admin/groups/${g.id}`).then(r => r.json())
      setMembers(d.members || [])
    } finally { setMembersLoading(false) }
  }

  async function removeMember(userId: string) {
    if (!membersGroup) return
    setRemovingMember(userId)
    try {
      await fetch(`/api/admin/groups/${membersGroup.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'remove_member', userId }),
      })
      setMembers(prev => prev.filter(m => m.id !== userId))
      setGroups(prev => prev.map(g => g.id === membersGroup.id ? { ...g, memberCount: g.memberCount - 1 } : g))
    } finally { setRemovingMember(null) }
  }

  const ROLE_LABELS: Record<string, string> = {
    STUDENT: 'Étudiant', BIATSS: 'BIATSS', EC: 'Enseignant', RESPONSABLE: 'Responsable', ADMIN: 'Admin',
  }
  const ROLE_COLORS: Record<string, string> = {
    STUDENT: 'bg-[#E8F5E9] text-[#2E7D32] border-[#A5D6A7]',
    BIATSS: 'bg-amber-50 text-amber-700 border-amber-300',
    EC: 'bg-[#E8E9F8] text-[#00068D] border-[#2B2EB8]',
    RESPONSABLE: 'bg-purple-50 text-purple-700 border-purple-300',
    ADMIN: 'bg-red-50 text-red-700 border-red-300',
  }

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '1.3rem', color: '#0D0D0D' }}>
            Gestion des groupes
          </h1>
          <p style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: '0.82rem', color: '#8A8A8A' }}>
            {groups.length} groupe{groups.length !== 1 ? 's' : ''} · contrôle d&apos;accès agents et sources
          </p>
        </div>
        <button
          onClick={() => { setCreateOpen(true); setCreateError(''); setForm(EMPTY_FORM) }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-xs"
          style={{ background: '#00068D', fontFamily: 'Gilroy, sans-serif', fontWeight: 800, letterSpacing: '0.04em' }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          CRÉER UN GROUPE
        </button>
      </div>

      <div className="bg-white rounded-xl border border-[#D8D8D8] overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#D8D8D8] bg-[#FAFAFA]">
              {['Groupe', 'Type', 'Membres', 'Responsable(s)', 'Quota tokens', 'Actions'].map(h => (
                <th key={h} className="px-4 py-3 text-left" style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '0.62rem', letterSpacing: '0.04em', textTransform: 'uppercase', color: '#8A8A8A' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-[#8A8A8A]" style={{ fontFamily: 'Source Serif Pro, Georgia, serif' }}>Chargement…</td></tr>
            )}
            {!loading && groups.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-[#8A8A8A]" style={{ fontFamily: 'Source Serif Pro, Georgia, serif' }}>Aucun groupe</td></tr>
            )}
            {groups.map(g => (
              <tr key={g.id} className="border-b border-[#F2F2F2] hover:bg-[#FAFAFA]">
                <td className="px-4 py-3">
                  <p style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '0.85rem', color: '#0D0D0D' }}>{g.label}</p>
                  <p style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 300, fontSize: '0.7rem', color: '#8A8A8A' }}>{g.slug}</p>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border ${TYPE_COLORS[g.type] ?? 'bg-[#F2F2F2] text-[#5A5A5A] border-[#D8D8D8]'}`} style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800 }}>
                    {TYPE_LABELS[g.type] ?? g.type}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '0.9rem', color: '#0D0D0D' }}>{g.memberCount}</span>
                </td>
                <td className="px-4 py-3">
                  {g.responsables.length === 0 ? (
                    <span style={{ fontSize: '0.7rem', color: '#C8C8C8', fontFamily: 'Source Serif Pro, Georgia, serif' }}>—</span>
                  ) : (
                    <div className="flex flex-col gap-0.5">
                      {g.responsables.map(r => (
                        <span key={r.id} style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: '0.75rem', color: '#5A5A5A' }}>
                          {r.name ?? r.email.split('@')[0]}
                        </span>
                      ))}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3" style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: '0.82rem', color: '#5A5A5A' }}>
                  {fmtTokens(g.quotaTokens)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      onClick={() => openMembers(g)}
                      className="px-2.5 py-1.5 rounded-lg border border-[#D8D8D8] text-[10px] text-[#5A5A5A] hover:bg-[#E8E9F8] hover:border-[#2B2EB8] hover:text-[#00068D] transition-all"
                      style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, letterSpacing: '0.04em' }}
                    >
                      MEMBRES
                    </button>
                    {g.type === 'DIPLOME' && (
                      <>
                        <button
                          onClick={async () => {
                            if (!confirm(`Archiver tous les documents de "${g.label}" (rendre non-visibles) ?`)) return
                            await fetch(`/api/admin/groups/${g.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'archive_year' }) })
                          }}
                          className="px-2 py-1 rounded border border-orange-200 text-orange-600 text-[10px] hover:bg-orange-50 transition-all"
                          style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800 }}
                          title="Archiver l'année — masque tous les docs"
                        >
                          ARCHIVER
                        </button>
                        <button
                          onClick={async () => {
                            if (!confirm(`Réactiver tous les documents de "${g.label}" pour la nouvelle année ?`)) return
                            await fetch(`/api/admin/groups/${g.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'new_year' }) })
                          }}
                          className="px-2 py-1 rounded border border-green-200 text-green-700 text-[10px] hover:bg-green-50 transition-all"
                          style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800 }}
                          title="Nouvelle année — réactive tous les docs"
                        >
                          ↺ ANNÉE
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create modal */}
      {createOpen && (
        <Modal title="Créer un groupe" onClose={() => setCreateOpen(false)}>
          <div className="space-y-3">
            {[
              { label: 'Slug', key: 'slug', type: 'text', placeholder: 'm2-trad-2026', hint: 'Minuscules, chiffres, _ et -' },
              { label: 'Label', key: 'label', type: 'text', placeholder: 'M2 Traductologie 2026', hint: '' },
            ].map(({ label, key, type, placeholder, hint }) => (
              <div key={key}>
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#8A8A8A] mb-1" style={{ fontFamily: 'Gilroy, sans-serif' }}>
                  {label}
                </label>
                <input
                  type={type}
                  placeholder={placeholder}
                  value={form[key as 'slug' | 'label']}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-[#D8D8D8] text-sm focus:outline-none focus:ring-2 focus:ring-[#2B2EB8]"
                  style={{ fontFamily: 'Source Serif Pro, Georgia, serif' }}
                />
                {hint && <p className="mt-0.5 text-[10px] text-[#8A8A8A]" style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 300 }}>{hint}</p>}
              </div>
            ))}
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#8A8A8A] mb-1" style={{ fontFamily: 'Gilroy, sans-serif' }}>Type</label>
              <select
                value={form.type}
                onChange={e => setForm(f => ({ ...f, type: e.target.value, diplomeRefId: '', hasKB: false }))}
                className="w-full px-3 py-2 rounded-lg border border-[#D8D8D8] text-sm focus:outline-none focus:ring-2 focus:ring-[#2B2EB8] bg-white"
                style={{ fontFamily: 'Source Serif Pro, Georgia, serif' }}
              >
                {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>

            {form.type === 'DIPLOME' && (
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#8A8A8A] mb-1" style={{ fontFamily: 'Gilroy, sans-serif' }}>
                  Diplôme de référence <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.diplomeRefId}
                  onChange={e => {
                    const ref = diplomes.find(d => d.id === e.target.value)
                    setForm(f => ({
                      ...f,
                      diplomeRefId: e.target.value,
                      slug: f.slug || (ref ? ref.slug : ''),
                      label: f.label || (ref ? ref.label : ''),
                    }))
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-[#D8D8D8] text-sm focus:outline-none focus:ring-2 focus:ring-[#2B2EB8] bg-white"
                  style={{ fontFamily: 'Source Serif Pro, Georgia, serif' }}
                >
                  <option value="">— Sélectionner un diplôme —</option>
                  {(['langues','dfle','cav','lld','autre'] as const).map(ufr => {
                    const items = diplomes.filter(d => d.ufr === ufr && d.actif !== false)
                    if (!items.length) return null
                    return (
                      <optgroup key={ufr} label={`UFR ${ufr.toUpperCase()}`}>
                        {items.map(d => <option key={d.id} value={d.id}>{d.niveau} — {d.label}</option>)}
                      </optgroup>
                    )
                  })}
                </select>
              </div>
            )}

            {form.type === 'UFR' && (
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.hasKB}
                  onChange={e => setForm(f => ({ ...f, hasKB: e.target.checked }))}
                  className="accent-[#00068D]"
                />
                <span style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: '0.85rem', color: '#3A3A3A' }}>
                  Créer une KB Dify dédiée pour cette UFR
                </span>
              </label>
            )}
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#8A8A8A] mb-1" style={{ fontFamily: 'Gilroy, sans-serif' }}>Quota tokens</label>
              <input
                type="number"
                min={0}
                step={50000}
                value={form.quotaTokens}
                onChange={e => setForm(f => ({ ...f, quotaTokens: Number(e.target.value) }))}
                className="w-full px-3 py-2 rounded-lg border border-[#D8D8D8] text-sm focus:outline-none focus:ring-2 focus:ring-[#2B2EB8]"
                style={{ fontFamily: 'Source Serif Pro, Georgia, serif' }}
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#8A8A8A] mb-1" style={{ fontFamily: 'Gilroy, sans-serif' }}>Description (optionnel)</label>
              <textarea
                rows={2}
                placeholder="Description du groupe…"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-[#D8D8D8] text-sm focus:outline-none focus:ring-2 focus:ring-[#2B2EB8] resize-none"
                style={{ fontFamily: 'Source Serif Pro, Georgia, serif' }}
              />
            </div>
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={form.allowPersonalSources}
                onChange={e => setForm(f => ({ ...f, allowPersonalSources: e.target.checked }))}
                className="accent-[#00068D]"
              />
              <span style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: '0.85rem', color: '#3A3A3A' }}>
                Autoriser les sources personnelles (espaces documentaires)
              </span>
            </label>
            {createError && (
              <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs" style={{ fontFamily: 'Source Serif Pro, Georgia, serif' }}>
                {createError}
              </div>
            )}
            <div className="flex gap-2 pt-1">
              <button
                onClick={handleCreate}
                disabled={creating}
                className="flex-1 py-2.5 rounded-lg text-white text-xs disabled:opacity-60"
                style={{ background: '#00068D', fontFamily: 'Gilroy, sans-serif', fontWeight: 800, letterSpacing: '0.04em' }}
              >
                {creating ? 'Création…' : 'CRÉER'}
              </button>
              <button
                onClick={() => setCreateOpen(false)}
                className="px-4 py-2.5 rounded-lg border border-[#D8D8D8] text-xs text-[#5A5A5A] hover:bg-[#F2F2F2]"
                style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800 }}
              >
                ANNULER
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Members modal */}
      {membersGroup && (
        <Modal title={`Membres — ${membersGroup.label}`} onClose={() => setMembersGroup(null)}>
          <div className="space-y-3">
            <p style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: '0.8rem', color: '#8A8A8A' }}>
              {members.length} membre{members.length !== 1 ? 's' : ''}
            </p>
            {membersLoading ? (
              <p className="py-6 text-center text-sm text-[#8A8A8A]" style={{ fontFamily: 'Source Serif Pro, Georgia, serif' }}>Chargement…</p>
            ) : members.length === 0 ? (
              <p className="py-6 text-center text-sm text-[#8A8A8A]" style={{ fontFamily: 'Source Serif Pro, Georgia, serif' }}>Aucun membre</p>
            ) : (
              <div className="border border-[#D8D8D8] rounded-lg divide-y divide-[#F2F2F2]">
                {members.map(m => (
                  <div key={m.id} className="flex items-center justify-between px-3 py-2.5 hover:bg-[#FAFAFA]">
                    <div>
                      <p style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontWeight: 600, fontSize: '0.82rem', color: '#0D0D0D' }}>{m.name || '—'}</p>
                      <p style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 300, fontSize: '0.7rem', color: '#8A8A8A' }}>{m.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${ROLE_COLORS[m.role] ?? 'bg-[#F2F2F2] text-[#5A5A5A] border-[#D8D8D8]'}`} style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800 }}>
                        {ROLE_LABELS[m.role] ?? m.role}
                      </span>
                      <button
                        onClick={() => removeMember(m.id)}
                        disabled={removingMember === m.id}
                        className="px-2 py-1 rounded border border-red-200 text-red-600 text-[10px] hover:bg-red-50 disabled:opacity-50 transition-all"
                        style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800 }}
                        title="Retirer du groupe"
                      >
                        {removingMember === m.id ? '…' : 'RETIRER'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <button
              onClick={() => setMembersGroup(null)}
              className="w-full py-2 rounded-lg border border-[#D8D8D8] text-xs text-[#5A5A5A] hover:bg-[#F2F2F2]"
              style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800 }}
            >
              FERMER
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
