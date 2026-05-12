'use client'

import { useState } from 'react'

const DISCIPLINES = [
  'ESIT — Traductologie',
  'DFLE — Français Langue Étrangère',
  'CAV — Cinéma et Audiovisuel',
  'Master professionnel autre',
]

const TIMER_OPTIONS = ['30 secondes', '1 minute', '2 minutes']

export interface MissionData {
  discipline: string
  contexte: string
  personnages: string
  situation: string
  bascule1_condition: string
  bascule1_bien: string
  bascule1_mal: string
  bascule2_condition: string
  bascule2_bien: string
  bascule2_mal: string
  timePressure: boolean
  timerDelay: string
  timerConsequence: string
}

interface Props {
  value: MissionData
  onChange: (data: MissionData) => void
}

function field(label: string, children: React.ReactNode, hint?: string) {
  return (
    <div>
      <label className="block mb-1" style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '0.7rem', letterSpacing: '0.04em', textTransform: 'uppercase', color: '#5A5A5A' }}>
        {label}
      </label>
      {hint && <p style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: '0.72rem', color: '#8A8A8A', marginBottom: '0.4rem', fontStyle: 'italic' }}>{hint}</p>}
      {children}
    </div>
  )
}

const inputCls = "w-full px-3 py-2 rounded-lg border border-[#D8D8D8] text-sm focus:outline-none focus:ring-2 focus:ring-[#2B2EB8] bg-white"
const taCls = `${inputCls} resize-none`
const inputStyle = { fontFamily: 'Source Serif Pro, Georgia, serif' }

export default function MissionForm({ value, onChange }: Props) {
  const [showPrompt, setShowPrompt] = useState(false)

  function set(key: keyof MissionData, val: string | boolean) {
    onChange({ ...value, [key]: val })
  }

  function buildPrompt(): string {
    return `Tu es le maître du jeu d'un scénario professionnel — ${value.discipline}.

CONTEXTE DU SCÉNARIO
${value.contexte}

PERSONNAGES QUE TU INCARNES
${value.personnages}

PLAN NARRATIF
Situation de départ : ${value.situation}

Point de bascule 1 :
  Condition de déclenchement : ${value.bascule1_condition}
  → Si bien géré : ${value.bascule1_bien}
  → Si mal géré : ${value.bascule1_mal}

Point de bascule 2 :
  Condition de déclenchement : ${value.bascule2_condition}
  → Si bien géré : ${value.bascule2_bien}
  → Si mal géré : ${value.bascule2_mal}
${value.timePressure ? `
PRESSION TEMPORELLE
Les questions marquées [RÉPONSE IMMÉDIATE] déclenchent un compte à rebours de ${value.timerDelay}.
Si pas de réponse dans ce délai : ${value.timerConsequence}
` : ''}
RÈGLES DU JEU
Tu fais avancer le scénario en permanence. Tu ne l'interromps pas pour donner des conseils.
Les conséquences des décisions sont immédiates et narratives — le scénario bifurque, il ne revient pas en arrière.
Si l'étudiant essaie de "sortir du jeu", reste dans le personnage.
En fin de session, sors du rôle et propose un débriefing des moments clés.`
  }

  return (
    <div className="space-y-5">
      {field('Discipline', (
        <select value={value.discipline} onChange={e => set('discipline', e.target.value)}
          className={inputCls} style={inputStyle}>
          <option value="">— Choisir —</option>
          {DISCIPLINES.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
      ))}

      {field('Contexte de la mission', (
        <textarea value={value.contexte} onChange={e => set('contexte', e.target.value)}
          rows={3} placeholder="Organisation, mission confiée, enjeux…"
          className={taCls} style={inputStyle} />
      ), "L'étudiant voit ce contexte au début de la session.")}

      {field('Personnages incarnés par NouveLLM', (
        <textarea value={value.personnages} onChange={e => set('personnages', e.target.value)}
          rows={3} placeholder="Un personnage par ligne : Nom · rôle · intérêts · relation à l'étudiant"
          className={taCls} style={inputStyle} />
      ))}

      {field('Situation de départ', (
        <textarea value={value.situation} onChange={e => set('situation', e.target.value)}
          rows={2} placeholder="Ce que l'étudiant reçoit au début de la session"
          className={taCls} style={inputStyle} />
      ))}

      <div className="border border-[#D8D8D8] rounded-xl p-4 space-y-4 bg-[#FAFAFA]">
        <p style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '0.7rem', letterSpacing: '0.04em', textTransform: 'uppercase', color: '#5A5A5A' }}>
          Point de bascule 1
        </p>
        {field('Condition de déclenchement', (
          <input value={value.bascule1_condition} onChange={e => set('bascule1_condition', e.target.value)}
            placeholder="Ex: L'étudiant reçoit l'email du client mécontent" className={inputCls} style={inputStyle} />
        ))}
        <div className="grid grid-cols-2 gap-3">
          {field('Si bien géré →', (
            <input value={value.bascule1_bien} onChange={e => set('bascule1_bien', e.target.value)}
              placeholder="Suite du scénario" className={inputCls} style={inputStyle} />
          ))}
          {field('Si mal géré →', (
            <input value={value.bascule1_mal} onChange={e => set('bascule1_mal', e.target.value)}
              placeholder="Bifurcation et conséquences" className={inputCls} style={inputStyle} />
          ))}
        </div>
      </div>

      <div className="border border-[#D8D8D8] rounded-xl p-4 space-y-4 bg-[#FAFAFA]">
        <p style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '0.7rem', letterSpacing: '0.04em', textTransform: 'uppercase', color: '#5A5A5A' }}>
          Point de bascule 2
        </p>
        {field('Condition de déclenchement', (
          <input value={value.bascule2_condition} onChange={e => set('bascule2_condition', e.target.value)}
            placeholder="Ex: La livraison est attendue, délai dépassé" className={inputCls} style={inputStyle} />
        ))}
        <div className="grid grid-cols-2 gap-3">
          {field('Si bien géré →', (
            <input value={value.bascule2_bien} onChange={e => set('bascule2_bien', e.target.value)}
              placeholder="Dénouement A" className={inputCls} style={inputStyle} />
          ))}
          {field('Si mal géré →', (
            <input value={value.bascule2_mal} onChange={e => set('bascule2_mal', e.target.value)}
              placeholder="Dénouement B" className={inputCls} style={inputStyle} />
          ))}
        </div>
      </div>

      {/* Time pressure toggle */}
      <div className="border border-[#D8D8D8] rounded-xl p-4 space-y-3">
        <label className="flex items-center gap-3 cursor-pointer">
          <div
            onClick={() => set('timePressure', !value.timePressure)}
            className={`w-9 h-5 rounded-full transition-colors flex-shrink-0 relative cursor-pointer ${value.timePressure ? 'bg-[#00068D]' : 'bg-[#D8D8D8]'}`}>
            <div className={`w-3.5 h-3.5 bg-white rounded-full absolute top-0.5 transition-all ${value.timePressure ? 'left-[1.2rem]' : 'left-0.5'}`} />
          </div>
          <span style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '0.8rem', color: '#0D0D0D' }}>
            Activer la pression temporelle
          </span>
        </label>
        {value.timePressure && (
          <div className="space-y-3 pl-1">
            <p style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: '0.75rem', color: '#8A8A8A', fontStyle: 'italic' }}>
              Les questions marquées [RÉPONSE IMMÉDIATE] déclenchent un compte à rebours.
            </p>
            <div className="grid grid-cols-2 gap-3">
              {field('Délai', (
                <select value={value.timerDelay} onChange={e => set('timerDelay', e.target.value)}
                  className={inputCls} style={inputStyle}>
                  {TIMER_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              ))}
              {field('Conséquence si pas de réponse', (
                <input value={value.timerConsequence} onChange={e => set('timerConsequence', e.target.value)}
                  placeholder="Ex: Le client raccroche" className={inputCls} style={inputStyle} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Show assembled prompt */}
      <button
        type="button"
        onClick={() => setShowPrompt(v => !v)}
        className="text-[11px] text-[#2B2EB8] hover:underline"
        style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800 }}>
        {showPrompt ? 'Masquer le prompt complet' : 'Voir le prompt complet →'}
      </button>
      {showPrompt && (
        <pre className="bg-[#F8F8FF] border border-[#D8D8D8] rounded-xl p-4 text-[11px] whitespace-pre-wrap leading-relaxed overflow-auto max-h-80"
          style={{ fontFamily: 'Source Serif Pro, Georgia, serif', color: '#3A3A3A' }}>
          {buildPrompt()}
        </pre>
      )}
    </div>
  )
}

export function missionToPrompt(d: MissionData): string {
  return `Tu es le maître du jeu d'un scénario professionnel — ${d.discipline}.

CONTEXTE DU SCÉNARIO
${d.contexte}

PERSONNAGES QUE TU INCARNES
${d.personnages}

PLAN NARRATIF
Situation de départ : ${d.situation}

Point de bascule 1 :
  Condition de déclenchement : ${d.bascule1_condition}
  → Si bien géré : ${d.bascule1_bien}
  → Si mal géré : ${d.bascule1_mal}

Point de bascule 2 :
  Condition de déclenchement : ${d.bascule2_condition}
  → Si bien géré : ${d.bascule2_bien}
  → Si mal géré : ${d.bascule2_mal}
${d.timePressure ? `
PRESSION TEMPORELLE
Les questions marquées [RÉPONSE IMMÉDIATE] déclenchent un compte à rebours de ${d.timerDelay}.
Si pas de réponse dans ce délai : ${d.timerConsequence}
` : ''}
RÈGLES DU JEU
Tu fais avancer le scénario en permanence. Tu ne l'interromps pas pour donner des conseils.
Les conséquences des décisions sont immédiates et narratives — le scénario bifurque, il ne revient pas en arrière.
Si l'étudiant essaie de "sortir du jeu", reste dans le personnage.
En fin de session, sors du rôle et propose un débriefing des moments clés.`
}
