'use client'

import { useState } from 'react'

interface OnboardingModalProps {
  onComplete: () => void
}

type Step = 1 | 2 | 3 | 4

const QUIZ: {
  question: string
  options: string[]
  correct: number
}[] = [
  {
    question: "L'utilisation de NouveLLM pour rédiger intégralement un devoir et le soumettre comme son propre travail est-elle autorisée ?",
    options: [
      "Non, c'est du plagiat assisté par IA",
      "Oui, si les sources sont citées",
      "Oui, c'est un outil institutionnel donc autorisé",
    ],
    correct: 0,
  },
  {
    question: 'Comment doit-on utiliser les réponses générées par NouveLLM dans un travail académique ?',
    options: [
      "Les copier directement sans modification",
      "Les mentionner en note ou en bibliographie et les reformuler",
      "Elles n'ont pas à être déclarées car c'est un outil interne",
    ],
    correct: 1,
  },
  {
    question: "Que faire si NouveLLM génère une information qui vous semble douteuse ou inexacte ?",
    options: [
      "L'accepter car le système est hébergé par l'université",
      "Ignorer le doute et l'utiliser si c'est utile",
      "La vérifier avec des sources primaires fiables",
    ],
    correct: 2,
  },
]

export default function OnboardingModal({ onComplete }: OnboardingModalProps) {
  const [step, setStep] = useState<Step>(1)
  const [answers, setAnswers] = useState<(number | null)[]>([null, null, null])
  const [quizSubmitted, setQuizSubmitted] = useState(false)
  const [quizError, setQuizError] = useState(false)
  const [completing, setCompleting] = useState(false)

  const score = answers.filter((a, i) => a === QUIZ[i].correct).length
  const quizPassed = score >= 2

  function handleAnswer(questionIdx: number, optionIdx: number) {
    if (quizSubmitted) return
    setAnswers((prev) => prev.map((a, i) => (i === questionIdx ? optionIdx : a)))
  }

  function handleQuizSubmit() {
    if (answers.some((a) => a === null)) return
    setQuizSubmitted(true)
    if (!quizPassed) {
      setQuizError(true)
    }
  }

  function handleQuizRetry() {
    setAnswers([null, null, null])
    setQuizSubmitted(false)
    setQuizError(false)
  }

  async function handleComplete() {
    setCompleting(true)
    try {
      await fetch('/api/onboarding/complete', { method: 'POST' })
    } finally {
      setCompleting(false)
      onComplete()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div
        className="bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        style={{ width: 560, maxHeight: '90vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-7 py-5 border-b border-[#D8D8D8] flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#00068D]">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                <path d="M12 3v18M3 12h18" />
                <path d="M5.6 5.6l12.8 12.8M5.6 18.4l12.8-12.8" />
              </svg>
            </div>
            <span style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '1rem', color: '#0D0D0D' }}>
              Bienvenue sur NouveLLM
            </span>
          </div>
          {/* Step dots */}
          <div className="flex items-center gap-1.5">
            {([1, 2, 3, 4] as Step[]).map((s) => (
              <div
                key={s}
                className="rounded-full transition-all"
                style={{
                  width: step === s ? 20 : 6,
                  height: 6,
                  background: step >= s ? '#00068D' : '#D8D8D8',
                }}
              />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-7 py-6">

          {/* STEP 1 — Présentation */}
          {step === 1 && (
            <div className="space-y-5">
              <h2 style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '1.2rem', color: '#0D0D0D' }}>
                L'IA au service de l'enseignement supérieur
              </h2>
              <p style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: '0.9rem', color: '#3A3A3A', lineHeight: '1.7' }}>
                NouveLLM est l'assistant IA institutionnel de l'Université Sorbonne Nouvelle, développé dans le
                cadre du projet INTEGRIA (ANR France 2030). Il vous donne accès à des agents spécialisés pour
                vos activités académiques.
              </p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: '📚', label: 'Bibliographies', desc: 'Construire des références sourcées' },
                  { icon: '📋', label: 'Fiches de cours', desc: 'Structurer au format ECTS' },
                  { icon: '🔍', label: 'Analyse documentaire', desc: 'Interroger les publications SHS' },
                  { icon: '✍️', label: 'Rédaction', desc: 'Notes et documents institutionnels' },
                ].map((item) => (
                  <div key={item.label} className="flex items-start gap-2.5 p-3 rounded-xl bg-[#F8F8FF] border border-[#D8D8D8]">
                    <span className="text-xl">{item.icon}</span>
                    <div>
                      <p style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '0.75rem', color: '#0D0D0D' }}>{item.label}</p>
                      <p style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: '0.75rem', color: '#8A8A8A' }}>{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="rounded-xl bg-[#FFF8E1] border border-[#FFD54F] px-4 py-3">
                <p style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: '0.82rem', color: '#5D4037', lineHeight: '1.6' }}>
                  <strong>Important :</strong> NouveLLM est un outil d'assistance. Les réponses générées doivent
                  être vérifiées et ne peuvent pas remplacer votre propre travail académique.
                </p>
              </div>
            </div>
          )}

          {/* STEP 2 — Quiz intégrité académique */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h2 style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '1.2rem', color: '#0D0D0D' }}>
                  Quiz — Intégrité académique
                </h2>
                <p style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: '0.82rem', color: '#8A8A8A' }} className="mt-1">
                  3 questions · Score minimum 2/3 pour continuer
                </p>
              </div>

              {QUIZ.map((q, qi) => (
                <div key={qi} className="space-y-2.5">
                  <p style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontWeight: 600, fontSize: '0.87rem', color: '#0D0D0D', lineHeight: '1.5' }}>
                    {qi + 1}. {q.question}
                  </p>
                  <div className="space-y-1.5">
                    {q.options.map((opt, oi) => {
                      const isSelected = answers[qi] === oi
                      const isCorrect = oi === q.correct
                      let bg = 'bg-white border-[#D8D8D8]'
                      let textColor = 'text-[#3A3A3A]'
                      if (quizSubmitted) {
                        if (isCorrect) { bg = 'bg-[#E8F5E9] border-[#4CAF50]'; textColor = 'text-[#2E7D32]' }
                        else if (isSelected && !isCorrect) { bg = 'bg-red-50 border-red-300'; textColor = 'text-red-700' }
                      } else if (isSelected) {
                        bg = 'bg-[#E8E9F8] border-[#2B2EB8]'
                        textColor = 'text-[#00068D]'
                      }
                      return (
                        <button
                          key={oi}
                          onClick={() => handleAnswer(qi, oi)}
                          disabled={quizSubmitted}
                          className={`w-full text-left px-3.5 py-2.5 rounded-lg border transition-all ${bg} disabled:cursor-default`}
                          style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: '0.83rem' }}
                        >
                          <span className={textColor}>{opt}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}

              {quizSubmitted && (
                <div
                  className={`rounded-xl px-4 py-3 border ${quizPassed ? 'bg-[#E8F5E9] border-[#4CAF50]' : 'bg-red-50 border-red-300'}`}
                >
                  {quizPassed ? (
                    <p style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '0.85rem', color: '#2E7D32' }}>
                      ✓ {score}/3 — Vous pouvez continuer.
                    </p>
                  ) : (
                    <div>
                      <p style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '0.85rem', color: '#dc2626' }}>
                        {score}/3 — Score insuffisant (minimum 2/3 requis).
                      </p>
                      <p style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: '0.8rem', color: '#dc2626' }} className="mt-1">
                        Veuillez relire les questions et réessayer.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {!quizSubmitted && (
                <button
                  onClick={handleQuizSubmit}
                  disabled={answers.some((a) => a === null)}
                  className="w-full py-2.5 rounded-lg bg-[#00068D] text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:bg-[#2B2EB8]"
                  style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '0.78rem', letterSpacing: '0.04em' }}
                >
                  VALIDER MES RÉPONSES
                </button>
              )}

              {quizSubmitted && !quizPassed && (
                <button
                  onClick={handleQuizRetry}
                  className="w-full py-2.5 rounded-lg border border-[#D8D8D8] text-[#0D0D0D] hover:bg-[#F2F2F2] transition-all"
                  style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '0.78rem', letterSpacing: '0.04em' }}
                >
                  RÉESSAYER
                </button>
              )}
            </div>
          )}

          {/* STEP 3 — RGPD */}
          {step === 3 && (
            <div className="space-y-5">
              <h2 style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '1.2rem', color: '#0D0D0D' }}>
                Protection de vos données
              </h2>
              <div className="space-y-4">
                {[
                  {
                    icon: '🗂️',
                    title: 'Données collectées',
                    text: "Vos conversations et messages sont conservés pour améliorer votre expérience et permettre l'historique des échanges.",
                  },
                  {
                    icon: '🗓️',
                    title: 'Durée de conservation',
                    text: 'Vos conversations sont conservées 1 an, puis supprimées automatiquement. Vous pouvez les effacer à tout moment depuis vos paramètres.',
                  },
                  {
                    icon: '🇫🇷',
                    title: 'Hébergement en France',
                    text: "Toutes vos données sont hébergées sur les serveurs de l'Université Sorbonne Nouvelle, en France. Aucune donnée n'est transmise à des tiers hors UE.",
                  },
                  {
                    icon: '🔐',
                    title: 'Vos droits',
                    text: 'Vous pouvez accéder, rectifier ou effacer vos données depuis les paramètres de votre compte (icône ⚙). Conformément au RGPD.',
                  },
                ].map((item) => (
                  <div key={item.title} className="flex gap-3.5 p-4 rounded-xl bg-[#FAFAFA] border border-[#D8D8D8]">
                    <span className="text-xl flex-shrink-0">{item.icon}</span>
                    <div>
                      <p style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '0.8rem', color: '#0D0D0D' }}>
                        {item.title}
                      </p>
                      <p style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: '0.82rem', color: '#5A5A5A', lineHeight: '1.6' }} className="mt-1">
                        {item.text}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <p style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: '0.78rem', color: '#8A8A8A' }}>
                Consulter les{' '}
                <a href="/legal" target="_blank" className="text-[#00068D] underline">
                  mentions légales complètes
                </a>
              </p>
            </div>
          )}

          {/* STEP 4 — Démo @ et # */}
          {step === 4 && (
            <div className="space-y-5">
              <h2 style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '1.2rem', color: '#0D0D0D' }}>
                Prêt à démarrer
              </h2>
              <p style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: '0.88rem', color: '#3A3A3A', lineHeight: '1.7' }}>
                Deux raccourcis pour tirer le meilleur de NouveLLM :
              </p>

              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-[#E8E9F8] border border-[#2B2EB8]">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="nl-token-agent">@agent</span>
                    <span style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '0.78rem', color: '#00068D' }}>
                      Activer un agent spécialisé
                    </span>
                  </div>
                  <p style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: '0.82rem', color: '#3A3A3A', lineHeight: '1.5' }}>
                    Tapez <code className="bg-white px-1 rounded text-[#00068D]">@</code> dans la zone de saisie
                    pour choisir un agent. Ex :{' '}
                  </p>
                  <div className="mt-2 space-y-1.5">
                    {[
                      { slug: 'bibliographie', label: 'Bibliographie annotée' },
                      { slug: 'analyse', label: 'Analyse documentaire' },
                    ].map((a) => (
                      <div key={a.slug} className="flex items-center gap-2 p-2 rounded-lg bg-white border border-[#D8D8D8]">
                        <span className="nl-token-agent text-[11px]">@{a.slug}</span>
                        <span style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: '0.8rem', color: '#5A5A5A' }}>
                          {a.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-[#e8f5e9] border border-[#a5d6a7]">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="nl-token-source">#source</span>
                    <span style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '0.78rem', color: '#2e7d32' }}>
                      Cibler une base documentaire
                    </span>
                  </div>
                  <p style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: '0.82rem', color: '#3A3A3A', lineHeight: '1.5' }}>
                    Tapez <code className="bg-white px-1 rounded text-[#2e7d32]">#</code> pour restreindre la
                    recherche à une source spécifique.
                  </p>
                  <div className="mt-2 space-y-1.5">
                    {[
                      { slug: 'formations-sn', label: 'Formations Sorbonne Nouvelle' },
                      { slug: 'publications-shs', label: 'Publications SHS' },
                    ].map((s) => (
                      <div key={s.slug} className="flex items-center gap-2 p-2 rounded-lg bg-white border border-[#a5d6a7]">
                        <span className="nl-token-source text-[11px]">#{s.slug}</span>
                        <span style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: '0.8rem', color: '#5A5A5A' }}>
                          {s.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="rounded-xl bg-[#FAFAFA] border border-[#D8D8D8] px-4 py-3">
                <p style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: '0.82rem', color: '#5A5A5A', lineHeight: '1.6' }}>
                  💡 <strong>Quota mensuel :</strong> votre crédit de tokens est affiché en bas de l'écran. Utilisez
                  les agents ciblés pour optimiser vos échanges.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer buttons */}
        <div className="flex items-center justify-between px-7 py-4 border-t border-[#D8D8D8] flex-shrink-0 bg-[#FAFAFA]">
          <button
            onClick={() => step > 1 && setStep((s) => (s - 1) as Step)}
            disabled={step === 1}
            className="px-4 py-2 rounded-lg text-[#8A8A8A] disabled:opacity-0 hover:bg-[#F2F2F2] transition-all"
            style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '0.72rem', letterSpacing: '0.04em' }}
          >
            ← PRÉCÉDENT
          </button>

          <span style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 300, fontSize: '0.65rem', color: '#8A8A8A' }}>
            {step} / 4
          </span>

          {step < 4 ? (
            <button
              onClick={() => {
                if (step === 2 && (!quizSubmitted || !quizPassed)) return
                setStep((s) => (s + 1) as Step)
              }}
              disabled={step === 2 && (!quizSubmitted || !quizPassed)}
              className="px-5 py-2 rounded-lg bg-[#00068D] text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#2B2EB8] transition-all"
              style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '0.72rem', letterSpacing: '0.04em' }}
            >
              SUIVANT →
            </button>
          ) : (
            <button
              onClick={handleComplete}
              disabled={completing}
              className="px-5 py-2 rounded-lg bg-[#00068D] text-white disabled:opacity-50 hover:bg-[#2B2EB8] transition-all"
              style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '0.72rem', letterSpacing: '0.04em' }}
            >
              {completing ? 'Chargement…' : "COMMENCER →"}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
