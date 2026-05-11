'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface Agent {
  id: string
  slug: string
  label: string
  icon: string
}

interface Source {
  id: string
  slug: string
  label: string
  icon: string
}

const VALIDITY_OPTIONS = [
  { label: '1 heure', hours: 1 },
  { label: '4 heures', hours: 4 },
  { label: '24 heures', hours: 24 },
  { label: '1 semaine', hours: 168 },
  { label: '30 jours', hours: 720 },
]

interface ScenarioConfig {
  icon: string
  label: string
  description: string
  agentSlugs: string[]
  systemPrompt: string
}

const SCENARIOS: Record<string, ScenarioConfig> = {
  'exploration-documentaire': {
    icon: '📖',
    label: 'Exploration documentaire',
    description: "Les étudiants explorent un corpus que je fournis",
    agentSlugs: ['analyse', 'bibliographie'],
    systemPrompt: "Tu aides les étudiants à explorer et comprendre les documents fournis. Encourage la lecture active, pose des questions pour vérifier la compréhension. Ne donne pas les réponses directement.",
  },
  'verification-sources': {
    icon: '🔍',
    label: 'Vérification de sources',
    description: "Les étudiants identifient des erreurs ou incohérences",
    agentSlugs: ['analyse'],
    systemPrompt: "Tu aides les étudiants à identifier des erreurs, incohérences ou biais dans les documents. Guide-les vers la vérification critique sans leur donner les réponses.",
  },
  'co-redaction': {
    icon: '✍️',
    label: 'Co-rédaction guidée',
    description: "Les étudiants co-construisent un texte avec l'IA",
    agentSlugs: ['redaction', 'analyse'],
    systemPrompt: "Tu co-construis un texte avec l'étudiant. Propose des formulations, améliore le style, mais laisse l'étudiant prendre les décisions finales. Explique tes suggestions.",
  },
  'questions-reponses': {
    icon: '❓',
    label: 'Questions-réponses sur cours',
    description: "Les étudiants interrogent le contenu de mon cours",
    agentSlugs: ['analyse'],
    systemPrompt: "Tu réponds aux questions des étudiants sur le contenu du cours. Sois précis et pédagogique. Si une question dépasse le contenu fourni, dis-le clairement.",
  },
  'traduction-commentee': {
    icon: '🌍',
    label: 'Traduction commentée',
    description: "Les étudiants traduisent et analysent leurs choix",
    agentSlugs: ['traduction'],
    systemPrompt: "Tu aides les étudiants à traduire et à commenter leurs choix traductifs. Pose des questions sur leurs décisions, propose des alternatives, explique les enjeux.",
  },
  'personnalisee': {
    icon: '⚙️',
    label: 'Session personnalisée',
    description: "Configurer manuellement les agents et sources",
    agentSlugs: [],
    systemPrompt: '',
  },
}

type Step = 'scenario' | 'details' | 'confirm'

export default function NewSessionPage() {
  const router = useRouter()
  const [agents, setAgents] = useState<Agent[]>([])
  const [sources, setSources] = useState<Source[]>([])

  const [step, setStep] = useState<Step>('scenario')
  const [selectedScenario, setSelectedScenario] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [systemPrompt, setSystemPrompt] = useState('')
  const [validityHours, setValidityHours] = useState(24)
  const [maxParticipants, setMaxParticipants] = useState('')
  const [access, setAccess] = useState<'OPEN' | 'CLOSED'>('OPEN')
  const [selectedAgents, setSelectedAgents] = useState<string[]>([])
  const [selectedSources, setSelectedSources] = useState<string[]>([])

  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ code: string; link: string; qrSvg: string } | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/agents').then(r => r.json()).then(d => setAgents(d.agents ?? []))
    fetch('/api/sources').then(r => r.json()).then(d => setSources(d.sources ?? []))
  }, [])

  function chooseScenario(slug: string) {
    const sc = SCENARIOS[slug]
    setSelectedScenario(slug)
    setSystemPrompt(sc.systemPrompt)
    if (slug !== 'personnalisee') {
      setSelectedAgents(sc.agentSlugs)
    } else {
      setSelectedAgents([])
    }
    setStep('details')
  }

  function toggleAgent(slug: string) {
    setSelectedAgents(prev => prev.includes(slug) ? prev.filter(s => s !== slug) : [...prev, slug])
  }
  function toggleSource(slug: string) {
    setSelectedSources(prev => prev.includes(slug) ? prev.filter(s => s !== slug) : [...prev, slug])
  }

  async function handleSubmit() {
    if (!name.trim()) { setError('Le nom est requis.'); return }
    setLoading(true)
    setError('')
    try {
      const validUntil = new Date(Date.now() + validityHours * 60 * 60 * 1000).toISOString()
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          systemPrompt: systemPrompt.trim() || undefined,
          validUntil,
          maxParticipants: maxParticipants ? parseInt(maxParticipants) : undefined,
          access,
          agentSlugs: selectedAgents,
          sourceSlugs: selectedSources,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Erreur'); return }
      setResult({ code: data.session.code, link: data.link, qrSvg: data.qrSvg })
    } finally {
      setLoading(false)
    }
  }

  function downloadQR() {
    if (!result) return
    const blob = new Blob([result.qrSvg], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `session-${result.code}.svg`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (result) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl border border-[#D8D8D8] p-8 max-w-md w-full text-center space-y-6">
          <div>
            <div className="w-12 h-12 rounded-full bg-[#E8F5E9] flex items-center justify-center mx-auto mb-4">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2E7D32" strokeWidth="2.5" strokeLinecap="round"><path d="M20 6L9 17l-5-5" /></svg>
            </div>
            <h2 style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '1.2rem', color: '#0D0D0D' }}>
              Session créée
            </h2>
            <p style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: '0.85rem', color: '#8A8A8A', marginTop: '0.25rem' }}>
              Partagez le code ou le QR avec vos étudiants
            </p>
          </div>
          <div className="bg-[#E8E9F8] rounded-xl px-6 py-4">
            <p style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 300, fontSize: '0.7rem', letterSpacing: '0.08em', color: '#00068D', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
              Code de session
            </p>
            <p style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '1.5rem', color: '#00068D', letterSpacing: '0.04em' }}>
              {result.code}
            </p>
          </div>
          <div className="mx-auto rounded-xl overflow-hidden border border-[#D8D8D8]" style={{ width: 192, height: 192 }}
            dangerouslySetInnerHTML={{ __html: result.qrSvg }} />
          <div className="flex flex-col gap-2">
            <button onClick={downloadQR}
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg border border-[#D8D8D8] text-sm hover:bg-[#F2F2F2] transition-colors"
              style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, color: '#0D0D0D' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7,10 12,15 17,10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
              Télécharger le QR code SVG
            </button>
            <button onClick={() => { navigator.clipboard.writeText(result.link) }}
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg border border-[#D8D8D8] text-sm hover:bg-[#F2F2F2] transition-colors"
              style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 300, color: '#5A5A5A' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>
              Copier le lien
            </button>
            <button onClick={() => router.push('/sessions')}
              className="w-full py-2.5 rounded-lg text-sm transition-colors"
              style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, background: '#00068D', color: '#fff' }}>
              Voir mes sessions
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => step === 'scenario' ? router.push('/sessions') : setStep('scenario')}
            className="p-2 rounded-lg hover:bg-[#F2F2F2] transition-colors" aria-label="Retour">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5A5A5A" strokeWidth="2" strokeLinecap="round">
              <path d="M19 12H5M5 12l7-7M5 12l7 7" />
            </svg>
          </button>
          <div>
            <h1 style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '1.3rem', color: '#0D0D0D' }}>
              Créer une session de cours
            </h1>
            <p style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: '0.82rem', color: '#8A8A8A' }}>
              {step === 'scenario' ? 'Étape 1 — Choisissez un scénario pédagogique' : 'Étape 2 — Informations de la session'}
            </p>
          </div>
        </div>

        {/* Step 1: Scenario chooser */}
        {step === 'scenario' && (
          <div className="space-y-2.5">
            {Object.entries(SCENARIOS).map(([slug, sc]) => (
              <button
                key={slug}
                onClick={() => chooseScenario(slug)}
                className="w-full flex items-start gap-4 px-5 py-4 rounded-xl border border-[#D8D8D8] bg-white hover:bg-[#F0F1FB] hover:border-[#2B2EB8] transition-all text-left"
              >
                <span className="text-2xl flex-shrink-0 mt-0.5">{sc.icon}</span>
                <div className="flex-1">
                  <p style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '0.9rem', color: '#0D0D0D' }}>
                    {sc.label}
                  </p>
                  <p style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: '0.82rem', color: '#8A8A8A', marginTop: '0.2rem', fontStyle: 'italic' }}>
                    {sc.description}
                  </p>
                  {sc.agentSlugs.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {sc.agentSlugs.map(s => (
                        <span key={s} className="nl-token-agent text-[10px]">@{s}</span>
                      ))}
                    </div>
                  )}
                </div>
                <svg className="flex-shrink-0 mt-1" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#C8C8C8" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </button>
            ))}
          </div>
        )}

        {/* Step 2: Details */}
        {step === 'details' && selectedScenario && (
          <div className="space-y-5">
            {/* Scenario reminder */}
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#E8E9F8] border border-[#C5C7F0]">
              <span className="text-xl">{SCENARIOS[selectedScenario].icon}</span>
              <div>
                <p style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '0.82rem', color: '#00068D' }}>
                  {SCENARIOS[selectedScenario].label}
                </p>
                <p style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: '0.75rem', color: '#5A5A5A', fontStyle: 'italic' }}>
                  {SCENARIOS[selectedScenario].description}
                </p>
              </div>
            </div>

            {/* Basic info */}
            <div className="bg-white rounded-xl border border-[#D8D8D8] p-5 space-y-4">
              <h2 style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '0.75rem', letterSpacing: '0.05em', textTransform: 'uppercase', color: '#5A5A5A' }}>
                Informations de base
              </h2>
              <div>
                <label className="block mb-1.5" style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '0.7rem', letterSpacing: '0.04em', textTransform: 'uppercase', color: '#5A5A5A' }}>
                  Nom de la session *
                </label>
                <input value={name} onChange={e => setName(e.target.value)}
                  placeholder="ex: Traduction M1 — TD du 14 mai 2026"
                  className="w-full px-3 py-2 rounded-lg border border-[#D8D8D8] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#2B2EB8]"
                  style={{ fontFamily: 'Source Serif Pro, Georgia, serif' }} />
              </div>
              <div>
                <label className="block mb-1.5" style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '0.7rem', letterSpacing: '0.04em', textTransform: 'uppercase', color: '#5A5A5A' }}>
                  Consigne pour les étudiants
                </label>
                <textarea value={description} onChange={e => setDescription(e.target.value)}
                  placeholder="Décrivez l'activité et les objectifs attendus…"
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-[#D8D8D8] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#2B2EB8] resize-none"
                  style={{ fontFamily: 'Source Serif Pro, Georgia, serif' }} />
              </div>
              {systemPrompt && (
                <div>
                  <label className="block mb-1.5" style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '0.7rem', letterSpacing: '0.04em', textTransform: 'uppercase', color: '#5A5A5A' }}>
                    Prompt système <span style={{ fontWeight: 300, textTransform: 'none' }}>(pré-configuré)</span>
                  </label>
                  <textarea value={systemPrompt} onChange={e => setSystemPrompt(e.target.value)} rows={3}
                    className="w-full px-3 py-2 rounded-lg border border-[#D8D8D8] bg-[#FAFAFA] text-sm focus:outline-none focus:ring-2 focus:ring-[#2B2EB8] resize-none"
                    style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: '0.8rem' }} />
                </div>
              )}
            </div>

            {/* Duration + capacity */}
            <div className="bg-white rounded-xl border border-[#D8D8D8] p-5 space-y-4">
              <h2 style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '0.75rem', letterSpacing: '0.05em', textTransform: 'uppercase', color: '#5A5A5A' }}>
                Accès et durée
              </h2>
              <div>
                <label className="block mb-2" style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '0.7rem', letterSpacing: '0.04em', textTransform: 'uppercase', color: '#5A5A5A' }}>
                  Durée de validité
                </label>
                <div className="flex flex-wrap gap-2">
                  {VALIDITY_OPTIONS.map(opt => (
                    <button key={opt.hours} type="button" onClick={() => setValidityHours(opt.hours)}
                      className={`px-3 py-1.5 rounded-lg border text-xs transition-all ${validityHours === opt.hours ? 'border-[#2B2EB8] bg-[#E8E9F8] text-[#00068D]' : 'border-[#D8D8D8] text-[#5A5A5A] hover:bg-[#F2F2F2]'}`}
                      style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800 }}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1.5" style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '0.7rem', letterSpacing: '0.04em', textTransform: 'uppercase', color: '#5A5A5A' }}>
                    Capacité max
                  </label>
                  <input type="number" value={maxParticipants} onChange={e => setMaxParticipants(e.target.value)}
                    placeholder="Illimitée" min="1"
                    className="w-full px-3 py-2 rounded-lg border border-[#D8D8D8] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#2B2EB8]"
                    style={{ fontFamily: 'Source Serif Pro, Georgia, serif' }} />
                </div>
                <div>
                  <label className="block mb-2" style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '0.7rem', letterSpacing: '0.04em', textTransform: 'uppercase', color: '#5A5A5A' }}>
                    Accès
                  </label>
                  <div className="flex gap-2">
                    {(['OPEN', 'CLOSED'] as const).map(mode => (
                      <button key={mode} type="button" onClick={() => setAccess(mode)}
                        className={`flex-1 py-2 rounded-lg border text-[10px] transition-all ${access === mode ? 'border-[#2B2EB8] bg-[#E8E9F8] text-[#00068D]' : 'border-[#D8D8D8] text-[#5A5A5A] hover:bg-[#F2F2F2]'}`}
                        style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800 }}>
                        {mode === 'OPEN' ? 'OUVERT' : 'FERMÉ'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Agents (editable for personnalisée, summary for others) */}
            <div className="bg-white rounded-xl border border-[#D8D8D8] p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h2 style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '0.75rem', letterSpacing: '0.05em', textTransform: 'uppercase', color: '#5A5A5A' }}>
                  Agents disponibles
                </h2>
                {selectedScenario !== 'personnalisee' && (
                  <span style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: '0.72rem', color: '#8A8A8A', fontStyle: 'italic' }}>
                    Pré-configuré par le scénario
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {agents.map(agent => (
                  <button key={agent.slug} type="button" onClick={() => toggleAgent(agent.slug)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-left transition-all ${selectedAgents.includes(agent.slug) ? 'border-[#2B2EB8] bg-[#E8E9F8]' : 'border-[#D8D8D8] hover:bg-[#F2F2F2]'}`}>
                    <span className="text-sm">{agent.icon}</span>
                    <span style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '0.72rem', color: selectedAgents.includes(agent.slug) ? '#00068D' : '#0D0D0D' }}>
                      {agent.label}
                    </span>
                    {selectedAgents.includes(agent.slug) && (
                      <svg className="ml-auto" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#2B2EB8" strokeWidth="2.5" strokeLinecap="round"><path d="M20 6L9 17l-5-5" /></svg>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Sources */}
            {sources.length > 0 && (
              <div className="bg-white rounded-xl border border-[#D8D8D8] p-5 space-y-3">
                <h2 style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '0.75rem', letterSpacing: '0.05em', textTransform: 'uppercase', color: '#5A5A5A' }}>
                  Sources activées <span style={{ fontWeight: 300, textTransform: 'none' }}>(optionnel)</span>
                </h2>
                <div className="grid grid-cols-2 gap-2">
                  {sources.map(source => (
                    <button key={source.slug} type="button" onClick={() => toggleSource(source.slug)}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-left transition-all ${selectedSources.includes(source.slug) ? 'border-[#2B2EB8] bg-[#E8E9F8]' : 'border-[#D8D8D8] hover:bg-[#F2F2F2]'}`}>
                      <span className="text-sm">{source.icon}</span>
                      <span style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '0.72rem', color: selectedSources.includes(source.slug) ? '#00068D' : '#0D0D0D' }}>
                        {source.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {error && (
              <p className="text-sm text-red-600 px-1" style={{ fontFamily: 'Source Serif Pro, Georgia, serif' }}>{error}</p>
            )}

            <button onClick={handleSubmit} disabled={loading}
              className="w-full py-3 rounded-xl text-sm disabled:opacity-50 transition-all hover:opacity-90"
              style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, background: '#00068D', color: '#fff', letterSpacing: '0.04em' }}>
              {loading ? 'Création en cours…' : 'CRÉER LA SESSION'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
