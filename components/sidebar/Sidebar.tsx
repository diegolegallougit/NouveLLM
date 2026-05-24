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
  onClose?: () => void
  inDrawer?: boolean
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

const AGENT_BADGE_COLORS: Record<string, { bg: string; color: string }> = {
  analyse:      { bg: '#E8E9F8', color: '#00068D' },
  redaction:    { bg: '#E8F5E9', color: '#2E7D32' },
  traduction:   { bg: '#FFF8E1', color: '#F57F17' },
  bibliographie:{ bg: '#F3E5F5', color: '#7B1FA2' },
  examen:       { bg: '#FBE9E7', color: '#BF360C' },
}
function agentBadgeStyle(slug: string) {
  return AGENT_BADGE_COLORS[slug] ?? { bg: '#E8E9F8', color: '#00068D' }
}

type ConvGroup = { label: string; items: Conversation[] }

function groupConversations(list: Conversation[]): ConvGroup[] {
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const yesterdayStart = todayStart - 86400000
  const weekStart = todayStart - 6 * 86400000

  const groups: ConvGroup[] = [
    { label: "Aujourd'hui", items: [] },
    { label: 'Hier', items: [] },
    { label: 'Cette semaine', items: [] },
    { label: 'Plus ancien', items: [] },
  ]
  for (const conv of list) {
    const t = new Date(conv.updatedAt).getTime()
    if (t >= todayStart) groups[0].items.push(conv)
    else if (t >= yesterdayStart) groups[1].items.push(conv)
    else if (t >= weekStart) groups[2].items.push(conv)
    else groups[3].items.push(conv)
  }
  return groups.filter(g => g.items.length > 0)
}

const SettingsIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
)

export default function Sidebar({ onSelectConversation, activeConversationId, onNewConversation, refreshKey, userRole, onClose, inDrawer }: SidebarProps) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(false)
  const [hoveredConvId, setHoveredConvId] = useState<string | null>(null)
  const [deletingConvId, setDeletingConvId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

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
  useEffect(() => { loadConversations() }, [refreshKey])

  const showTools = userRole !== 'STUDENT'

  // STUDENT in drawer: Paramètres only
  if (inDrawer && !showTools) {
    return (
      <div className="flex flex-col h-full bg-[#FAFAFA]" style={{ width: 280 }}>
        <div className="flex-1" />
        <div className="border-t border-[#D8D8D8] py-1">
          <button
            onClick={() => { window.dispatchEvent(new CustomEvent('nl:open-settings')); onClose?.() }}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-[#8A8A8A] hover:bg-[#F2F2F2] transition-colors text-left"
            style={{ minHeight: 44, fontFamily: 'Gilroy, sans-serif', fontWeight: 300, fontSize: 'var(--text-xs)' }}
          >
            <SettingsIcon />
            Paramètres
          </button>
        </div>
      </div>
    )
  }

  const filtered = searchQuery
    ? conversations.filter(c => (c.title ?? '').toLowerCase().includes(searchQuery.toLowerCase()))
    : conversations

  function renderConvItem(conv: Conversation) {
    return (
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
          <a
            href={`/c/${conv.id}`}
            tabIndex={0}
            onClick={(e) => {
              if (!e.metaKey && !e.ctrlKey) {
                e.preventDefault()
                onSelectConversation(conv.id)
                onClose?.()
              }
            }}
            className={`w-full flex flex-col items-start gap-1 px-3 py-3 text-left transition-all border-l-2 cursor-pointer ${
              activeConversationId === conv.id
                ? 'bg-[#E8E9F8] border-l-[#00068D]'
                : 'border-l-transparent hover:bg-[#F2F2F2] hover:border-l-[#D8D8D8]'
            }`}
          >
            <div className="flex items-start justify-between w-full gap-1">
              <span
                className="text-[#0D0D0D] line-clamp-2 leading-relaxed flex-1"
                style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: inDrawer ? 'var(--text-xs)' : 'var(--text-base)' }}
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
              {conv.agentSlug && (() => {
                const { bg, color } = agentBadgeStyle(conv.agentSlug as string)
                return (
                  <span style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-2xs)', background: bg, color, borderRadius: 3, padding: '1px 5px' }}>
                    @{conv.agentSlug}
                  </span>
                )
              })()}
              <span className="text-[#8A8A8A]" style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 300, fontSize: 'var(--text-2xs)' }}>
                {formatRelativeDate(conv.updatedAt)}
              </span>
            </div>
          </a>
        )}
      </div>
    )
  }

  return (
    <div
      className="flex flex-col border-r border-[#D8D8D8] bg-[#FAFAFA] flex-shrink-0"
      style={{ width: inDrawer ? 280 : 'var(--sidebar-w)' }}
    >
      {/* New conversation button */}
      <div className={`flex-shrink-0 ${inDrawer ? 'px-3 pt-3 pb-2' : 'p-2.5 border-b border-[#D8D8D8]'}`}>
        <button
          onClick={onNewConversation}
          className="w-full flex items-center gap-2 transition-all"
          style={inDrawer
            ? {
                justifyContent: 'flex-start',
                padding: '10px 12px',
                borderRadius: 8,
                background: '#00068D',
                fontFamily: 'Gilroy, sans-serif',
                fontWeight: 800,
                fontSize: 'var(--text-xs)',
                color: 'white',
              }
            : {
                justifyContent: 'center',
                padding: '8px 12px',
                borderRadius: 8,
                border: '1px solid #D8D8D8',
                background: '#fff',
                fontFamily: 'Gilroy, sans-serif',
                fontWeight: 800,
                fontSize: 'var(--text-xs)',
                letterSpacing: '0.05em',
                color: '#0D0D0D',
              }
          }
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          {inDrawer ? 'Nouvelle conversation' : 'NOUVELLE CONVERSATION'}
        </button>
      </div>

      {/* Nav section — drawer only, non-STUDENT */}
      {inDrawer && showTools && (
        <>
          <hr className="border-[#E8E8E8] mx-3" />
          <div className="px-2 py-1 flex-shrink-0">
            <a
              href="/spaces"
              onClick={() => onClose?.()}
              className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-[#F4F4F8] transition-all text-[#0D0D0D]"
              style={{ minHeight: 48 }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00068D" strokeWidth="2" strokeLinecap="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></svg>
              <span style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-sm)' }}>Mes dossiers</span>
            </a>
            <a
              href="/sessions"
              onClick={() => onClose?.()}
              className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-[#F4F4F8] transition-all text-[#0D0D0D]"
              style={{ minHeight: 48 }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00068D" strokeWidth="2" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
              <span style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-sm)' }}>Mes séances</span>
            </a>
          </div>
          <hr className="border-[#E8E8E8] mx-3 mb-1" />
        </>
      )}

      {/* Search bar — drawer et desktop */}
      {inDrawer ? (
        <div className="px-3 pt-2 pb-2 flex-shrink-0">
          <div className="relative">
            <svg
              width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#8A8A8A" strokeWidth="2.5" strokeLinecap="round"
              className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
            >
              <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Rechercher..."
              className="w-full pl-8 pr-3 rounded-lg bg-[#F2F2F2] text-[#0D0D0D] placeholder:text-[#8A8A8A] focus:outline-none"
              style={{ height: 36, fontFamily: 'Gilroy, sans-serif', fontWeight: 300, fontSize: 'var(--text-xs)', border: 'none' }}
            />
          </div>
        </div>
      ) : (
        <div className="flex-shrink-0" style={{ padding: '0 8px 6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, height: 32, background: '#F2F2F2', borderRadius: 8, padding: '0 10px' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#8A8A8A" strokeWidth="2.5" strokeLinecap="round" style={{ flexShrink: 0 }}>
              <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Rechercher..."
              style={{ background: 'transparent', border: 'none', fontSize: 'var(--text-xs)', color: '#0D0D0D', flex: 1, outline: 'none', fontFamily: 'Gilroy, sans-serif' }}
            />
          </div>
        </div>
      )}

      {/* Conversations list */}
      <div className="flex-1 overflow-y-auto nl-scroll py-1">
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <span className="nl-spinner" />
          </div>
        ) : filtered.length === 0 ? (
          <p
            className="text-[#8A8A8A] italic text-center py-10 px-4 leading-relaxed"
            style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: 'var(--text-xs)' }}
          >
            {searchQuery ? 'Aucun résultat.' : 'Vos conversations apparaîtront ici.'}
          </p>
        ) : inDrawer ? (
          groupConversations(filtered).map(group => (
            <div key={group.label}>
              <p
                className="px-3 pt-3 pb-1.5"
                style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 300, fontSize: 'var(--text-2xs)', letterSpacing: '0.08em', color: '#8A8A8A', textTransform: 'uppercase' }}
              >
                {group.label}
              </p>
              {group.items.map(conv => renderConvItem(conv))}
            </div>
          ))
        ) : (
          filtered.map(conv => renderConvItem(conv))
        )}
      </div>

      {/* Desktop footer — tool links */}
      {showTools && !inDrawer && (
        <div className="border-t border-[#D8D8D8] flex-shrink-0 px-2 py-2 flex flex-col gap-1">
          <a
            href="/spaces"
            className="flex items-center gap-2.5 px-3 rounded-lg transition-all bg-[#E8E9F8] text-[#00068D] hover:bg-[#00068D] hover:text-white"
            style={{ minHeight: 52, fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-xs)' }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></svg>
            Mes dossiers
          </a>
          <a
            href="/sessions"
            className="flex items-center gap-2.5 px-3 rounded-lg transition-all bg-[#E8E9F8] text-[#00068D] hover:bg-[#00068D] hover:text-white"
            style={{ minHeight: 52, fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-xs)' }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
            Séances
          </a>
          <a
            href="/agents"
            className="flex items-center gap-2.5 px-3 rounded-lg transition-all bg-[#FFF8E1] text-[#E65100] hover:bg-[#E65100] hover:text-white"
            style={{ minHeight: 52, fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-xs)' }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
            </svg>
            Agents
          </a>
          <a
            href="/session/AIDE-2026"
            className="flex items-center gap-2.5 px-3 rounded-lg transition-all bg-[#F3E5F5] text-[#7B1FA2] hover:bg-[#7B1FA2] hover:text-white"
            style={{ minHeight: 52, fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-xs)' }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
              <circle cx="12" cy="17" r="0.5" fill="currentColor" />
            </svg>
            Assistance
          </a>
        </div>
      )}

      {/* Drawer footer — Paramètres */}
      {inDrawer && (
        <div className="border-t border-[#D8D8D8] flex-shrink-0 py-1">
          <button
            onClick={() => { window.dispatchEvent(new CustomEvent('nl:open-settings')); onClose?.() }}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-[#8A8A8A] hover:bg-[#F2F2F2] transition-colors text-left"
            style={{ minHeight: 44, fontFamily: 'Gilroy, sans-serif', fontWeight: 300, fontSize: 'var(--text-xs)' }}
          >
            <SettingsIcon />
            Paramètres
          </button>
        </div>
      )}
    </div>
  )
}
