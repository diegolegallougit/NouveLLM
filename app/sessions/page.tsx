'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

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
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  function showToast(type: 'success' | 'error', message: string) {
    setToast({ type, message })
    setTimeout(() => setToast(null), 3500)
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    try {
      const text = await file.text()
      const parsed = JSON.parse(text) as { version?: number; session?: { name?: string; validityHours?: number; [k: string]: unknown } }
      if (parsed.version !== 1 || !parsed.session?.name) {
        showToast('error', 'Format de fichier invalide')
        return
      }
      const { session: s } = parsed
      const validUntil = new Date(Date.now() + (Number(s.validityHours) || 168) * 3600 * 1000).toISOString()
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...s, validUntil }),
      })
      if (!res.ok) { showToast('error', "Erreur lors de l'import"); return }
      const data = await res.json() as { session: { id: string } }
      showToast('success', 'Séance importée avec succès')
      router.push(`/sessions/${data.session.id}`)
    } catch {
      showToast('error', 'Format de fichier invalide')
    }
  }

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
    <>
    <div className="min-h-screen bg-[#FAFAFA] p-3 sm:p-6">
      <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex items-start sm:items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-lg)', color: '#0D0D0D' }}>
              Mes Séances
            </h1>
            <p style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: 'var(--text-sm)', color: '#8A8A8A' }}>
              {active.length} séance{active.length !== 1 ? 's' : ''} active{active.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
            <Link href="/"
              className="flex items-center gap-1.5 px-4 rounded-lg transition-all hover:bg-[#E8E9F8]"
              style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-xs)', letterSpacing: '0.04em', color: '#00068D', background: '#E8E9F8', minHeight: 40 }}
            >
              ← Retour
            </Link>
            <button
              onClick={() => router.push('/sessions/new')}
              className="flex items-center gap-2 px-3 sm:px-4 py-2.5 min-h-[44px] rounded-xl text-sm transition-all hover:opacity-90"
              style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, background: '#00068D', color: '#fff', letterSpacing: '0.04em' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
              <span className="hidden sm:inline">NOUVELLE SÉANCE</span>
              <span className="sm:hidden">Nouvelle</span>
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-3 sm:px-4 py-2.5 min-h-[44px] rounded-xl text-sm border border-[#D8D8D8] transition-all hover:bg-[#F2F2F2]"
              style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, color: '#5A5A5A', letterSpacing: '0.04em' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
              <span className="hidden sm:inline">IMPORTER</span>
            </button>
            <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
          </div>
        </div>

        {sessions.length === 0 && (
          <div className="bg-white rounded-xl border border-[#D8D8D8] px-8 py-14 text-center">
            <div className="flex justify-center mb-6">
              <svg width="88" height="72" viewBox="0 0 88 72" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="4" y="4" width="80" height="40" rx="4" fill="#E8E9F8" stroke="#00068D" strokeWidth="2"/>
                <rect x="14" y="14" width="36" height="3" rx="1.5" fill="#00068D"/>
                <rect x="14" y="22" width="52" height="2" rx="1" fill="#2B2EB8" opacity="0.5"/>
                <rect x="14" y="28" width="40" height="2" rx="1" fill="#2B2EB8" opacity="0.35"/>
                <rect x="14" y="34" width="28" height="2" rx="1" fill="#2B2EB8" opacity="0.25"/>
                <line x1="44" y1="44" x2="44" y2="53" stroke="#D8D8D8" strokeWidth="2"/>
                <line x1="30" y1="53" x2="58" y2="53" stroke="#D8D8D8" strokeWidth="2" strokeLinecap="round"/>
                <circle cx="20" cy="63" r="5.5" fill="#E8E9F8" stroke="#00068D" strokeWidth="1.5"/>
                <path d="M11 71 C11 67 15 65 20 65 C25 65 29 67 29 71" fill="#E8E9F8" stroke="#00068D" strokeWidth="1.5" strokeLinecap="round"/>
                <circle cx="68" cy="63" r="5.5" fill="#E8E9F8" stroke="#00068D" strokeWidth="1.5"/>
                <path d="M59 71 C59 67 63 65 68 65 C73 65 77 67 77 71" fill="#E8E9F8" stroke="#00068D" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <h2 style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-md)', color: '#0D0D0D', marginBottom: '0.6rem' }}>
              Créez votre première Séance IA
            </h2>
            <p style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: 'var(--text-sm)', color: '#5A5A5A', maxWidth: '28rem', margin: '0 auto 1.75rem', lineHeight: 1.6 }}>
              Une Séance IA permet de partager un agent configuré avec vos étudiants via un lien. Les échanges sont tracés et exportables.
            </p>
            <button
              onClick={() => router.push('/sessions/new')}
              className="inline-flex items-center gap-2 px-5 py-3 min-h-[44px] rounded-xl transition-all hover:opacity-90"
              style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-sm)', background: '#00068D', color: '#fff', letterSpacing: '0.04em' }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
              Nouvelle Séance
            </button>
            <div className="mt-3">
              <Link
                href="/sessions/new"
                style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 300, fontSize: 'var(--text-xs)', color: '#2B2EB8' }}
                className="hover:underline"
              >
                Voir les scénarios disponibles →
              </Link>
            </div>
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
            <p style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-2xs)', letterSpacing: '0.06em', textTransform: 'uppercase', color: '#C8C8C8', paddingLeft: '0.25rem' }}>
              Séances fermées
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
    {toast && (
      <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-md whitespace-nowrap ${toast.type === 'success' ? 'bg-[#E8F5E9] border border-[#A5D6A7] text-[#2E7D32]' : 'bg-red-50 border border-red-200 text-red-700'}`}
        style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-2xs)' }}>
        {toast.type === 'success' ? '✓' : '⚠'} {toast.message}
      </div>
    )}
    </>
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
    <div className={`bg-white rounded-xl border border-[#D8D8D8] p-3 sm:p-5 ${s.status === 'CLOSED' ? 'opacity-60' : ''}`}>
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-base)', color: '#0D0D0D' }}>
              {s.name}
            </span>
            <span className={`px-2 py-0.5 rounded-full border ${STATUS_STYLES[s.status]}`} style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-2xs)' }}>
              {STATUS_LABELS[s.status]}
            </span>
            {isExpired && s.status !== 'CLOSED' && (
              <span className="px-2 py-0.5 rounded-full border bg-red-50 text-red-500 border-red-200" style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-2xs)' }}>
                Expirée
              </span>
            )}
          </div>
          <div className="flex items-center gap-4 mb-3">
            <span className="font-mono text-xs bg-[#F2F2F2] px-2 py-0.5 rounded text-[#5A5A5A]">{s.code}</span>
            <span style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: 'var(--text-xs)', color: '#8A8A8A' }}>
              {s.participantCount} connecté{s.participantCount !== 1 ? 's' : ''}{s.maxParticipants ? ` / ${s.maxParticipants}` : ''}
            </span>
            <span style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: 'var(--text-xs)', color: '#8A8A8A' }}>
              {formatTokens(s.tokens)} tokens
            </span>
            <span style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: 'var(--text-xs)', color: '#8A8A8A' }}>
              Expire le {formatDate(s.validUntil)}
            </span>
          </div>

          {(s.agents.length > 0 || s.sources.length > 0) && (
            <div className="flex flex-wrap gap-1.5">
              {s.agents.map(a => (
                <span key={a.slug} className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#E8E9F8] text-[#00068D]" style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 300, fontSize: 'var(--text-2xs)' }}>
                  {a.icon} {a.label}
                </span>
              ))}
              {s.sources.map(src => (
                <span key={src.slug} className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#F2F2F2] text-[#5A5A5A]" style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 300, fontSize: 'var(--text-2xs)' }}>
                  {src.icon} {src.label}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap flex-shrink-0 mt-2 sm:mt-0">
          {s.status !== 'CLOSED' && (
            <>
              <button
                onClick={() => onDashboard(s.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#2B2EB8] bg-[#E8E9F8] hover:bg-[#D4D5F5] transition-colors"
                style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, color: '#00068D', fontSize: 'var(--text-2xs)' }}>
                Dashboard
              </button>
              <button
                onClick={() => onCopy(s.code)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#D8D8D8] hover:bg-[#F2F2F2] transition-colors"
                style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 300, color: '#5A5A5A', fontSize: 'var(--text-2xs)' }}
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
                className="px-3 py-1.5 rounded-lg border disabled:opacity-50 transition-colors hover:bg-[#F2F2F2]"
                style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, borderColor: '#D8D8D8', color: '#5A5A5A', fontSize: 'var(--text-2xs)' }}
              >
                {s.status === 'SUSPENDED' ? 'RÉACTIVER' : 'SUSPENDRE'}
              </button>
              <button
                onClick={() => onAction(s.id, 'duplicate')}
                disabled={working === s.id}
                className="px-3 py-1.5 rounded-lg border disabled:opacity-50 transition-colors hover:bg-[#F2F2F2]"
                style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, borderColor: '#D8D8D8', color: '#5A5A5A', fontSize: 'var(--text-2xs)' }}
              >
                DUPLIQUER
              </button>
              <button
                onClick={() => onAction(s.id, 'close')}
                disabled={working === s.id}
                className="px-3 py-1.5 rounded-lg border border-red-200 text-red-500 disabled:opacity-50 hover:bg-red-50 transition-colors"
                style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-2xs)' }}
              >
                FERMER
              </button>
            </>
          )}
          {s.status === 'CLOSED' && (
            <button
              onClick={() => onAction(s.id, 'duplicate')}
              disabled={working === s.id}
              className="px-3 py-1.5 rounded-lg border disabled:opacity-50 transition-colors hover:bg-[#F2F2F2]"
              style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, borderColor: '#D8D8D8', color: '#5A5A5A', fontSize: 'var(--text-2xs)' }}
            >
              DUPLIQUER
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
