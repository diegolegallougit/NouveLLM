'use client'

import { useEffect, useRef, useState } from 'react'

export interface AgentFormField {
  key: string
  label: string
  type: 'text' | 'textarea' | 'select' | 'number'
  required?: boolean
  default?: string
  placeholder?: string
  options?: string[]
}

export interface AgentInputSchema {
  fields: AgentFormField[]
}

export interface AgentConfig {
  slug: string
  label: string
  icon: string
  description: string
  status: string
  inputSchema?: AgentInputSchema | null
}

interface AgentPaletteProps {
  agents: AgentConfig[]
  query: string
  onSelect: (agent: AgentConfig) => void
  onClose: () => void
}

export default function AgentPalette({ agents, query, onSelect, onClose }: AgentPaletteProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const listRef = useRef<HTMLDivElement>(null)

  const filtered = agents.filter((a) => {
    const q = query.toLowerCase()
    return (
      a.slug.toLowerCase().includes(q) ||
      a.label.toLowerCase().includes(q) ||
      a.description.toLowerCase().includes(q)
    )
  })

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setActiveIndex(0) }, [query])

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActiveIndex((i) => Math.min(i + 1, filtered.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActiveIndex((i) => Math.max(i - 1, 0))
      } else if (e.key === 'Enter' && filtered[activeIndex]) {
        e.preventDefault()
        onSelect(filtered[activeIndex])
      } else if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [filtered, activeIndex, onSelect, onClose])

  if (filtered.length === 0) return null

  return (
    <div
      className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-[#D8D8D8] rounded-xl shadow-lg overflow-hidden"
      style={{ maxHeight: '360px', zIndex: 50 }}
    >
      {/* Header */}
      <div className="px-4 py-2.5 bg-[#F0F1FB] border-b border-[#D8D8D8]">
        <p style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-xs)', letterSpacing: '0.12em', color: '#00068D', textTransform: 'uppercase' }}>
          Agents · Sélectionnez un workflow pour structurer votre demande
        </p>
      </div>

      {/* List */}
      <div ref={listRef} className="overflow-y-auto nl-scroll" style={{ maxHeight: '280px' }}>
        {filtered.map((agent, i) => (
          <button
            key={agent.slug}
            onClick={() => onSelect(agent)}
            className="w-full flex items-start gap-3 px-4 py-3 text-left transition-colors border-b border-[#F2F2F2] last:border-0"
            style={{ background: i === activeIndex ? '#F0F1FB' : 'transparent' }}
          >
            <span className="text-lg flex-shrink-0 mt-0.5">{agent.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-sm)', color: '#00068D' }}>
                  @{agent.slug}
                </span>
                <span style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontWeight: 400, fontSize: 'var(--text-sm)', color: '#3A3A3A' }}>
                  {agent.label}
                </span>
                {agent.status === 'BETA' && (
                  <span className="px-1.5 py-0.5 rounded bg-orange-100 text-orange-700 border border-orange-200" style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-2xs)' }}>
                    BÊTA
                  </span>
                )}
              </div>
              <p style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: 'var(--text-sm)', color: '#8A8A8A', marginTop: '2px' }}>
                {agent.description}
              </p>
            </div>
          </button>
        ))}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-[#D8D8D8] flex items-center justify-between bg-[#F2F2F2]">
        <div className="flex items-center gap-3 text-[#8A8A8A]" style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 300, fontSize: 'var(--text-2xs)' }}>
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 bg-white border border-[#D8D8D8] rounded" style={{ fontSize: 'var(--text-2xs)' }}>↑↓</kbd> naviguer
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 bg-white border border-[#D8D8D8] rounded" style={{ fontSize: 'var(--text-2xs)' }}>↵</kbd> sélectionner
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 bg-white border border-[#D8D8D8] rounded" style={{ fontSize: 'var(--text-2xs)' }}>Esc</kbd> fermer
          </span>
        </div>
        <span style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 300, fontSize: 'var(--text-2xs)', color: '#8A8A8A' }}>
          {filtered.length} agent{filtered.length > 1 ? 's' : ''} disponible{filtered.length > 1 ? 's' : ''}
        </span>
      </div>
    </div>
  )
}
