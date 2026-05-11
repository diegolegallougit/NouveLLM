'use client'

import { useEffect, useRef, useState } from 'react'

export interface SourceConfig {
  slug: string
  label: string
  icon: string
  description: string
  docCount: number | null
  access: string
  isFolder?: boolean
  spaceName?: string
}

interface SourcePaletteProps {
  sources: SourceConfig[]
  query: string
  selected: string[]
  onToggle: (source: SourceConfig) => void
  onClose: () => void
}

export default function SourcePalette({ sources, query, selected, onToggle, onClose }: SourcePaletteProps) {
  const [activeIndex, setActiveIndex] = useState(0)

  const filtered = sources.filter((s) => {
    const q = query.toLowerCase()
    return (
      s.slug.toLowerCase().includes(q) ||
      s.label.toLowerCase().includes(q) ||
      s.description.toLowerCase().includes(q)
    )
  })

  useEffect(() => {
    setActiveIndex(0)
  }, [query])

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
        onToggle(filtered[activeIndex])
      } else if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [filtered, activeIndex, onToggle, onClose])

  const institutionalSources = filtered.filter(s => !s.isFolder)
  const folderSources = filtered.filter(s => s.isFolder)

  if (filtered.length === 0) return null

  return (
    <div
      className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-[#D8D8D8] rounded-xl shadow-lg overflow-hidden"
      style={{ maxHeight: '400px', zIndex: 50 }}
    >
      {/* Header */}
      <div className="px-4 py-2.5 bg-[#e8f5e9] border-b border-[#a5d6a7]">
        <p style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '0.65rem', letterSpacing: '0.12em', color: '#2e7d32', textTransform: 'uppercase' }}>
          Sources documentaires · Choisissez les bases à interroger
        </p>
      </div>

      {/* List */}
      <div className="overflow-y-auto nl-scroll" style={{ maxHeight: '310px' }}>
        {institutionalSources.length > 0 && (
          <>
            {folderSources.length > 0 && (
              <div className="px-3 py-1.5 bg-[#F2F2F2] border-b border-[#D8D8D8]">
                <span className="text-[9px] text-[#8A8A8A] uppercase tracking-widest"
                  style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800 }}>Bases institutionnelles</span>
              </div>
            )}
            {institutionalSources.map((source, i) => {
              const isSelected = selected.includes(source.slug)
              const globalIdx = filtered.indexOf(source)
              return (
                <button key={source.slug} onClick={() => onToggle(source)}
                  className="w-full flex items-start gap-3 px-4 py-3 text-left transition-colors border-b border-[#F2F2F2] last:border-0"
                  style={{ background: globalIdx === activeIndex ? '#f1f8e9' : isSelected ? '#f1f8e9' : 'transparent' }}>
                  <span className="text-lg flex-shrink-0 mt-0.5">{source.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '0.85rem', color: '#2e7d32' }}>
                        #{source.slug}
                      </span>
                      <span style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontWeight: 400, fontSize: '0.85rem', color: '#3A3A3A' }}>
                        {source.label}
                      </span>
                      {source.docCount != null && (
                        <span style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 300, fontSize: '0.7rem', color: '#8A8A8A' }}>
                          {source.docCount} docs
                        </span>
                      )}
                      <span className="px-1.5 py-0.5 rounded text-[10px] border"
                        style={{
                          fontFamily: 'Gilroy, sans-serif', fontWeight: 800,
                          background: source.access === 'PUBLIC' ? '#e8f5e9' : '#fff3e0',
                          color: source.access === 'PUBLIC' ? '#2e7d32' : '#e65100',
                          borderColor: source.access === 'PUBLIC' ? '#a5d6a7' : '#ffcc02',
                        }}>
                        {source.access === 'PUBLIC' ? 'Public' : 'Restreint'}
                      </span>
                    </div>
                    <p style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: '0.75rem', color: '#8A8A8A', marginTop: '2px' }}>
                      {source.description}
                    </p>
                  </div>
                  {isSelected && (
                    <div className="flex-shrink-0 w-5 h-5 rounded-full bg-[#2e7d32] flex items-center justify-center mt-1">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round"><path d="M20 6L9 17l-5-5" /></svg>
                    </div>
                  )}
                </button>
              )
            })}
          </>
        )}

        {folderSources.length > 0 && (
          <>
            <div className="px-3 py-1.5 bg-[#F2F2F2] border-b border-[#D8D8D8]">
              <span className="text-[9px] text-[#8A8A8A] uppercase tracking-widest"
                style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800 }}>Mes espaces documentaires</span>
            </div>
            {folderSources.map((source) => {
              const isSelected = selected.includes(source.slug)
              const globalIdx = filtered.indexOf(source)
              return (
                <button key={source.slug} onClick={() => onToggle(source)}
                  className="w-full flex items-start gap-3 px-4 py-2.5 text-left transition-colors border-b border-[#F2F2F2] last:border-0"
                  style={{ background: globalIdx === activeIndex ? '#f1f8e9' : isSelected ? '#f1f8e9' : 'transparent' }}>
                  <span className="text-base flex-shrink-0 mt-0.5">{source.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '0.82rem', color: '#2e7d32' }}>
                        #{source.slug}
                      </span>
                      {source.docCount != null && (
                        <span style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 300, fontSize: '0.7rem', color: '#8A8A8A' }}>
                          {source.docCount} docs
                        </span>
                      )}
                      <span className="px-1.5 py-0.5 rounded text-[10px] border bg-[#E8E9F8] text-[#00068D] border-[#C5C7F0]"
                        style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800 }}>
                        Personnel
                      </span>
                    </div>
                    {source.spaceName && (
                      <p style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: '0.72rem', color: '#8A8A8A', marginTop: '1px' }}>
                        {source.spaceName}
                      </p>
                    )}
                  </div>
                  {isSelected && (
                    <div className="flex-shrink-0 w-5 h-5 rounded-full bg-[#2e7d32] flex items-center justify-center mt-1">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round"><path d="M20 6L9 17l-5-5" /></svg>
                    </div>
                  )}
                </button>
              )
            })}
          </>
        )}
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
        {selected.length > 0 && (
          <span style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '0.65rem', color: '#2e7d32' }}>
            {selected.length} source{selected.length > 1 ? 's' : ''} sélectionnée{selected.length > 1 ? 's' : ''}
          </span>
        )}
      </div>
    </div>
  )
}
