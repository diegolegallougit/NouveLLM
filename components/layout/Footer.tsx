'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface FooterProps {
  userRole?: string
  tokenCount?: number
  tokenLimit?: number
}

export default function Footer({ userRole = 'EC', tokenCount = 0, tokenLimit = 2000000 }: FooterProps) {
  const isStudent = userRole === 'STUDENT'

  const [quota, setQuota] = useState<{ available: number; pct: number } | null>(null)

  useEffect(() => {
    if (!isStudent) return
    fetch('/api/quota')
      .then((r) => r.json())
      .then((data) => setQuota({ available: data.available, pct: data.pct }))
      .catch(() => null)
  }, [isStudent])

  return (
    <footer
      className="flex items-center justify-between px-6 bg-white border-t border-[#D8D8D8] flex-shrink-0"
      style={{ height: '32px' }}
    >
      <div className="flex items-center gap-4">
        <span style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 300, fontSize: '0.7rem', letterSpacing: '0.06em', color: '#8A8A8A', textTransform: 'uppercase' }}>
          Université Sorbonne Nouvelle
        </span>
        <span className="w-px h-3 bg-[#D8D8D8]" />
        <span style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 300, fontSize: '0.7rem', letterSpacing: '0.06em', color: '#8A8A8A', textTransform: 'uppercase' }}>
          INTEGRIA · France 2030
        </span>
        <span className="w-px h-3 bg-[#D8D8D8]" />
        <Link
          href="/legal"
          style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 300, fontSize: '0.7rem', letterSpacing: '0.06em', color: '#8A8A8A', textTransform: 'uppercase' }}
          className="hover:text-[#00068D] transition-colors"
        >
          Mentions légales
        </Link>
      </div>

      <div className="flex items-center gap-3">
        {isStudent ? (
          /* Student view — credit remaining */
          <div className="flex items-center gap-2">
            <span style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 300, fontSize: '0.65rem', letterSpacing: '0.04em', color: '#8A8A8A' }}>
              Crédit disponible ce mois :
            </span>
            <span
              style={{
                fontFamily: 'Gilroy, sans-serif',
                fontWeight: 800,
                fontSize: '0.65rem',
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
          /* EC/Admin view — token count */
          <div className="flex items-center gap-2">
            <span style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 300, fontSize: '0.65rem', letterSpacing: '0.04em', color: '#8A8A8A' }}>
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
  )
}
