'use client'

import { useState } from 'react'

interface SurveyQuestion {
  id: string
  order: number
  text: string
  options: string
  correct: number | null
}

interface Survey {
  id: string
  title: string
  tokenReward: number
  questions: SurveyQuestion[]
}

interface SurveyModalProps {
  survey: Survey
  onClose: () => void
  onComplete: (tokenEarned: number) => void
}

export default function SurveyModal({ survey, onClose, onComplete }: SurveyModalProps) {
  const questions = survey.questions.map(q => ({
    ...q,
    parsedOptions: JSON.parse(q.options) as string[],
  }))

  const [answers, setAnswers] = useState<(number | null)[]>(questions.map(() => null))
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<{ score: number; total: number; tokenEarned: number } | null>(null)

  function selectAnswer(qIndex: number, optIndex: number) {
    setAnswers(prev => prev.map((a, i) => i === qIndex ? optIndex : a))
  }

  async function submit() {
    if (answers.some(a => a === null)) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/surveys/${survey.id}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers }),
      })
      const data = await res.json()
      if (res.ok) setResult(data)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={result ? onClose : undefined} />
      <div className="relative bg-white rounded-2xl border border-[#D8D8D8] w-full max-w-lg shadow-xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#F2F2F2] flex items-center justify-between">
          <div>
            <h2 style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '1rem', color: '#0D0D0D' }}>
              {survey.title}
            </h2>
            <p style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: '0.78rem', color: '#8A8A8A', marginTop: '0.1rem' }}>
              Récompense : +{survey.tokenReward.toLocaleString('fr-FR')} tokens
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-[#F2F2F2] transition-colors" aria-label="Fermer">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#5A5A5A" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="px-6 py-5 space-y-6 max-h-[60vh] overflow-y-auto">
          {result ? (
            /* Result screen */
            <div className="text-center space-y-4 py-4">
              <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto ${result.score === result.total ? 'bg-[#E8F5E9]' : 'bg-[#E8E9F8]'}`}>
                {result.score === result.total
                  ? <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2E7D32" strokeWidth="2.5" strokeLinecap="round"><path d="M20 6L9 17l-5-5" /></svg>
                  : <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#00068D" strokeWidth="2" strokeLinecap="round"><path d="M12 3v18M3 12h18" /></svg>
                }
              </div>
              <div>
                <p style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '1.2rem', color: '#0D0D0D' }}>
                  {result.score} / {result.total}
                </p>
                <p style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: '0.85rem', color: '#5A5A5A', marginTop: '0.25rem' }}>
                  {result.score === result.total ? 'Parfait !' : 'Bonne participation !'}
                </p>
              </div>
              <div className="bg-[#E8E9F8] rounded-xl px-5 py-3">
                <p style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 300, fontSize: '0.7rem', letterSpacing: '0.06em', textTransform: 'uppercase', color: '#00068D' }}>
                  Tokens crédités
                </p>
                <p style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '1.4rem', color: '#00068D' }}>
                  +{result.tokenEarned.toLocaleString('fr-FR')}
                </p>
              </div>
            </div>
          ) : (
            /* Questions */
            questions.map((q, qi) => (
              <div key={q.id} className="space-y-2.5">
                <p style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontWeight: 600, fontSize: '0.9rem', color: '#0D0D0D' }}>
                  {qi + 1}. {q.text}
                </p>
                <div className="space-y-1.5">
                  {q.parsedOptions.map((opt, oi) => (
                    <button
                      key={oi}
                      onClick={() => selectAnswer(qi, oi)}
                      className={`w-full text-left px-4 py-2.5 rounded-lg border text-sm transition-all ${answers[qi] === oi ? 'border-[#2B2EB8] bg-[#E8E9F8] text-[#00068D]' : 'border-[#D8D8D8] hover:bg-[#F2F2F2] text-[#0D0D0D]'}`}
                      style={{ fontFamily: 'Source Serif Pro, Georgia, serif' }}
                    >
                      <span className="font-semibold mr-2" style={{ fontFamily: 'Gilroy, sans-serif' }}>
                        {String.fromCharCode(65 + oi)}.
                      </span>
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="px-6 py-4 border-t border-[#F2F2F2]">
          {result ? (
            <button
              onClick={() => onComplete(result.tokenEarned)}
              className="w-full py-2.5 rounded-xl text-sm"
              style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, background: '#00068D', color: '#fff' }}
            >
              FERMER
            </button>
          ) : (
            <button
              onClick={submit}
              disabled={submitting || answers.some(a => a === null)}
              className="w-full py-2.5 rounded-xl text-sm disabled:opacity-40 transition-all hover:opacity-90"
              style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, background: '#00068D', color: '#fff' }}
            >
              {submitting ? 'Envoi…' : `VALIDER (${answers.filter(a => a !== null).length}/${questions.length} réponses)`}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
