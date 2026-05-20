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
    <div className="flex flex-col h-full bg-white px-6">
      {/* Top spacer ~15% */}
      <div style={{ height: '15vh', flexShrink: 0 }} />

      {/* Greeting */}
      <h1
        style={{
          fontFamily: 'Gilroy, sans-serif',
          fontWeight: 800,
          fontSize: '1.25rem',
          color: '#0D0D0D',
          letterSpacing: '-0.01em',
        }}
      >
        Bonjour {firstName}.
      </h1>
      <p
        className="mt-1.5"
        style={{
          fontFamily: 'Gilroy, sans-serif',
          fontWeight: 300,
          fontSize: '0.875rem',
          color: '#5A5A6A',
        }}
      >
        Par où commençons-nous ?
      </p>

      {/* Gap ~6% */}
      <div style={{ height: '6vh', flexShrink: 0 }} />

      {/* Suggestions */}
      <div className="space-y-2.5">
        {suggestions.map((s) => {
          const Icon = s.icon
          return (
            <button
              key={s.slug}
              onClick={() => onSelectAgent(s.slug)}
              className="w-full flex items-center gap-3 rounded-[10px] text-left transition-all active:opacity-60"
              style={{
                background: '#FFFFFF',
                border: '0.5px solid #D8D8D8',
                padding: '12px 14px',
                minHeight: 44,
              }}
            >
              <Icon size={16} color="#00068D" strokeWidth={2} />
              <span
                style={{
                  fontFamily: 'Gilroy, sans-serif',
                  fontWeight: 800,
                  fontSize: '0.875rem',
                  color: '#0D0D0D',
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
        className="mt-5 w-full text-center transition-colors"
        style={{
          fontFamily: 'Gilroy, sans-serif',
          fontWeight: 300,
          fontSize: '0.75rem',
          color: '#8A8A8A',
          minHeight: 36,
        }}
      >
        Voir tous les outils →
      </button>

      {/* Bottom spacer */}
      <div className="flex-1" />
    </div>
  )
}
