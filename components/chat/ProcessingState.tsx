'use client'

import { useEffect, useState } from 'react'

const STEPS_BY_AGENT: Record<string, string[]> = {
  bibliographie: [
    'Analyse du sujet et des paramètres...',
    'Recherche bibliographique...',
    'Filtrage et évaluation des sources...',
    'Formatage des références...',
  ],
  module: [
    'Analyse du syllabus...',
    'Structuration pédagogique...',
    'Alignement avec les objectifs...',
    'Rédaction du module...',
  ],
  'fiche-cours': [
    'Analyse des paramètres ECTS...',
    'Structuration du contenu...',
    'Vérification des crédits et prérequis...',
    'Rédaction de la fiche...',
  ],
  examen: [
    'Analyse des compétences cibles...',
    'Conception des questions...',
    'Calibrage du niveau...',
    'Finalisation du sujet...',
  ],
  traduction: [
    'Analyse du texte source...',
    'Traduction...',
    'Révision et cohérence...',
  ],
  briefing: [
    'Collecte des informations...',
    'Analyse du contexte...',
    'Rédaction du briefing...',
  ],
}

const DEFAULT_STEPS = [
  'Analyse de la question...',
  'Recherche dans les sources...',
  'Synthèse documentaire...',
  'Rédaction de la réponse...',
]

interface SourceModeConfig {
  steps: string[]
  intervalMs: number
  note?: string
}

const STEPS_BY_SOURCE_MODE: Record<string, SourceModeConfig> = {
  academic: {
    steps: [
      'Interrogation de HAL Archives Ouvertes...',
      'Interrogation de OpenAlex et Semantic Scholar...',
      'Analyse des publications académiques...',
      'Synthèse des sources vérifiées...',
    ],
    intervalMs: 2500,
    note: 'La recherche dans les bases académiques prend 8 à 15 secondes pour garantir des sources vérifiables.',
  },
  web: {
    steps: [
      'Lecture de la page web...',
      'Extraction du contenu...',
      'Analyse et synthèse...',
    ],
    intervalMs: 2000,
  },
  all: {
    steps: [
      'Interrogation des ressources USN...',
      'Interrogation des bases académiques...',
      'Interrogation de HAL, OpenAlex, Semantic Scholar...',
      'Fusion et synthèse des sources...',
    ],
    intervalMs: 3000,
    note: 'Recherche combinée — comptez 15 à 20 secondes.',
  },
}

export default function ProcessingState({ agentSlug, sourceMode }: { agentSlug?: string; sourceMode?: string }) {
  const sourceModeConfig = sourceMode ? STEPS_BY_SOURCE_MODE[sourceMode] : undefined
  const steps = sourceModeConfig?.steps ?? (agentSlug ? STEPS_BY_AGENT[agentSlug] : undefined) ?? DEFAULT_STEPS
  const intervalMs = sourceModeConfig?.intervalMs ?? 1400
  const [currentStep, setCurrentStep] = useState(0)

  useEffect(() => {
    if (currentStep >= steps.length - 1) return
    const timer = setTimeout(() => setCurrentStep((s) => s + 1), intervalMs)
    return () => clearTimeout(timer)
  }, [currentStep, steps.length, intervalMs])

  return (
    <div className="space-y-2 py-1">
      {steps.slice(0, currentStep + 1).map((step, i) => (
        <div key={i} className="flex items-center gap-2.5">
          {i < currentStep ? (
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#2B2EB8"
              strokeWidth="2.5"
              strokeLinecap="round"
              className="flex-shrink-0"
            >
              <path d="M20 6L9 17l-5-5" />
            </svg>
          ) : (
            <span
              className="nl-spinner flex-shrink-0"
              style={{ width: 13, height: 13 }}
            />
          )}
          <span
            className={i < currentStep ? 'text-[#8A8A8A]' : 'text-[#3A3A3A]'}
            style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: '0.8rem' }}
          >
            {step}
          </span>
        </div>
      ))}
      {sourceModeConfig?.note && (
        <p style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: 11, color: '#5A5A6A', marginTop: 6 }}>
          {sourceModeConfig.note}
        </p>
      )}
    </div>
  )
}
