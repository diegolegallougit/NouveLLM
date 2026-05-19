'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import SurveyModal from '@/components/surveys/SurveyModal'

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

interface FooterProps {
  userRole?: string
  tokenCount?: number
  tokenLimit?: number
}

export default function Footer({ userRole = 'EC', tokenCount = 0, tokenLimit = 2000000 }: FooterProps) {
  const isStudent = userRole === 'STUDENT'

  const [quota, setQuota] = useState<{ available: number; pct: number } | null>(null)
  const [pendingSurveys, setPendingSurveys] = useState<Survey[]>([])
  const [activeSurvey, setActiveSurvey] = useState<Survey | null>(null)

  useEffect(() => {
    if (!isStudent) return
    fetch('/api/quota')
      .then((r) => r.json())
      .then((data) => setQuota({ available: data.available, pct: data.pct }))
      .catch(() => null)
    fetch('/api/surveys')
      .then((r) => r.json())
      .then((data) => setPendingSurveys(data.surveys ?? []))
      .catch(() => null)
  }, [isStudent])

  function handleSurveyComplete(_tokenEarned: number) {
    setPendingSurveys(prev => prev.filter(s => s.id !== activeSurvey?.id))
    setActiveSurvey(null)
    // Refresh quota after token earn
    fetch('/api/quota')
      .then((r) => r.json())
      .then((data) => setQuota({ available: data.available, pct: data.pct }))
      .catch(() => null)
  }

  const usedPct = quota ? Math.round(100 - quota.available) : null
  const showQuotaBandeau = isStudent && usedPct !== null && usedPct >= 80

  return (
    <>
      {activeSurvey && (
        <SurveyModal
          survey={activeSurvey}
          onClose={() => setActiveSurvey(null)}
          onComplete={handleSurveyComplete}
        />
      )}
      {showQuotaBandeau && (
        <div className="hidden md:flex items-center justify-between px-6 py-1.5 bg-orange-50 border-t border-orange-200 flex-shrink-0">
          <div className="flex items-center gap-2">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#ea580c" strokeWidth="2.5" strokeLinecap="round" className="flex-shrink-0">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <span style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: 'var(--text-xs)', color: '#9a3412' }}>
              Vous avez utilisé <strong>{usedPct}%</strong> de votre crédit ce mois.
            </span>
          </div>
          <Link
            href="/legal#quota"
            style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-xs)', color: '#ea580c', letterSpacing: '0.04em' }}
            className="hover:underline"
          >
            En savoir plus →
          </Link>
        </div>
      )}
      <footer
        className="hidden md:flex items-center justify-between px-6 bg-white border-t border-[#D8D8D8] flex-shrink-0"
        style={{ height: 'var(--footer-h)' }}
      >
        <div className="flex items-center gap-4">
          <span style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 300, fontSize: 'var(--text-2xs)', letterSpacing: '0.06em', color: '#8A8A8A', textTransform: 'uppercase' }}>
            Université Sorbonne Nouvelle
          </span>
          <span className="w-px h-3 bg-[#D8D8D8]" />
          <span style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 300, fontSize: 'var(--text-2xs)', letterSpacing: '0.06em', color: '#8A8A8A', textTransform: 'uppercase' }}>
            INTEGRIA · France 2030
          </span>
          <span className="w-px h-3 bg-[#D8D8D8]" />
          <Link
            href="/legal"
            style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 300, fontSize: 'var(--text-2xs)', letterSpacing: '0.06em', color: '#8A8A8A', textTransform: 'uppercase' }}
            className="hover:text-[#00068D] transition-colors"
          >
            Mentions légales
          </Link>
          <span className="w-px h-3 bg-[#D8D8D8]" />
          <Link
            href="/apropos"
            style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 300, fontSize: 'var(--text-2xs)', letterSpacing: '0.06em', color: '#8A8A8A', textTransform: 'uppercase' }}
            className="hover:text-[#00068D] transition-colors"
          >
            À propos
          </Link>
        </div>

        <div className="flex items-center gap-3">
          {isStudent && pendingSurveys.length > 0 && (
            <button
              onClick={() => setActiveSurvey(pendingSurveys[0])}
              className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full transition-all hover:opacity-90"
              style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-xs)', background: '#E8E9F8', color: '#00068D', letterSpacing: '0.04em' }}
            >
              <span className="w-4 h-4 rounded-full bg-[#00068D] text-white flex items-center justify-center font-bold" style={{ fontSize: 'var(--text-2xs)' }}>{pendingSurveys.length}</span>
              SONDAGE EN ATTENTE
            </button>
          )}
          {isStudent ? (
            <div className="flex items-center gap-2">
              <span style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 300, fontSize: 'var(--text-xs)', letterSpacing: '0.04em', color: '#8A8A8A' }}>
                Crédit disponible ce mois :
              </span>
              <span
                style={{
                  fontFamily: 'Gilroy, sans-serif',
                  fontWeight: 800,
                  fontSize: 'var(--text-xs)',
                  letterSpacing: '0.04em',
                  color: quota
                    ? quota.available > 40 ? '#2E7D32' : quota.available > 15 ? '#f97316' : '#dc2626'
                    : '#8A8A8A',
                }}
              >
                {quota ? `${quota.available}%` : '…'}
              </span>
              <div className="w-16 h-1.5 rounded-full bg-[#D8D8D8] overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${quota ? quota.available : 100}%`,
                    background: quota
                      ? quota.available > 40 ? '#2E7D32' : quota.available > 15 ? '#f97316' : '#dc2626'
                      : '#D8D8D8',
                  }}
                />
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 300, fontSize: 'var(--text-xs)', letterSpacing: '0.04em', color: '#8A8A8A' }}>
                Ce mois : {tokenCount > 999 ? `${(tokenCount / 1000).toFixed(0)}k` : tokenCount} / {(tokenLimit / 1000).toFixed(0)}k tokens
              </span>
              <div className="w-16 h-1.5 rounded-full bg-[#D8D8D8] overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(100, Math.round((tokenCount / tokenLimit) * 100))}%`,
                    background: tokenCount / tokenLimit > 0.8 ? '#dc2626' : tokenCount / tokenLimit > 0.6 ? '#f97316' : '#00068D',
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </footer>
    </>
  )
}
