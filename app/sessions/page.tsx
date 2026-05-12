'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface CourseSession {
  id: string
  code: string
  name: string
  description: string | null
  validUntil: string
  maxParticipants: number | null
  access: 'OPEN' | 'CLOSED'
  status: 'ACTIVE' | 'SUSPENDED' | 'CLOSED'
  participantCount: number
  tokens: number
  agents: { slug: string; label: string; icon: string }[]
  sources: { slug: string; label: string; icon: string }[]
  createdAt: string
}

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: 'bg-[#E8F5E9] text-[#2E7D32] border-[#A5D6A7]',
  SUSPENDED: 'bg-[#FFF8E1] text-[#F57F17] border-[#FFD54F]',
  CLOSED: 'bg-[#F2F2F2] text-[#8A8A8A] border-[#D8D8D8]',
}
const STATUS_LABELS: Record<string, string> = { ACTIVE: 'Active', SUSPENDED: 'Suspendue', CLOSED: 'Fermée' }

function formatDate(s: string) {
  return new Date(s).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatTokens(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return String(n)
}

export default function SessionsPage() {
  const router = useRouter()
  const [sessions, setSessions] = useState<CourseSession[]>([])
  const [working, setWorking] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  async function load() {
    const d = await fetch('/api/sessions').then(r => r.json())
    setSessions(d.sessions ?? [])
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps, react-hooks/set-state-in-effect
  useEffect(() => { load() }, [])

  async function doAction(id: string, action: 'suspend' | 'close' | 'duplicate') {
    if (action === 'close' && !confirm('Fermer définitivement cette session ?')) return
    setWorking(id)
    try {
      await fetch(`/api/sessions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      await load()
    } finally {
      setWorking(null)
    }
  }

  function copyLink(code: string) {
    const base = window.location.origin
    navigator.clipboard.writeText(`${base}/session/${code}`)
    setCopied(code)
    setTimeout(() => setCopied(null), 2000)
  }

  function goToDashboard(id: string) {
    router.push(`/sessions/${id}`)
  }

  const active = sessions.filter(s => s.status === 'ACTIVE' || s.status === 'SUSPENDED')
  const closed = sessions.filter(s => s.status === 'CLOSED')

  return (
    <div className="min-h-screen bg-[#FAFAFA] p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '1.3rem', color: '#0D0D0D' }}>
              Mes sessions de cours
            </h1>
            <p style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: '0.82rem', color: '#8A8A8A' }}>
              {active.length} session{active.length !== 1 ? 's' : ''} active{active.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={() => router.push('/sessions/new')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm transition-all hover:opacity-90"
            style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, background: '#00068D', color: '#fff', letterSpacing: '0.04em' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
            NOUVELLE SESSION
          </button>
        </div>

        {sessions.length === 0 && (
          <div className="bg-white rounded-xl border border-[#D8D8D8] p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-[#F2F2F2] flex items-center justify-center mx-auto mb-4">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#C8C8C8" strokeWidth="2" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
            </div>
            <p style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '0.85rem', color: '#5A5A5A' }}>
              Aucune session créée
            </p>
            <p style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: '0.8rem', color: '#C8C8C8', marginTop: '0.25rem' }}>
              Créez votre première session pour partager des agents avec vos étudiants
            </p>
          </div>
        )}

        {/* Active sessions */}
        {active.length > 0 && (
          <div className="space-y-3">
            {active.map(s => (
              <SessionCard
                key={s.id}
                session={s}
                working={working}
                copied={copied}
                onAction={doAction}
                onCopy={copyLink}
                onDashboard={goToDashboard}
              />
            ))}
          </div>
        )}

        {/* Closed sessions */}
        {closed.length > 0 && (
          <div className="space-y-3">
            <p style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '0.65rem', letterSpacing: '0.06em', textTransform: 'uppercase', color: '#C8C8C8', paddingLeft: '0.25rem' }}>
              Sessions fermées
            </p>
            {closed.map(s => (
              <SessionCard
                key={s.id}
                session={s}
                working={working}
                copied={copied}
                onAction={doAction}
                onCopy={copyLink}
                onDashboard={goToDashboard}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function SessionCard({
  session: s,
  working,
  copied,
  onAction,
  onCopy,
  onDashboard,
}: {
  session: CourseSession
  working: string | null
  copied: string | null
  onAction: (id: string, action: 'suspend' | 'close' | 'duplicate') => void
  onCopy: (code: string) => void
  onDashboard: (id: string) => void
}) {
  const isExpired = new Date(s.validUntil) < new Date()

  return (
    <div className={`bg-white rounded-xl border border-[#D8D8D8] p-5 ${s.status === 'CLOSED' ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '0.95rem', color: '#0D0D0D' }}>
              {s.name}
            </span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full border ${STATUS_STYLES[s.status]}`} style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800 }}>
              {STATUS_LABELS[s.status]}
            </span>
            {isExpired && s.status !== 'CLOSED' && (
              <span className="text-[10px] px-2 py-0.5 rounded-full border bg-red-50 text-red-500 border-red-200" style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800 }}>
                Expirée
              </span>
            )}
          </div>
          <div className="flex items-center gap-4 mb-3">
            <span className="font-mono text-xs bg-[#F2F2F2] px-2 py-0.5 rounded text-[#5A5A5A]">{s.code}</span>
            <span style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: '0.75rem', color: '#8A8A8A' }}>
              {s.participantCount} participant{s.participantCount !== 1 ? 's' : ''}{s.maxParticipants ? ` / ${s.maxParticipants}` : ''}
            </span>
            <span style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: '0.75rem', color: '#8A8A8A' }}>
              {formatTokens(s.tokens)} tokens
            </span>
            <span style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: '0.75rem', color: '#8A8A8A' }}>
              Expire le {formatDate(s.validUntil)}
            </span>
          </div>

          {(s.agents.length > 0 || s.sources.length > 0) && (
            <div className="flex flex-wrap gap-1.5">
              {s.agents.map(a => (
                <span key={a.slug} className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-[#E8E9F8] text-[#00068D]" style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 300 }}>
                  {a.icon} {a.label}
                </span>
              ))}
              {s.sources.map(src => (
                <span key={src.slug} className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-[#F2F2F2] text-[#5A5A5A]" style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 300 }}>
                  {src.icon} {src.label}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {s.status !== 'CLOSED' && (
            <>
              <button
                onClick={() => onDashboard(s.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#2B2EB8] bg-[#E8E9F8] text-[11px] hover:bg-[#D4D5F5] transition-colors"
                style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, color: '#00068D' }}>
                Dashboard
              </button>
              <button
                onClick={() => onCopy(s.code)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#D8D8D8] text-[11px] hover:bg-[#F2F2F2] transition-colors"
                style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 300, color: '#5A5A5A' }}
              >
                {copied === s.code
                  ? <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M20 6L9 17l-5-5" /></svg>
                  : <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>
                }
                {copied === s.code ? 'Copié' : 'Lien'}
              </button>
              <button
                onClick={() => onAction(s.id, 'suspend')}
                disabled={working === s.id}
                className="px-3 py-1.5 rounded-lg border text-[11px] disabled:opacity-50 transition-colors hover:bg-[#F2F2F2]"
                style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, borderColor: '#D8D8D8', color: '#5A5A5A' }}
              >
                {s.status === 'SUSPENDED' ? 'RÉACTIVER' : 'SUSPENDRE'}
              </button>
              <button
                onClick={() => onAction(s.id, 'duplicate')}
                disabled={working === s.id}
                className="px-3 py-1.5 rounded-lg border text-[11px] disabled:opacity-50 transition-colors hover:bg-[#F2F2F2]"
                style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, borderColor: '#D8D8D8', color: '#5A5A5A' }}
              >
                DUPLIQUER
              </button>
              <button
                onClick={() => onAction(s.id, 'close')}
                disabled={working === s.id}
                className="px-3 py-1.5 rounded-lg border border-red-200 text-red-500 text-[11px] disabled:opacity-50 hover:bg-red-50 transition-colors"
                style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800 }}
              >
                FERMER
              </button>
            </>
          )}
          {s.status === 'CLOSED' && (
            <button
              onClick={() => onAction(s.id, 'duplicate')}
              disabled={working === s.id}
              className="px-3 py-1.5 rounded-lg border text-[11px] disabled:opacity-50 transition-colors hover:bg-[#F2F2F2]"
              style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, borderColor: '#D8D8D8', color: '#5A5A5A' }}
            >
              DUPLIQUER
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
