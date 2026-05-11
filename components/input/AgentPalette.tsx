'use client'

import { useEffect, useRef, useState } from 'react'

export interface AgentConfig {
  slug: string
  label: string
  icon: string
  description: string
  status: string
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
        <p style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '0.65rem', letterSpacing: '0.12em', color: '#00068D', textTransform: 'uppercase' }}>
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
                <span style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '0.85rem', color: '#00068D' }}>
                  @{agent.slug}
                </span>
                <span style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontWeight: 400, fontSize: '0.85rem', color: '#3A3A3A' }}>
                  {agent.label}
                </span>
                {agent.status === 'BETA' && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-orange-100 text-orange-700 border border-orange-200" style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800 }}>
                    BÊTA
                  </span>
                )}
              </div>
              <p style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: '0.75rem', color: '#8A8A8A', marginTop: '2px' }}>
                {agent.description}
              </p>
            </div>
          </button>
        ))}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-[#D8D8D8] flex items-center justify-between bg-[#F2F2F2]">
        <div className="flex items-center gap-3 text-[10px] text-[#8A8A8A]" style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 300 }}>
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 bg-white border border-[#D8D8D8] rounded text-[9px]">↑↓</kbd> naviguer
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 bg-white border border-[#D8D8D8] rounded text-[9px]">↵</kbd> sélectionner
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 bg-white border border-[#D8D8D8] rounded text-[9px]">Esc</kbd> fermer
          </span>
        </div>
        <span style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 300, fontSize: '0.65rem', color: '#8A8A8A' }}>
          {filtered.length} agent{filtered.length > 1 ? 's' : ''} disponible{filtered.length > 1 ? 's' : ''}
        </span>
      </div>
    </div>
  )
}
