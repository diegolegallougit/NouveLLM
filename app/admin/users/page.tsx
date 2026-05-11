'use client'

import { useEffect, useState } from 'react'

interface User {
  id: string
  email: string
  name: string | null
  role: string
  onboarded: boolean
  disabled: boolean
  createdAt: string
  groups: string[]
  lastActivity: string | null
}

function formatDate(s: string | null) {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

const ROLE_LABELS: Record<string, string> = { STUDENT: 'Étudiant', EC: 'Enseignant', ADMIN: 'Admin' }
const ROLE_COLORS: Record<string, string> = {
  STUDENT: 'bg-[#E8F5E9] text-[#2E7D32] border-[#A5D6A7]',
  EC: 'bg-[#E8E9F8] text-[#00068D] border-[#2B2EB8]',
  ADMIN: 'bg-[#FFF8E1] text-[#F57F17] border-[#FFD54F]',
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [working, setWorking] = useState<string | null>(null)
  const [filter, setFilter] = useState('')

  async function load() {
    const d = await fetch('/api/admin/users').then(r => r.json())
    setUsers(d.users || [])
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
    } finally {
      setWorking(null)
    }
  }

  const filtered = users.filter(u =>
    !filter || u.email.includes(filter) || (u.name ?? '').toLowerCase().includes(filter.toLowerCase())
  )

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '1.3rem', color: '#0D0D0D' }}>
            Gestion des utilisateurs
          </h1>
          <p style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: '0.82rem', color: '#8A8A8A' }}>
            {users.length} utilisateurs · aucun contenu de message exposé
          </p>
        </div>
        <input
          placeholder="Filtrer par email ou nom…"
          value={filter}
          onChange={e => setFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border border-[#D8D8D8] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#2B2EB8] w-56"
          style={{ fontFamily: 'Source Serif Pro, Georgia, serif' }}
        />
      </div>

      <div className="bg-white rounded-xl border border-[#D8D8D8] overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#D8D8D8] bg-[#FAFAFA]">
              {['Utilisateur', 'Rôle', 'Groupes', 'Onboarding', 'Dernière activité', 'Actions'].map(h => (
                <th key={h} className="px-4 py-3 text-left" style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '0.62rem', letterSpacing: '0.04em', textTransform: 'uppercase', color: '#8A8A8A' }}>
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
                  <p style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontWeight: 600, fontSize: '0.85rem', color: '#0D0D0D' }}>
                    {u.name || '—'}
                  </p>
                  <p style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 300, fontSize: '0.72rem', color: '#8A8A8A' }}>
                    {u.email}
                  </p>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border ${ROLE_COLORS[u.role] ?? 'bg-[#F2F2F2] text-[#8A8A8A] border-[#D8D8D8]'}`} style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800 }}>
                    {ROLE_LABELS[u.role] ?? u.role}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {u.groups.length === 0
                      ? <span style={{ fontSize: '0.75rem', color: '#C8C8C8' }}>—</span>
                      : u.groups.map(g => (
                        <span key={g} className="text-[10px] px-1.5 py-0.5 rounded bg-[#F2F2F2] text-[#5A5A5A] border border-[#D8D8D8]" style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 300 }}>{g}</span>
                      ))
                    }
                  </div>
                </td>
                <td className="px-4 py-3">
                  {u.onboarded ? (
                    <span className="text-[10px] text-[#2E7D32]" style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800 }}>✓ Complété</span>
                  ) : (
                    <span className="text-[10px] text-[#F57F17]" style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800 }}>En attente</span>
                  )}
                </td>
                <td className="px-4 py-3" style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: '0.82rem', color: '#8A8A8A' }}>
                  {formatDate(u.lastActivity)}
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => toggleUser(u.id, u.disabled)}
                    disabled={working === u.id}
                    className={`px-2.5 py-1.5 rounded-lg border text-[10px] disabled:opacity-50 transition-all ${u.disabled ? 'border-[#A5D6A7] text-[#2E7D32] hover:bg-[#E8F5E9]' : 'border-red-300 text-red-600 hover:bg-red-50'}`}
                    style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, letterSpacing: '0.04em' }}
                  >
                    {working === u.id ? '…' : u.disabled ? 'RÉACTIVER' : 'DÉSACTIVER'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
