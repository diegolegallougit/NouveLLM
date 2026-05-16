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
  userRole?: string
}

// SVG icons keyed by the icon field stored in the DB
function FamilyIcon({ name, size = 20 }: { name: string; size?: number }) {
  const icons: Record<string, React.ReactNode> = {
    brain: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M9.5 2a2.5 2.5 0 0 1 5 0v1a2.5 2.5 0 0 1 0 5H9.5a2.5 2.5 0 0 1 0-5V2z" /><path d="M9.5 8a2.5 2.5 0 0 0-5 0c0 1.4 1 2.5 2.5 2.5" /><path d="M14.5 8a2.5 2.5 0 0 1 5 0c0 1.4-1 2.5-2.5 2.5" /><path d="M12 13v-3M7 13a5 5 0 0 0 10 0" /></svg>,
    exam: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="4" y="2" width="16" height="20" rx="2" /><path d="M8 7h8M8 11h5M8 15h3" /></svg>,
    book: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></svg>,
    write: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>,
    check: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>,
    globe: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>,
    search: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>,
    mic: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="9" y="2" width="6" height="12" rx="3" /><path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8" /></svg>,
    teacher: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></svg>,
    admin: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>,
    help: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01" /></svg>,
  }
  return <>{icons[name] ?? icons['help']}</>
}

export default function RoutingPanel({ onSelectAgent, onExpertMode, conversationId, userRole }: RoutingPanelProps) {
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

  function selectOption(opt: RoutingOption) {
    if (opt.comingSoon) return
    if (opt.agentSlug === 'session-cours') {
      window.location.assign('/sessions/new')
      return
    }
    onSelectAgent(opt.agentSlug)
  }

  function selectFamily(family: RoutingFamily) {
    if (family.slug === 'aide-humaine') {
      setShowHIL(true)
      return
    }
    // Auto-select if single question with single option
    if (family.questions.length === 1 && family.questions[0].options.length === 1) {
      selectOption(family.questions[0].options[0])
      return
    }
    setSelectedFamily(family)
    if (family.questions.length > 0) {
      setCurrentQuestion(family.questions[0])
    } else {
      onSelectAgent(null)
    }
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
    <div className="flex flex-col items-center justify-center min-h-full py-8 px-4 sm:py-12 sm:px-8">
      {/* Logo / heading */}
      <div className="text-center mb-6 sm:mb-8">
        <div className="inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[#00068D] mb-4 sm:mb-5 shadow-md">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.4" strokeLinecap="round">
            <path d="M12 3v18M3 12h18" />
            <path d="M5.6 5.6l12.8 12.8M5.6 18.4l12.8-12.8" />
          </svg>
        </div>
        <h2 style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'clamp(1.1rem, 4vw, 1.4rem)', letterSpacing: '-0.02em', color: '#0D0D0D' }}>
          {selectedFamily ? selectedFamily.label : 'Que voulez-vous faire ?'}
        </h2>
        {!selectedFamily && (
          <p className="mt-1.5 text-sm text-[#8A8A8A] max-w-xs mx-auto" style={{ fontFamily: 'Source Serif Pro, Georgia, serif' }}>
            Sélectionnez une tâche ou passez en mode expert
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
              className={`w-full flex items-center justify-between px-4 py-3 min-h-[44px] rounded-xl border text-left transition-all ${
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
              </div>
            </button>
          ))}
          <button
            onClick={goBack}
            className="flex items-center gap-1.5 mt-3 px-3 py-1.5 min-h-[44px] rounded-lg text-sm text-[#8A8A8A] hover:text-[#0D0D0D] hover:bg-[#F2F2F2] transition-all"
            style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 300 }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M19 12H5M5 12l7-7M5 12l7 7" />
            </svg>
            Retour
          </button>
        </div>
      ) : !selectedFamily ? (
        /* Family grid — 2 columns mobile, 3 desktop */
        <div className="w-full max-w-2xl">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
            {families.map(family => (
              <button
                key={family.slug}
                onClick={() => selectFamily(family)}
                className="flex flex-col items-start gap-2 p-3 sm:p-4 rounded-xl border border-[#D8D8D8] bg-white hover:bg-[#F0F1FB] hover:border-[#2B2EB8] transition-all text-left min-h-[80px] sm:min-h-[100px]"
              >
                <span className="text-[#00068D] flex-shrink-0">
                  <FamilyIcon name={family.icon} size={18} />
                </span>
                <div className="flex-1 min-w-0">
                  <p style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-xs)', color: '#0D0D0D', lineHeight: 1.3 }}>
                    {family.label}
                  </p>
                  <p className="mt-0.5 hidden sm:block" style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: '0.7rem', color: '#8A8A8A', lineHeight: 1.4 }}>
                    {family.description}
                  </p>
                </div>
              </button>
            ))}
          </div>

          <div className="flex justify-end pt-3">
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
