'use client'

import { useRef, useState, useEffect, KeyboardEvent } from 'react'
import AgentPalette, { AgentConfig } from './AgentPalette'
import SourcePalette, { SourceConfig } from './SourcePalette'

interface ChatInputProps {
  agents: AgentConfig[]
  sources: SourceConfig[]
  onSend: (message: string, agentSlug?: string, sourceSlugs?: string[]) => void
  disabled?: boolean
}

type PaletteMode = null | 'agent' | 'source'

export default function ChatInput({ agents, sources, onSend, disabled }: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [text, setText] = useState('')
  const [paletteMode, setPaletteMode] = useState<PaletteMode>(null)
  const [paletteQuery, setPaletteQuery] = useState('')
  const [selectedAgent, setSelectedAgent] = useState<AgentConfig | null>(null)
  const [selectedSources, setSelectedSources] = useState<string[]>([])

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = Math.min(ta.scrollHeight, 200) + 'px'
  }, [text])

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
    // Replace the @query with the token
    const lastAt = text.lastIndexOf('@')
    const before = text.slice(0, lastAt)
    setText(before + ' ')
    setSelectedAgent(agent)
    setPaletteMode(null)
    textareaRef.current?.focus()
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
  }

  function handleRemoveAgent() {
    setSelectedAgent(null)
  }

  function handleRemoveSource(slug: string) {
    setSelectedSources((prev) => prev.filter((s) => s !== slug))
  }

  function handleSend() {
    const trimmed = text.trim()
    if (!trimmed || disabled) return
    onSend(trimmed, selectedAgent?.slug, selectedSources.length > 0 ? selectedSources : undefined)
    setText('')
    setSelectedAgent(null)
    setSelectedSources([])
    setPaletteMode(null)
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
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

  const hasContent = text.trim().length > 0 || selectedAgent !== null || selectedSources.length > 0

  return (
    <div className="relative px-6 pb-4 bg-white border-t border-[#D8D8D8] flex-shrink-0">
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
      {(selectedAgent || selectedSources.length > 0) && (
        <div className="flex flex-wrap items-center gap-2 pt-3 pb-1">
          {selectedAgent && (
            <div className="flex items-center gap-1.5 pl-2 pr-1 py-1 rounded-lg bg-[#E8E9F8] border border-[#2B2EB8]">
              <span className="text-sm">{selectedAgent.icon}</span>
              <span className="nl-token-agent text-xs">@{selectedAgent.slug}</span>
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

      {/* Input box */}
      <div className="mt-3 flex flex-col rounded-xl border border-[#D8D8D8] bg-white focus-within:ring-2 focus-within:ring-[#2B2EB8] focus-within:border-transparent transition-all overflow-hidden">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => handleTextChange(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder="Posez une question ou tapez @ pour un agent, # pour une source · Cmd+Entrée"
          className="w-full px-4 pt-3 pb-2 bg-transparent resize-none text-[#0D0D0D] text-sm placeholder:text-[#8A8A8A] focus:outline-none disabled:opacity-50 leading-relaxed"
          style={{ fontFamily: 'Source Serif Pro, Georgia, serif', minHeight: '56px', maxHeight: '200px' }}
          rows={1}
        />

        {/* Toolbar */}
        <div className="flex items-center justify-between px-3 pb-2">
          <div className="flex items-center gap-1">
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

          {/* Send button */}
          <button
            onClick={handleSend}
            disabled={!hasContent || disabled}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-xs font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: hasContent && !disabled ? '#00068D' : '#D8D8D8',
              fontFamily: 'Gilroy, sans-serif',
              fontWeight: 800,
              letterSpacing: '0.04em',
            }}
          >
            ENVOYER
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
