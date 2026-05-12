'use client'

import { useState } from 'react'

const MECHANICS = [
  {
    id: 'debat',
    label: 'Le débat contradictoire',
    description: "L'IA défend la position contraire jusqu'à ce que l'étudiant intègre les objections.",
    prompt: `\n\nMÉCANIQUE — DÉBAT CONTRADICTOIRE
Pour chaque affirmation que l'étudiant formule, défends systématiquement la position contraire, en t'appuyant sur le corpus.
Ne cède que si l'étudiant intègre les objections avec des preuves textuelles précises.`,
  },
  {
    id: 'sequentiel',
    label: 'La décomposition séquentielle forcée',
    description: "L'IA refuse les demandes globales et exige des livrables intermédiaires successifs.",
    prompt: `\n\nMÉCANIQUE — DÉCOMPOSITION SÉQUENTIELLE
Refuse toute demande globale. Exige toujours un livrable intermédiaire d'abord.
Ne valide un livrable que lorsqu'il est explicitement soumis avec la mention "SOUMISSION :"`,
  },
  {
    id: 'persona',
    label: 'La simulation de persona lecteur',
    description: "L'IA réagit exactement comme le lecteur-cible réagirait face au texte de l'étudiant.",
    prompt: '',
    hasField: true,
    fieldLabel: 'Décrivez le profil du lecteur simulé',
    fieldPlaceholder: 'Ex: Relecteur académique anglophone spécialisé en linguistique de corpus',
  },
  {
    id: 'hypotheses',
    label: 'Les hypothèses concurrentes',
    description: "L'IA génère 3 hypothèses alternatives à la thèse de l'étudiant et exige qu'il argumente.",
    prompt: `\n\nMÉCANIQUE — HYPOTHÈSES CONCURRENTES
Après chaque soumission d'analyse, génère systématiquement 3 hypothèses alternatives à la thèse centrale de l'étudiant.
L'étudiant doit argumenter pourquoi ces alternatives sont moins convaincantes que sa thèse.`,
  },
]

interface Props {
  value: string
  onChange: (prompt: string) => void
  hasStructuredForm?: boolean
}

export default function PromptBuilder({ value, onChange, hasStructuredForm }: Props) {
  const [activeMechanics, setActiveMechanics] = useState<Record<string, boolean>>({})
  const [personaText, setPersonaText] = useState('')

  function toggleMechanic(id: string) {
    const wasActive = activeMechanics[id]
    const newActive = { ...activeMechanics, [id]: !wasActive }
    setActiveMechanics(newActive)

    // Rebuild prompt: base text without any mechanic blocks, then append active ones
    let base = value
    for (const m of MECHANICS) {
      if (m.prompt) {
        base = base.replace(m.prompt, '')
      } else if (m.hasField) {
        base = base.replace(/\n\nMÉCANIQUE — PERSONA LECTEUR\n[\s\S]*?(?=\n\nMÉCANIQUE|$)/, '')
      }
    }
    base = base.trimEnd()

    let result = base
    for (const m of MECHANICS) {
      if (!newActive[m.id]) continue
      if (m.id === 'persona') {
        const pText = personaText || '[PROFIL_LECTEUR]'
        result += `\n\nMÉCANIQUE — PERSONA LECTEUR\nTu réagis exactement comme ${pText} réagirait face au texte de l'étudiant.\nTu incarnes ce lecteur dans chaque réponse — tu n'es pas un assistant, tu es ce lecteur.`
      } else {
        result += m.prompt
      }
    }
    onChange(result)
  }

  function updatePersona(text: string) {
    setPersonaText(text)
    if (!activeMechanics['persona']) return
    const pText = text || '[PROFIL_LECTEUR]'
    let updated = value.replace(
      /\n\nMÉCANIQUE — PERSONA LECTEUR\n[\s\S]*?(?=\n\nMÉCANIQUE|$)/,
      `\n\nMÉCANIQUE — PERSONA LECTEUR\nTu réagis exactement comme ${pText} réagirait face au texte de l'étudiant.\nTu incarnes ce lecteur dans chaque réponse — tu n'es pas un assistant, tu es ce lecteur.`
    )
    // if not found, append
    if (!updated.includes('MÉCANIQUES — PERSONA LECTEUR')) {
      updated = value.trimEnd() + `\n\nMÉCANIQUE — PERSONA LECTEUR\nTu réagis exactement comme ${pText} réagirait face au texte de l'étudiant.\nTu incarnes ce lecteur dans chaque réponse — tu n'es pas un assistant, tu es ce lecteur.`
    }
    onChange(updated)
  }

  // Highlight placeholders: split by [text] pattern
  function renderHighlighted(text: string) {
    const parts = text.split(/(\[[^\]]+\])/g)
    return parts.map((p, i) =>
      p.startsWith('[') && p.endsWith(']')
        ? <mark key={i} className="bg-yellow-200 text-yellow-900 rounded px-0.5">{p}</mark>
        : <span key={i}>{p}</span>
    )
  }

  const placeholderCount = (value.match(/\[[^\]]+\]/g) || []).length

  return (
    <div className="space-y-4">
      {!hasStructuredForm && (
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '0.7rem', letterSpacing: '0.04em', textTransform: 'uppercase', color: '#5A5A5A' }}>
              Prompt d'accompagnement pédagogique
            </label>
            {placeholderCount > 0 && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800 border border-yellow-300"
                style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800 }}>
                {placeholderCount} placeholder{placeholderCount > 1 ? 's' : ''} à compléter
              </span>
            )}
          </div>
          <div className="relative">
            <textarea
              value={value}
              onChange={e => onChange(e.target.value)}
              rows={12}
              placeholder="Décrivez la posture que NouveLLM doit adopter avec les étudiants…"
              className="w-full px-4 py-3 rounded-xl border border-[#D8D8D8] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#2B2EB8] resize-none"
              style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: '0.82rem', lineHeight: 1.7 }}
            />
          </div>
          {/* Placeholder preview overlay hint */}
          {placeholderCount > 0 && (
            <div className="mt-2 p-3 rounded-lg bg-yellow-50 border border-yellow-200">
              <p style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: '0.75rem', color: '#7A6000' }}>
                Remplacez les éléments entre crochets par les informations de votre cours avant de créer la session.
              </p>
              <div className="flex flex-wrap gap-1 mt-1.5">
                {(value.match(/\[[^\]]+\]/g) || []).map((p, i) => (
                  <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-200 text-yellow-900"
                    style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800 }}>
                    {p}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Mechanics */}
      <div className="border border-[#D8D8D8] rounded-xl overflow-hidden">
        <div className="px-4 py-3 bg-[#FAFAFA] border-b border-[#D8D8D8]">
          <p style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '0.7rem', letterSpacing: '0.05em', textTransform: 'uppercase', color: '#5A5A5A' }}>
            Mécaniques optionnelles
          </p>
          <p style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: '0.72rem', color: '#8A8A8A', marginTop: '0.2rem', fontStyle: 'italic' }}>
            S'ajoutent automatiquement au prompt
          </p>
        </div>
        <div className="divide-y divide-[#F2F2F2]">
          {MECHANICS.map(m => (
            <div key={m.id} className="p-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <div
                  onClick={() => toggleMechanic(m.id)}
                  className={`w-4.5 h-4.5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 cursor-pointer transition-colors ${activeMechanics[m.id] ? 'border-[#00068D] bg-[#00068D]' : 'border-[#D8D8D8] bg-white'}`}
                  style={{ width: '1.1rem', height: '1.1rem' }}>
                  {activeMechanics[m.id] && (
                    <svg width="8" height="8" viewBox="0 0 12 12" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                      <path d="M2 6L5 9L10 3" />
                    </svg>
                  )}
                </div>
                <div className="flex-1">
                  <p style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '0.82rem', color: '#0D0D0D' }}>
                    {m.label}
                  </p>
                  <p style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: '0.78rem', color: '#8A8A8A', marginTop: '0.2rem', fontStyle: 'italic' }}>
                    {m.description}
                  </p>
                  {m.hasField && activeMechanics[m.id] && (
                    <input
                      value={personaText}
                      onChange={e => updatePersona(e.target.value)}
                      placeholder={m.fieldPlaceholder}
                      className="mt-2 w-full px-3 py-2 rounded-lg border border-[#D8D8D8] text-sm focus:outline-none focus:ring-2 focus:ring-[#2B2EB8]"
                      style={{ fontFamily: 'Source Serif Pro, Georgia, serif' }}
                    />
                  )}
                </div>
              </label>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
