'use client'

import { useEffect, useState, useRef } from 'react'
import SpaceTree, { SpaceData } from '@/components/spaces/SpaceTree'

interface Conversation {
  id: string
  title: string | null
  agentSlug: string | null
  createdAt: string
  updatedAt: string
}

interface SidebarProps {
  onSelectConversation: (id: string) => void
  activeConversationId?: string
  onNewConversation: () => void
  refreshKey?: number
  onFolderToken?: (token: string) => void
  userRole?: string
}

const CONNECTORS = [
  { id: 'gdrive', name: 'Google Drive', icon: '📁' },
  { id: 'notion', name: 'Notion', icon: '📝' },
  { id: 'nextcloud', name: 'Nextcloud USN', icon: '☁️' },
  { id: 'onedrive', name: 'OneDrive', icon: '🔷' },
]

const INST_SPACES = [
  { id: 'ufr', label: 'Documents UFR', icon: '🏛️' },
  { id: 'chartes', label: 'Chartes & règlements', icon: '📜' },
  { id: 'formations', label: 'Catalogue formations', icon: '🎓' },
]

function formatRelativeDate(dateStr: string) {
  const date = new Date(dateStr)
  const diff = Date.now() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 2) return "À l'instant"
  if (minutes < 60) return `Il y a ${minutes}min`
  if (hours < 24) return `Il y a ${hours}h`
  if (days === 1) return 'Hier'
  if (days < 7) return `Il y a ${days}j`
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

export default function Sidebar({ onSelectConversation, activeConversationId, onNewConversation, refreshKey, onFolderToken, userRole }: SidebarProps) {
  const [activeTab, setActiveTab] = useState<'espace' | 'history' | 'inst'>('history')
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(false)
  const [connectorDrawerOpen, setConnectorDrawerOpen] = useState(false)
  const [notionModal, setNotionModal] = useState(false)
  const [notionTokenInput, setNotionTokenInput] = useState('')
  const [notionConnecting, setNotionConnecting] = useState(false)
  const [notionError, setNotionError] = useState('')
  const [notionConnected, setNotionConnected] = useState(false)
  const [gdriveConnected, setGdriveConnected] = useState(false)
  const notionInputRef = useRef<HTMLInputElement>(null)
  const [spaces, setSpaces] = useState<SpaceData[]>([])
  const [spacesRefreshKey, setSpacesRefreshKey] = useState(0)
  const [creatingSpace, setCreatingSpace] = useState(false)
  const [newSpaceName, setNewSpaceName] = useState('')
  const [hoveredConvId, setHoveredConvId] = useState<string | null>(null)
  const [deletingConvId, setDeletingConvId] = useState<string | null>(null)
  const configuredConnectors = CONNECTORS.filter(c =>
    (c.id === 'notion' && notionConnected) || (c.id === 'gdrive' && gdriveConnected)
  )

  async function checkNotionStatus() {
    try {
      const r = await fetch('/api/connectors/notion/connect')
      const data = await r.json()
      setNotionConnected(data.connected ?? false)
    } catch { /* silent */ }
  }

  async function checkGdriveStatus() {
    try {
      const r = await fetch('/api/connectors/gdrive/connect')
      const data = await r.json()
      setGdriveConnected(data.connected ?? false)
    } catch { /* silent */ }
  }

  async function disconnectGdrive() {
    await fetch('/api/connectors/gdrive/connect', { method: 'DELETE' })
    setGdriveConnected(false)
  }

  async function connectNotion() {
    if (!notionTokenInput.trim()) return
    setNotionConnecting(true)
    setNotionError('')
    try {
      const r = await fetch('/api/connectors/notion/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: notionTokenInput.trim() }),
      })
      if (!r.ok) {
        const d = await r.json()
        setNotionError(d.error ?? 'Erreur inconnue')
        return
      }
      setNotionConnected(true)
      setNotionModal(false)
      setNotionTokenInput('')
    } finally {
      setNotionConnecting(false)
    }
  }

  async function disconnectNotion() {
    await fetch('/api/connectors/notion/connect', { method: 'DELETE' })
    setNotionConnected(false)
  }

  async function loadSpaces() {
    try {
      const r = await fetch('/api/spaces')
      const data = await r.json()
      setSpaces(data.spaces ?? [])
    } catch { /* silent */ }
  }

  async function loadConversations() {
    setLoading(true)
    try {
      const r = await fetch('/api/conversations')
      const data = await r.json()
      setConversations(data.conversations || [])
    } finally {
      setLoading(false)
    }
  }

  async function deleteConversation(id: string) {
    await fetch(`/api/conversations/${id}`, { method: 'DELETE' })
    setConversations(prev => prev.filter(c => c.id !== id))
    setDeletingConvId(null)
    setHoveredConvId(null)
  }

  async function handleCreateSpace() {
    if (!newSpaceName.trim()) return
    await fetch('/api/spaces', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newSpaceName.trim() }),
    })
    setNewSpaceName('')
    setCreatingSpace(false)
    setSpacesRefreshKey(k => k + 1)
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { // eslint-disable-line react-hooks/set-state-in-effect
    checkNotionStatus()
    checkGdriveStatus()
    // Handle OAuth callback redirect with query param
    const params = new URLSearchParams(window.location.search)
    if (params.get('gdrive_connected') === '1') {
      setGdriveConnected(true)
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (activeTab === 'history') loadConversations() // eslint-disable-line react-hooks/set-state-in-effect
    if (activeTab === 'espace' && userRole !== 'STUDENT') loadSpaces() // eslint-disable-line react-hooks/set-state-in-effect
  }, [activeTab, refreshKey])

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (activeTab === 'espace' && userRole !== 'STUDENT') loadSpaces() // eslint-disable-line react-hooks/set-state-in-effect
  }, [spacesRefreshKey])

  const tabs = [
    { key: 'espace', label: 'MON ESPACE' },
    { key: 'history', label: 'HISTORIQUE' },
    { key: 'inst', label: 'INSTITUTIONNEL' },
  ] as const

  return (
    <div
      className="flex flex-col border-r border-[#D8D8D8] bg-[#FAFAFA] flex-shrink-0"
      style={{ width: 'var(--sidebar-w)' }}
    >
      {/* New conversation */}
      <div className="p-2.5 border-b border-[#D8D8D8]">
        <button
          onClick={onNewConversation}
          className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border border-[#D8D8D8] bg-white hover:bg-[#F0F1FB] hover:border-[#2B2EB8] transition-all"
          style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-xs)', letterSpacing: '0.05em', color: '#0D0D0D' }}
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          NOUVELLE CONVERSATION
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#D8D8D8] flex-shrink-0">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-2.5 transition-all border-b-2 ${
              activeTab === tab.key
                ? 'border-[#00068D] text-[#00068D]'
                : 'border-transparent text-[#8A8A8A] hover:text-[#0D0D0D]'
            }`}
            style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-xs)', letterSpacing: '0.04em' }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto nl-scroll">

        {/* MON ESPACE */}
        {activeTab === 'espace' && (
          <div className="p-3 space-y-4">
            {configuredConnectors.length > 0 ? (
              /* Progressive disclosure: connectors configured → collapse into drawer */
              <div>
                <button
                  onClick={() => setConnectorDrawerOpen(o => !o)}
                  className="flex items-center justify-between w-full px-2 py-1.5 rounded-lg hover:bg-[#F2F2F2] transition-all"
                >
                  <span className="text-[#8A8A8A] uppercase tracking-widest"
                    style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-2xs)' }}>
                    Sources externes ⚙
                  </span>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#8A8A8A" strokeWidth="2.5"
                    className={`transition-transform ${connectorDrawerOpen ? 'rotate-180' : ''}`}>
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>
                {connectorDrawerOpen && (
                  <div className="space-y-1.5 mt-2">
                    {configuredConnectors.map((c) => (
                      <div key={c.id} className="flex items-center justify-between px-2.5 py-2 rounded-lg bg-white border border-[#D8D8D8]">
                        <div className="flex items-center gap-2">
                          <span className="text-xs">{c.icon}</span>
                          <span className="text-[#3A3A3A]"
                            style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: 'var(--text-sm)' }}>{c.name}</span>
                        </div>
                        <span className="text-[#2E7D32]"
                          style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-2xs)' }}>Lié</span>
                      </div>
                    ))}
                    <button className="text-[#8A8A8A] hover:text-[#00068D] px-2 py-1 transition-all"
                      style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 300, fontSize: 'var(--text-2xs)' }}>
                      + Ajouter un connecteur
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* No connectors yet → show LIER buttons */
              <div>
                <p className="text-[#8A8A8A] uppercase tracking-widest mb-2"
                  style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-2xs)' }}>
                  Connecteurs
                </p>
                <div className="space-y-1.5">
                  {CONNECTORS.map((c) => {
                    const isNotion = c.id === 'notion'
                    const isGdrive = c.id === 'gdrive'
                    const connected = (isNotion && notionConnected) || (isGdrive && gdriveConnected)
                    const canConnect = isNotion || isGdrive
                    const handleConnect = isNotion
                      ? () => { setNotionError(''); setNotionModal(true); setTimeout(() => notionInputRef.current?.focus(), 50) }
                      : isGdrive
                      ? () => { window.location.href = '/api/connectors/gdrive/init' }
                      : undefined
                    const handleDisconnect = isNotion ? disconnectNotion : isGdrive ? disconnectGdrive : undefined
                    return (
                      <div key={c.id}
                        className="flex items-center justify-between px-2.5 py-2 rounded-lg bg-white border border-[#D8D8D8]">
                        <div className="flex items-center gap-2">
                          <span className="text-xs">{c.icon}</span>
                          <span className="text-[#3A3A3A]"
                            style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: 'var(--text-sm)' }}>{c.name}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {connected ? (
                            <>
                              <span className="text-[#2E7D32]"
                                style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-2xs)' }}>Lié</span>
                              <button onClick={handleDisconnect}
                                className="px-1.5 py-0.5 rounded border border-[#D8D8D8] text-[#8A8A8A] hover:border-red-400 hover:text-red-600 transition-all"
                                style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-2xs)' }}>
                                ✕
                              </button>
                            </>
                          ) : (
                            <>
                              <span className="text-[#8A8A8A] italic"
                                style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 300, fontSize: 'var(--text-2xs)' }}>non connecté</span>
                              <button
                                onClick={handleConnect}
                                disabled={!canConnect}
                                className="px-1.5 py-0.5 rounded border border-[#D8D8D8] text-[#8A8A8A] hover:border-[#2B2EB8] hover:text-[#00068D] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                                style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-2xs)', letterSpacing: '0.03em' }}>
                                LIER
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
            {userRole !== 'STUDENT' && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-[#8A8A8A] uppercase tracking-widest"
                    style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-2xs)' }}>
                    Espaces documentaires
                  </p>
                  <button
                    onClick={() => setCreatingSpace(v => !v)}
                    className="w-5 h-5 flex items-center justify-center rounded text-[#8A8A8A] hover:text-[#00068D] hover:bg-[#E8E9F8] transition-all"
                    title="Nouvel espace">
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
                  </button>
                </div>

                {creatingSpace && (
                  <div className="flex items-center gap-1 mb-2 bg-[#F8F8FF] p-1.5 rounded-lg">
                    <input
                      autoFocus
                      value={newSpaceName}
                      onChange={e => setNewSpaceName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleCreateSpace(); if (e.key === 'Escape') setCreatingSpace(false) }}
                      placeholder="Nom de l'espace"
                      className="flex-1 min-w-0 px-1.5 py-0.5 rounded border border-[#D8D8D8] focus:outline-none focus:ring-1 focus:ring-[#2B2EB8]"
                      style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: 'var(--text-sm)' }}
                    />
                    <button onClick={handleCreateSpace}
                      className="px-2 py-0.5 rounded bg-[#00068D] text-white flex-shrink-0"
                      style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-2xs)' }}>OK</button>
                    <button onClick={() => setCreatingSpace(false)}
                      className="px-1 text-[#8A8A8A]"
                      style={{ fontSize: 'var(--text-2xs)' }}>✕</button>
                  </div>
                )}

                {spaces.length === 0 && !creatingSpace ? (
                  <p className="text-[#C8C8C8] italic"
                    style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: 'var(--text-2xs)' }}>
                    Aucun espace — cliquez + pour en créer un.
                  </p>
                ) : (
                  <div className="space-y-1">
                    {spaces.map(space => (
                      <SpaceTree
                        key={space.id}
                        space={space}
                        onFolderToken={onFolderToken}
                        onRefresh={() => setSpacesRefreshKey(k => k + 1)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* HISTORIQUE */}
        {activeTab === 'history' && (
          <div className="py-1">
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <span className="nl-spinner" />
              </div>
            ) : conversations.length === 0 ? (
              <p
                className="text-[#8A8A8A] italic text-center py-10 px-4 leading-relaxed"
                style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: 'var(--text-xs)' }}
              >
                Vos conversations apparaîtront ici.
              </p>
            ) : (
              conversations.map((conv) => (
                <div
                  key={conv.id}
                  className="relative"
                  onMouseEnter={() => setHoveredConvId(conv.id)}
                  onMouseLeave={() => { if (deletingConvId !== conv.id) setHoveredConvId(null) }}
                >
                  {deletingConvId === conv.id ? (
                    <div className={`flex items-center gap-2 px-3 py-2.5 border-l-2 border-l-[#EF4444] bg-red-50`}>
                      <span className="flex-1 text-[#EF4444]" style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: 'var(--text-xs)' }}>
                        Supprimer ?
                      </span>
                      <button
                        onClick={() => deleteConversation(conv.id)}
                        className="px-2 py-0.5 rounded bg-[#EF4444] text-white transition-all hover:bg-red-700"
                        style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-2xs)' }}
                      >
                        Oui
                      </button>
                      <button
                        onClick={() => { setDeletingConvId(null); setHoveredConvId(null) }}
                        className="px-2 py-0.5 rounded border border-[#D8D8D8] text-[#5A5A5A] hover:bg-[#F2F2F2] transition-all"
                        style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-2xs)' }}
                      >
                        Non
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => onSelectConversation(conv.id)}
                      className={`w-full flex flex-col items-start gap-1 px-3 py-2.5 text-left transition-all border-l-2 ${
                        activeConversationId === conv.id
                          ? 'bg-[#E8E9F8] border-l-[#00068D]'
                          : 'border-l-transparent hover:bg-[#F2F2F2] hover:border-l-[#D8D8D8]'
                      }`}
                    >
                      <div className="flex items-start justify-between w-full gap-1">
                        <span
                          className="text-[#0D0D0D] line-clamp-2 leading-relaxed flex-1"
                          style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: 'var(--text-sm)' }}
                        >
                          {conv.title || 'Conversation sans titre'}
                        </span>
                        {hoveredConvId === conv.id && (
                          <button
                            onClick={e => { e.stopPropagation(); setDeletingConvId(conv.id) }}
                            className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded text-[#C8C8C8] hover:text-[#EF4444] hover:bg-red-50 transition-all"
                            title="Supprimer"
                          >
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" /></svg>
                          </button>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {conv.agentSlug && (
                          <span className="nl-token-agent">
                            @{conv.agentSlug}
                          </span>
                        )}
                        <span
                          className="text-[#8A8A8A]"
                          style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 300, fontSize: 'var(--text-2xs)' }}
                        >
                          {formatRelativeDate(conv.updatedAt)}
                        </span>
                      </div>
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* INSTITUTIONNEL */}
        {activeTab === 'inst' && (
          <div className="p-3 space-y-3">
            <p
              className="text-[#8A8A8A] uppercase tracking-widest"
              style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-2xs)' }}
            >
              Espaces partagés USN
            </p>
            <div className="space-y-1.5">
              {INST_SPACES.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center gap-2.5 px-2.5 py-2.5 rounded-lg bg-white border border-[#D8D8D8] opacity-50 cursor-not-allowed"
                >
                  <span className="text-sm">{s.icon}</span>
                  <div>
                    <p
                      className="text-[#3A3A3A]"
                      style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: 'var(--text-sm)' }}
                    >
                      {s.label}
                    </p>
                    <p
                      className="text-[#8A8A8A]"
                      style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 300, fontSize: 'var(--text-2xs)' }}
                    >
                      Lecture seule
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <p
              className="text-[#8A8A8A] italic leading-relaxed px-0.5"
              style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: 'var(--text-xs)' }}
            >
              Ces espaces sont gérés par l&apos;administration Sorbonne Nouvelle.
            </p>
          </div>
        )}

      </div>

      {/* Notion connect modal */}
      {notionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={e => { if (e.target === e.currentTarget) setNotionModal(false) }}>
          <div className="bg-white rounded-2xl shadow-xl p-6 w-80 space-y-4 mx-4">
            <div>
              <h3 style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-md)', color: '#0D0D0D' }}>
                Lier Notion
              </h3>
              <p style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: 'var(--text-sm)', color: '#8A8A8A', marginTop: '0.25rem', lineHeight: 1.5 }}>
                Créez une intégration sur <strong>notion.so/my-integrations</strong>, partagez vos pages avec elle, puis collez le token ci-dessous.
              </p>
            </div>
            <div>
              <label className="block text-[#8A8A8A] mb-1.5 uppercase tracking-widest"
                style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-2xs)' }}>
                Token d&apos;intégration
              </label>
              <input
                ref={notionInputRef}
                type="password"
                value={notionTokenInput}
                onChange={e => { setNotionTokenInput(e.target.value); setNotionError('') }}
                onKeyDown={e => { if (e.key === 'Enter') connectNotion(); if (e.key === 'Escape') setNotionModal(false) }}
                placeholder="secret_xxxxxxxxxxxxxxxx"
                className="w-full px-3 py-2 rounded-lg border border-[#D8D8D8] focus:outline-none focus:ring-2 focus:ring-[#2B2EB8] font-mono"
                style={{ fontSize: 'var(--text-sm)' }}
              />
              {notionError && (
                <p className="text-red-600 mt-1"
                  style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: 'var(--text-xs)' }}>{notionError}</p>
              )}
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setNotionModal(false)}
                className="flex-1 py-2 rounded-xl border border-[#D8D8D8] text-[#8A8A8A] hover:bg-[#F2F2F2] transition-all"
                style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-xs)' }}>
                Annuler
              </button>
              <button
                onClick={connectNotion}
                disabled={notionConnecting || !notionTokenInput.trim()}
                className="flex-1 py-2 rounded-xl bg-[#00068D] text-white hover:bg-[#2B2EB8] transition-all disabled:opacity-50"
                style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-xs)' }}>
                {notionConnecting ? 'Connexion…' : 'Lier'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
