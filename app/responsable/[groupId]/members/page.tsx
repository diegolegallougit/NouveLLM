'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, UserPlus, Upload, Trash2, RefreshCw } from 'lucide-react'
import { ROLE_LABELS, ROLE_BADGE_COLORS } from '@/lib/permissions'

interface Member {
  id: string
  email: string
  name: string | null
  role: string
  createdAt: string
  lastActivity: string | null
}

interface ImportResult {
  email: string
  status: 'created' | 'added' | 'already_member' | 'error'
  error?: string
}

export default function GroupMembersPage() {
  const { groupId } = useParams<{ groupId: string }>()
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [removing, setRemoving] = useState<string | null>(null)
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null)

  // Invite form
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteName, setInviteName] = useState('')
  const [inviteRole, setInviteRole] = useState('STUDENT')
  const [inviting, setInviting] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)

  // CSV import
  const csvInputRef = useRef<HTMLInputElement>(null)
  const [importResults, setImportResults] = useState<ImportResult[] | null>(null)
  const [importing, setImporting] = useState(false)

  const fetchMembers = () => {
    setLoading(true)
    fetch(`/api/responsable/${groupId}/members`)
      .then((r) => r.json())
      .then((d) => { setMembers(d.members ?? []); setLoading(false) })
  }

  useEffect(() => { fetchMembers() }, [groupId])

  async function invite() {
    if (!inviteEmail || !inviteName) return
    setInviting(true)
    setInviteError(null)
    const res = await fetch(`/api/responsable/${groupId}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: inviteEmail, name: inviteName, role: inviteRole }),
    })
    if (res.ok) {
      setInviteEmail('')
      setInviteName('')
      fetchMembers()
    } else {
      const d = await res.json()
      setInviteError(d.error ?? 'Erreur')
    }
    setInviting(false)
  }

  async function removeMember(userId: string) {
    setRemoving(userId)
    await fetch(`/api/responsable/${groupId}/members`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    })
    setMembers((prev) => prev.filter((m) => m.id !== userId))
    setConfirmRemove(null)
    setRemoving(null)
  }

  async function handleCsvImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    setImportResults(null)
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch(`/api/responsable/${groupId}/csv-import`, { method: 'POST', body: fd })
    const d = await res.json()
    setImportResults(d.results ?? [])
    setImporting(false)
    fetchMembers()
    if (csvInputRef.current) csvInputRef.current.value = ''
  }

  const statusLabel = { created: 'Créé + ajouté', added: 'Ajouté', already_member: 'Déjà membre', error: 'Erreur' }
  const statusColor = { created: 'text-green-600', added: 'text-blue-600', already_member: 'text-gray-400', error: 'text-red-500' }

  return (
    <div className="min-h-screen bg-[#F7F7FA] p-8">
      <div className="max-w-3xl mx-auto">
        <Link href="/responsable" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#00068D] mb-6">
          <ArrowLeft size={14} /> Retour
        </Link>

        <div className="mb-6">
          <p className="text-xs font-semibold tracking-widest text-[#00068D] uppercase mb-1">Gestion des membres</p>
          <h1 className="text-xl font-extrabold text-[#1A1A2E]">Membres du groupe</h1>
        </div>

        {/* Invite form */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 mb-6">
          <h2 className="text-xs font-semibold tracking-widest text-gray-400 uppercase mb-4 flex items-center gap-2">
            <UserPlus size={13} /> Inviter un membre
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
            <input
              type="email"
              placeholder="Email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00068D]/20"
            />
            <input
              type="text"
              placeholder="Prénom Nom"
              value={inviteName}
              onChange={(e) => setInviteName(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00068D]/20"
            />
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00068D]/20"
            >
              <option value="STUDENT">Étudiant·e</option>
              <option value="BIATSS">BIATSS</option>
              <option value="EC">EC</option>
            </select>
          </div>
          {inviteError && <p className="text-xs text-red-500 mb-2">{inviteError}</p>}
          <button
            onClick={invite}
            disabled={inviting || !inviteEmail || !inviteName}
            className="bg-[#00068D] text-white text-xs font-semibold px-4 py-2 rounded-lg hover:bg-[#0008B0] disabled:opacity-40 transition-colors"
          >
            {inviting ? 'Envoi…' : 'Ajouter'}
          </button>
        </div>

        {/* CSV import */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 mb-6">
          <h2 className="text-xs font-semibold tracking-widest text-gray-400 uppercase mb-3 flex items-center gap-2">
            <Upload size={13} /> Import CSV
          </h2>
          <p className="text-xs text-gray-400 mb-3">Colonnes attendues : <code>email, name, role</code> (role optionnel, défaut STUDENT)</p>
          <input
            ref={csvInputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={handleCsvImport}
            className="hidden"
            id="csv-upload"
          />
          <label
            htmlFor="csv-upload"
            className="inline-flex items-center gap-2 bg-gray-50 border border-dashed border-gray-300 text-sm text-gray-600 px-4 py-2 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
          >
            {importing ? <RefreshCw size={14} className="animate-spin" /> : <Upload size={14} />}
            {importing ? 'Import en cours…' : 'Choisir un fichier CSV'}
          </label>

          {importResults && (
            <div className="mt-4 border border-gray-100 rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-3 py-2 text-gray-500">Email</th>
                    <th className="text-left px-3 py-2 text-gray-500">Résultat</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {importResults.map((r, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2 text-gray-600">{r.email}</td>
                      <td className={`px-3 py-2 font-medium ${statusColor[r.status]}`}>
                        {statusLabel[r.status]}{r.error ? ` — ${r.error}` : ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Members list */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="px-5 py-3 border-b border-gray-50 flex items-center justify-between">
            <h2 className="text-xs font-semibold tracking-widest text-gray-400 uppercase">
              {members.length} membre{members.length !== 1 ? 's' : ''}
            </h2>
            <button onClick={fetchMembers} className="text-gray-400 hover:text-[#00068D] transition-colors">
              <RefreshCw size={13} />
            </button>
          </div>

          {loading ? (
            <div className="p-5 text-sm text-gray-400">Chargement…</div>
          ) : members.length === 0 ? (
            <div className="p-5 text-sm text-gray-400">Aucun membre.</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {members.map((m) => (
                <div key={m.id} className="px-5 py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-[#1A1A2E] truncate">{m.name ?? m.email}</p>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${ROLE_BADGE_COLORS[m.role as keyof typeof ROLE_BADGE_COLORS] ?? 'bg-gray-100 text-gray-500'}`}>
                        {ROLE_LABELS[m.role as keyof typeof ROLE_LABELS] ?? m.role}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 truncate">{m.email}</p>
                  </div>
                  <div className="text-xs text-gray-400 hidden sm:block">
                    {m.lastActivity ? new Date(m.lastActivity).toLocaleDateString('fr-FR') : '—'}
                  </div>
                  {confirmRemove === m.id ? (
                    <div className="flex items-center gap-2 text-xs">
                      <button
                        onClick={() => removeMember(m.id)}
                        disabled={removing === m.id}
                        className="text-red-500 font-semibold hover:underline"
                      >Oui</button>
                      <button onClick={() => setConfirmRemove(null)} className="text-gray-400 hover:underline">Non</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmRemove(m.id)}
                      className="text-gray-300 hover:text-red-400 transition-colors p-1"
                      title="Retirer du groupe"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
