'use client'

import { useEffect, useState } from 'react'
import HILContactPanel from '@/components/hil/HILContactPanel'

interface RoutingOption {
  id: string
  label: string
  agentSlug: string | null
  nextQuestionId: string | null
  order: number
  comingSoon: boolean
}

interface RoutingQuestion {
  id: string
  question: string
  order: number
  options: RoutingOption[]
}

interface RoutingFamily {
  id: string
  slug: string
  label: string
  icon: string
  description: string
  questions: RoutingQuestion[]
}

interface RoutingPanelProps {
  onSelectAgent: (agentSlug: string | null) => void
  onExpertMode: () => void
  conversationId?: string
}

export default function RoutingPanel({ onSelectAgent, onExpertMode, conversationId }: RoutingPanelProps) {
  const [families, setFamilies] = useState<RoutingFamily[]>([])
  const [selectedFamily, setSelectedFamily] = useState<RoutingFamily | null>(null)
  const [currentQuestion, setCurrentQuestion] = useState<RoutingQuestion | null>(null)
  const [showHIL, setShowHIL] = useState(false)

  useEffect(() => {
    fetch('/api/routing/families')
      .then(r => r.json())
      .then(d => setFamilies(d.families ?? []))
      .catch(() => null)
  }, [])

  function selectFamily(family: RoutingFamily) {
    if (family.slug === 'aide-humaine') {
      setShowHIL(true)
      return
    }
    setSelectedFamily(family)
    if (family.questions.length > 0) {
      setCurrentQuestion(family.questions[0])
    } else {
      onSelectAgent(null)
    }
  }

  function selectOption(opt: RoutingOption) {
    if (opt.comingSoon) return
    if (opt.agentSlug === 'session-cours') {
      window.location.href = '/sessions/new'
      return
    }
    onSelectAgent(opt.agentSlug)
  }

  function goBack() {
    setCurrentQuestion(null)
    setSelectedFamily(null)
    setShowHIL(false)
  }

  if (showHIL) {
    return (
      <HILContactPanel
        conversationId={conversationId}
        onBack={goBack}
        onDone={goBack}
      />
    )
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-full py-12 px-8">
      {/* Logo / heading */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#00068D] mb-5 shadow-md">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.4" strokeLinecap="round">
            <path d="M12 3v18M3 12h18" />
            <path d="M5.6 5.6l12.8 12.8M5.6 18.4l12.8-12.8" />
          </svg>
        </div>
        <h2 style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '1.4rem', letterSpacing: '-0.02em', color: '#0D0D0D' }}>
          {selectedFamily ? selectedFamily.label : 'Que voulez-vous faire ?'}
        </h2>
        {!selectedFamily && (
          <p className="mt-1.5 text-sm text-[#8A8A8A]" style={{ fontFamily: 'Source Serif Pro, Georgia, serif' }}>
            Sélectionnez une tâche ou passez en mode expert pour accéder directement aux agents
          </p>
        )}
      </div>

      {/* Question drill-down */}
      {selectedFamily && currentQuestion ? (
        <div className="w-full max-w-md space-y-2">
          <p className="text-sm text-[#5A5A5A] mb-3" style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontStyle: 'italic' }}>
            {currentQuestion.question}
          </p>
          {currentQuestion.options.map(opt => (
            <button
              key={opt.id}
              onClick={() => selectOption(opt)}
              disabled={opt.comingSoon}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border text-left transition-all ${
                opt.comingSoon
                  ? 'border-[#F2F2F2] bg-[#FAFAFA] opacity-50 cursor-not-allowed'
                  : 'border-[#D8D8D8] bg-white hover:bg-[#F0F1FB] hover:border-[#2B2EB8]'
              }`}
            >
              <span style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: '0.9rem', color: '#0D0D0D' }}>
                {opt.label}
              </span>
              <div className="flex items-center gap-2 flex-shrink-0">
                {opt.comingSoon && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#FFF8E1] text-[#F57F17] border border-[#FFD54F]"
                    style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800 }}>
                    Bientôt
                  </span>
                )}
                {opt.agentSlug && !opt.comingSoon && (
                  <span className="nl-token-agent text-[10px]">@{opt.agentSlug}</span>
                )}
                {!opt.agentSlug && !opt.comingSoon && opt.label !== 'Créer une session étudiants' && (
                  <span className="text-[10px] text-[#8A8A8A]" style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 300 }}>
                    Général
                  </span>
                )}
              </div>
            </button>
          ))}
          <button
            onClick={goBack}
            className="flex items-center gap-1.5 mt-3 px-3 py-1.5 rounded-lg text-sm text-[#8A8A8A] hover:text-[#0D0D0D] hover:bg-[#F2F2F2] transition-all"
            style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 300 }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M19 12H5M5 12l7-7M5 12l7 7" />
            </svg>
            Retour
          </button>
        </div>
      ) : !selectedFamily ? (
        /* Family grid */
        <div className="w-full max-w-lg space-y-2">
          {families.map(family => (
            <button
              key={family.slug}
              onClick={() => selectFamily(family)}
              className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl border border-[#D8D8D8] bg-white hover:bg-[#F0F1FB] hover:border-[#2B2EB8] transition-all text-left"
            >
              <span className="text-xl flex-shrink-0 w-7 text-center">{family.icon}</span>
              <div className="flex-1 min-w-0">
                <p style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '0.85rem', color: '#0D0D0D' }}>
                  {family.label}
                </p>
                <p style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: '0.75rem', color: '#8A8A8A', marginTop: '0.1rem' }}>
                  {family.description}
                </p>
              </div>
              <svg className="flex-shrink-0" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#C8C8C8" strokeWidth="2.5" strokeLinecap="round">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          ))}

          <div className="flex justify-end pt-2">
            <button
              onClick={onExpertMode}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-[#8A8A8A] hover:text-[#00068D] hover:bg-[#E8E9F8] transition-all"
              style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, letterSpacing: '0.03em' }}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12" />
              </svg>
              Mode expert
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
