'use client'

import { useEffect, useState } from 'react'

interface Group { id: string; slug: string; label: string }
interface User {
  id: string
  email: string
  name: string | null
  role: string
  onboarded: boolean
  disabled: boolean
  createdAt: string
  groups: Group[]
  scopes: Group[]
  lastActivity: string | null
}

function formatDate(s: string | null) {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

const ROLE_LABELS: Record<string, string> = {
  STUDENT: 'Étudiant',
  BIATSS: 'BIATSS',
  EC: 'Enseignant',
  RESPONSABLE: 'Responsable',
  ADMIN: 'Admin',
}
const ROLE_COLORS: Record<string, string> = {
  STUDENT: 'bg-[#E8F5E9] text-[#2E7D32] border-[#A5D6A7]',
  BIATSS: 'bg-amber-50 text-amber-700 border-amber-300',
  EC: 'bg-[#E8E9F8] text-[#00068D] border-[#2B2EB8]',
  RESPONSABLE: 'bg-purple-50 text-purple-700 border-purple-300',
  ADMIN: 'bg-red-50 text-red-700 border-red-300',
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#D8D8D8]">
          <h3 style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-md)', color: '#0D0D0D' }}>{title}</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-[#8A8A8A] hover:bg-[#F2F2F2]">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  )
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [allGroups, setAllGroups] = useState<Group[]>([])
  const [working, setWorking] = useState<string | null>(null)
  const [filter, setFilter] = useState('')

  // Invite modal
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteForm, setInviteForm] = useState({ email: '', name: '', role: 'EC', groupIds: [] as string[] })
  const [inviteError, setInviteError] = useState('')
  const [inviteResult, setInviteResult] = useState<{ email: string; tempPassword: string } | null>(null)

  // Edit groups modal
  const [groupsUser, setGroupsUser] = useState<User | null>(null)
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([])
  const [groupsSaving, setGroupsSaving] = useState(false)

  // Scope modal (for RESPONSABLE)
  const [scopeUser, setScopeUser] = useState<User | null>(null)
  const [selectedScopeGroupIds, setSelectedScopeGroupIds] = useState<string[]>([])
  const [scopeSaving, setScopeSaving] = useState(false)

  async function load() {
    const [ud, gd] = await Promise.all([
      fetch('/api/admin/users').then(r => r.json()),
      fetch('/api/admin/groups').then(r => r.json()),
    ])
    setUsers(ud.users || [])
    setAllGroups(gd.groups || [])
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps, react-hooks/set-state-in-effect
  useEffect(() => { load() }, [])

  async function toggleUser(id: string, disabled: boolean) {
    setWorking(id)
    try {
      await fetch(`/api/admin/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: disabled ? 'enable' : 'disable' }),
      })
      await load()
    } finally { setWorking(null) }
  }

  async function handleInvite() {
    setInviteError('')
    if (!inviteForm.email || !inviteForm.name) { setInviteError('Email et nom sont requis.'); return }
    setWorking('invite')
    try {
      const r = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inviteForm),
      })
      const data = await r.json()
      if (!r.ok) { setInviteError(data.error ?? 'Erreur'); return }
      setInviteResult({ email: data.user.email, tempPassword: data.tempPassword })
      await load()
    } finally { setWorking(null) }
  }

  function openGroupsModal(u: User) {
    setGroupsUser(u)
    setSelectedGroupIds(u.groups.map(g => g.id))
  }

  async function saveGroups() {
    if (!groupsUser) return
    setGroupsSaving(true)
    try {
      await fetch(`/api/admin/users/${groupsUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set_groups', groupIds: selectedGroupIds }),
      })
      await load()
      setGroupsUser(null)
    } finally { setGroupsSaving(false) }
  }

  function openScopeModal(u: User) {
    setScopeUser(u)
    setSelectedScopeGroupIds(u.scopes.map(s => s.id))
  }

  async function saveScope() {
    if (!scopeUser) return
    setScopeSaving(true)
    try {
      await fetch(`/api/admin/users/${scopeUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set_scope', scopeGroupIds: selectedScopeGroupIds }),
      })
      await load()
      setScopeUser(null)
    } finally { setScopeSaving(false) }
  }

  async function makeResponsable(u: User) {
    setWorking(u.id + '-role')
    try {
      await fetch(`/api/admin/users/${u.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set_role', role: 'RESPONSABLE' }),
      })
      await load()
    } finally { setWorking(null) }
  }

  const filtered = users.filter(u =>
    !filter || u.email.includes(filter) || (u.name ?? '').toLowerCase().includes(filter.toLowerCase())
  )

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-lg)', color: '#0D0D0D' }}>
            Gestion des utilisateurs
          </h1>
          <p style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: 'var(--text-sm)', color: '#8A8A8A' }}>
            {users.length} utilisateurs · aucun contenu de message exposé
          </p>
        </div>
        <div className="flex items-center gap-3">
          <input
            placeholder="Filtrer par email ou nom…"
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-[#D8D8D8] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#2B2EB8] w-52"
            style={{ fontFamily: 'Source Serif Pro, Georgia, serif' }}
          />
          <button
            onClick={() => { setInviteOpen(true); setInviteResult(null); setInviteError(''); setInviteForm({ email: '', name: '', role: 'EC', groupIds: [] }) }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-xs transition-all"
            style={{ background: '#00068D', fontFamily: 'Gilroy, sans-serif', fontWeight: 800, letterSpacing: '0.04em' }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><line x1="19" y1="8" x2="19" y2="14" /><line x1="22" y1="11" x2="16" y2="11" /></svg>
            INVITER
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-[#D8D8D8] overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#D8D8D8] bg-[#FAFAFA]">
              {['Utilisateur', 'Rôle', 'Groupes', 'Onboarding', 'Dernière activité', 'Actions'].map(h => (
                <th key={h} className="px-4 py-3 text-left" style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-2xs)', letterSpacing: '0.04em', textTransform: 'uppercase', color: '#8A8A8A' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-[#8A8A8A]" style={{ fontFamily: 'Source Serif Pro, Georgia, serif' }}>Aucun utilisateur</td></tr>
            )}
            {filtered.map(u => (
              <tr key={u.id} className={`border-b border-[#F2F2F2] ${u.disabled ? 'opacity-50 bg-[#FAFAFA]' : 'hover:bg-[#FAFAFA]'}`}>
                <td className="px-4 py-3">
                  <p style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontWeight: 600, fontSize: 'var(--text-sm)', color: '#0D0D0D' }}>
                    {u.name || '—'}
                  </p>
                  <p style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 300, fontSize: 'var(--text-xs)', color: '#8A8A8A' }}>
                    {u.email}
                  </p>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full border ${ROLE_COLORS[u.role] ?? 'bg-[#F2F2F2] text-[#8A8A8A] border-[#D8D8D8]'}`} style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-2xs)' }}>
                    {ROLE_LABELS[u.role] ?? u.role}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1 items-center">
                    {u.groups.length === 0
                      ? <span style={{ fontSize: '0.75rem', color: '#C8C8C8' }}>—</span>
                      : u.groups.map(g => (
                        <span key={g.id} className="px-1.5 py-0.5 rounded bg-[#F2F2F2] text-[#5A5A5A] border border-[#D8D8D8]" style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 300, fontSize: 'var(--text-2xs)' }}>{g.label}</span>
                      ))
                    }
                    <button
                      onClick={() => openGroupsModal(u)}
                      className="px-1.5 py-0.5 rounded border border-dashed border-[#2B2EB8] text-[#2B2EB8] hover:bg-[#E8E9F8] transition-all ml-0.5"
                      style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-2xs)' }}
                      title="Modifier les groupes"
                    >
                      ✎
                    </button>
                  </div>
                </td>
                <td className="px-4 py-3">
                  {u.onboarded ? (
                    <span className="text-[#2E7D32]" style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-2xs)' }}>✓ Complété</span>
                  ) : (
                    <span className="text-[#F57F17]" style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-2xs)' }}>En attente</span>
                  )}
                </td>
                <td className="px-4 py-3" style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: 'var(--text-sm)', color: '#8A8A8A' }}>
                  {formatDate(u.lastActivity)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => toggleUser(u.id, u.disabled)}
                      disabled={working === u.id || working === u.id + '-role'}
                      className={`px-2.5 py-1.5 rounded-lg border disabled:opacity-50 transition-all ${u.disabled ? 'border-[#A5D6A7] text-[#2E7D32] hover:bg-[#E8F5E9]' : 'border-red-300 text-red-600 hover:bg-red-50'}`}
                      style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-2xs)', letterSpacing: '0.04em' }}
                    >
                      {working === u.id ? '…' : u.disabled ? 'RÉACTIVER' : 'DÉSACTIVER'}
                    </button>
                    {u.role !== 'RESPONSABLE' && u.role !== 'ADMIN' && (
                      <button
                        onClick={() => makeResponsable(u)}
                        disabled={working === u.id + '-role'}
                        className="px-2.5 py-1.5 rounded-lg border border-purple-300 text-purple-700 hover:bg-purple-50 disabled:opacity-50 transition-all"
                        style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-2xs)' }}
                      >
                        {working === u.id + '-role' ? '…' : '→ Responsable'}
                      </button>
                    )}
                    {u.role === 'RESPONSABLE' && (
                      <button
                        onClick={() => openScopeModal(u)}
                        className="px-2.5 py-1.5 rounded-lg border border-purple-200 text-purple-600 hover:bg-purple-50 transition-all"
                        style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-2xs)' }}
                      >
                        Périmètre ({u.scopes.length})
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Invite modal */}
      {inviteOpen && (
        <Modal title="Inviter un utilisateur" onClose={() => setInviteOpen(false)}>
          {inviteResult ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 p-3 rounded-lg bg-[#E8F5E9] border border-[#A5D6A7]">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2E7D32" strokeWidth="2.5" strokeLinecap="round"><path d="M20 6L9 17l-5-5" /></svg>
                <span style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-sm)', color: '#2E7D32' }}>
                  Compte créé pour {inviteResult.email}
                </span>
              </div>
              <div className="p-4 rounded-xl border-2 border-dashed border-[#FFD54F] bg-[#FFF8E1]">
                <p style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-xs)', letterSpacing: '0.06em', color: '#F57F17', textTransform: 'uppercase' }} className="mb-1">
                  Mot de passe temporaire — affiché une seule fois
                </p>
                <p style={{ fontFamily: 'monospace', fontSize: '1.1rem', fontWeight: 700, color: '#0D0D0D', letterSpacing: '0.1em' }}>
                  {inviteResult.tempPassword}
                </p>
                <p style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: 'var(--text-sm)', color: '#8A8A8A' }} className="mt-2">
                  Communiquez ce mot de passe à l&apos;utilisateur. Il devra le changer à sa première connexion.
                </p>
              </div>
              <button
                onClick={() => setInviteOpen(false)}
                className="w-full py-2 rounded-lg border border-[#D8D8D8] text-xs text-[#5A5A5A] hover:bg-[#F2F2F2]"
                style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800 }}
              >
                FERMER
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-3">
                {[
                  { label: 'Email', key: 'email', type: 'email', placeholder: 'prenom.nom@sorbonne-nouvelle.fr' },
                  { label: 'Nom complet', key: 'name', type: 'text', placeholder: 'Prénom Nom' },
                ].map(({ label, key, type, placeholder }) => (
                  <div key={key}>
                    <label className="block font-semibold uppercase tracking-wider text-[#8A8A8A] mb-1" style={{ fontFamily: 'Gilroy, sans-serif', fontSize: 'var(--text-2xs)' }}>
                      {label}
                    </label>
                    <input
                      type={type}
                      placeholder={placeholder}
                      value={inviteForm[key as 'email' | 'name']}
                      onChange={e => setInviteForm(f => ({ ...f, [key]: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg border border-[#D8D8D8] text-sm focus:outline-none focus:ring-2 focus:ring-[#2B2EB8]"
                      style={{ fontFamily: 'Source Serif Pro, Georgia, serif' }}
                    />
                  </div>
                ))}
                <div>
                  <label className="block font-semibold uppercase tracking-wider text-[#8A8A8A] mb-1" style={{ fontFamily: 'Gilroy, sans-serif', fontSize: 'var(--text-2xs)' }}>Rôle</label>
                  <select
                    value={inviteForm.role}
                    onChange={e => setInviteForm(f => ({ ...f, role: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-[#D8D8D8] text-sm focus:outline-none focus:ring-2 focus:ring-[#2B2EB8] bg-white"
                    style={{ fontFamily: 'Source Serif Pro, Georgia, serif' }}
                  >
                    <option value="EC">Enseignant (EC)</option>
                    <option value="STUDENT">Étudiant</option>
                    <option value="BIATSS">Personnel BIATSS</option>
                    <option value="RESPONSABLE">Responsable</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold uppercase tracking-wider text-[#8A8A8A] mb-1" style={{ fontFamily: 'Gilroy, sans-serif', fontSize: 'var(--text-2xs)' }}>Groupes</label>
                  <div className="max-h-36 overflow-y-auto nl-scroll border border-[#D8D8D8] rounded-lg divide-y divide-[#F2F2F2]">
                    {allGroups.length === 0 && (
                      <p className="px-3 py-2 text-xs text-[#8A8A8A]" style={{ fontFamily: 'Source Serif Pro, Georgia, serif' }}>Aucun groupe</p>
                    )}
                    {allGroups.map(g => (
                      <label key={g.id} className="flex items-center gap-2.5 px-3 py-2 hover:bg-[#FAFAFA] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={inviteForm.groupIds.includes(g.id)}
                          onChange={e => setInviteForm(f => ({
                            ...f,
                            groupIds: e.target.checked ? [...f.groupIds, g.id] : f.groupIds.filter(id => id !== g.id)
                          }))}
                          className="accent-[#00068D]"
                        />
                        <span style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: 'var(--text-sm)', color: '#0D0D0D' }}>{g.label}</span>
                        <span style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 300, fontSize: 'var(--text-2xs)', color: '#8A8A8A' }}>{g.slug}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              {inviteError && (
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs" style={{ fontFamily: 'Source Serif Pro, Georgia, serif' }}>
                  {inviteError}
                </div>
              )}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleInvite}
                  disabled={working === 'invite'}
                  className="flex-1 py-2.5 rounded-lg text-white text-xs disabled:opacity-60"
                  style={{ background: '#00068D', fontFamily: 'Gilroy, sans-serif', fontWeight: 800, letterSpacing: '0.04em' }}
                >
                  {working === 'invite' ? 'Création…' : 'CRÉER LE COMPTE'}
                </button>
                <button
                  onClick={() => setInviteOpen(false)}
                  className="px-4 py-2.5 rounded-lg border border-[#D8D8D8] text-xs text-[#5A5A5A] hover:bg-[#F2F2F2]"
                  style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800 }}
                >
                  ANNULER
                </button>
              </div>
            </div>
          )}
        </Modal>
      )}

      {/* Edit groups modal */}
      {groupsUser && (
        <Modal title={`Groupes — ${groupsUser.name || groupsUser.email}`} onClose={() => setGroupsUser(null)}>
          <div className="space-y-4">
            <div className="max-h-64 overflow-y-auto nl-scroll border border-[#D8D8D8] rounded-lg divide-y divide-[#F2F2F2]">
              {allGroups.length === 0 && (
                <p className="px-3 py-2 text-xs text-[#8A8A8A]" style={{ fontFamily: 'Source Serif Pro, Georgia, serif' }}>Aucun groupe disponible</p>
              )}
              {allGroups.map(g => (
                <label key={g.id} className="flex items-center gap-2.5 px-3 py-2.5 hover:bg-[#FAFAFA] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedGroupIds.includes(g.id)}
                    onChange={e => setSelectedGroupIds(prev =>
                      e.target.checked ? [...prev, g.id] : prev.filter(id => id !== g.id)
                    )}
                    className="accent-[#00068D]"
                  />
                  <span style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: 'var(--text-sm)', color: '#0D0D0D' }}>{g.label}</span>
                  <span style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 300, fontSize: 'var(--text-2xs)', color: '#8A8A8A' }}>{g.slug}</span>
                </label>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                onClick={saveGroups}
                disabled={groupsSaving}
                className="flex-1 py-2.5 rounded-lg text-white text-xs disabled:opacity-60"
                style={{ background: '#00068D', fontFamily: 'Gilroy, sans-serif', fontWeight: 800, letterSpacing: '0.04em' }}
              >
                {groupsSaving ? 'Enregistrement…' : 'ENREGISTRER'}
              </button>
              <button
                onClick={() => setGroupsUser(null)}
                className="px-4 py-2.5 rounded-lg border border-[#D8D8D8] text-xs text-[#5A5A5A] hover:bg-[#F2F2F2]"
                style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800 }}
              >
                ANNULER
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Scope modal */}
      {scopeUser && (
        <Modal title={`Périmètre de ${scopeUser.name ?? scopeUser.email}`} onClose={() => setScopeUser(null)}>
          <div className="space-y-4">
            <p style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: 'var(--text-sm)', color: '#5A5A5A' }}>
              Sélectionnez les groupes dont ce responsable peut gérer les membres.
            </p>
            <div className="max-h-48 overflow-y-auto nl-scroll border border-[#D8D8D8] rounded-lg divide-y divide-[#F2F2F2]">
              {allGroups.map(g => (
                <label key={g.id} className="flex items-center gap-2.5 px-3 py-2 hover:bg-[#FAFAFA] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedScopeGroupIds.includes(g.id)}
                    onChange={e => setSelectedScopeGroupIds(prev =>
                      e.target.checked ? [...prev, g.id] : prev.filter(id => id !== g.id)
                    )}
                    className="accent-[#00068D]"
                  />
                  <span style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: 'var(--text-sm)', color: '#0D0D0D' }}>{g.label}</span>
                  <span style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 300, fontSize: 'var(--text-2xs)', color: '#8A8A8A' }}>{g.slug}</span>
                </label>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                onClick={saveScope}
                disabled={scopeSaving}
                className="flex-1 py-2.5 rounded-lg text-white text-xs disabled:opacity-60"
                style={{ background: '#00068D', fontFamily: 'Gilroy, sans-serif', fontWeight: 800, letterSpacing: '0.04em' }}
              >
                {scopeSaving ? 'Enregistrement…' : 'ENREGISTRER'}
              </button>
              <button
                onClick={() => setScopeUser(null)}
                className="px-4 py-2.5 rounded-lg border border-[#D8D8D8] text-xs text-[#5A5A5A] hover:bg-[#F2F2F2]"
                style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800 }}
              >
                ANNULER
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
