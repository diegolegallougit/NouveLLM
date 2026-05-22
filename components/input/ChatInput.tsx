'use client'

import { useRef, useState, useEffect, KeyboardEvent } from 'react'
import AgentPalette, { AgentConfig } from './AgentPalette'
import SourcePalette, { SourceConfig } from './SourcePalette'
import AgentFormModal from './AgentFormModal'

interface MetaPromptItem {
  id: string
  title: string
}

interface MetaPromptsData {
  institutional: MetaPromptItem[]
  shared: MetaPromptItem[]
  personal: MetaPromptItem[]
}

interface ChatInputProps {
  agents: AgentConfig[]
  sources: SourceConfig[]
  onSend: (message: string, agentSlug?: string, sourceSlugs?: string[], file?: File, prebuiltInputs?: Record<string, string>, sourceMode?: string) => void
  disabled?: boolean
  preselectedAgent?: string | null
  activeMetaPrompt?: { id: string; title: string } | null
  onDeactivateMetaPrompt?: () => void
  onActivateMetaPrompt?: (id: string, title: string) => void
  onAbort?: () => void
  sourceMode: 'usn' | 'academic' | 'web' | 'all'
  onSourceModeChange: (mode: 'usn' | 'academic' | 'web' | 'all') => void
  onOpenSourceSheet?: () => void
}

type PaletteMode = null | 'agent' | 'source'

export default function ChatInput({ agents, sources, onSend, disabled, preselectedAgent, activeMetaPrompt, onDeactivateMetaPrompt, onActivateMetaPrompt, onAbort, sourceMode, onSourceModeChange, onOpenSourceSheet }: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const mobileInputRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const [text, setText] = useState('')
  const [paletteMode, setPaletteMode] = useState<PaletteMode>(null)
  const [paletteQuery, setPaletteQuery] = useState('')
  const [selectedAgent, setSelectedAgent] = useState<AgentConfig | null>(null)
  const [selectedSources, setSelectedSources] = useState<string[]>([])
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [agentAutoSelected, setAgentAutoSelected] = useState(false)
  const [showFormModal, setShowFormModal] = useState(false)
  const [popoverOpen, setPopoverOpen] = useState(false)
  const [metaPromptsData, setMetaPromptsData] = useState<MetaPromptsData | null>(null)
  const [metaPromptsLoading, setMetaPromptsLoading] = useState(false)

  // Pre-select agent from routing
  useEffect(() => {
    if (preselectedAgent === undefined) return
    if (preselectedAgent === null) { setSelectedAgent(null); return } // eslint-disable-line react-hooks/set-state-in-effect
    const agent = agents.find(a => a.slug === preselectedAgent)
    if (agent) {
      setSelectedAgent(agent) // eslint-disable-line react-hooks/set-state-in-effect
      if (agent.inputSchema) {
        setShowFormModal(true) // eslint-disable-line react-hooks/set-state-in-effect
      } else {
        setTimeout(() => { textareaRef.current?.focus(); mobileInputRef.current?.focus() }, 50)
      }
    }
  }, [preselectedAgent, agents])

  // Listen for folder token insertion from sidebar
  useEffect(() => {
    function handleInsertSource(e: Event) {
      const { token } = (e as CustomEvent<{ token: string }>).detail
      if (!token) return
      const source = sources.find(s => s.slug === token)
      if (source) {
        setSelectedSources(prev => prev.includes(token) ? prev : [...prev, token])
        setTimeout(() => { textareaRef.current?.focus(); mobileInputRef.current?.focus() }, 50)
      }
    }
    window.addEventListener('chat:insert-source', handleInsertSource)
    return () => window.removeEventListener('chat:insert-source', handleInsertSource)
  }, [sources])

  // Open native file picker when routing selects 'analyse'
  useEffect(() => {
    function handleOpenFilePicker() {
      fileInputRef.current?.click()
    }
    window.addEventListener('nl:open-file-picker', handleOpenFilePicker)
    return () => window.removeEventListener('nl:open-file-picker', handleOpenFilePicker)
  }, [])

  // Auto-resize textarea (both mobile and desktop)
  useEffect(() => {
    for (const ref of [textareaRef, mobileInputRef]) {
      const ta = ref.current
      if (!ta) continue
      ta.style.height = 'auto'
      ta.style.height = Math.min(ta.scrollHeight, 200) + 'px'
    }
  }, [text])

  // Close popover on outside click
  useEffect(() => {
    if (!popoverOpen) return
    function onClickOutside(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setPopoverOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [popoverOpen])

  // Auto-select 'analyse' agent when a file is attached; deselect when file is removed
  useEffect(() => {
    if (selectedFile && !selectedAgent) {
      const analyseAgent = agents.find(a => a.slug === 'analyse')
      if (analyseAgent) {
        setSelectedAgent(analyseAgent) // eslint-disable-line react-hooks/set-state-in-effect
        setAgentAutoSelected(true) // eslint-disable-line react-hooks/set-state-in-effect
      }
    } else if (!selectedFile && agentAutoSelected) {
      setSelectedAgent(null) // eslint-disable-line react-hooks/set-state-in-effect
      setAgentAutoSelected(false) // eslint-disable-line react-hooks/set-state-in-effect
    }
  }, [selectedFile]) // eslint-disable-line react-hooks/exhaustive-deps

  // Load meta-prompts list when popover opens
  useEffect(() => {
    if (!popoverOpen || metaPromptsData) return
    setMetaPromptsLoading(true)
    fetch('/api/meta-prompts')
      .then((r) => r.json())
      .then((data) => setMetaPromptsData({
        institutional: data.institutional ?? [],
        shared: data.shared ?? [],
        personal: data.personal ?? [],
      }))
      .catch(() => {})
      .finally(() => setMetaPromptsLoading(false))
  }, [popoverOpen, metaPromptsData])

  function handleTextChange(value: string) {
    setText(value)

    // Detect @ or # triggers
    const lastAt = value.lastIndexOf('@')
    const lastHash = value.lastIndexOf('#')

    if (lastAt > lastHash && lastAt >= 0) {
      const afterAt = value.slice(lastAt + 1)
      if (!afterAt.includes(' ') && !afterAt.includes('\n')) {
        setPaletteMode('agent')
        setPaletteQuery(afterAt)
        return
      }
    }

    if (lastHash > lastAt && lastHash >= 0) {
      const afterHash = value.slice(lastHash + 1)
      if (!afterHash.includes(' ') && !afterHash.includes('\n')) {
        setPaletteMode('source')
        setPaletteQuery(afterHash)
        return
      }
    }

    setPaletteMode(null)
    setPaletteQuery('')
  }

  function handleSelectAgent(agent: AgentConfig) {
    const lastAt = text.lastIndexOf('@')
    const before = text.slice(0, lastAt)
    setText(before.trim() ? before : '')
    setSelectedAgent(agent)
    setPaletteMode(null)
    if (agent.inputSchema) {
      setShowFormModal(true)
    } else {
      textareaRef.current?.focus()
      mobileInputRef.current?.focus()
    }
  }

  function handleFormSubmit(inputs: Record<string, string>, displayMessage: string) {
    setShowFormModal(false)
    onSend(displayMessage, selectedAgent!.slug, selectedSources.length > 0 ? selectedSources : undefined, selectedFile ?? undefined, inputs, sourceMode)
    setText('')
    setSelectedAgent(null)
    setSelectedSources([])
    setSelectedFile(null)
  }

  function handleFormCancel() {
    setShowFormModal(false)
    setSelectedAgent(null)
  }

  function handleToggleSource(source: SourceConfig) {
    // Replace the #query with the token and toggle
    const lastHash = text.lastIndexOf('#')
    const before = text.slice(0, lastHash)
    setText(before + ' ')
    setSelectedSources((prev) =>
      prev.includes(source.slug) ? prev.filter((s) => s !== source.slug) : [...prev, source.slug]
    )
    textareaRef.current?.focus()
    mobileInputRef.current?.focus()
  }

  function handleSelectMetaPrompt(mp: MetaPromptItem) {
    onActivateMetaPrompt?.(mp.id, mp.title)
    setPopoverOpen(false)
  }

  function handleRemoveAgent() {
    setSelectedAgent(null)
    setAgentAutoSelected(false)
  }

  function handleRemoveSource(slug: string) {
    setSelectedSources((prev) => prev.filter((s) => s !== slug))
  }

  function handleSend() {
    // If agent requires form, open the form instead of sending
    if (selectedAgent?.inputSchema && !showFormModal) {
      setShowFormModal(true)
      return
    }
    const trimmed = text.trim()
    if (!trimmed || disabled) return
    onSend(trimmed, selectedAgent?.slug, selectedSources.length > 0 ? selectedSources : undefined, selectedFile ?? undefined, undefined, sourceMode)
    setText('')
    setSelectedAgent(null)
    setSelectedSources([])
    setSelectedFile(null)
    setPaletteMode(null)
    for (const ref of [textareaRef, mobileInputRef]) {
      if (ref.current) ref.current.style.height = 'auto'
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (paletteMode) {
      if (e.key === 'Escape') {
        e.preventDefault()
        setPaletteMode(null)
      }
      return
    }
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      handleSend()
    }
  }

  const hasContent = text.trim().length > 0 || selectedAgent !== null || selectedSources.length > 0 || selectedFile !== null

  const plusButtonClasses = selectedFile
    ? 'bg-yellow-100 text-yellow-600'
    : ({ usn: 'bg-indigo-100 text-indigo-600', academic: 'bg-green-100 text-green-600', web: 'bg-blue-100 text-blue-600', all: 'bg-purple-100 text-purple-600' } as const)[sourceMode]

  return (
    <div className="relative bg-white md:border-t md:border-[#D8D8D8] md:px-6 md:pb-4 flex-shrink-0">
      {/* Agent form modal */}
      {showFormModal && selectedAgent?.inputSchema && (
        <AgentFormModal
          agent={selectedAgent}
          onSubmit={handleFormSubmit}
          onCancel={handleFormCancel}
        />
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept=".pdf,.doc,.docx,.txt,.md,.csv,.xls,.xlsx,.ppt,.pptx"
        onChange={(e) => {
          const file = e.target.files?.[0] ?? null
          setSelectedFile(file)
          e.target.value = ''
        }}
      />

      {/* Palette overlay */}
      {paletteMode === 'agent' && (
        <AgentPalette
          agents={agents}
          query={paletteQuery}
          onSelect={handleSelectAgent}
          onClose={() => setPaletteMode(null)}
        />
      )}
      {paletteMode === 'source' && (
        <SourcePalette
          sources={sources}
          query={paletteQuery}
          selected={selectedSources}
          onToggle={handleToggleSource}
          onClose={() => setPaletteMode(null)}
        />
      )}

      {/* Tokens row */}
      {(activeMetaPrompt || selectedAgent || selectedSources.length > 0 || selectedFile) && (
        <div className="flex flex-wrap items-center gap-2 pt-3 pb-1 px-4 md:px-0">

          {/* Meta-prompt badge */}
          {activeMetaPrompt && (
            <div ref={popoverRef} className="relative">
              <div className="flex items-center rounded-lg border border-[#B8BAEA]" style={{ background: '#E8E9F8' }}>
                <button
                  type="button"
                  onClick={() => setPopoverOpen((o) => !o)}
                  className="flex items-center gap-1.5 pl-2 pr-1.5 py-1 rounded-l-lg hover:bg-[#D8DAF5] transition-all"
                  title="Changer de posture"
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#00068D" strokeWidth="2.5" strokeLinecap="round">
                    <circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
                  </svg>
                  <span style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-2xs)', letterSpacing: '0.06em', color: '#00068D', textTransform: 'uppercase' }}>
                    POSTURE :
                  </span>
                  <span style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-2xs)', color: '#00068D', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {activeMetaPrompt.title}
                  </span>
                  <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#00068D" strokeWidth="2.5" strokeLinecap="round" className={`transition-transform ${popoverOpen ? 'rotate-180' : ''}`}>
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>
                <div className="w-px h-4 bg-[#B8BAEA]" />
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onDeactivateMetaPrompt?.() }}
                  className="w-6 h-6 flex items-center justify-center rounded-r-lg hover:bg-[#D8DAF5] transition-all"
                  aria-label="Désactiver la posture"
                  title="Désactiver"
                >
                  <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#00068D" strokeWidth="3" strokeLinecap="round">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Popover */}
              {popoverOpen && (
                <div
                  className="absolute bottom-full mb-2 left-0 z-50 bg-white rounded-xl shadow-xl border border-[#D8D8D8] overflow-hidden"
                  style={{ width: 300, maxHeight: 360, overflowY: 'auto' }}
                >
                  <div className="px-3 pt-3 pb-1">
                    <p style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-xs)', letterSpacing: '0.06em', color: '#0D0D0D' }}>
                      CHANGER DE POSTURE
                    </p>
                  </div>

                  {metaPromptsLoading ? (
                    <div className="flex items-center justify-center py-6">
                      <div className="w-4 h-4 border-2 border-[#D8D8D8] border-t-[#00068D] rounded-full animate-spin" />
                    </div>
                  ) : metaPromptsData ? (
                    <div className="px-2 pb-2">
                      {(['institutional', 'shared', 'personal'] as const).map((section) => {
                        const items = metaPromptsData[section]
                        if (items.length === 0) return null
                        const label = section === 'institutional' ? 'Institutionnel' : section === 'shared' ? 'Partagé' : 'Personnel'
                        return (
                          <div key={section}>
                            <p className="px-1 mt-2 mb-0.5" style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 9, letterSpacing: '0.1em', color: '#8A8A8A', textTransform: 'uppercase' }}>
                              {label}
                            </p>
                            {items.map((mp) => (
                              <button
                                key={mp.id}
                                type="button"
                                onClick={() => handleSelectMetaPrompt(mp)}
                                className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-[#E8E9F8] transition-all flex items-center justify-between gap-2 group"
                              >
                                <span style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: 'var(--text-sm)', color: '#0D0D0D', lineHeight: '1.3' }}>
                                  {mp.title}
                                </span>
                                {activeMetaPrompt?.id === mp.id && (
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#00068D" strokeWidth="2.5" strokeLinecap="round" className="flex-shrink-0">
                                    <path d="M20 6L9 17l-5-5" />
                                  </svg>
                                )}
                              </button>
                            ))}
                          </div>
                        )
                      })}
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          )}

          {selectedAgent && (
            <div className="flex items-center gap-1.5 pl-2 pr-1 py-1 rounded-lg bg-[#E8E9F8] border border-[#2B2EB8]">
              <span className="text-sm">{selectedAgent.icon}</span>
              <span className="nl-token-agent text-xs">@{selectedAgent.slug}</span>
              {selectedAgent.inputSchema && (
                <button
                  onClick={() => setShowFormModal(true)}
                  className="px-1.5 py-0.5 rounded bg-[#00068D] text-white hover:bg-[#2B2EB8] transition-all"
                  style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-2xs)' }}
                  title="Ouvrir le formulaire"
                >
                  Formulaire
                </button>
              )}
              <button
                onClick={handleRemoveAgent}
                className="w-4 h-4 rounded-full flex items-center justify-center text-[#00068D] hover:bg-[#2B2EB8] hover:text-white transition-all"
                aria-label="Retirer l'agent"
              >
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
          {selectedFile && (
            <div className="flex items-center gap-1.5 pl-2 pr-1 py-1 rounded-lg bg-[#FFF8E1] border border-[#FFD54F]">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#F57F17" strokeWidth="2" strokeLinecap="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              <span className="text-[#F57F17]" style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: 'var(--text-xs)' }}>
                {selectedFile.name.length > 24 ? selectedFile.name.slice(0, 22) + '…' : selectedFile.name}
              </span>
              <button
                onClick={() => setSelectedFile(null)}
                className="w-4 h-4 rounded-full flex items-center justify-center text-[#F57F17] hover:bg-[#FFD54F] transition-all"
                aria-label="Retirer le fichier"
              >
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
          {selectedSources.map((slug) => {
            const source = sources.find((s) => s.slug === slug)
            return (
              <div key={slug} className="flex items-center gap-1.5 pl-2 pr-1 py-1 rounded-lg bg-[#e8f5e9] border border-[#a5d6a7]">
                {source && <span className="text-sm">{source.icon}</span>}
                <span className="nl-token-source text-xs">#{slug}</span>
                <button
                  onClick={() => handleRemoveSource(slug)}
                  className="w-4 h-4 rounded-full flex items-center justify-center text-[#2e7d32] hover:bg-[#2e7d32] hover:text-white transition-all"
                  aria-label="Retirer la source"
                >
                  <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* ── MOBILE : pill unique ────────────────────────────────────── */}
      <div
        className="md:hidden px-4 pt-2"
        style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}
      >
        <div className="flex items-center gap-2 bg-white rounded-full shadow-md border border-[#E0E0E0] px-3 py-2">
          {/* [+] / [📎] */}
          <button
            type="button"
            onClick={onOpenSourceSheet}
            className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${plusButtonClasses}`}
            aria-label="Sources et options"
          >
            {selectedFile ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
            )}
          </button>

          {/* Textarea */}
          <textarea
            ref={mobileInputRef}
            value={text}
            onChange={(e) => handleTextChange(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            placeholder="Posez une question..."
            className="flex-1 bg-transparent resize-none text-[#0D0D0D] placeholder:text-[#8A8A8A] focus:outline-none disabled:opacity-50 leading-relaxed"
            style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: 'var(--text-base)', maxHeight: '120px' }}
            rows={1}
          />

          {/* Stop / Send */}
          {disabled ? (
            <button
              type="button"
              onClick={() => onAbort?.()}
              className="w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center flex-shrink-0 transition-all"
              aria-label="Arrêter"
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
                <rect width="10" height="10" rx="1.5" />
              </svg>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSend}
              disabled={!hasContent}
              className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all disabled:cursor-not-allowed"
              style={{ background: hasContent ? '#00068D' : '#E8E8E8' }}
              aria-label="Envoyer"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={hasContent ? 'white' : '#B0B0B0'} strokeWidth="2.5" strokeLinecap="round">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* ── DESKTOP : inchangé ──────────────────────────────────────── */}
      <div className="hidden md:block">
        <div className="mt-3 flex flex-col rounded-xl border border-[#D8D8D8] bg-white md:focus-within:ring-2 md:focus-within:ring-[#2B2EB8] md:focus-within:border-transparent transition-all overflow-hidden">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => handleTextChange(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            placeholder="Posez une question ou tapez @ pour un agent, # pour une source · Cmd+Entrée"
            className="w-full px-4 pt-3 pb-2 bg-transparent resize-none text-[#0D0D0D] placeholder:text-[#8A8A8A] focus:outline-none disabled:opacity-50 leading-relaxed"
            style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: 'var(--text-base)', minHeight: 'var(--input-min-h)', maxHeight: '200px' }}
            rows={1}
          />

          {/* Toolbar */}
          <div className="flex items-center justify-between px-3 pb-2">
            <div className="flex items-center gap-1">
              {/* 📎 file */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-[#8A8A8A] hover:bg-[#FFF8E1] hover:text-[#F57F17] transition-all"
                title="Joindre un document"
                aria-label="Joindre un document"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                </svg>
              </button>
              {/* @ trigger */}
              <button
                onClick={() => {
                  setText((t) => t + '@')
                  setPaletteMode('agent')
                  setPaletteQuery('')
                  textareaRef.current?.focus()
                }}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-[#8A8A8A] hover:bg-[#E8E9F8] hover:text-[#00068D] transition-all text-sm font-bold"
                style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800 }}
                title="Sélectionner un agent (@)"
                aria-label="Sélectionner un agent"
              >
                @
              </button>
              {/* # trigger */}
              <button
                onClick={() => {
                  setText((t) => t + '#')
                  setPaletteMode('source')
                  setPaletteQuery('')
                  textareaRef.current?.focus()
                }}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-[#8A8A8A] hover:bg-[#e8f5e9] hover:text-[#2e7d32] transition-all text-sm font-bold"
                style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800 }}
                title="Sélectionner une source (#)"
                aria-label="Sélectionner une source"
              >
                #
              </button>
              {/* Clear */}
              {hasContent && (
                <button
                  onClick={() => {
                    setText('')
                    setSelectedAgent(null)
                    setSelectedSources([])
                    setSelectedFile(null)
                  }}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-[#8A8A8A] hover:bg-red-50 hover:text-red-500 transition-all"
                  title="Effacer"
                  aria-label="Effacer"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6l-1 14H6L5 6" />
                    <path d="M10 11v6M14 11v6" />
                    <path d="M9 6V4h6v2" />
                  </svg>
                </button>
              )}
            </div>

            {/* Stop / Send button */}
            {disabled ? (
              <button
                type="button"
                onClick={() => onAbort?.()}
                className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-white transition-all"
                style={{ background: '#EF4444', fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-xs)', letterSpacing: '0.04em' }}
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
                  <rect width="10" height="10" rx="1.5" />
                </svg>
                ARRÊTER
              </button>
            ) : (
              <button
                onClick={handleSend}
                disabled={!hasContent}
                className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-white font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: hasContent ? '#00068D' : '#D8D8D8', fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-xs)', letterSpacing: '0.04em' }}
              >
                ENVOYER
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </button>
            )}
          </div>

          {/* Source mode bar */}
          {paletteMode === null && (
            <div className="border-t border-[#F0F0F0] px-3 py-2">
              <div
                className="flex items-center overflow-x-auto"
                style={{ gap: 5, scrollbarWidth: 'none', msOverflowStyle: 'none' } as React.CSSProperties}
              >
                {([
                  { mode: 'usn',      label: 'Mes ressources',  icon: '📚' },
                  { mode: 'academic', label: 'Publications SHS', icon: '🔬' },
                  { mode: 'web',      label: 'Web',             icon: '🌐' },
                  { mode: 'all',      label: 'Tout',            icon: '⚡' },
                ] as const).map(({ mode, label, icon }) => {
                  const active = sourceMode === mode
                  return (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => onSourceModeChange(mode)}
                      style={{
                        height: 26,
                        padding: '0 8px',
                        borderRadius: 13,
                        border: `0.5px solid ${active ? '#2B2EB8' : '#D8D8D8'}`,
                        background: active ? '#E8E9F8' : 'transparent',
                        color: active ? '#00068D' : '#8A8A8A',
                        fontFamily: 'Gilroy, sans-serif',
                        fontWeight: active ? 800 : 300,
                        fontSize: 11,
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        cursor: 'pointer',
                      }}
                    >
                      <span style={{ fontSize: 11 }}>{icon}</span>
                      {label}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
