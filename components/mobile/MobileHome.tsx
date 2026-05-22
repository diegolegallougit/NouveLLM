'use client'

import type { LucideIcon } from 'lucide-react'
import { BookOpen, FileSearch, Globe, PenLine, GraduationCap, ClipboardCheck, FileText, Lightbulb } from 'lucide-react'

interface MobileHomeProps {
  userName: string
  discipline?: string
  onSelectAgent: (slug: string) => void
  onShowAll: () => void
}

interface Suggestion {
  label: string
  slug: string
  icon: LucideIcon
}

const DEFAULT_SUGGESTIONS: Suggestion[] = [
  { label: 'Bibliographie',       slug: 'bibliographie', icon: BookOpen    },
  { label: 'Analyser un document',slug: 'analyse',       icon: FileSearch  },
  { label: 'Rédiger',             slug: 'redaction',     icon: PenLine     },
]

function getSuggestions(discipline?: string): Suggestion[] {
  if (!discipline) return DEFAULT_SUGGESTIONS
  const d = discipline.toLowerCase()

  if (d.includes('traductolog') || d.includes('traduction')) {
    return [
      { label: 'Traduction SHS',        slug: 'traduction',    icon: Globe       },
      { label: 'Bibliographie',         slug: 'bibliographie', icon: BookOpen    },
      { label: 'Analyser un document',  slug: 'analyse',       icon: FileSearch  },
    ]
  }

  if (
    d.includes('cinéma') || d.includes('cinema') ||
    d.includes('médias') || d.includes('medias') ||
    d.includes('médiation') || d.includes('mediation') ||
    d.includes('communication')
  ) {
    return [
      { label: 'Bibliographie',         slug: 'bibliographie', icon: BookOpen    },
      { label: 'Analyser un document',  slug: 'analyse',       icon: FileSearch  },
      { label: 'Rédiger',               slug: 'redaction',     icon: PenLine     },
    ]
  }

  if (d.includes('didactique') || d.includes('pédagogie') || d.includes('pedagogie') || d.includes('formation')) {
    return [
      { label: 'Module pédagogique',    slug: 'module',        icon: GraduationCap },
      { label: 'Bibliographie',         slug: 'bibliographie', icon: BookOpen      },
      { label: 'Concevoir un examen',   slug: 'examen',        icon: ClipboardCheck},
    ]
  }

  if (d.includes('droit') || d.includes('juridique')) {
    return [
      { label: 'Analyser un document',  slug: 'analyse',       icon: FileSearch  },
      { label: 'Rédiger',               slug: 'redaction',     icon: FileText    },
      { label: 'Bibliographie',         slug: 'bibliographie', icon: BookOpen    },
    ]
  }

  if (d.includes('socio') || d.includes('anthropo') || d.includes('science') || d.includes('shs')) {
    return [
      { label: 'Bibliographie',         slug: 'bibliographie', icon: BookOpen    },
      { label: 'Analyser un document',  slug: 'analyse',       icon: FileSearch  },
      { label: 'Révélateur de sources', slug: 'revelateur',    icon: Lightbulb   },
    ]
  }

  return DEFAULT_SUGGESTIONS
}

export default function MobileHome({ userName, discipline, onSelectAgent, onShowAll }: MobileHomeProps) {
  const firstName = userName.split(' ')[0] || ''
  const suggestions = getSuggestions(discipline)

  return (
    <div className="flex flex-col justify-center flex-1 px-6 pb-6 bg-white" style={{ minHeight: '100%' }}>
      {/* Greeting */}
      <h1
        style={{
          fontFamily: 'Gilroy, sans-serif',
          fontWeight: 800,
          fontSize: 'var(--text-xl)',
          color: '#0D0D0D',
          letterSpacing: '-0.01em',
        }}
      >
        Bonjour {firstName}.
      </h1>
      <p
        className="mb-2"
        style={{
          fontFamily: 'Gilroy, sans-serif',
          fontWeight: 300,
          fontSize: 'var(--text-md)',
          color: '#8A8A8A',
        }}
      >
        Par où commençons-nous ?
      </p>

      {/* Suggestions — horizontal chips */}
      <div className="flex gap-3 mt-6 pb-1 overflow-x-auto snap-x snap-mandatory" style={{ scrollbarWidth: 'none' } as React.CSSProperties}>
        {suggestions.map((s) => {
          const Icon = s.icon
          return (
            <button
              key={s.slug}
              onClick={() => {
                onSelectAgent(s.slug)
                if (s.slug === 'analyse') window.dispatchEvent(new CustomEvent('nl:open-file-picker'))
              }}
              className="flex items-center gap-2 rounded-full flex-shrink-0 transition-all active:opacity-60 snap-start shadow-sm"
              style={{
                background: '#FFFFFF',
                border: '1.5px solid #D0D0E0',
                padding: '10px 20px',
                minHeight: 44,
              }}
            >
              <Icon size={14} color="#00068D" strokeWidth={2} />
              <span
                style={{
                  fontFamily: 'Gilroy, sans-serif',
                  fontWeight: 800,
                  fontSize: 'var(--text-base)',
                  color: '#0D0D0D',
                  whiteSpace: 'nowrap',
                }}
              >
                {s.label}
              </span>
            </button>
          )
        })}
      </div>

      {/* Voir tous les outils */}
      <button
        onClick={onShowAll}
        className="mt-5 flex items-center gap-1.5 transition-colors"
        style={{
          fontFamily: 'Gilroy, sans-serif',
          fontWeight: 300,
          fontSize: 'var(--text-sm)',
          color: '#8A8A8A',
          minHeight: 44,
          background: 'none',
          border: 'none',
        }}
      >
        Voir tous les outils →
      </button>
    </div>
  )
}
