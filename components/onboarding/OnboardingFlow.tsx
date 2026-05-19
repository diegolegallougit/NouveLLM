/* eslint-disable react/no-unescaped-entities */
'use client'

import { useEffect, useState, useCallback, Fragment } from 'react'

interface OnboardingFlowProps {
  onComplete: () => void
  userName: string
}

type Step = 0 | 1 | 2 | 3

const UFR_OPTIONS = [
  'Arts & Médias',
  'LLCSE',
  'LLD',
  'Monde Anglophone',
  'IHEAL',
  'ESIT',
  'ICM',
  'INSPÉ de Paris',
  'Autre',
]

const ROLE_OPTIONS = [
  'MCF',
  'PR',
  'PRAG',
  'ATER',
  'Doctorant',
  'Vacataire',
  'BIATSS-A',
  'BIATSS-B',
  'Autre',
]

const STEP_LABELS = ['Profil', 'Posture', 'Sources']

interface MetaPrompt {
  id: string
  title: string
  description?: string | null
}

interface AcademicSource {
  slug: string
  label: string
  description: string
  icon: string
}

export default function OnboardingFlow({ onComplete, userName }: OnboardingFlowProps) {
  const [step, setStep] = useState<Step>(0)
  const [visible, setVisible] = useState(false)
  const [completing, setCompleting] = useState(false)

  // Step 0
  const [discipline, setDiscipline] = useState('')
  const [roleExact, setRoleExact] = useState('')
  const [roleExactOther, setRoleExactOther] = useState('')
  const [ufr, setUfr] = useState('')

  // Step 1
  const [metaPrompts, setMetaPrompts] = useState<MetaPrompt[]>([])
  const [selectedMpId, setSelectedMpId] = useState<string | null>(null)
  const [mpLoading, setMpLoading] = useState(false)

  // Step 2
  const [academicSources, setAcademicSources] = useState<AcademicSource[]>([])
  const [selectedSources, setSelectedSources] = useState<Set<string>>(new Set())
  const [sourcesLoading, setSourcesLoading] = useState(false)

  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(id)
  }, [])

  useEffect(() => {
    if (step !== 1 || metaPrompts.length > 0) return
    setMpLoading(true)
    fetch('/api/meta-prompts')
      .then((r) => r.json())
      .then((data) => setMetaPrompts(data.institutional || []))
      .catch(() => {})
      .finally(() => setMpLoading(false))
  }, [step, metaPrompts.length])

  useEffect(() => {
    if (step !== 2 || academicSources.length > 0) return
    setSourcesLoading(true)
    fetch('/api/integrations/sources')
      .then((r) => r.json())
      .then((data) => setAcademicSources(data.academicSources || []))
      .catch(() => {})
      .finally(() => setSourcesLoading(false))
  }, [step, academicSources.length])

  const goToStep = useCallback((next: Step) => {
    setVisible(false)
    setTimeout(() => {
      setStep(next)
      setVisible(true)
    }, 150)
  }, [])

  function advanceFromStep0() {
    const effectiveRole = roleExact === 'Autre' ? roleExactOther.trim() : roleExact
    const body: Record<string, string> = {}
    if (discipline.trim()) body.discipline = discipline.trim()
    if (effectiveRole) body.roleExact = effectiveRole
    if (ufr) body.ufr = ufr
    if (Object.keys(body).length > 0) {
      fetch('/api/users/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }).catch(() => {})
    }
    goToStep(1)
  }

  function advanceFromStep1() {
    if (selectedMpId) {
      fetch(`/api/meta-prompts/${selectedMpId}/activate`, { method: 'POST' }).catch(() => {})
    }
    goToStep(2)
  }

  function advanceFromStep2() {
    if (selectedSources.size > 0) {
      fetch('/api/users/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourcesAcademiques: [...selectedSources].join(',') }),
      }).catch(() => {})
    }
    goToStep(3)
  }

  async function handleComplete() {
    setCompleting(true)
    try {
      const r = await fetch('/api/onboarding/complete', { method: 'POST' })
      if (!r.ok) throw new Error('server_error')
      onComplete()
    } catch {
      setCompleting(false)
    }
  }

  async function handleSkipAll() {
    try { await fetch('/api/onboarding/complete', { method: 'POST' }) } catch {}
    onComplete()
  }

  // Derived
  const effectiveRole = roleExact === 'Autre' ? roleExactOther.trim() : roleExact
  const selectedMp = metaPrompts.find((mp) => mp.id === selectedMpId)
  const hasAnyInfo =
    discipline.trim() || effectiveRole || ufr || selectedMp || selectedSources.size > 0
  const firstName = userName.split(' ')[0] || ''

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#D8D8D8] flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: '#00068D' }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          <span style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '0.9rem', color: '#0D0D0D', letterSpacing: '0.02em' }}>
            NouveLLM
          </span>
        </div>

        {/* Skip all — desktop */}
        {step < 3 && (
          <button
            onClick={handleSkipAll}
            className="hidden md:block text-xs text-[#8A8A8A] hover:text-[#00068D] transition-colors"
            style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 300 }}
          >
            Configurer plus tard
          </button>
        )}
      </div>

      {/* Progress stepper (steps 0–2) */}
      {step < 3 && (
        <div className="flex items-start gap-0 px-6 pt-5 pb-1 max-w-[560px] mx-auto w-full">
          {([0, 1, 2] as const).map((s, i) => {
            const isActive = step === s
            const isCompleted = step > s
            return (
              <Fragment key={s}>
                <button
                  onClick={() => (isCompleted ? goToStep(s) : undefined)}
                  disabled={!isCompleted}
                  className="flex flex-col items-center gap-1.5"
                  style={{ cursor: isCompleted ? 'pointer' : 'default', minWidth: 44 }}
                >
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center transition-all"
                    style={{
                      background: isCompleted ? '#2B2EB8' : isActive ? '#00068D' : '#D8D8D8',
                    }}
                  >
                    {isCompleted ? (
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      <span style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '0.6rem', color: 'white', lineHeight: 1 }}>
                        {s + 1}
                      </span>
                    )}
                  </div>
                  <span style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: isActive ? 800 : 300, fontSize: '0.6rem', letterSpacing: '0.04em', color: isCompleted ? '#2B2EB8' : isActive ? '#00068D' : '#8A8A8A' }}>
                    {STEP_LABELS[s]}
                  </span>
                </button>

                {i < 2 && (
                  <div
                    className="flex-1 h-px mt-3 mx-1 transition-all"
                    style={{ background: step > s ? '#2B2EB8' : '#D8D8D8' }}
                  />
                )}
              </Fragment>
            )
          })}
        </div>
      )}

      {/* Animated content */}
      <div
        className="flex-1 overflow-y-auto nl-scroll"
        style={{ opacity: visible ? 1 : 0, transition: 'opacity 150ms ease' }}
      >
        <div className="max-w-[560px] mx-auto px-4 md:px-6 py-6 space-y-6">

          {/* ── STEP 0 — Profil ── */}
          {step === 0 && (
            <>
              <div>
                <h1 style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '1.35rem', color: '#0D0D0D', letterSpacing: '-0.01em', lineHeight: 1.25 }}>
                  Configurons votre assistant
                </h1>
                <p style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: '0.88rem', color: '#5A5A5A', lineHeight: 1.65 }} className="mt-2">
                  Pour adapter ses réponses à votre contexte, votre assistant a besoin de vous connaître un peu.
                </p>
                <p style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: '0.75rem', color: '#8A8A8A', fontStyle: 'italic' }} className="mt-1">
                  Ces informations restent privées et ne sont jamais partagées.
                </p>
              </div>

              <div className="space-y-4">
                {/* Discipline */}
                <div className="space-y-1.5">
                  <label style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '0.68rem', color: '#5A5A5A', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                    Discipline
                  </label>
                  <input
                    type="text"
                    value={discipline}
                    onChange={(e) => setDiscipline(e.target.value)}
                    placeholder="Ex : Traductologie, Cinéma, Linguistique..."
                    className="w-full px-3.5 rounded-lg border border-[#D8D8D8] focus:border-[#00068D] focus:outline-none transition-colors"
                    style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: '0.88rem', color: '#0D0D0D', minHeight: 44 }}
                  />
                </div>

                {/* Fonction */}
                <div className="space-y-1.5">
                  <label style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '0.68rem', color: '#5A5A5A', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                    Fonction
                  </label>
                  <select
                    value={roleExact}
                    onChange={(e) => {
                      setRoleExact(e.target.value)
                      if (e.target.value !== 'Autre') setRoleExactOther('')
                    }}
                    className="w-full px-3.5 rounded-lg border border-[#D8D8D8] focus:border-[#00068D] focus:outline-none transition-colors appearance-none bg-white"
                    style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: '0.88rem', color: roleExact ? '#0D0D0D' : '#8A8A8A', minHeight: 44 }}
                  >
                    <option value="" disabled>Sélectionnez votre fonction</option>
                    {ROLE_OPTIONS.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                  {roleExact === 'Autre' && (
                    <input
                      type="text"
                      value={roleExactOther}
                      onChange={(e) => setRoleExactOther(e.target.value)}
                      placeholder="Précisez votre fonction..."
                      className="w-full px-3.5 rounded-lg border border-[#D8D8D8] focus:border-[#00068D] focus:outline-none transition-colors"
                      style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: '0.88rem', color: '#0D0D0D', minHeight: 44 }}
                      autoFocus
                    />
                  )}
                </div>

                {/* UFR */}
                <div className="space-y-1.5">
                  <label style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '0.68rem', color: '#5A5A5A', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                    UFR / Composante
                  </label>
                  <select
                    value={ufr}
                    onChange={(e) => setUfr(e.target.value)}
                    className="w-full px-3.5 rounded-lg border border-[#D8D8D8] focus:border-[#00068D] focus:outline-none transition-colors appearance-none bg-white"
                    style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: '0.88rem', color: ufr ? '#0D0D0D' : '#8A8A8A', minHeight: 44 }}
                  >
                    <option value="" disabled>Sélectionnez votre composante</option>
                    {UFR_OPTIONS.map((u) => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
              </div>
            </>
          )}

          {/* ── STEP 1 — Méta-prompt ── */}
          {step === 1 && (
            <>
              <div>
                <h1 style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '1.35rem', color: '#0D0D0D', letterSpacing: '-0.01em', lineHeight: 1.25 }}>
                  Adoptez une posture de travail
                </h1>
                <p style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: '0.88rem', color: '#5A5A5A', lineHeight: 1.65 }} className="mt-2">
                  Un méta-prompt adapte le ton et le style de l'assistant. Vous pouvez en changer à tout moment.
                </p>
              </div>

              {mpLoading ? (
                <div className="flex justify-center py-10">
                  <div className="w-5 h-5 border-2 border-[#D8D8D8] border-t-[#00068D] rounded-full animate-spin" />
                </div>
              ) : metaPrompts.length === 0 ? (
                <p style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: '0.85rem', color: '#8A8A8A' }}>
                  Aucune posture institutionnelle disponible pour le moment.
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {metaPrompts.map((mp) => {
                    const isSelected = selectedMpId === mp.id
                    return (
                      <button
                        key={mp.id}
                        onClick={() => setSelectedMpId(isSelected ? null : mp.id)}
                        className="text-left p-4 rounded-xl transition-all"
                        style={{
                          border: isSelected ? '1.5px solid #00068D' : '1px solid #D8D8D8',
                          background: isSelected ? '#E8E9F8' : '#FFFFFF',
                          minHeight: 44,
                        }}
                      >
                        <p style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '0.82rem', color: isSelected ? '#00068D' : '#0D0D0D' }}>
                          {mp.title}
                        </p>
                        {mp.description && (
                          <p style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: '0.78rem', color: '#5A5A5A', lineHeight: 1.55, marginTop: '0.35rem' }}>
                            {mp.description}
                          </p>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
            </>
          )}

          {/* ── STEP 2 — Sources ── */}
          {step === 2 && (
            <>
              <div>
                <h1 style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '1.35rem', color: '#0D0D0D', letterSpacing: '-0.01em', lineHeight: 1.25 }}>
                  Quelles bases documentaires utilisez-vous ?
                </h1>
                <p style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: '0.88rem', color: '#5A5A5A', lineHeight: 1.65 }} className="mt-2">
                  Votre assistant les interrogera en priorité dans vos recherches bibliographiques.
                </p>
              </div>

              {sourcesLoading ? (
                <div className="flex justify-center py-10">
                  <div className="w-5 h-5 border-2 border-[#D8D8D8] border-t-[#00068D] rounded-full animate-spin" />
                </div>
              ) : academicSources.length === 0 ? (
                <p style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: '0.85rem', color: '#8A8A8A' }}>
                  Aucune source académique disponible pour le moment.
                </p>
              ) : (
                <div className="space-y-2.5">
                  {academicSources.map((src) => {
                    const checked = selectedSources.has(src.slug)
                    return (
                      <label
                        key={src.slug}
                        className="flex items-start gap-3 p-3.5 rounded-xl cursor-pointer transition-all"
                        style={{
                          border: checked ? '1.5px solid #00068D' : '1px solid #D8D8D8',
                          background: checked ? '#E8E9F8' : '#FFFFFF',
                          minHeight: 44,
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            setSelectedSources((prev) => {
                              const next = new Set(prev)
                              if (next.has(src.slug)) next.delete(src.slug)
                              else next.add(src.slug)
                              return next
                            })
                          }
                          className="mt-0.5 flex-shrink-0 accent-[#00068D]"
                        />
                        <div>
                          <p style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '0.82rem', color: checked ? '#00068D' : '#0D0D0D' }}>
                            {src.icon} {src.label}
                          </p>
                          {src.description && (
                            <p style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: '0.78rem', color: '#5A5A5A', lineHeight: 1.5, marginTop: '0.2rem' }}>
                              {src.description}
                            </p>
                          )}
                        </div>
                      </label>
                    )
                  })}
                </div>
              )}
            </>
          )}

          {/* ── STEP 3 — Récap ── */}
          {step === 3 && (
            <>
              <div className="text-center pt-2">
                <div
                  className="inline-flex items-center justify-center w-14 h-14 rounded-full mb-4"
                  style={{ background: '#E8E9F8' }}
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#00068D" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <h1 style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '1.35rem', color: '#0D0D0D', letterSpacing: '-0.01em' }}>
                  Votre assistant est prêt
                </h1>
              </div>

              {/* Recap card */}
              <div className="rounded-xl px-5 py-4 space-y-2.5" style={{ background: '#F2F2F2' }}>
                {hasAnyInfo ? (
                  <>
                    {discipline.trim() && (
                      <RecapRow label="Discipline" value={discipline.trim()} />
                    )}
                    {effectiveRole && (
                      <RecapRow label="Fonction" value={effectiveRole} />
                    )}
                    {ufr && (
                      <RecapRow label="UFR" value={ufr} />
                    )}
                    {selectedMp && (
                      <RecapRow label="Posture active" value={selectedMp.title} />
                    )}
                    {selectedSources.size > 0 && (
                      <RecapRow
                        label="Sources"
                        value={[...selectedSources]
                          .map((slug) => academicSources.find((s) => s.slug === slug)?.label ?? slug)
                          .join(', ')}
                      />
                    )}
                  </>
                ) : (
                  <p style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: '0.85rem', color: '#5A5A5A', lineHeight: 1.6 }}>
                    Assistant configuré avec les paramètres par défaut de Sorbonne Nouvelle.
                  </p>
                )}
              </div>

              {/* Pre-formatted message */}
              <div className="rounded-xl border border-[#D8D8D8] px-5 py-4">
                <p style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: '0.88rem', color: '#3A3A3A', lineHeight: 1.7, fontStyle: 'italic' }}>
                  "Bonjour{firstName ? `, ${firstName}` : ''} ! Je suis votre assistant IA de l'Université Sorbonne Nouvelle. Je suis prêt à vous aider dans vos travaux de recherche et d'enseignement."
                </p>
              </div>

              {/* CTA */}
              <button
                onClick={handleComplete}
                disabled={completing}
                className="w-full rounded-xl text-white transition-all hover:bg-[#2B2EB8] disabled:opacity-50"
                style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '0.82rem', letterSpacing: '0.04em', background: '#00068D', minHeight: 52 }}
              >
                {completing ? 'Chargement…' : 'COMMENCER MA PREMIÈRE CONVERSATION →'}
              </button>
            </>
          )}

          {/* ── CTA row — steps 0–2 ── */}
          {step < 3 && (
            <div className="space-y-2 pt-2">
              <button
                onClick={() => {
                  if (step === 0) advanceFromStep0()
                  else if (step === 1) advanceFromStep1()
                  else advanceFromStep2()
                }}
                className="w-full rounded-xl text-white transition-all hover:bg-[#2B2EB8]"
                style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '0.82rem', letterSpacing: '0.04em', background: '#00068D', minHeight: 48 }}
              >
                Continuer →
              </button>
              <button
                onClick={() => goToStep((step + 1) as Step)}
                className="w-full py-2.5 text-center text-xs text-[#8A8A8A] hover:text-[#00068D] transition-colors"
                style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 300 }}
              >
                Passer cette étape
              </button>

              {/* Skip all — mobile only */}
              <button
                onClick={handleSkipAll}
                className="md:hidden w-full py-2 text-center text-xs text-[#8A8A8A] hover:text-[#00068D] transition-colors"
                style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 300 }}
              >
                Configurer plus tard
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function RecapRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3">
      <span style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '0.75rem', color: '#5A5A5A', minWidth: 110, paddingTop: 1 }}>
        {label}
      </span>
      <span style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: '0.82rem', color: '#0D0D0D', lineHeight: 1.5 }}>
        {value}
      </span>
    </div>
  )
}
