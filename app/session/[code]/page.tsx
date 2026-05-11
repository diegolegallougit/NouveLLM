'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import Message, { MessageData } from '@/components/chat/Message'

interface SessionAgent {
  id: string
  slug: string
  label: string
  icon: string
  description: string
}

interface SessionInfo {
  id: string
  code: string
  name: string
  description: string | null
  systemPrompt: string | null
  validUntil: string
  access: string
  status: string
  ecName: string | null
  agents: SessionAgent[]
  sources: { slug: string; label: string; icon: string }[]
  isParticipant: boolean
  participantCount: number
}

export default function SessionPage() {
  const { code } = useParams<{ code: string }>()
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null)
  const [error, setError] = useState('')
  const [joined, setJoined] = useState(false)
  const [joining, setJoining] = useState(false)
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
        if (d.session.isParticipant) setJoined(true)
        if (d.session.agents.length > 0) setSelectedAgent(d.session.agents[0])
      })
      .catch(() => setError('Impossible de charger la session'))
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
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          agentSlug: selectedAgent?.slug,
          conversationId,
          courseSessionId: sessionInfo.id,
        }),
      })

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
            if (event.type === 'conv_id') setConversationId(event.conversationId)
            else if (event.type === 'chunk') {
              setMessages(prev => prev.map(m =>
                m.id === placeholderId ? { ...m, content: m.content + event.text } : m
              ))
            } else if (event.type === 'done') {
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
          <h2 style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '1rem', color: '#0D0D0D' }}>Session introuvable</h2>
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

  // Join gate
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
                  Organisée par {sessionInfo.ecName}
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
            {joining ? 'Connexion…' : 'REJOINDRE LA SESSION'}
          </button>
        </div>
      </div>
    )
  }

  // Chat interface
  return (
    <div className="flex flex-col h-screen bg-[#FAFAFA]">
      {/* Session banner */}
      <div className="flex items-center gap-3 px-5 py-2.5 border-b border-[#D8D8D8] bg-white">
        <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: '#E8E9F8' }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#00068D" strokeWidth="2.5" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
        </div>
        <div className="flex-1 min-w-0">
          <span style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '0.72rem', color: '#00068D', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            Session : {sessionInfo.name}
          </span>
          {sessionInfo.ecName && (
            <span style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: '0.7rem', color: '#8A8A8A', marginLeft: '0.75rem' }}>
              {sessionInfo.ecName}
            </span>
          )}
        </div>
        <span className="font-mono text-[10px] bg-[#F2F2F2] px-2 py-0.5 rounded text-[#5A5A5A]">{sessionInfo.code}</span>
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
