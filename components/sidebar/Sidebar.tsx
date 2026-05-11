'use client'

import { useEffect, useState } from 'react'

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

export default function Sidebar({ onSelectConversation, activeConversationId, onNewConversation, refreshKey }: SidebarProps) {
  const [activeTab, setActiveTab] = useState<'espace' | 'history' | 'inst'>('history')
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(false)
  const [connectorDrawerOpen, setConnectorDrawerOpen] = useState(false)
  // Simulated connector state — in production, fetched from /api/connectors
  const configuredConnectors = CONNECTORS.filter(c => c.id === '__none__') // none configured yet

  useEffect(() => {
    if (activeTab === 'history') {
      loadConversations()
    }
  }, [activeTab, refreshKey])

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

  const tabs = [
    { key: 'espace', label: 'MON ESPACE' },
    { key: 'history', label: 'HISTORIQUE' },
    { key: 'inst', label: 'INSTITUTIONNEL' },
  ] as const

  return (
    <div
      className="flex flex-col border-r border-[#D8D8D8] bg-[#FAFAFA] flex-shrink-0"
      style={{ width: 236 }}
    >
      {/* New conversation */}
      <div className="p-2.5 border-b border-[#D8D8D8]">
        <button
          onClick={onNewConversation}
          className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border border-[#D8D8D8] bg-white hover:bg-[#F0F1FB] hover:border-[#2B2EB8] transition-all"
          style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '0.6rem', letterSpacing: '0.05em', color: '#0D0D0D' }}
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
            style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '0.55rem', letterSpacing: '0.04em' }}
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
                  <span className="text-[9px] text-[#8A8A8A] uppercase tracking-widest"
                    style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800 }}>
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
                          <span className="text-[11px] text-[#3A3A3A]"
                            style={{ fontFamily: 'Source Serif Pro, Georgia, serif' }}>{c.name}</span>
                        </div>
                        <span className="text-[9px] text-[#2E7D32]"
                          style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800 }}>Lié</span>
                      </div>
                    ))}
                    <button className="text-[9px] text-[#8A8A8A] hover:text-[#00068D] px-2 py-1 transition-all"
                      style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 300 }}>
                      + Ajouter un connecteur
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* No connectors yet → show LIER buttons */
              <div>
                <p className="text-[9px] text-[#8A8A8A] uppercase tracking-widest mb-2"
                  style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800 }}>
                  Connecteurs
                </p>
                <div className="space-y-1.5">
                  {CONNECTORS.map((c) => (
                    <div key={c.id}
                      className="flex items-center justify-between px-2.5 py-2 rounded-lg bg-white border border-[#D8D8D8]">
                      <div className="flex items-center gap-2">
                        <span className="text-xs">{c.icon}</span>
                        <span className="text-[11px] text-[#3A3A3A]"
                          style={{ fontFamily: 'Source Serif Pro, Georgia, serif' }}>{c.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] text-[#8A8A8A] italic"
                          style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 300 }}>non connecté</span>
                        <button
                          className="text-[9px] px-1.5 py-0.5 rounded border border-[#D8D8D8] text-[#8A8A8A] hover:border-[#2B2EB8] hover:text-[#00068D] transition-all"
                          style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, letterSpacing: '0.03em' }}>
                          LIER
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div>
              <p className="text-[9px] text-[#8A8A8A] uppercase tracking-widest mb-2"
                style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800 }}>
                Espaces personnels
              </p>
              <p className="text-[11px] text-[#8A8A8A] italic leading-relaxed"
                style={{ fontFamily: 'Source Serif Pro, Georgia, serif' }}>
                Liez un connecteur pour importer vos documents et les utiliser comme sources.
              </p>
            </div>
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
                className="text-[11px] text-[#8A8A8A] italic text-center py-10 px-4 leading-relaxed"
                style={{ fontFamily: 'Source Serif Pro, Georgia, serif' }}
              >
                Vos conversations apparaîtront ici.
              </p>
            ) : (
              conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => onSelectConversation(conv.id)}
                  className={`w-full flex flex-col items-start gap-1 px-3 py-2.5 text-left transition-all border-l-2 ${
                    activeConversationId === conv.id
                      ? 'bg-[#E8E9F8] border-l-[#00068D]'
                      : 'border-l-transparent hover:bg-[#F2F2F2] hover:border-l-[#D8D8D8]'
                  }`}
                >
                  <span
                    className="text-[11px] text-[#0D0D0D] line-clamp-2 leading-relaxed w-full"
                    style={{ fontFamily: 'Source Serif Pro, Georgia, serif' }}
                  >
                    {conv.title || 'Conversation sans titre'}
                  </span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {conv.agentSlug && (
                      <span className="nl-token-agent" style={{ fontSize: '0.6rem' }}>
                        @{conv.agentSlug}
                      </span>
                    )}
                    <span
                      className="text-[10px] text-[#8A8A8A]"
                      style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 300 }}
                    >
                      {formatRelativeDate(conv.updatedAt)}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        )}

        {/* INSTITUTIONNEL */}
        {activeTab === 'inst' && (
          <div className="p-3 space-y-3">
            <p
              className="text-[9px] text-[#8A8A8A] uppercase tracking-widest"
              style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800 }}
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
                      className="text-[11px] text-[#3A3A3A]"
                      style={{ fontFamily: 'Source Serif Pro, Georgia, serif' }}
                    >
                      {s.label}
                    </p>
                    <p
                      className="text-[10px] text-[#8A8A8A]"
                      style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 300 }}
                    >
                      Lecture seule
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <p
              className="text-[11px] text-[#8A8A8A] italic leading-relaxed px-0.5"
              style={{ fontFamily: 'Source Serif Pro, Georgia, serif' }}
            >
              Ces espaces sont gérés par l'administration Sorbonne Nouvelle.
            </p>
          </div>
        )}

      </div>
    </div>
  )
}
