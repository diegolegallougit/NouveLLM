'use client'

import { useState } from 'react'

interface Source {
  title: string
  domain: string
  url?: string
  icon: string
  tag?: string
  excerpt?: string
}

interface SourcesBlockProps {
  sources: Source[]
  hasProcessedFile?: boolean
  sourceMode?: string
  hasAcademicSources?: boolean
}

export default function SourcesBlock({ sources, hasProcessedFile, sourceMode, hasAcademicSources }: SourcesBlockProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  if (!sources || sources.length === 0) {
    if (hasProcessedFile) {
      return (
        <div className="mt-3 pt-3 border-t border-[#D8D8D8]">
          <p className="text-[#8A8A8A] italic" style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 300, fontSize: 'var(--text-xs)' }}>
            📄 Réponse basée sur le document fourni
          </p>
        </div>
      )
    }
    if (sourceMode === 'academic') {
      return (
        <div className="mt-3 pt-3 border-t border-[#D8D8D8]">
          <p className="italic" style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 300, fontSize: 'var(--text-xs)', background: '#F5F5F5', color: '#5A5A6A', padding: '4px 8px', borderRadius: 6 }}>
            🔬 Recherche académique — aucune source vérifiée trouvée pour cette requête
          </p>
        </div>
      )
    }
    if (hasAcademicSources) {
      return (
        <div className="mt-3 pt-3 border-t border-[#D8D8D8]">
          <p className="italic" style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 300, fontSize: 'var(--text-xs)', background: '#E8F5E9', color: '#2E7D32', padding: '4px 8px', borderRadius: 6 }}>
            🔬 Publications SHS consultées
          </p>
        </div>
      )
    }
    if (sourceMode === 'web') {
      return (
        <div className="mt-3 pt-3 border-t border-[#D8D8D8]">
          <p className="italic" style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 300, fontSize: 'var(--text-xs)', background: '#E3F2FD', color: '#1565C0', padding: '4px 8px', borderRadius: 6 }}>
            🌐 Réponse basée sur le web
          </p>
        </div>
      )
    }
    if (sourceMode === 'all') {
      return (
        <div className="mt-3 pt-3 border-t border-[#D8D8D8]">
          <p className="italic" style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 300, fontSize: 'var(--text-xs)', background: '#F3E5F5', color: '#6A1B9A', padding: '4px 8px', borderRadius: 6 }}>
            ⚡ Sources combinées consultées
          </p>
        </div>
      )
    }
    return (
      <div className="mt-3 pt-3 border-t border-[#D8D8D8]">
        <p className="text-[#8A8A8A] italic" style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 300, fontSize: 'var(--text-xs)' }}>
          Réponse basée sur les connaissances générales — aucune source documentaire consultée
        </p>
      </div>
    )
  }

  return (
    <div className="mt-3 pt-3 border-t border-[#D8D8D8]">
      <p
        className="text-[#8A8A8A] uppercase tracking-wider mb-2"
        style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-xs)', letterSpacing: '0.1em' }}
      >
        Sources consultées
      </p>
      <div className="space-y-1">
        {sources.map((source, i) => {
          const n = i + 1
          const isHovered = hoveredIndex === i
          const isWeb = !!source.url

          const inner = (
            <>
              {/* Number badge */}
              <span
                className="inline-flex items-center justify-center flex-shrink-0 w-5 h-5 rounded text-[10px]"
                style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, background: '#E8E9F8', color: '#00068D' }}
              >
                {n}
              </span>

              {/* Icon */}
              <span className="text-sm flex-shrink-0">{isWeb ? '🌐' : source.icon}</span>

              {/* Title + tag */}
              <span className="flex-1 min-w-0 flex items-center gap-1.5">
                {source.tag && (
                  <span
                    className="inline-flex items-center px-1.5 py-0.5 rounded bg-[#E8E9F8] text-[#00068D] border border-[#2B2EB8] flex-shrink-0"
                    style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-2xs)' }}
                  >
                    {source.tag}
                  </span>
                )}
                <span
                  className="font-medium truncate transition-colors"
                  style={{
                    fontFamily: 'Source Serif Pro, Georgia, serif',
                    fontSize: 'var(--text-sm)',
                    color: isHovered ? '#00068D' : '#3A3A3A',
                  }}
                >
                  {source.title}
                </span>
              </span>

              {/* Domain / arrow */}
              <span className="flex-shrink-0 flex items-center gap-1" style={{ color: isHovered ? '#2B2EB8' : '#8A8A8A' }}>
                {isWeb && (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                )}
                <span className="text-[#2B2EB8] underline underline-offset-2" style={{ fontSize: 'var(--text-xs)' }}>
                  {source.domain}
                </span>
              </span>
            </>
          )

          const sharedProps = {
            id: `source-${n}`,
            className: 'flex items-center gap-2 group relative',
            style: { fontSize: 'var(--text-xs)' } as React.CSSProperties,
            onMouseEnter: () => setHoveredIndex(i),
            onMouseLeave: () => setHoveredIndex(null),
          }

          return (
            <div key={i} className="relative">
              {isWeb ? (
                <a
                  {...sharedProps}
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {inner}
                </a>
              ) : (
                <div {...sharedProps} style={{ ...sharedProps.style, cursor: 'default' }}>
                  {inner}
                </div>
              )}

              {/* Excerpt tooltip */}
              {isHovered && source.excerpt && (
                <div
                  className="absolute left-0 z-50 pointer-events-none"
                  style={{ bottom: 'calc(100% + 6px)', width: 320 }}
                >
                  <div
                    className="rounded-xl px-3 py-2.5 shadow-lg border border-[#D8D8D8] bg-white"
                  >
                    <p
                      style={{
                        fontFamily: 'Source Serif Pro, Georgia, serif',
                        fontSize: 'var(--text-xs)',
                        color: '#3A3A3A',
                        lineHeight: '1.55',
                      }}
                    >
                      {source.excerpt}{source.excerpt.length === 220 ? '…' : ''}
                    </p>
                  </div>
                  {/* Arrow */}
                  <div
                    className="absolute left-4"
                    style={{
                      top: '100%',
                      width: 0,
                      height: 0,
                      borderLeft: '6px solid transparent',
                      borderRight: '6px solid transparent',
                      borderTop: '6px solid #D8D8D8',
                    }}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
