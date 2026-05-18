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
  onFolderToken?: (token: string) => void
  userRole?: string
}

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

export default function Sidebar({ onSelectConversation, activeConversationId, onNewConversation, refreshKey, userRole }: SidebarProps) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(false)
  const [hoveredConvId, setHoveredConvId] = useState<string | null>(null)
  const [deletingConvId, setDeletingConvId] = useState<string | null>(null)

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

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadConversations() }, [refreshKey]) // eslint-disable-line react-hooks/set-state-in-effect

  const showTools = userRole !== 'STUDENT'

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

      {/* Conversations list */}
      <div className="flex-1 overflow-y-auto nl-scroll py-1">
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
                <div className="flex items-center gap-2 px-3 py-2.5 border-l-2 border-l-[#EF4444] bg-red-50">
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
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => onSelectConversation(conv.id)}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onSelectConversation(conv.id) }}
                  className={`w-full flex flex-col items-start gap-1 px-3 py-2.5 text-left transition-all border-l-2 cursor-pointer ${
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
                        aria-label="Supprimer la conversation"
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
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Footer — tool links */}
      {showTools && (
        <div className="border-t border-[#D8D8D8] flex-shrink-0">
          <a
            href="/spaces"
            className="flex items-center gap-2.5 px-3 min-h-[44px] text-[#8A8A8A] hover:text-[#00068D] hover:bg-[#F0F1FB] transition-all"
            style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 300, fontSize: 'var(--text-xs)' }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></svg>
            Mes dossiers
          </a>
          <a
            href="/sessions"
            className="flex items-center gap-2.5 px-3 min-h-[44px] text-[#8A8A8A] hover:text-[#00068D] hover:bg-[#F0F1FB] transition-all"
            style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 300, fontSize: 'var(--text-xs)' }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
            Séances
          </a>
        </div>
      )}
    </div>
  )
}
