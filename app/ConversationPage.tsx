'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import BottomNav from '@/components/layout/BottomNav'
import Message, { MessageData, Source } from '@/components/chat/Message'
import ChatInput from '@/components/input/ChatInput'
import Sidebar from '@/components/sidebar/Sidebar'
import OnboardingModal from '@/components/onboarding/OnboardingModal'
import RoutingPanel from '@/components/routing/RoutingPanel'
import { AgentConfig } from '@/components/input/AgentPalette'
import { SourceConfig } from '@/components/input/SourcePalette'

interface Props {
  userName: string
  userRole: string
  userInitials: string
  userId: string
  needsOnboarding?: boolean
}

export default function ConversationPage({ userName, userRole, userInitials, needsOnboarding = false }: Props) {
  const [agents, setAgents] = useState<AgentConfig[]>([])
  const [sources, setSources] = useState<SourceConfig[]>([])
  const [messages, setMessages] = useState<MessageData[]>([])
  const [conversationId, setConversationId] = useState<string | undefined>()
  const [isStreaming, setIsStreaming] = useState(false)
  const [sidebarRefreshKey, setSidebarRefreshKey] = useState(0)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [onboardingDone, setOnboardingDone] = useState(false)
  const [expertMode, setExpertMode] = useState(false)
  const [pendingAgent, setPendingAgent] = useState<string | null | undefined>(undefined)
  const [activeMetaPrompt, setActiveMetaPrompt] = useState<{ id: string; title: string } | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  const isStudent = userRole === 'STUDENT'
  const showSidebar = !isStudent
  const showOnboarding = isStudent && needsOnboarding && !onboardingDone

  useEffect(() => {
    async function loadConfig() {
      const [agentData, sourceData] = await Promise.all([
        fetch('/api/config/agents').then((r) => r.json()),
        fetch('/api/config/sources').then((r) => r.json()),
      ])
      setAgents(agentData.agents || [])
      const institutionalSources: SourceConfig[] = sourceData.sources || []

      if (!isStudent) {
        const spacesData = await fetch('/api/spaces').then(r => r.json())
        const folderSources: SourceConfig[] = (spacesData.spaces ?? []).flatMap((space: {
          slug: string; name: string; folders: { slug: string; name: string; _count: { documents: number } }[]
        }) =>
          space.folders.map(folder => ({
            slug: `${space.slug}/${folder.slug}`,
            label: folder.name,
            icon: '📂',
            description: folder.name,
            docCount: folder._count?.documents ?? 0,
            access: 'PERSONAL',
            isFolder: true,
            spaceName: space.name,
          }))
        )
        setSources([...institutionalSources, ...folderSources])
      } else {
        setSources(institutionalSources)
      }
    }
    loadConfig()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    fetch('/api/meta-prompts/active')
      .then((r) => r.json())
      .then((data) => setActiveMetaPrompt(data.active ?? null))
      .catch(() => {})
  }, [])

  async function handleDeactivateMetaPrompt() {
    await fetch('/api/meta-prompts/active', { method: 'DELETE' })
    setActiveMetaPrompt(null)
  }

  async function handleActivateMetaPrompt(id: string, title: string) {
    await fetch(`/api/meta-prompts/${id}/activate`, { method: 'POST' })
    setActiveMetaPrompt({ id, title })
  }

  async function loadConversation(convId: string) {
    try {
      const r = await fetch(`/api/conversations/${convId}`)
      const data = await r.json()
      if (!data.conversation) return

      const msgs: MessageData[] = data.conversation.messages.map((m: {
        id: string
        role: string
        content: string
        agentUsed?: string
        sources?: string
        createdAt: string
      }) => ({
        id: m.id,
        role: m.role === 'USER' ? 'user' : 'assistant',
        content: m.content,
        agentUsed: m.agentUsed || undefined,
        agentLabel: m.agentUsed ? agents.find((a) => a.slug === m.agentUsed)?.label : undefined,
        sources: m.sources ? JSON.parse(m.sources) : undefined,
        createdAt: new Date(m.createdAt),
      }))

      setMessages(msgs)
      setConversationId(convId)
    } catch (err) {
      console.error('Failed to load conversation:', err)
    }
  }

  function handleNewConversation() {
    setMessages([])
    setConversationId(undefined)
    setExpertMode(false)
    setPendingAgent(undefined)
  }

  const handleSend = useCallback(
    async (message: string, agentSlug?: string, sourceSlugs?: string[], file?: File, prebuiltInputs?: Record<string, string>) => {
      if (isStreaming) return

      // Upload file first if provided
      let uploadedFileId: string | undefined
      let uploadFailed = false
      if (file) {
        try {
          const uploadSlug = agentSlug ?? 'analyse'
          const form = new FormData()
          form.append('file', file)
          form.append('agentSlug', uploadSlug)
          const uploadRes = await fetch('/api/upload', { method: 'POST', body: form })
          if (uploadRes.ok) {
            const uploadData = await uploadRes.json()
            uploadedFileId = uploadData.id
          } else {
            uploadFailed = true
          }
        } catch {
          uploadFailed = true
        }
      }

      const effectiveAgentSlug = agentSlug ?? (uploadedFileId ? 'analyse' : undefined)

      const userMsg: MessageData = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: file ? `${message}\n\n📎 ${file.name}` : message,
        createdAt: new Date(),
      }

      const streamingId = `assistant-${Date.now()}`
      const streamingMsg: MessageData = {
        id: streamingId,
        role: 'assistant',
        content: '',
        agentUsed: effectiveAgentSlug,
        isStreaming: true,
        createdAt: new Date(),
      }

      setMessages((prev) => [...prev, userMsg, streamingMsg])

      if (uploadFailed) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === streamingId
              ? {
                  ...m,
                  isStreaming: false,
                  content: "_Erreur :_ Échec de l'envoi du fichier. Réessayez.",
                }
              : m
          )
        )
        return
      }

      setIsStreaming(true)

      const controller = new AbortController()
      abortRef.current = controller
      const CLIENT_IDLE_TIMEOUT_MS = 90_000
      let idleTimer: ReturnType<typeof setTimeout> | undefined
      const resetIdle = () => {
        if (idleTimer) clearTimeout(idleTimer)
        idleTimer = setTimeout(() => controller.abort(), CLIENT_IDLE_TIMEOUT_MS)
      }

      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message,
            agentSlug: effectiveAgentSlug,
            sourceSlugs,
            conversationId,
            uploadedFileId,
            prebuiltInputs,
          }),
          signal: controller.signal,
        })

        if (!response.ok || !response.body) {
          throw new Error(`HTTP ${response.status}`)
        }

        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''
        let finalSources: Source[] = []
        let agentLabel: string | undefined
        let errorMessage: string | undefined
        let hasProcessedFile = false

        resetIdle()

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          resetIdle()

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
                finalSources = event.sources || []
                agentLabel = event.agentLabel
                hasProcessedFile = !!event.hasProcessedFile
              } else if (event.type === 'error') {
                errorMessage = event.message
              }
            } catch {
              // skip malformed
            }
          }
        }

        if (errorMessage) {
          const finalError = errorMessage
          setMessages((prev) =>
            prev.map((m) =>
              m.id === streamingId
                ? {
                    ...m,
                    isStreaming: false,
                    content: m.content
                      ? `${m.content}\n\n_Erreur :_ ${finalError}`
                      : `_Erreur :_ ${finalError}`,
                    sources: [],
                  }
                : m
            )
          )
        } else {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === streamingId
                ? { ...m, isStreaming: false, sources: finalSources, agentLabel, hasProcessedFile }
                : m
            )
          )
          setSidebarRefreshKey((k) => k + 1)
        }
      } catch (err) {
        console.error('Chat error:', err)
        const isAbort = err instanceof Error && err.name === 'AbortError'
        const fallback = isAbort
          ? '_Erreur :_ Réponse trop longue — requête interrompue.'
          : "Une erreur s'est produite. Veuillez réessayer."
        setMessages((prev) =>
          prev.map((m) =>
            m.id === streamingId
              ? {
                  ...m,
                  isStreaming: false,
                  content: fallback,
                  sources: [],
                }
              : m
          )
        )
      } finally {
        if (idleTimer) clearTimeout(idleTimer)
        abortRef.current = null
        setIsStreaming(false)
      }
    },
    [isStreaming, conversationId]
  )

  return (
    <div className="flex flex-col h-screen bg-white overflow-hidden">
      {showOnboarding && <OnboardingModal onComplete={() => setOnboardingDone(true)} />}

      <Header userName={userName} userRole={userRole} userInitials={userInitials} />

      <div className="flex flex-1 min-h-0">
        {/* Sidebar desktop — EC/Admin uniquement */}
        {showSidebar && (
          <div className="hidden md:flex">
            <Sidebar
              onSelectConversation={loadConversation}
              activeConversationId={conversationId}
              onNewConversation={handleNewConversation}
              refreshKey={sidebarRefreshKey}
              userRole={userRole}
              onFolderToken={(token) => {
                window.dispatchEvent(new CustomEvent('chat:insert-source', { detail: { token } }))
              }}
            />
          </div>
        )}

        {/* Sidebar drawer mobile */}
        {showSidebar && (
          <>
            {/* Overlay */}
            <div
              className={`fixed left-0 right-0 z-30 md:hidden transition-opacity duration-200 ${drawerOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
              style={{ top: 'var(--header-h)', bottom: 56, background: 'rgba(0,0,0,0.4)' }}
              onClick={() => setDrawerOpen(false)}
            />
            {/* Drawer */}
            <div
              className="fixed left-0 z-40 md:hidden bg-[#FAFAFA] border-r border-[#D8D8D8]"
              style={{
                top: 'var(--header-h)',
                bottom: 56,
                width: 'var(--sidebar-w)',
                transform: drawerOpen ? 'translateX(0)' : 'translateX(-100%)',
                transition: 'transform 200ms ease',
              }}
            >
              <Sidebar
                onSelectConversation={(id) => { loadConversation(id); setDrawerOpen(false) }}
                activeConversationId={conversationId}
                onNewConversation={() => { handleNewConversation(); setDrawerOpen(false) }}
                refreshKey={sidebarRefreshKey}
                userRole={userRole}
                inDrawer
                onClose={() => setDrawerOpen(false)}
                onFolderToken={(token) => {
                  window.dispatchEvent(new CustomEvent('chat:insert-source', { detail: { token } }))
                  setDrawerOpen(false)
                }}
              />
            </div>
          </>
        )}

        {/* Zone principale */}
        <div className="flex flex-col flex-1 min-w-0 pb-14 md:pb-0">
          <div className="flex-1 overflow-y-auto nl-scroll" style={{ background: '#ffffff' }}>
            {messages.length === 0 ? (
              expertMode ? (
                <EmptyState agents={agents} onSuggest={handleSend} onRoutingMode={() => setExpertMode(false)} />
              ) : (
                <RoutingPanel
                  onSelectAgent={(slug) => {
                    setPendingAgent(slug)
                    setExpertMode(true)
                  }}
                  onExpertMode={() => setExpertMode(true)}
                  conversationId={conversationId}
                  userRole={userRole}
                />
              )
            ) : (
              <div className="max-w-[760px] mx-auto px-4 md:px-8 py-8 space-y-7">
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

          <ChatInput
            agents={agents}
            sources={sources}
            onSend={(msg, agent, srcs, file) => {
              setPendingAgent(undefined)
              handleSend(msg, agent, srcs, file)
            }}
            disabled={isStreaming}
            preselectedAgent={pendingAgent ?? undefined}
            activeMetaPrompt={activeMetaPrompt}
            onDeactivateMetaPrompt={handleDeactivateMetaPrompt}
            onActivateMetaPrompt={handleActivateMetaPrompt}
            onAbort={() => abortRef.current?.abort()}
          />
        </div>
      </div>

      <Footer userRole={userRole} />

      <BottomNav
        userRole={userRole}
        drawerOpen={drawerOpen}
        onToggleDrawer={() => setDrawerOpen((v) => !v)}
        onOpenSettings={() => window.dispatchEvent(new CustomEvent('nl:open-settings'))}
      />
    </div>
  )
}

function EmptyState({
  agents,
  onSuggest,
  onRoutingMode,
}: {
  agents: AgentConfig[]
  onSuggest: (msg: string, agent?: string) => void
  onRoutingMode?: () => void
}) {
  const suggestions = [
    { text: "Créer une bibliographie sur l'IA en enseignement supérieur", agent: 'bibliographie', icon: '📚' },
    { text: 'Rédiger une fiche de cours ECTS pour un module Licence', agent: 'fiche-cours', icon: '📋' },
    { text: 'Concevoir un module pédagogique sur la sociolinguistique', agent: 'module', icon: '📖' },
    { text: "Préparer un sujet d'examen sur la traductologie", agent: 'examen', icon: '🎯' },
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
        <h2
          style={{
            fontFamily: 'Gilroy, sans-serif',
            fontWeight: 800,
            fontSize: '1.5rem',
            letterSpacing: '-0.02em',
            color: '#0D0D0D',
          }}
        >
          Bonjour, comment puis-je vous aider ?
        </h2>
        <p className="mt-2 text-sm text-[#8A8A8A]" style={{ fontFamily: 'Source Serif Pro, Georgia, serif' }}>
          Posez une question, ou utilisez un agent <span className="nl-token-agent">@</span> pour des tâches
          structurées
        </p>
      </div>

      {onRoutingMode && (
        <button
          onClick={onRoutingMode}
          className="mb-4 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-[#8A8A8A] hover:text-[#00068D] hover:bg-[#E8E9F8] transition-all"
          style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, letterSpacing: '0.03em' }}
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M19 12H5M5 12l7-7M5 12l7 7" />
          </svg>
          Vue guidée
        </button>
      )}

      {agents.length > 0 && (
        <div className="grid grid-cols-2 gap-3 max-w-xl w-full">
          {suggestions
            .filter((s) => agents.find((a) => a.slug === s.agent))
            .map((s) => (
              <button
                key={s.agent}
                onClick={() => onSuggest(s.text, s.agent)}
                className="flex items-start gap-3 p-4 rounded-xl border border-[#D8D8D8] bg-white hover:bg-[#F0F1FB] hover:border-[#2B2EB8] transition-all text-left"
              >
                <span className="text-xl flex-shrink-0">{s.icon}</span>
                <div>
                  <p
                    className="text-xs text-[#3A3A3A] leading-relaxed"
                    style={{ fontFamily: 'Source Serif Pro, Georgia, serif' }}
                  >
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
