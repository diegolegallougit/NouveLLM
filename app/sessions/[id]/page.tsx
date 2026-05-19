'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

interface SessionDetail {
  id: string
  code: string
  name: string
  description: string | null
  systemPrompt: string | null
  studentConsigne: string | null
  scenarioSlug: string | null
  visibility: number
  validUntil: string
  maxParticipants: number | null
  access: string
  status: string
  participantCount: number
  conversationCount: number
  tokens: number
  messageCount: number
  agents: { slug: string; label: string; icon: string }[]
  sources: { slug: string; label: string; icon: string }[]
  createdAt: string
}

const SCENARIO_META: Record<string, { label: string; icon: string; hasBroadcast?: boolean }> = {
  'revision-corpus-borne': { label: 'Révision sur corpus borné', icon: '📖' },
  'corpus-degrade': { label: 'Le corpus dégradé', icon: '🔍' },
  'revelateur-conformisme': { label: 'Le révélateur de conformisme', icon: '🪞' },
  'corpus-multilingue': { label: 'Corpus multilingue comparé', icon: '🌍' },
  'revision-adversariale': { label: 'La révision adversariale', icon: '⚔️' },
  'miroir-lacunes': { label: 'Le miroir des lacunes', icon: '💡', hasBroadcast: true },
  'mission-professionnelle': { label: 'La mission professionnelle', icon: '🎭' },
  'personnalise': { label: 'Séance personnalisée', icon: '⚙️' },
}

const VISIBILITY_INFO = [
  { label: 'Confidentiel', icon: '🔒', description: "Les étudiants travaillent sans observation." },
  { label: 'Statistiques anonymes', icon: '📊', description: "Thèmes fréquents collectés de façon anonyme." },
  { label: 'Sauvegardé pour analyse', icon: '📁', description: "Conversations accessibles après la fin de la session." },
  { label: 'Visible en temps réel', icon: '👁', description: "Vous lisez les échanges en direct." },
]

function formatTokens(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return String(n)
}

function formatDate(s: string) {
  return new Date(s).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

interface AnalyticsData {
  activeStudents: number
  maxParticipants: number | null
  totalMessages: number
  avgDurationMin: number
  keywords: string[]
  blockingMoments: number
}

export default function SessionDashboardPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [session, setSession] = useState<SessionDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [broadcasting, setBroadcasting] = useState(false)
  const [broadcastDone, setBroadcastDone] = useState(false)
  const [promptOpen, setPromptOpen] = useState(false)
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)

  async function load() {
    const r = await fetch(`/api/sessions/${id}`)
    if (!r.ok) { setError('Séance introuvable'); setLoading(false); return }
    const d = await r.json()
    setSession(d.session)
    setLoading(false)
    if (d.session.visibility >= 1) {
      fetch(`/api/sessions/${id}/analytics`)
        .then(r => r.json())
        .then(a => { if (a.analytics) setAnalytics(a.analytics) })
        .catch(() => {})
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps, react-hooks/set-state-in-effect
  useEffect(() => { load() }, [id])

  async function triggerPhase2() {
    if (!session) return
    if (!confirm('Envoyer le signal Phase 2 à toutes les conversations actives de cette session ?')) return
    setBroadcasting(true)
    try {
      await fetch(`/api/sessions/${id}/broadcast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signal: '[PHASE 2]' }),
      })
      setBroadcastDone(true)
    } finally {
      setBroadcasting(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-[#00068D] border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (error || !session) return (
    <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl border border-[#D8D8D8] p-8 max-w-sm w-full text-center space-y-4">
        <p style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, color: '#dc2626' }}>{error || 'Séance introuvable'}</p>
        <button onClick={() => router.push('/sessions')} className="text-[#00068D] text-sm hover:underline"
          style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800 }}>← Mes Séances</button>
      </div>
    </div>
  )

  const scenarioMeta = session.scenarioSlug ? SCENARIO_META[session.scenarioSlug] : null
  const hasBroadcast = scenarioMeta?.hasBroadcast ?? false
  const visInfo = VISIBILITY_INFO[session.visibility] ?? VISIBILITY_INFO[0]
  const isExpired = new Date(session.validUntil) < new Date()

  return (
    <div className="min-h-screen bg-[#FAFAFA] p-6">
      <div className="max-w-3xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/sessions')} className="p-2 rounded-lg hover:bg-[#F2F2F2] transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5A5A5A" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5M5 12l7-7M5 12l7 7" /></svg>
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '1.3rem', color: '#0D0D0D' }}>{session.name}</h1>
              <span className={`text-[10px] px-2 py-0.5 rounded-full border ${session.status === 'ACTIVE' ? 'bg-[#E8F5E9] text-[#2E7D32] border-[#A5D6A7]' : session.status === 'SUSPENDED' ? 'bg-[#FFF8E1] text-[#F57F17] border-[#FFD54F]' : 'bg-[#F2F2F2] text-[#8A8A8A] border-[#D8D8D8]'}`}
                style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800 }}>
                {session.status === 'ACTIVE' ? 'Active' : session.status === 'SUSPENDED' ? 'Suspendue' : 'Fermée'}
              </span>
              {isExpired && session.status !== 'CLOSED' && (
                <span className="text-[10px] px-2 py-0.5 rounded-full border bg-red-50 text-red-500 border-red-200"
                  style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800 }}>Expirée</span>
              )}
            </div>
            <p style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: '0.8rem', color: '#8A8A8A' }}>
              Code : <span className="font-mono font-bold">{session.code}</span> · Créée le {formatDate(session.createdAt)}
            </p>
          </div>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Participants', value: String(session.participantCount) + (session.maxParticipants ? `/${session.maxParticipants}` : '') },
            { label: 'Conversations', value: String(session.conversationCount) },
            { label: 'Messages', value: String(session.messageCount) },
            { label: 'Tokens', value: formatTokens(session.tokens) },
          ].map(stat => (
            <div key={stat.label} className="bg-white rounded-xl border border-[#D8D8D8] p-4 text-center">
              <p style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '1.4rem', color: '#0D0D0D' }}>{stat.value}</p>
              <p style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: '0.72rem', color: '#8A8A8A' }}>{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Analytics — niveau 1+ */}
        {session.visibility >= 1 && analytics && (
          <div className="bg-white rounded-xl border border-[#D8D8D8] p-5">
            <h2 className="mb-4" style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '0.7rem', letterSpacing: '0.05em', textTransform: 'uppercase', color: '#5A5A5A' }}>
              📊 Activité de la session (anonyme)
            </h2>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center">
                <p style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '1.3rem', color: '#0D0D0D' }}>
                  {analytics.activeStudents}{analytics.maxParticipants ? `/${analytics.maxParticipants}` : ''}
                </p>
                <p style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: '0.72rem', color: '#8A8A8A' }}>Étudiants actifs</p>
              </div>
              <div className="text-center">
                <p style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '1.3rem', color: '#0D0D0D' }}>{analytics.totalMessages}</p>
                <p style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: '0.72rem', color: '#8A8A8A' }}>Messages envoyés</p>
              </div>
              <div className="text-center">
                <p style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '1.3rem', color: '#0D0D0D' }}>
                  {analytics.avgDurationMin > 0 ? `${analytics.avgDurationMin} min` : '—'}
                </p>
                <p style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: '0.72rem', color: '#8A8A8A' }}>Durée moy. / étudiant</p>
              </div>
            </div>
            {analytics.keywords.length > 0 && (
              <div className="mb-3">
                <p style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '0.65rem', letterSpacing: '0.04em', textTransform: 'uppercase', color: '#8A8A8A', marginBottom: '0.5rem' }}>
                  Thèmes les plus abordés
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {analytics.keywords.map(kw => (
                    <span key={kw} className="px-2 py-0.5 rounded-full text-[11px] bg-[#E8E9F8] text-[#00068D]"
                      style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800 }}>
                      #{kw}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {analytics.blockingMoments > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#FFF8E1] border border-[#FFD54F]">
                <span style={{ fontSize: '0.75rem' }}>⚠️</span>
                <p style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: '0.75rem', color: '#7A5200' }}>
                  {analytics.blockingMoments} moment{analytics.blockingMoments > 1 ? 's' : ''} de blocage détecté{analytics.blockingMoments > 1 ? 's' : ''}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Phase 2 broadcast button */}
        {hasBroadcast && session.status === 'ACTIVE' && (
          <div className="bg-white rounded-xl border border-red-200 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '0.88rem', color: '#0D0D0D' }}>
                  💡 Déclencher la Phase 2
                </p>
                <p style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: '0.78rem', color: '#8A8A8A', marginTop: '0.2rem' }}>
                  Envoie le signal &quot;[PHASE 2]&quot; à toutes les conversations actives.
                  L&apos;IA révèle alors ce qu&apos;elle avait dit d&apos;inexact.
                </p>
              </div>
              <button
                onClick={triggerPhase2}
                disabled={broadcasting || broadcastDone}
                className={`flex-shrink-0 ml-4 px-5 py-2.5 rounded-xl text-[11px] disabled:opacity-60 transition-all ${broadcastDone ? 'bg-[#E8F5E9] text-[#2E7D32] border border-[#A5D6A7]' : 'bg-red-600 text-white hover:bg-red-700'}`}
                style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, letterSpacing: '0.04em' }}>
                {broadcastDone ? '✓ PHASE 2 ENVOYÉE' : broadcasting ? 'Envoi…' : 'DÉCLENCHER PHASE 2'}
              </button>
            </div>
          </div>
        )}

        {/* Session details */}
        <div className="grid grid-cols-2 gap-4">
          {/* Scenario info */}
          <div className="bg-white rounded-xl border border-[#D8D8D8] p-5 space-y-3">
            <h2 style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '0.7rem', letterSpacing: '0.05em', textTransform: 'uppercase', color: '#5A5A5A' }}>Scénario</h2>
            {scenarioMeta ? (
              <div className="flex items-center gap-2">
                <span className="text-xl">{scenarioMeta.icon}</span>
                <span style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '0.85rem', color: '#0D0D0D' }}>{scenarioMeta.label}</span>
              </div>
            ) : (
              <span style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: '0.82rem', color: '#8A8A8A', fontStyle: 'italic' }}>Non spécifié</span>
            )}
            <div className="flex flex-wrap gap-1">
              {session.agents.map(a => (
                <span key={a.slug} className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-[#E8E9F8] text-[#00068D]"
                  style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 300 }}>
                  {a.icon} {a.label}
                </span>
              ))}
            </div>
          </div>

          {/* Visibility */}
          <div className="bg-white rounded-xl border border-[#D8D8D8] p-5 space-y-2">
            <h2 style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '0.7rem', letterSpacing: '0.05em', textTransform: 'uppercase', color: '#5A5A5A' }}>Visibilité</h2>
            <div className="flex items-center gap-2">
              <span className="text-xl">{visInfo.icon}</span>
              <span style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '0.85rem', color: '#0D0D0D' }}>{visInfo.label}</span>
            </div>
            <p style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: '0.78rem', color: '#8A8A8A' }}>{visInfo.description}</p>
            {session.visibility === 0 && (
              <p style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: '0.75rem', color: '#5A5A5A', fontStyle: 'italic' }}>
                Les conversations sont confidentielles — aucun accès.
              </p>
            )}
            {session.visibility >= 1 && (
              <div className="mt-2 p-3 rounded-lg bg-[#F8F8FF] border border-[#E8E9F8]">
                <p style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: '0.75rem', color: '#8A8A8A', fontStyle: 'italic' }}>
                  Analytics détaillées disponibles en Sprint 12.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Consigne + prompt */}
        {session.studentConsigne && (
          <div className="bg-white rounded-xl border border-[#D8D8D8] p-5">
            <h2 className="mb-2" style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '0.7rem', letterSpacing: '0.05em', textTransform: 'uppercase', color: '#5A5A5A' }}>Consigne étudiants</h2>
            <p style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: '0.85rem', color: '#3A3A3A', lineHeight: 1.6 }}>{session.studentConsigne}</p>
          </div>
        )}

        {session.systemPrompt && (
          <div className="bg-white rounded-xl border border-[#D8D8D8] p-5">
            <button className="flex items-center justify-between w-full" onClick={() => setPromptOpen(v => !v)}>
              <h2 style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '0.7rem', letterSpacing: '0.05em', textTransform: 'uppercase', color: '#5A5A5A' }}>Prompt pédagogique</h2>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8A8A8A" strokeWidth="2.5" className={`transition-transform ${promptOpen ? 'rotate-180' : ''}`}>
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
            {promptOpen && (
              <pre className="mt-3 text-[11px] bg-[#FAFAFA] rounded-lg p-3 whitespace-pre-wrap border border-[#F2F2F2] max-h-64 overflow-auto"
                style={{ fontFamily: 'Source Serif Pro, Georgia, serif', color: '#3A3A3A', lineHeight: 1.6 }}>
                {session.systemPrompt}
              </pre>
            )}
          </div>
        )}

        {/* Session link */}
        <div className="bg-[#E8E9F8] rounded-xl p-4">
          <p style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '0.68rem', letterSpacing: '0.05em', textTransform: 'uppercase', color: '#00068D', marginBottom: '0.4rem' }}>Lien de la session</p>
          <p className="font-mono text-[12px] text-[#00068D] break-all">
            {typeof window !== 'undefined' ? `${window.location.origin}/session/${session.code}` : `/session/${session.code}`}
          </p>
        </div>
      </div>
    </div>
  )
}
