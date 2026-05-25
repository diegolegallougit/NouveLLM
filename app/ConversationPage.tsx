'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import NLLogo from '@/components/ui/NLLogo'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import Message, { MessageData, Source } from '@/components/chat/Message'
import ChatInput from '@/components/input/ChatInput'
import Sidebar from '@/components/sidebar/Sidebar'
import OnboardingModal from '@/components/onboarding/OnboardingModal'
import OnboardingFlow from '@/components/onboarding/OnboardingFlow'
import MobileHome from '@/components/mobile/MobileHome'
import RoutingPanel from '@/components/routing/RoutingPanel'
import SourceModeSheet from '@/components/chat/SourceModeSheet'
import { AgentConfig } from '@/components/input/AgentPalette'
import { SourceConfig } from '@/components/input/SourcePalette'

interface Props {
  userName: string
  userRole: string
  userInitials: string
  userId: string
  needsOnboarding?: boolean
  discipline?: string
  initialConversationId?: string
}

export default function ConversationPage({ userName, userRole, userInitials, needsOnboarding = false, discipline, initialConversationId }: Props) {
  const [agents, setAgents] = useState<AgentConfig[]>([])
  const [sources, setSources] = useState<SourceConfig[]>([])
  const [messages, setMessages] = useState<MessageData[]>([])
  const [conversationId, setConversationId] = useState<string | undefined>()
  const [isStreaming, setIsStreaming] = useState(false)
  const [sidebarRefreshKey, setSidebarRefreshKey] = useState(0)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [mobileRoutingOpen, setMobileRoutingOpen] = useState(false)
  const [onboardingDone, setOnboardingDone] = useState(false)
  const [showRoutingPanel, setShowRoutingPanel] = useState(false)
  const [pendingAgent, setPendingAgent] = useState<string | null | undefined>(undefined)
  const [sourceMode, setSourceMode] = useState<'usn' | 'academic' | 'web' | 'all'>('usn')
  const [sourceSheetOpen, setSourceSheetOpen] = useState(false)
  const [activeMetaPrompt, setActiveMetaPrompt] = useState<{ id: string; title: string } | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const touchStartX = useRef<number | null>(null)

  const handleOnboardingComplete = useCallback(() => {
    setOnboardingDone(true)
  }, [])

  const isStudent = userRole === 'STUDENT'
  const showSidebar = !isStudent
  const showOnboarding = needsOnboarding && !onboardingDone

  const mobileConversationMode = messages.length > 0
  const lastAssistantMsg = [...messages].reverse().find(m => m.role === 'assistant')
  const activeAgent = mobileConversationMode ? (lastAssistantMsg?.agentUsed ?? null) : null
  const activeAgentLabel = mobileConversationMode ? (lastAssistantMsg?.agentLabel ?? null) : null

  useEffect(() => {
    async function loadConfig() {
      const [agentData, sourceData] = await Promise.all([
        fetch('/api/config/agents').then((r) => r.json()),
        fetch('/api/config/sources').then((r) => r.json()),
      ])
      const loadedAgents: AgentConfig[] = agentData.agents || []
      setAgents(loadedAgents)
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

      if (initialConversationId) {
        await loadConversation(initialConversationId, loadedAgents)
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

  async function loadConversation(convId: string, resolvedAgents?: AgentConfig[]) {
    try {
      const r = await fetch(`/api/conversations/${convId}`)
      const data = await r.json()
      if (!data.conversation) return

      const agentList = resolvedAgents ?? agents
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
        agentLabel: m.agentUsed ? agentList.find((a) => a.slug === m.agentUsed)?.label : undefined,
        sources: m.sources ? JSON.parse(m.sources) : undefined,
        createdAt: new Date(m.createdAt),
      }))

      setMessages(msgs)
      setConversationId(convId)
      setSourceMode('usn')
      if (typeof window !== 'undefined' && window.location.pathname !== `/c/${convId}`) {
        window.history.pushState({}, '', `/c/${convId}`)
      }
    } catch (err) {
      console.error('Failed to load conversation:', err)
    }
  }

  function handleDrawerTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX
  }
  function handleDrawerTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return
    if (touchStartX.current - e.changedTouches[0].clientX > 60) setDrawerOpen(false)
    touchStartX.current = null
  }

  function handleNewConversation() {
    setMessages([])
    setConversationId(undefined)
    setShowRoutingPanel(false)
    setPendingAgent(undefined)
    setMobileRoutingOpen(false)
    setSourceMode('usn')
    if (typeof window !== 'undefined' && window.location.pathname !== '/') {
      window.history.pushState({}, '', '/')
    }
  }

  const handleSend = useCallback(
    async (message: string, agentSlug?: string, sourceSlugs?: string[], file?: File, prebuiltInputs?: Record<string, string>, sourceMode?: string) => {
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
        sourceMode,
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
      const CLIENT_IDLE_TIMEOUT_MS = 45_000
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
            sourceMode,
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
        let finalSourceMode: string | undefined

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
                if (!conversationId && typeof window !== 'undefined') {
                  window.history.pushState({}, '', `/c/${event.conversationId}`)
                }
              } else if (event.type === 'chunk') {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === streamingId ? { ...m, content: m.content + event.text } : m
                  )
                )
              } else if (event.type === 'heartbeat') {
                // heartbeat — ne rien faire, resetIdle deja appele
              } else if (event.type === 'done') {
                finalSources = event.sources || []
                agentLabel = event.agentLabel
                hasProcessedFile = !!event.hasProcessedFile
                finalSourceMode = event.sourceMode
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
                ? { ...m, isStreaming: false, sources: finalSources, agentLabel, hasProcessedFile, sourceMode: finalSourceMode }
                : m
            )
          )
          setSidebarRefreshKey((k) => k + 1)
        }
      } catch (err) {
        console.error('Chat error:', err)
        const isAbort = err instanceof Error && err.name === 'AbortError'
        const fallback = isAbort
          ? '_Erreur :_ Le service prend plus de temps que prévu. Réessayez dans quelques secondes — c\'est généralement résolu rapidement.'
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
      {showOnboarding && isStudent && (
        <OnboardingModal onComplete={handleOnboardingComplete} />
      )}
      {showOnboarding && !isStudent && (
        <OnboardingFlow onComplete={handleOnboardingComplete} userName={userName} />
      )}

      <Header
        userName={userName}
        userRole={userRole}
        userInitials={userInitials}
        mobileConversationMode={mobileConversationMode}
        activeAgent={activeAgent}
        agentLabel={activeAgentLabel}
        onBack={() => setDrawerOpen(v => !v)}
      />

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

        {/* Sidebar drawer mobile — all users */}
        <>
          {/* Overlay — instant close, no transition */}
          <div
            className={`fixed left-0 right-0 z-30 md:hidden ${drawerOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
            style={{ top: 56, bottom: 0, background: 'rgba(0,0,0,0.35)' }}
            onClick={() => setDrawerOpen(false)}
          />
          {/* Drawer */}
          <div
            className="fixed left-0 z-40 md:hidden bg-[#FAFAFA] border-r border-[#D8D8D8]"
            style={{
              top: 56,
              bottom: 0,
              width: 280,
              transform: drawerOpen ? 'translateX(0)' : 'translateX(-100%)',
              transition: drawerOpen ? 'transform 180ms cubic-bezier(0.4, 0, 0.2, 1)' : 'none',
            }}
            onTouchStart={handleDrawerTouchStart}
            onTouchEnd={handleDrawerTouchEnd}
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

        {/* Zone principale */}
        <div className="flex flex-col flex-1 min-w-0">
          <div className="flex-1 overflow-y-auto nl-scroll pb-20 md:pb-0" style={{ background: '#ffffff' }}>
            {messages.length === 0 ? (
              <>
                {/* Mobile — MobileHome ou RoutingPanel complet */}
                <div className="md:hidden flex flex-col" style={{ minHeight: 'calc(100dvh - 56px - 72px)' }}>
                  {mobileRoutingOpen ? (
                    <RoutingPanel
                      onSelectAgent={(slug) => { setPendingAgent(slug); setMobileRoutingOpen(false) }}
                      onExpertMode={() => setMobileRoutingOpen(false)}
                      conversationId={conversationId}
                      userRole={userRole}
                    />
                  ) : (
                    <MobileHome
                      userName={userName}
                      discipline={discipline}
                      onSelectAgent={(slug) => { setPendingAgent(slug) }}
                      onShowAll={() => setMobileRoutingOpen(true)}
                    />
                  )}
                </div>
                {/* Desktop — EmptyState par défaut, RoutingPanel via "Vue guidée" */}
                <div className="hidden md:block h-full">
                  {showRoutingPanel ? (
                    <RoutingPanel
                      onSelectAgent={(slug) => { setPendingAgent(slug); setShowRoutingPanel(false) }}
                      onExpertMode={() => setShowRoutingPanel(false)}
                      conversationId={conversationId}
                      userRole={userRole}
                    />
                  ) : (
                    <EmptyState />
                  )}
                </div>
              </>
            ) : (
              <div className="max-w-[760px] mx-auto px-4 md:px-8 py-4 md:py-8 space-y-4 md:space-y-7">
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

          <div className="fixed bottom-0 left-0 right-0 z-40 bg-white md:static md:z-auto md:bg-transparent md:flex-shrink-0">
            <ChatInput
              agents={agents}
              sources={sources}
              onSend={(msg, agent, srcs, file, prebuiltInputs) => {
                setPendingAgent(undefined)
                handleSend(msg, agent, srcs, file, prebuiltInputs, sourceMode)
              }}
              disabled={isStreaming}
              preselectedAgent={pendingAgent}
              activeMetaPrompt={activeMetaPrompt}
              onDeactivateMetaPrompt={handleDeactivateMetaPrompt}
              onActivateMetaPrompt={handleActivateMetaPrompt}
              onAbort={() => abortRef.current?.abort()}
              sourceMode={sourceMode}
              onSourceModeChange={setSourceMode}
              onOpenSourceSheet={() => setSourceSheetOpen(true)}
            />
          </div>
        </div>
      </div>

      <Footer userRole={userRole} />

      <SourceModeSheet
        isOpen={sourceSheetOpen}
        sourceMode={sourceMode}
        onSourceModeChange={setSourceMode}
        onClose={() => setSourceSheetOpen(false)}
        onFileClick={() => {
          setSourceSheetOpen(false)
          window.dispatchEvent(new CustomEvent('nl:open-file-picker'))
        }}
      />
    </div>
  )
}

function EmptyState() {
  const router = useRouter()

  const shortcuts = [
    {
      label: 'Mes dossiers',
      onClick: () => router.push('/spaces'),
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
        </svg>
      ),
    },
    {
      label: 'Séances',
      onClick: () => router.push('/sessions'),
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
      ),
    },
    {
      label: 'Agents',
      onClick: () => router.push('/agents'),
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M15 3l-4 4-4-4" />
          <path d="M3 12h18" />
          <path d="M12 7v10" />
          <circle cx="12" cy="19" r="2" />
        </svg>
      ),
    },
    {
      label: 'Assistance',
      onClick: () => router.push('/session/AIDE-2026'),
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
          <circle cx="12" cy="17" r="0.5" fill="currentColor" />
        </svg>
      ),
    },
  ]

  return (
    <div
      className="flex flex-col items-center justify-center min-h-full"
      style={{ padding: '24px 40px 16px' }}
    >
      {/* Logo + titre */}
      <div className="text-center mb-6">
        <div className="mb-4 inline-flex" style={{ borderRadius: 11, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
          <NLLogo size={40} />
        </div>
        <h2 style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '1.5rem', letterSpacing: '-0.02em', color: '#0D0D0D' }}>
          Bonjour, comment puis-je vous aider ?
        </h2>
        <p className="mt-2" style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: 'var(--text-sm)', color: '#8A8A8A' }}>
          Posez une question, utilisez <span className="nl-token-agent">@</span> agent,{' '}
          <span className="nl-token-source">#</span> source ou{' '}
          <span style={{ color: '#E65100', fontWeight: 800 }}>/</span> posture
        </p>
      </div>

      {/* 4 raccourcis */}
      <div className="grid grid-cols-4 gap-2" style={{ maxWidth: 420, marginTop: 20, width: '100%' }}>
        {shortcuts.map((s) => (
          <button
            key={s.label}
            type="button"
            onClick={s.onClick}
            className="flex flex-col items-center transition-all"
            style={{ gap: 6, padding: '12px 8px', border: '0.5px solid var(--color-border)', borderRadius: 10, background: 'white', cursor: 'pointer' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#00068D'
              e.currentTarget.style.background = '#F0F1FB'
              const ic = e.currentTarget.querySelector<HTMLElement>('.icon-c')
              if (ic) { ic.style.background = '#E8E9F8'; ic.style.color = '#00068D' }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-border)'
              e.currentTarget.style.background = 'white'
              const ic = e.currentTarget.querySelector<HTMLElement>('.icon-c')
              if (ic) { ic.style.background = '#F2F2F2'; ic.style.color = '#5A5A5A' }
            }}
          >
            <div className="icon-c" style={{ width: 28, height: 28, borderRadius: 7, background: '#F2F2F2', color: '#5A5A5A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {s.icon}
            </div>
            <span style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 700, fontSize: 'var(--text-2xs)', color: '#8A8A8A' }}>
              {s.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
