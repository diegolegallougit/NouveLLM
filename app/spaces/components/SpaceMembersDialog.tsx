'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

type UserMember = {
  userId: string
  role: string
  addedAt: string
  user: { id: string; name: string | null; email: string; role: string }
}

type GroupMember = {
  groupId: string
  role: string
  addedAt: string
  group: { id: string; slug: string; label: string; type: string }
}

type Owner = { id: string; name: string | null; email: string }
type SearchUser = { id: string; name: string | null; email: string }
type Group = { id: string; slug: string; label: string; type: string }

const ROLE_LABELS: Record<string, string> = {
  READER: 'Lecteur',
  CONTRIBUTOR: 'Contributeur',
  MANAGER: 'Gestionnaire',
  OWNER: 'Propriétaire',
}

const ROLE_STYLE: Record<string, { bg: string; color: string }> = {
  READER: { bg: '#D8D8D8', color: '#5A5A5A' },
  CONTRIBUTOR: { bg: '#E8E9F8', color: '#2B2EB8' },
  MANAGER: { bg: '#00068D', color: '#fff' },
  OWNER: { bg: '#0D0D0D', color: '#fff' },
}

function initials(name: string | null, email: string) {
  if (name) {
    const parts = name.trim().split(/\s+/)
    return parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : name.slice(0, 2).toUpperCase()
  }
  return email.slice(0, 2).toUpperCase()
}

function RoleBadge({ role }: { role: string }) {
  const s = ROLE_STYLE[role] ?? ROLE_STYLE.READER
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full flex-shrink-0"
      style={{
        fontFamily: 'Gilroy, sans-serif',
        fontWeight: 800,
        fontSize: '10px',
        letterSpacing: '0.04em',
        background: s.bg,
        color: s.color,
      }}
    >
      {ROLE_LABELS[role] ?? role}
    </span>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="mb-2"
      style={{
        fontFamily: 'Gilroy, sans-serif',
        fontWeight: 800,
        fontSize: 'var(--text-2xs)',
        color: '#5A5A5A',
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
      }}
    >
      {children}
    </p>
  )
}

function EmptyHint({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        fontFamily: 'Source Serif Pro, Georgia, serif',
        fontSize: 'var(--text-xs)',
        color: '#C8C8C8',
        fontStyle: 'italic',
      }}
    >
      {children}
    </p>
  )
}

function MemberRow({
  name,
  email,
  role,
  onRemove,
  removing,
}: {
  name: string | null
  email: string
  role: string
  onRemove?: () => void
  removing?: boolean
}) {
  const ini = initials(name, email)
  return (
    <div
      className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-[#F2F2F2] group transition-colors"
      style={{ minHeight: '44px' }}
    >
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
        style={{
          background: '#2B2EB8',
          color: '#fff',
          fontFamily: 'Gilroy, sans-serif',
          fontWeight: 800,
          fontSize: '11px',
        }}
      >
        {ini}
      </div>
      <div className="flex-1 min-w-0">
        <div
          className="truncate"
          style={{
            fontFamily: 'Gilroy, sans-serif',
            fontWeight: 800,
            fontSize: 'var(--text-sm)',
            color: '#0D0D0D',
          }}
        >
          {name ?? email}
        </div>
        {name && (
          <div
            className="truncate"
            style={{
              fontFamily: 'Source Serif Pro, Georgia, serif',
              fontSize: 'var(--text-xs)',
              color: '#8A8A8A',
            }}
          >
            {email}
          </div>
        )}
      </div>
      <RoleBadge role={role} />
      {role !== 'OWNER' && onRemove && (
        <button
          onClick={onRemove}
          disabled={removing}
          className="opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center rounded text-[#8A8A8A] hover:text-[#EF4444] hover:bg-red-50 transition-all disabled:opacity-40 flex-shrink-0"
          aria-label="Retirer le membre"
          style={{ fontSize: '0.75rem' }}
        >
          {removing ? '…' : '✕'}
        </button>
      )}
    </div>
  )
}

interface SpaceMembersDialogProps {
  spaceId: string
  spaceName: string
  userRole: string
  onClose: () => void
}

export default function SpaceMembersDialog({
  spaceId,
  spaceName,
  userRole,
  onClose,
}: SpaceMembersDialogProps) {
  const [owner, setOwner] = useState<Owner | null>(null)
  const [userMembers, setUserMembers] = useState<UserMember[]>([])
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([])
  const [loading, setLoading] = useState(true)

  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchUser[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [selectedUser, setSelectedUser] = useState<SearchUser | null>(null)
  const [addRole, setAddRole] = useState<'READER' | 'CONTRIBUTOR' | 'MANAGER'>('READER')
  const [adding, setAdding] = useState(false)

  const [groups, setGroups] = useState<Group[]>([])
  const [selectedGroupId, setSelectedGroupId] = useState('')
  const [groupRole, setGroupRole] = useState<'READER' | 'CONTRIBUTOR' | 'MANAGER'>('READER')
  const [addingGroup, setAddingGroup] = useState(false)

  const [removing, setRemoving] = useState<string | null>(null)

  const isAdmin = userRole === 'ADMIN'
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchMembers = useCallback(async () => {
    const r = await fetch(`/api/spaces/${spaceId}/members`)
    if (!r.ok) return
    const d = await r.json()
    setOwner(d.owner ?? null)
    setUserMembers(d.userMembers ?? [])
    setGroupMembers(d.groupMembers ?? [])
  }, [spaceId])

  useEffect(() => {
    setLoading(true)
    fetchMembers().finally(() => setLoading(false))
  }, [fetchMembers])

  useEffect(() => {
    if (!isAdmin) return
    fetch('/api/admin/groups')
      .then((r) => r.json())
      .then((d) => setGroups(d.groups ?? []))
      .catch(() => {})
  }, [isAdmin])

  useEffect(() => {
    if (selectedUser) return
    if (searchTimer.current) clearTimeout(searchTimer.current)
    if (searchQuery.length < 2) {
      setSearchResults([])
      return
    }
    searchTimer.current = setTimeout(async () => {
      setSearchLoading(true)
      try {
        const r = await fetch(
          `/api/spaces/${spaceId}/members/users/search?q=${encodeURIComponent(searchQuery)}`
        )
        const d = await r.json()
        setSearchResults(d.users ?? [])
      } finally {
        setSearchLoading(false)
      }
    }, 300)
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current)
    }
  }, [searchQuery, spaceId, selectedUser])

  const handleSelectUser = (u: SearchUser) => {
    setSelectedUser(u)
    setSearchQuery(u.name ?? u.email)
    setSearchResults([])
  }

  const handleAddMember = async () => {
    if (!selectedUser) return
    setAdding(true)
    try {
      const r = await fetch(`/api/spaces/${spaceId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selectedUser.id, role: addRole }),
      })
      if (r.ok) {
        await fetchMembers()
        setSelectedUser(null)
        setSearchQuery('')
        setSearchResults([])
        setAddRole('READER')
      }
    } finally {
      setAdding(false)
    }
  }

  const handleRemoveMember = async (userId: string) => {
    setRemoving(userId)
    try {
      await fetch(`/api/spaces/${spaceId}/members`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })
      await fetchMembers()
    } finally {
      setRemoving(null)
    }
  }

  const handleAddGroup = async () => {
    if (!selectedGroupId) return
    setAddingGroup(true)
    try {
      const r = await fetch(`/api/spaces/${spaceId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId: selectedGroupId, role: groupRole }),
      })
      if (r.ok) {
        await fetchMembers()
        setSelectedGroupId('')
        setGroupRole('READER')
      }
    } finally {
      setAddingGroup(false)
    }
  }

  const handleRemoveGroup = async (groupId: string) => {
    await fetch(`/api/spaces/${spaceId}/members`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ groupId }),
    })
    await fetchMembers()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        onKeyDown={handleKeyDown}
      >
        <div
          className="bg-white rounded-2xl border border-[#D8D8D8] shadow-2xl flex flex-col overflow-hidden w-full"
          style={{ maxWidth: '520px', maxHeight: '90vh' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#D8D8D8] flex-shrink-0">
            <div>
              <h2
                style={{
                  fontFamily: 'Gilroy, sans-serif',
                  fontWeight: 800,
                  fontSize: 'var(--text-md)',
                  color: '#0D0D0D',
                }}
              >
                Membres
              </h2>
              <p
                style={{
                  fontFamily: 'Source Serif Pro, Georgia, serif',
                  fontSize: 'var(--text-xs)',
                  color: '#8A8A8A',
                  marginTop: '0.1rem',
                }}
              >
                {spaceName}
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-[#8A8A8A] hover:bg-[#F2F2F2] transition-colors"
              style={{ fontSize: '1rem' }}
              aria-label="Fermer"
            >
              ✕
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto nl-scroll px-6 py-5 space-y-6">
            {loading ? (
              <div className="py-8 text-center">
                <span
                  style={{
                    fontFamily: 'Source Serif Pro, Georgia, serif',
                    fontSize: 'var(--text-sm)',
                    color: '#C8C8C8',
                  }}
                >
                  Chargement…
                </span>
              </div>
            ) : (
              <>
                {/* Section 1 — Propriétaire */}
                {owner && (
                  <div>
                    <SectionLabel>Propriétaire</SectionLabel>
                    <MemberRow name={owner.name} email={owner.email} role="OWNER" />
                  </div>
                )}

                {/* Section 2 — Membres individuels */}
                <div>
                  <SectionLabel>Membres individuels</SectionLabel>
                  {userMembers.length === 0 ? (
                    <EmptyHint>Aucun membre individuel pour le moment</EmptyHint>
                  ) : (
                    <div className="space-y-0.5">
                      {userMembers.map((m) => (
                        <MemberRow
                          key={m.userId}
                          name={m.user.name}
                          email={m.user.email}
                          role={m.role}
                          onRemove={() => handleRemoveMember(m.userId)}
                          removing={removing === m.userId}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Section 3 — Ajouter un membre */}
                <div>
                  <SectionLabel>Ajouter un membre</SectionLabel>
                  <div className="space-y-2">
                    <div className="relative">
                      <input
                        value={searchQuery}
                        onChange={(e) => {
                          setSelectedUser(null)
                          setSearchQuery(e.target.value)
                        }}
                        placeholder="Rechercher par email ou nom…"
                        className="w-full px-3 py-2.5 rounded-lg border border-[#D8D8D8] bg-[#FAFAFA] focus:outline-none focus:ring-2 focus:ring-[#2B2EB8]"
                        style={{
                          fontFamily: 'Source Serif Pro, Georgia, serif',
                          fontSize: 'var(--text-sm)',
                          minHeight: '44px',
                        }}
                        autoComplete="off"
                      />
                      {searchLoading && (
                        <span
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#C8C8C8]"
                          style={{ fontSize: '0.7rem' }}
                        >
                          …
                        </span>
                      )}
                      {searchResults.length > 0 && !selectedUser && (
                        <div className="absolute z-10 left-0 right-0 top-full mt-1 bg-white rounded-lg border border-[#D8D8D8] shadow-lg overflow-hidden">
                          {searchResults.map((u) => (
                            <button
                              key={u.id}
                              onClick={() => handleSelectUser(u)}
                              className="w-full text-left px-3 py-2.5 hover:bg-[#F2F2F2] transition-colors border-b border-[#F2F2F2] last:border-0"
                              style={{ minHeight: '44px' }}
                            >
                              <div
                                style={{
                                  fontFamily: 'Gilroy, sans-serif',
                                  fontWeight: 800,
                                  fontSize: 'var(--text-sm)',
                                  color: '#0D0D0D',
                                }}
                              >
                                {u.name ?? u.email}
                              </div>
                              {u.name && (
                                <div
                                  style={{
                                    fontFamily: 'Source Serif Pro, Georgia, serif',
                                    fontSize: 'var(--text-xs)',
                                    color: '#8A8A8A',
                                  }}
                                >
                                  {u.email}
                                </div>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <select
                        value={addRole}
                        onChange={(e) =>
                          setAddRole(e.target.value as 'READER' | 'CONTRIBUTOR' | 'MANAGER')
                        }
                        className="flex-1 px-3 py-2 rounded-lg border border-[#D8D8D8] bg-[#FAFAFA] focus:outline-none focus:ring-2 focus:ring-[#2B2EB8]"
                        style={{
                          fontFamily: 'Source Serif Pro, Georgia, serif',
                          fontSize: 'var(--text-sm)',
                          minHeight: '44px',
                        }}
                      >
                        <option value="READER">Lecteur</option>
                        <option value="CONTRIBUTOR">Contributeur</option>
                        <option value="MANAGER">Gestionnaire</option>
                      </select>
                      <button
                        onClick={handleAddMember}
                        disabled={!selectedUser || adding}
                        className="px-5 py-2 rounded-lg disabled:opacity-40 hover:opacity-90 transition-all flex-shrink-0"
                        style={{
                          fontFamily: 'Gilroy, sans-serif',
                          fontWeight: 800,
                          fontSize: 'var(--text-xs)',
                          background: '#00068D',
                          color: '#fff',
                          minHeight: '44px',
                          letterSpacing: '0.04em',
                        }}
                      >
                        {adding ? '…' : 'AJOUTER'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Section 4 — Groupes (ADMIN uniquement) */}
                {isAdmin && (
                  <div>
                    <SectionLabel>Groupes membres</SectionLabel>
                    {groupMembers.length > 0 && (
                      <div className="space-y-0.5 mb-3">
                        {groupMembers.map((m) => (
                          <div
                            key={m.groupId}
                            className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-[#F2F2F2] group transition-colors"
                            style={{ minHeight: '44px' }}
                          >
                            <div className="w-8 h-8 rounded-full bg-[#F2F2F2] flex items-center justify-center flex-shrink-0">
                              <span style={{ fontSize: '0.85rem' }}>👥</span>
                            </div>
                            <span
                              className="flex-1 min-w-0 truncate"
                              style={{
                                fontFamily: 'Gilroy, sans-serif',
                                fontWeight: 800,
                                fontSize: 'var(--text-sm)',
                                color: '#0D0D0D',
                              }}
                            >
                              {m.group.label}
                            </span>
                            <RoleBadge role={m.role} />
                            <button
                              onClick={() => handleRemoveGroup(m.groupId)}
                              className="opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center rounded text-[#8A8A8A] hover:text-[#EF4444] hover:bg-red-50 transition-all flex-shrink-0"
                              aria-label="Retirer le groupe"
                              style={{ fontSize: '0.75rem' }}
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    {groupMembers.length === 0 && (
                      <div className="mb-3">
                        <EmptyHint>Aucun groupe pour le moment</EmptyHint>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <select
                        value={selectedGroupId}
                        onChange={(e) => setSelectedGroupId(e.target.value)}
                        className="flex-1 min-w-0 px-3 py-2 rounded-lg border border-[#D8D8D8] bg-[#FAFAFA] focus:outline-none focus:ring-2 focus:ring-[#2B2EB8]"
                        style={{
                          fontFamily: 'Source Serif Pro, Georgia, serif',
                          fontSize: 'var(--text-sm)',
                          minHeight: '44px',
                        }}
                      >
                        <option value="">Sélectionner un groupe…</option>
                        {groups.map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.label}
                          </option>
                        ))}
                      </select>
                      <select
                        value={groupRole}
                        onChange={(e) =>
                          setGroupRole(e.target.value as 'READER' | 'CONTRIBUTOR' | 'MANAGER')
                        }
                        className="px-3 py-2 rounded-lg border border-[#D8D8D8] bg-[#FAFAFA] focus:outline-none focus:ring-2 focus:ring-[#2B2EB8]"
                        style={{
                          fontFamily: 'Source Serif Pro, Georgia, serif',
                          fontSize: 'var(--text-sm)',
                          minHeight: '44px',
                        }}
                      >
                        <option value="READER">Lecteur</option>
                        <option value="CONTRIBUTOR">Contributeur</option>
                        <option value="MANAGER">Gestionnaire</option>
                      </select>
                      <button
                        onClick={handleAddGroup}
                        disabled={!selectedGroupId || addingGroup}
                        className="px-4 py-2 rounded-lg disabled:opacity-40 hover:opacity-90 transition-all flex-shrink-0"
                        style={{
                          fontFamily: 'Gilroy, sans-serif',
                          fontWeight: 800,
                          fontSize: 'var(--text-xs)',
                          background: '#00068D',
                          color: '#fff',
                          minHeight: '44px',
                          letterSpacing: '0.04em',
                        }}
                      >
                        {addingGroup ? '…' : '+ Groupe'}
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
