'use client'

import { useEffect, useState } from 'react'

interface Group { id: string; slug: string; label: string }
interface Agent {
  id: string
  slug: string
  label: string
  icon: string
  difyAppId: string
  difyApiKey: string
  status: string
  groups: { group: Group }[]
}

export default function AdminAgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [allGroups, setAllGroups] = useState<Group[]>([])
  const [editing, setEditing] = useState<string | null>(null)
  const [form, setForm] = useState<Partial<Agent & { groupIds: string[] }>>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/agents').then(r => r.json()).then(d => {
      setAgents(d.agents || [])
      const groups = new Map<string, Group>()
      for (const a of (d.agents || [])) {
        for (const ga of a.groups) {
          groups.set(ga.group.id, ga.group)
        }
      }
      setAllGroups(Array.from(groups.values()))
    })
  }, [])

  function startEdit(a: Agent) {
    setEditing(a.slug)
    setForm({
      difyAppId: a.difyAppId,
      difyApiKey: a.difyApiKey,
      status: a.status,
      groupIds: a.groups.map(g => g.group.id),
    })
    setSaved(null)
  }

  async function handleSave(slug: string) {
    setSaving(true)
    try {
      const r = await fetch(`/api/admin/agents/${slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (r.ok) {
        setSaved(slug)
        setEditing(null)
        const updated = await fetch('/api/admin/agents').then(r => r.json())
        setAgents(updated.agents || [])
      }
    } finally {
      setSaving(false)
    }
  }

  const statusColors: Record<string, string> = {
    ACTIVE: 'bg-[#E8F5E9] text-[#2E7D32] border-[#A5D6A7]',
    BETA: 'bg-[#FFF8E1] text-[#F57F17] border-[#FFD54F]',
    DISABLED: 'bg-[#F2F2F2] text-[#8A8A8A] border-[#D8D8D8]',
  }

  return (
    <div className="space-y-5 max-w-5xl">
      <div>
        <h1 style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '1.3rem', color: '#0D0D0D' }}>
          Gestion des agents
        </h1>
        <p style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: '0.82rem', color: '#8A8A8A' }}>
          Modifier le Dify App ID sans redéploiement · {agents.length} agents
        </p>
      </div>

      <div className="bg-white rounded-xl border border-[#D8D8D8] overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#D8D8D8] bg-[#FAFAFA]">
              {['Agent', 'Dify App ID', 'Statut', 'Groupes', 'Actions'].map(h => (
                <th key={h} className="px-4 py-3 text-left" style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '0.62rem', letterSpacing: '0.04em', textTransform: 'uppercase', color: '#8A8A8A' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {agents.map(agent => (
              <>
                <tr key={agent.slug} className="border-b border-[#F2F2F2] hover:bg-[#FAFAFA]">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span>{agent.icon}</span>
                      <div>
                        <p style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '0.82rem', color: '#0D0D0D' }}>{agent.label}</p>
                        <span className="nl-token-agent text-[10px]">@{agent.slug}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <code style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: '#5A5A5A', background: '#F2F2F2', padding: '2px 6px', borderRadius: 4 }}>
                      {agent.difyAppId}
                    </code>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border ${statusColors[agent.status] ?? statusColors.DISABLED}`} style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800 }}>
                      {agent.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {agent.groups.map(g => (
                        <span key={g.group.id} className="text-[10px] px-1.5 py-0.5 rounded bg-[#E8E9F8] text-[#00068D] border border-[#2B2EB8]" style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 300 }}>
                          {g.group.label}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => editing === agent.slug ? setEditing(null) : startEdit(agent)}
                        className="px-2.5 py-1.5 rounded-lg border border-[#D8D8D8] text-[10px] hover:bg-[#F0F1FB] hover:border-[#2B2EB8] transition-all"
                        style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, letterSpacing: '0.04em', color: '#0D0D0D' }}
                      >
                        {editing === agent.slug ? 'ANNULER' : 'MODIFIER'}
                      </button>
                      {saved === agent.slug && (
                        <span className="text-[10px] text-[#2E7D32]" style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800 }}>✓ Sauvegardé</span>
                      )}
                    </div>
                  </td>
                </tr>
                {editing === agent.slug && (
                  <tr key={`${agent.slug}-edit`} className="bg-[#F8F8FF] border-b border-[#D8D8D8]">
                    <td colSpan={5} className="px-4 py-4">
                      <div className="grid grid-cols-3 gap-4 mb-4">
                        <div>
                          <label style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '0.65rem', letterSpacing: '0.04em', textTransform: 'uppercase', color: '#8A8A8A' }} className="block mb-1">
                            Dify App ID
                          </label>
                          <input
                            value={form.difyAppId ?? ''}
                            onChange={e => setForm(f => ({ ...f, difyAppId: e.target.value }))}
                            className="w-full px-3 py-2 rounded-lg border border-[#D8D8D8] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#2B2EB8] font-mono"
                          />
                        </div>
                        <div>
                          <label style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '0.65rem', letterSpacing: '0.04em', textTransform: 'uppercase', color: '#8A8A8A' }} className="block mb-1">
                            Dify API Key
                          </label>
                          <input
                            value={form.difyApiKey ?? ''}
                            onChange={e => setForm(f => ({ ...f, difyApiKey: e.target.value }))}
                            className="w-full px-3 py-2 rounded-lg border border-[#D8D8D8] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#2B2EB8] font-mono"
                          />
                        </div>
                        <div>
                          <label style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '0.65rem', letterSpacing: '0.04em', textTransform: 'uppercase', color: '#8A8A8A' }} className="block mb-1">
                            Statut
                          </label>
                          <select
                            value={form.status ?? 'ACTIVE'}
                            onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                            className="w-full px-3 py-2 rounded-lg border border-[#D8D8D8] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#2B2EB8]"
                            style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800 }}
                          >
                            <option value="ACTIVE">ACTIVE</option>
                            <option value="BETA">BETA</option>
                            <option value="DISABLED">DISABLED</option>
                          </select>
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
                                className={`px-2.5 py-1 rounded-lg border text-[10px] transition-all ${enabled ? 'bg-[#E8E9F8] border-[#2B2EB8] text-[#00068D]' : 'bg-white border-[#D8D8D8] text-[#8A8A8A]'}`}
                                style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800 }}
                              >
                                {enabled ? '✓ ' : ''}{g.label}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                      <button
                        onClick={() => handleSave(agent.slug)}
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
