'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import Message, { MessageData, Source } from '@/components/chat/Message'
import ChatInput from '@/components/input/ChatInput'
import { AgentConfig } from '@/components/input/AgentPalette'
import { SourceConfig } from '@/components/input/SourcePalette'

interface Props {
  userName: string
  userRole: string
  userInitials: string
  userId: string
}

export default function ConversationPage({ userName, userRole, userInitials }: Props) {
  const [agents, setAgents] = useState<AgentConfig[]>([])
  const [sources, setSources] = useState<SourceConfig[]>([])
  const [messages, setMessages] = useState<MessageData[]>([])
  const [conversationId, setConversationId] = useState<string | undefined>()
  const [isStreaming, setIsStreaming] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Load config on mount
  useEffect(() => {
    Promise.all([
      fetch('/api/config/agents').then((r) => r.json()),
      fetch('/api/config/sources').then((r) => r.json()),
    ]).then(([agentData, sourceData]) => {
      setAgents(agentData.agents || [])
      setSources(sourceData.sources || [])
    })
  }, [])

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = useCallback(
    async (message: string, agentSlug?: string, sourceSlugs?: string[]) => {
      if (isStreaming) return

      const userMsg: MessageData = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: message,
        createdAt: new Date(),
      }

      const streamingId = `assistant-${Date.now()}`
      const streamingMsg: MessageData = {
        id: streamingId,
        role: 'assistant',
        content: '',
        agentUsed: agentSlug,
        isStreaming: true,
        createdAt: new Date(),
      }

      setMessages((prev) => [...prev, userMsg, streamingMsg])
      setIsStreaming(true)

      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message,
            agentSlug,
            sourceSlugs,
            conversationId,
          }),
        })

        if (!response.ok || !response.body) {
          throw new Error(`HTTP ${response.status}`)
        }

        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''
        let sources: Source[] = []
        let agentLabel: string | undefined

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            const raw = line.slice(6).trim()
            if (!raw) continue

            try {
              const event = JSON.parse(raw)

              if (event.type === 'conv_id') {
                setConversationId(event.conversationId)
              } else if (event.type === 'chunk') {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === streamingId ? { ...m, content: m.content + event.text } : m
                  )
                )
              } else if (event.type === 'done') {
                sources = event.sources || []
                agentLabel = event.agentLabel
              } else if (event.type === 'error') {
                throw new Error(event.message)
              }
            } catch {
              // skip malformed
            }
          }
        }

        // Finalize message
        setMessages((prev) =>
          prev.map((m) =>
            m.id === streamingId
              ? { ...m, isStreaming: false, sources, agentLabel }
              : m
          )
        )
      } catch (err) {
        console.error('Chat error:', err)
        setMessages((prev) =>
          prev.map((m) =>
            m.id === streamingId
              ? {
                  ...m,
                  isStreaming: false,
                  content: "Une erreur s'est produite. Veuillez réessayer.",
                  sources: [],
                }
              : m
          )
        )
      } finally {
        setIsStreaming(false)
      }
    },
    [isStreaming, conversationId]
  )

  function handleNewConversation() {
    setMessages([])
    setConversationId(undefined)
  }

  return (
    <div className="flex flex-col h-screen bg-white overflow-hidden">
      <Header userName={userName} userRole={userRole} userInitials={userInitials} />

      <div className="flex flex-1 min-h-0">
        {/* Main conversation area */}
        <div className="flex flex-col flex-1 min-w-0">
          {/* Scroll area */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto nl-scroll" style={{ background: '#ffffff' }}>
            {messages.length === 0 ? (
              <EmptyState agents={agents} onSuggest={handleSend} />
            ) : (
              <div className="max-w-[760px] mx-auto px-8 py-8 space-y-7">
                {messages.map((msg, i) => (
                  <Message
                    key={msg.id}
                    message={msg}
                    userName={userName}
                    userInitials={userInitials}
                    onRegenerate={
                      !msg.isStreaming && msg.role === 'assistant' && i === messages.length - 1
                        ? () => {
                            const lastUser = [...messages].reverse().find((m) => m.role === 'user')
                            if (lastUser) handleSend(lastUser.content)
                          }
                        : undefined
                    }
                  />
                ))}
                <div ref={bottomRef} />
              </div>
            )}
          </div>

          {/* Input */}
          <ChatInput
            agents={agents}
            sources={sources}
            onSend={handleSend}
            disabled={isStreaming}
          />
        </div>
      </div>

      <Footer />
    </div>
  )
}

function EmptyState({ agents, onSuggest }: { agents: AgentConfig[]; onSuggest: (msg: string, agent?: string) => void }) {
  const suggestions = [
    { text: 'Créer une bibliographie sur l\'IA en enseignement supérieur', agent: 'bibliographie', icon: '📚' },
    { text: 'Rédiger une fiche de cours ECTS pour un module Licence', agent: 'fiche-cours', icon: '📋' },
    { text: 'Concevoir un module pédagogique sur la sociolinguistique', agent: 'module', icon: '📖' },
    { text: 'Préparer un sujet d\'examen sur la traductologie', agent: 'examen', icon: '🎯' },
  ]

  return (
    <div className="flex flex-col items-center justify-center min-h-full py-16 px-8">
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#00068D] mb-6 shadow-md">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.4" strokeLinecap="round">
            <path d="M12 3v18M3 12h18" />
            <path d="M5.6 5.6l12.8 12.8M5.6 18.4l12.8-12.8" />
          </svg>
        </div>
        <h2 style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '1.5rem', letterSpacing: '-0.02em', color: '#0D0D0D' }}>
          Bonjour, comment puis-je vous aider ?
        </h2>
        <p className="mt-2 text-sm text-[#8A8A8A]" style={{ fontFamily: 'Source Serif Pro, Georgia, serif' }}>
          Posez une question, ou utilisez un agent <span className="nl-token-agent">@</span> pour des tâches structurées
        </p>
      </div>

      {agents.length > 0 && (
        <div className="grid grid-cols-2 gap-3 max-w-xl w-full">
          {suggestions.filter(s => agents.find(a => a.slug === s.agent)).map((s) => (
            <button
              key={s.agent}
              onClick={() => onSuggest(s.text, s.agent)}
              className="flex items-start gap-3 p-4 rounded-xl border border-[#D8D8D8] bg-white hover:bg-[#F0F1FB] hover:border-[#2B2EB8] transition-all text-left group"
            >
              <span className="text-xl flex-shrink-0">{s.icon}</span>
              <div>
                <p className="text-xs text-[#3A3A3A] leading-relaxed" style={{ fontFamily: 'Source Serif Pro, Georgia, serif' }}>
                  {s.text}
                </p>
                <span className="mt-1.5 inline-block nl-token-agent text-[10px]">@{s.agent}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
