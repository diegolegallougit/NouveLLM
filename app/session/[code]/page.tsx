'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import Message, { MessageData } from '@/components/chat/Message'

interface SessionAgent {
  id: string
  slug: string
  label: string
  icon: string
  description: string
}

const VISIBILITY_BANNERS = [
  { icon: '🔒', text: 'Vos échanges sont confidentiels.', color: '#2E7D32', bg: '#E8F5E9', border: '#A5D6A7' },
  { icon: '📊', text: 'Des statistiques anonymes sont collectées.', color: '#5A5A5A', bg: '#F2F2F2', border: '#D8D8D8' },
  { icon: '📁', text: 'Vos échanges sont sauvegardés pour analyse pédagogique.', color: '#7A3200', bg: '#FFF3E0', border: '#FFD54F' },
  { icon: '👁', text: 'Votre enseignant peut lire vos échanges en direct.', color: '#7A0000', bg: '#FFEBEE', border: '#FFCDD2' },
]

interface SessionInfo {
  id: string
  code: string
  name: string
  description: string | null
  studentConsigne: string | null
  visibility: number
  systemPrompt: string | null
  validUntil: string
  access: string
  status: string
  ecName: string | null
  agents: SessionAgent[]
  sources: { slug: string; label: string; icon: string }[]
  isParticipant: boolean
  isGuest: boolean
  participantCount: number
}

export default function SessionPage() {
  const { code } = useParams<{ code: string }>()
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null)
  const [error, setError] = useState('')
  const [joined, setJoined] = useState(false)
  const [joining, setJoining] = useState(false)
  const [isGuest, setIsGuest] = useState(false)
  const [guestFirstName, setGuestFirstName] = useState('')
  const [guestLastName, setGuestLastName] = useState('')
  const [guestId, setGuestId] = useState('')
  const [selectedAgent, setSelectedAgent] = useState<SessionAgent | null>(null)
  const [messages, setMessages] = useState<MessageData[]>([])
  const [conversationId, setConversationId] = useState<string | undefined>()
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch(`/api/session/${code}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); return }
        setSessionInfo(d.session)
        setIsGuest(d.session.isGuest ?? false)
        if (d.session.isParticipant) setJoined(true)
        if (d.session.agents.length > 0) setSelectedAgent(d.session.agents[0])
      })
      .catch(() => setError('Impossible de charger la session'))
  }, [code])

  // Restore guest session from sessionStorage
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem('guest_session')
      if (stored) {
        const { firstName, lastName, id, sessionCode } = JSON.parse(stored) as {
          firstName: string; lastName: string; id: string; sessionCode: string
        }
        if (sessionCode === code) {
          setGuestFirstName(firstName)
          setGuestLastName(lastName)
          setGuestId(id)
          setJoined(true)
        }
      }
    } catch { /* ignore */ }
  }, [code])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function join() {
    setJoining(true)
    try {
      const res = await fetch(`/api/session/${code}/join`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Erreur'); return }
      setJoined(true)
    } finally {
      setJoining(false)
    }
  }

  function joinAsGuest() {
    if (!guestFirstName.trim() || !guestLastName.trim()) return
    const id = crypto.randomUUID()
    const payload = { firstName: guestFirstName.trim(), lastName: guestLastName.trim(), id, sessionCode: code }
    try { sessionStorage.setItem('guest_session', JSON.stringify(payload)) } catch { /* ignore */ }
    setGuestId(id)
    setJoined(true)
  }

  // Warn guest before closing tab if conversation has messages
  useEffect(() => {
    if (!isGuest || messages.length === 0) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isGuest, messages.length])

  const exportMarkdown = useCallback(() => {
    if (!sessionInfo || messages.length === 0) return
    const guestName = guestFirstName ? `${guestFirstName} ${guestLastName}` : 'Invité'
    const date = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
    const lines = [
      `# ${sessionInfo.name}`,
      ``,
      `**Activité IA** · ${date} · ${guestName}`,
      sessionInfo.ecName ? `Proposée par ${sessionInfo.ecName}` : '',
      ``,
      `---`,
      ``,
    ]
    for (const msg of messages) {
      if (msg.isStreaming) continue
      const role = msg.role === 'user' ? `**${guestName}**` : `**Assistant**`
      lines.push(`${role}`, ``, msg.content, ``, `---`, ``)
    }
    const blob = new Blob([lines.filter((_, i, a) => !(a[i - 1] === '' && _ === '' && a[i - 2] === '---')).join('\n')], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `activite-ia-${sessionInfo.code}-${date.replace(/ /g, '-')}.md`
    a.click()
    URL.revokeObjectURL(url)
  }, [sessionInfo, messages, guestFirstName, guestLastName])

  async function send() {
    if (!input.trim() || sending || !sessionInfo) return
    const text = input.trim()
    setInput('')
    setSending(true)

    const userMsg: MessageData = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      createdAt: new Date(),
    }
    const placeholderId = `assistant-${Date.now()}`
    const placeholder: MessageData = {
      id: placeholderId,
      role: 'assistant',
      content: '',
      isStreaming: true,
      agentUsed: selectedAgent?.slug,
    }
    setMessages(prev => [...prev, userMsg, placeholder])

    try {
      let res: Response
      if (isGuest) {
        res = await fetch(`/api/session/${code}/guest-chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: text,
            agentSlug: selectedAgent?.slug,
            conversationId,
            guestId: guestId || `guest-${code}`,
          }),
        })
      } else {
        res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: text,
            agentSlug: selectedAgent?.slug,
            conversationId,
            courseSessionId: sessionInfo.id,
          }),
        })
      }

      if (!res.ok || !res.body) {
        setMessages(prev => prev.map(m => m.id === placeholderId ? { ...m, content: 'Erreur de connexion', isStreaming: false } : m))
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const event = JSON.parse(line.slice(6))
            if (event.type === 'conv_id') {
              setConversationId(event.conversationId)
            } else if (event.type === 'chunk') {
              setMessages(prev => prev.map(m =>
                m.id === placeholderId ? { ...m, content: m.content + event.text } : m
              ))
            } else if (event.type === 'done') {
              // For guests, conversationId comes from done event (Dify conv ID)
              if (isGuest && event.conversationId) setConversationId(event.conversationId)
              setMessages(prev => prev.map(m =>
                m.id === placeholderId
                  ? { ...m, id: event.messageId ?? m.id, isStreaming: false, sources: event.sources }
                  : m
              ))
            }
          } catch { /* skip */ }
        }
      }
    } finally {
      setSending(false)
    }
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl border border-[#D8D8D8] p-8 max-w-sm w-full text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" /></svg>
          </div>
          <h2 style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '1rem', color: '#0D0D0D' }}>Activité IA introuvable</h2>
          <p style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: '0.85rem', color: '#8A8A8A' }}>{error}</p>
        </div>
      </div>
    )
  }

  if (!sessionInfo) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#00068D] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // Guest landing screen
  if (isGuest && !joined) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl border border-[#D8D8D8] p-8 max-w-md w-full space-y-6">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: '#00068D' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" /></svg>
            </div>
            <span style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '0.9rem', color: '#00068D', letterSpacing: '0.04em' }}>NouveLLM</span>
          </div>

          {/* Activity info */}
          <div className="space-y-1">
            <p style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '0.72rem', color: '#8A8A8A', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Activité IA</p>
            <h1 style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '1.1rem', color: '#0D0D0D' }}>{sessionInfo.name}</h1>
            <p style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: '0.78rem', color: '#8A8A8A' }}>
              {sessionInfo.ecName && `Proposée par ${sessionInfo.ecName} · `}
              Expire le {new Date(sessionInfo.validUntil).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
            </p>
          </div>

          {sessionInfo.description && (
            <p style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: '0.85rem', color: '#5A5A5A', lineHeight: 1.6 }}>
              {sessionInfo.description}
            </p>
          )}

          {/* Guest form */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-[#E8E8E8]" />
              <span style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: '0.75rem', color: '#8A8A8A' }}>Participer sans compte</span>
              <div className="flex-1 h-px bg-[#E8E8E8]" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '0.72rem', color: '#5A5A5A', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Prénom *</label>
                <input
                  type="text"
                  value={guestFirstName}
                  onChange={e => setGuestFirstName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') joinAsGuest() }}
                  placeholder="Marie"
                  className="w-full px-3 py-2.5 rounded-lg border border-[#D8D8D8] bg-[#FAFAFA] text-sm focus:outline-none focus:ring-2 focus:ring-[#2B2EB8]"
                  style={{ fontFamily: 'Source Serif Pro, Georgia, serif' }}
                />
              </div>
              <div className="space-y-1">
                <label style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '0.72rem', color: '#5A5A5A', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Nom *</label>
                <input
                  type="text"
                  value={guestLastName}
                  onChange={e => setGuestLastName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') joinAsGuest() }}
                  placeholder="Dupont"
                  className="w-full px-3 py-2.5 rounded-lg border border-[#D8D8D8] bg-[#FAFAFA] text-sm focus:outline-none focus:ring-2 focus:ring-[#2B2EB8]"
                  style={{ fontFamily: 'Source Serif Pro, Georgia, serif' }}
                />
              </div>
            </div>

            <button
              onClick={joinAsGuest}
              disabled={!guestFirstName.trim() || !guestLastName.trim()}
              className="w-full py-3 rounded-xl text-sm disabled:opacity-40 transition-all hover:opacity-90 flex items-center justify-center gap-2"
              style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, background: '#00068D', color: '#fff', letterSpacing: '0.04em' }}
            >
              REJOINDRE L&apos;ACTIVITÉ
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
            </button>
          </div>

          {/* Login link */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-[#E8E8E8]" />
              <span style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: '0.75rem', color: '#8A8A8A' }}>Vous avez un compte NouveLLM ?</span>
              <div className="flex-1 h-px bg-[#E8E8E8]" />
            </div>
            <a
              href={`/login?redirect=/session/${code}`}
              className="w-full py-2.5 rounded-xl text-sm border border-[#D8D8D8] hover:border-[#00068D] hover:text-[#00068D] transition-all flex items-center justify-center gap-2"
              style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, color: '#5A5A5A', letterSpacing: '0.04em' }}
            >
              SE CONNECTER
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
            </a>
          </div>
        </div>
      </div>
    )
  }

  // Join gate (authenticated users who haven't joined yet)
  if (!joined) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl border border-[#D8D8D8] p-8 max-w-md w-full space-y-6">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: '#00068D' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M12 3v18M3 12h18" /><path d="M5.6 5.6l12.8 12.8M5.6 18.4l12.8-12.8" /></svg>
            </div>
            <div>
              <h1 style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '1.1rem', color: '#0D0D0D' }}>
                {sessionInfo.name}
              </h1>
              {sessionInfo.ecName && (
                <p style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: '0.82rem', color: '#8A8A8A' }}>
                  Activité proposée par {sessionInfo.ecName}
                </p>
              )}
            </div>
          </div>

          {sessionInfo.description && (
            <p style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: '0.85rem', color: '#5A5A5A', lineHeight: 1.6 }}>
              {sessionInfo.description}
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            {sessionInfo.agents.map(a => (
              <span key={a.slug} className="flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-lg bg-[#E8E9F8] text-[#00068D]" style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800 }}>
                {a.icon} {a.label}
              </span>
            ))}
          </div>

          {/* Visibility banner on join gate */}
          {(() => {
            const vb = VISIBILITY_BANNERS[sessionInfo.visibility ?? 0]
            return (
              <div className="rounded-lg px-4 py-2.5 border" style={{ background: vb.bg, borderColor: vb.border }}>
                <p style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: '0.78rem', color: vb.color }}>
                  {vb.icon} {vb.text}
                </p>
                <p style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: '0.75rem', color: '#8A8A8A', marginTop: '0.25rem', fontStyle: 'italic' }}>
                  Cette activité IA ne donne pas lieu à une notation.
                </p>
              </div>
            )
          })()}

          <div className="flex items-center justify-between text-xs border-t border-[#F2F2F2] pt-4">
            <span style={{ fontFamily: 'Source Serif Pro, Georgia, serif', color: '#8A8A8A' }}>
              {sessionInfo.participantCount} participant{sessionInfo.participantCount !== 1 ? 's' : ''}
            </span>
            <span style={{ fontFamily: 'Source Serif Pro, Georgia, serif', color: '#8A8A8A' }}>
              Expire le {new Date(sessionInfo.validUntil).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
            </span>
          </div>

          <button
            onClick={join}
            disabled={joining}
            className="w-full py-3 rounded-xl text-sm disabled:opacity-50 transition-all hover:opacity-90"
            style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, background: '#00068D', color: '#fff', letterSpacing: '0.04em' }}
          >
            {joining ? 'Connexion…' : "REJOINDRE L'ACTIVITÉ IA"}
          </button>
        </div>
      </div>
    )
  }

  // Chat interface
  return (
    <div className="flex flex-col h-screen bg-[#FAFAFA]">
      {/* Session banner */}
      <div className="border-b border-[#D8D8D8] bg-white">
        <div className="flex items-center gap-3 px-5 py-2.5">
          <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: '#E8E9F8' }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#00068D" strokeWidth="2.5" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
          </div>
          <div className="flex-1 min-w-0">
            <span style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '0.72rem', color: '#00068D', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              Activité IA : {sessionInfo.name}
            </span>
            {sessionInfo.ecName && (
              <span style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: '0.7rem', color: '#8A8A8A', marginLeft: '0.75rem' }}>
                {sessionInfo.ecName}
              </span>
            )}
          </div>
          {isGuest && guestFirstName && (
            <span style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: '0.7rem', color: '#8A8A8A' }}>
              {guestFirstName} {guestLastName}
            </span>
          )}
          <span className="font-mono text-[10px] bg-[#F2F2F2] px-2 py-0.5 rounded text-[#5A5A5A]">{sessionInfo.code}</span>
          {isGuest && messages.length > 0 && (
            <button
              onClick={exportMarkdown}
              title="Exporter la conversation"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-[#D8D8D8] hover:border-[#00068D] hover:text-[#00068D] transition-all"
              style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '0.65rem', color: '#5A5A5A', letterSpacing: '0.04em', textTransform: 'uppercase' }}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
              Exporter
            </button>
          )}
        </div>
        {/* Visibility notice */}
        {(() => {
          const vb = VISIBILITY_BANNERS[sessionInfo.visibility ?? 0]
          return (
            <div className="px-5 py-1.5 flex items-center gap-2" style={{ background: vb.bg, borderTop: `1px solid ${vb.border}` }}>
              <span style={{ fontSize: '0.7rem' }}>{vb.icon}</span>
              <span style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: '0.7rem', color: vb.color }}>{vb.text}</span>
              <span style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: '0.7rem', color: '#8A8A8A', marginLeft: '0.5rem' }}>· Cette activité IA ne donne pas lieu à une notation.</span>
            </div>
          )
        })()}
      </div>

      {/* Agent selector */}
      {sessionInfo.agents.length > 1 && (
        <div className="flex gap-2 px-5 py-2 border-b border-[#F2F2F2] bg-white overflow-x-auto">
          {sessionInfo.agents.map(agent => (
            <button
              key={agent.slug}
              onClick={() => setSelectedAgent(agent)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] whitespace-nowrap transition-all flex-shrink-0 ${selectedAgent?.slug === agent.slug ? 'bg-[#00068D] text-white' : 'bg-[#F2F2F2] text-[#5A5A5A] hover:bg-[#E8E9F8] hover:text-[#00068D]'}`}
              style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800 }}
            >
              {agent.icon} {agent.label}
            </button>
          ))}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-6 space-y-6">
        {messages.length === 0 && (
          <div className="text-center pt-8">
            <p style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: '0.9rem', color: '#C8C8C8' }}>
              {sessionInfo.description ?? 'Posez votre première question…'}
            </p>
          </div>
        )}
        {messages.map(msg => (
          <Message key={msg.id} message={msg} />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-[#D8D8D8] bg-white px-5 py-4">
        <div className="flex items-end gap-3 max-w-3xl mx-auto">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
            placeholder={selectedAgent ? `Message à ${selectedAgent.label}…` : 'Votre message…'}
            rows={1}
            disabled={sending}
            className="flex-1 resize-none px-4 py-3 rounded-xl border border-[#D8D8D8] bg-[#FAFAFA] text-sm focus:outline-none focus:ring-2 focus:ring-[#2B2EB8] disabled:opacity-50"
            style={{ fontFamily: 'Source Serif Pro, Georgia, serif', minHeight: '44px', maxHeight: '160px' }}
          />
          <button
            onClick={send}
            disabled={sending || !input.trim()}
            className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-all disabled:opacity-40"
            style={{ background: '#00068D' }}
            aria-label="Envoyer"
          >
            {sending
              ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M22 2L11 13" /><path d="M22 2L15 22l-4-9-9-4 20-7z" /></svg>
            }
          </button>
        </div>
      </div>
    </div>
  )
}
