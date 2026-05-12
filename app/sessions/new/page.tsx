'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import PromptBuilder from '@/components/sessions/PromptBuilder'
import MissionForm, { MissionData, missionToPrompt } from '@/components/sessions/MissionForm'

interface Scenario {
  id: string
  slug: string
  label: string
  level: number | null
  levelLabel: string
  icon: string
  shortDescription: string
  fullDescription: string
  disciplineHint: string | null
  levelHint: string | null
  defaultAgentSlugs: string[]
  defaultDuration: string
  defaultSaveHistory: boolean
  defaultVisibility: number
  systemPromptTemplate: string
  studentConsigne: string
  hasBroadcast: boolean
  hasStructuredForm: boolean
}

interface Agent { id: string; slug: string; label: string; icon: string }
interface Source { id: string; slug: string; label: string; icon: string }

const DURATION_OPTIONS = [
  { label: '1 heure', hours: 1 },
  { label: '3 heures', hours: 3 },
  { label: '24 heures', hours: 24 },
  { label: '1 semaine', hours: 168 },
  { label: '30 jours', hours: 720 },
]

const VISIBILITY_OPTIONS = [
  { value: 0, icon: '🔒', label: 'Confidentiel', sublabel: 'Recommandé', description: "Vous ne voyez rien. Les étudiants travaillent sans observation.", banner: "Vos échanges sont confidentiels." },
  { value: 1, icon: '📊', label: 'Statistiques anonymes', sublabel: '', description: "Thèmes fréquents, points de blocage — aucun étudiant identifié.", banner: "Des statistiques anonymes sont collectées." },
  { value: 2, icon: '📁', label: 'Sauvegardé pour analyse', sublabel: '', description: "Conversations complètes accessibles après la fin de la session.", banner: "Vos échanges sont sauvegardés pour analyse pédagogique." },
  { value: 3, icon: '👁', label: 'Visible en temps réel', sublabel: '', description: "Vous lisez les échanges en direct pendant la session.", banner: "Votre enseignant peut lire vos échanges en direct." },
]

type Step = 'scenario' | 'info' | 'prompt' | 'visibility' | 'sources' | 'recap'
const STEPS: Step[] = ['scenario', 'info', 'prompt', 'visibility', 'sources', 'recap']
const STEP_LABELS = ['Scénario', 'Informations', 'Prompt', 'Visibilité', 'Sources', 'Récapitulatif']

function groupByLevel(scenarios: Scenario[]) {
  const groups: { level: number | null; levelLabel: string; items: Scenario[] }[] = []
  for (const sc of scenarios) {
    const existing = groups.find(g => g.level === sc.level)
    if (existing) {
      existing.items.push(sc)
    } else {
      groups.push({ level: sc.level, levelLabel: sc.levelLabel, items: [sc] })
    }
  }
  return groups.sort((a, b) => (a.level ?? 99) - (b.level ?? 99))
}

const EMPTY_MISSION: MissionData = {
  discipline: '', contexte: '', personnages: '', situation: '',
  bascule1_condition: '', bascule1_bien: '', bascule1_mal: '',
  bascule2_condition: '', bascule2_bien: '', bascule2_mal: '',
  timePressure: false, timerDelay: '1 minute', timerConsequence: '',
}

export default function NewSessionPage() {
  const router = useRouter()
  const [scenarios, setScenarios] = useState<Scenario[]>([])
  const [agents, setAgents] = useState<Agent[]>([])
  const [sources, setSources] = useState<Source[]>([])
  const [step, setStep] = useState<Step>('scenario')
  const [hoveredScenario, setHoveredScenario] = useState<Scenario | null>(null)

  // Form state
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null)
  const [name, setName] = useState('')
  const [studentConsigne, setStudentConsigne] = useState('')
  const [validityHours, setValidityHours] = useState(24)
  const [maxParticipants, setMaxParticipants] = useState('')
  const [access, setAccess] = useState<'OPEN' | 'CLOSED'>('OPEN')
  const [systemPrompt, setSystemPrompt] = useState('')
  const [missionData, setMissionData] = useState<MissionData>(EMPTY_MISSION)
  const [visibility, setVisibility] = useState(0)
  const [selectedAgents, setSelectedAgents] = useState<string[]>([])
  const [selectedSources, setSelectedSources] = useState<string[]>([])

  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ code: string; link: string; qrSvg: string } | null>(null)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetch('/api/sessions/scenarios').then(r => r.json()).then(d => setScenarios(d.scenarios ?? []))
    fetch('/api/agents').then(r => r.json()).then(d => setAgents(d.agents ?? []))
    fetch('/api/sources').then(r => r.json()).then(d => setSources(d.sources ?? []))
  }, [])

  function chooseScenario(sc: Scenario) {
    setSelectedScenario(sc)
    setSystemPrompt(sc.systemPromptTemplate)
    setStudentConsigne(sc.studentConsigne)
    setVisibility(sc.defaultVisibility)
    setSelectedAgents(sc.defaultAgentSlugs)
    // Set default duration
    const durationMap: Record<string, number> = { '1 heure': 1, '2 heures': 3, '3 heures': 3, '1h30': 3, '1 semaine': 168, '30 jours': 720 }
    setValidityHours(durationMap[sc.defaultDuration] ?? 24)
    setStep('info')
  }

  function goToStep(s: Step) {
    if (!selectedScenario && s !== 'scenario') return
    setStep(s)
  }

  function nextStep() {
    const idx = STEPS.indexOf(step)
    if (idx < STEPS.length - 1) setStep(STEPS[idx + 1])
  }
  function prevStep() {
    const idx = STEPS.indexOf(step)
    if (idx > 0) setStep(STEPS[idx - 1])
  }

  function toggleAgent(slug: string) {
    setSelectedAgents(prev => prev.includes(slug) ? prev.filter(s => s !== slug) : [...prev, slug])
  }
  function toggleSource(slug: string) {
    setSelectedSources(prev => prev.includes(slug) ? prev.filter(s => s !== slug) : [...prev, slug])
  }

  function getEffectivePrompt(): string {
    if (selectedScenario?.hasStructuredForm) return missionToPrompt(missionData)
    return systemPrompt
  }

  async function handleSubmit() {
    if (!name.trim()) { setError('Le nom est requis.'); return }
    setLoading(true)
    setError('')
    try {
      const validUntil = new Date(Date.now() + validityHours * 3600 * 1000).toISOString()
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: studentConsigne.trim() || undefined,
          studentConsigne: studentConsigne.trim() || undefined,
          systemPrompt: getEffectivePrompt().trim() || undefined,
          scenarioSlug: selectedScenario?.slug,
          visibility,
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

  function copyLink(text: string) {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
    } else {
      const el = document.createElement('textarea')
      el.value = text; el.style.position = 'fixed'; el.style.opacity = '0'
      document.body.appendChild(el); el.select(); document.execCommand('copy'); document.body.removeChild(el)
      setCopied(true); setTimeout(() => setCopied(false), 2000)
    }
  }

  // ─── Success screen ────────────────────────────────────────────────────────
  if (result) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl border border-[#D8D8D8] p-8 max-w-md w-full text-center space-y-6">
          <div>
            <div className="w-12 h-12 rounded-full bg-[#E8F5E9] flex items-center justify-center mx-auto mb-4">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2E7D32" strokeWidth="2.5" strokeLinecap="round"><path d="M20 6L9 17l-5-5" /></svg>
            </div>
            <h2 style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '1.2rem', color: '#0D0D0D' }}>Session créée</h2>
            <p style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: '0.85rem', color: '#8A8A8A', marginTop: '0.25rem' }}>Partagez le code ou le QR avec vos étudiants</p>
          </div>
          <div className="bg-[#E8E9F8] rounded-xl px-6 py-4">
            <p style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 300, fontSize: '0.7rem', letterSpacing: '0.08em', color: '#00068D', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Code de session</p>
            <p style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '1.5rem', color: '#00068D', letterSpacing: '0.04em' }}>{result.code}</p>
          </div>
          <div className="mx-auto rounded-xl overflow-hidden border border-[#D8D8D8]" style={{ width: 192, height: 192 }}
            dangerouslySetInnerHTML={{ __html: result.qrSvg }} />
          <div className="flex flex-col gap-2">
            <button onClick={() => copyLink(result.link)}
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg border border-[#D8D8D8] text-sm hover:bg-[#F2F2F2] transition-colors"
              style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 300, color: copied ? '#2E7D32' : '#5A5A5A' }}>
              {copied ? '✓ Lien copié !' : 'Copier le lien'}
            </button>
            <div className="px-1 py-1.5 rounded-lg bg-[#F2F2F2] text-center">
              <p className="text-xs break-all" style={{ fontFamily: 'monospace', color: '#5A5A5A', fontSize: '0.7rem' }}>{result.link}</p>
            </div>
            <button onClick={() => router.push('/sessions')}
              className="w-full py-2.5 rounded-xl text-sm transition-all hover:opacity-90"
              style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, background: '#00068D', color: '#fff' }}>
              Voir mes sessions
            </button>
          </div>
        </div>
      </div>
    )
  }

  const stepIdx = STEPS.indexOf(step)
  const visOption = VISIBILITY_OPTIONS.find(v => v.value === visibility)!

  return (
    <div className="min-h-screen bg-[#FAFAFA] p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header + breadcrumb */}
        <div className="flex items-center gap-3 mb-5">
          <button onClick={() => step === 'scenario' ? router.push('/sessions') : prevStep()}
            className="p-2 rounded-lg hover:bg-[#F2F2F2] transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5A5A5A" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5M5 12l7-7M5 12l7 7" /></svg>
          </button>
          <div className="flex-1">
            <h1 style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '1.3rem', color: '#0D0D0D' }}>Nouvelle session de cours</h1>
            <div className="flex items-center gap-1 mt-1">
              {STEPS.map((s, i) => (
                <div key={s} className="flex items-center gap-1">
                  <button onClick={() => goToStep(s)} disabled={!selectedScenario && s !== 'scenario'}
                    className={`text-[9px] px-2 py-0.5 rounded transition-all ${step === s ? 'bg-[#00068D] text-white' : i < stepIdx ? 'text-[#2B2EB8] hover:underline' : 'text-[#C8C8C8]'}`}
                    style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800 }}>
                    {STEP_LABELS[i]}
                  </button>
                  {i < STEPS.length - 1 && <span className="text-[#D8D8D8] text-[9px]">›</span>}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── STEP 1: Scenario ──────────────────────────────────────────────── */}
        {step === 'scenario' && (
          <div className="flex gap-5">
            {/* Left: scenario list */}
            <div className="flex-1 space-y-4">
              {groupByLevel(scenarios).map(group => (
                <div key={String(group.level)} className="bg-white rounded-xl border border-[#D8D8D8] overflow-hidden">
                  {group.level !== null && (
                    <div className="px-5 py-3 border-b border-[#F2F2F2] bg-[#FAFAFA]">
                      <p style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '0.7rem', letterSpacing: '0.05em', textTransform: 'uppercase', color: '#5A5A5A' }}>
                        {group.levelLabel}
                      </p>
                    </div>
                  )}
                  <div className="divide-y divide-[#F2F2F2]">
                    {group.items.map(sc => (
                      <button key={sc.slug}
                        onMouseEnter={() => setHoveredScenario(sc)}
                        onMouseLeave={() => setHoveredScenario(null)}
                        onClick={() => chooseScenario(sc)}
                        className="w-full flex items-start gap-3 px-5 py-3.5 text-left hover:bg-[#F0F1FB] transition-all group">
                        <span className="text-xl flex-shrink-0 mt-0.5">{sc.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '0.88rem', color: '#0D0D0D' }}>{sc.label}</p>
                          <p style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: '0.78rem', color: '#8A8A8A', marginTop: '0.15rem', fontStyle: 'italic' }}>
                            {sc.shortDescription}
                          </p>
                        </div>
                        <span className="text-[11px] px-2.5 py-1 rounded-lg border border-[#2B2EB8] text-[#00068D] opacity-0 group-hover:opacity-100 transition-all flex-shrink-0 mt-0.5"
                          style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800 }}>
                          Sélectionner
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Right: detail panel */}
            <div className="w-80 flex-shrink-0">
              <div className="bg-white rounded-xl border border-[#D8D8D8] p-5 sticky top-6">
                {hoveredScenario ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{hoveredScenario.icon}</span>
                      <div>
                        <p style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '0.95rem', color: '#0D0D0D' }}>{hoveredScenario.label}</p>
                        <p style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 300, fontSize: '0.7rem', color: '#2B2EB8' }}>{hoveredScenario.levelLabel}</p>
                      </div>
                    </div>
                    {(hoveredScenario.disciplineHint || hoveredScenario.levelHint) && (
                      <div className="flex flex-wrap gap-1.5">
                        {hoveredScenario.disciplineHint && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#F2F2F2] text-[#5A5A5A]"
                            style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800 }}>
                            {hoveredScenario.disciplineHint}
                          </span>
                        )}
                        {hoveredScenario.levelHint && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#E8E9F8] text-[#00068D]"
                            style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800 }}>
                            {hoveredScenario.levelHint}
                          </span>
                        )}
                      </div>
                    )}
                    <p style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: '0.82rem', color: '#3A3A3A', lineHeight: 1.6 }}>
                      {hoveredScenario.fullDescription}
                    </p>
                    <div className="border-t border-[#F2F2F2] pt-3 space-y-1.5">
                      <p style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '0.68rem', letterSpacing: '0.04em', textTransform: 'uppercase', color: '#8A8A8A' }}>Pré-configuré</p>
                      {hoveredScenario.defaultAgentSlugs.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {hoveredScenario.defaultAgentSlugs.map(s => (
                            <span key={s} className="nl-token-agent text-[10px]">@{s}</span>
                          ))}
                        </div>
                      )}
                      <p style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: '0.75rem', color: '#8A8A8A' }}>
                        Durée : {hoveredScenario.defaultDuration} · Visibilité : {VISIBILITY_OPTIONS.find(v => v.value === hoveredScenario.defaultVisibility)?.label}
                      </p>
                    </div>
                    <button onClick={() => chooseScenario(hoveredScenario)}
                      className="w-full py-2 rounded-xl text-sm transition-all hover:opacity-90 mt-1"
                      style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, background: '#00068D', color: '#fff' }}>
                      Utiliser ce scénario →
                    </button>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: '0.85rem', color: '#C8C8C8', fontStyle: 'italic' }}>
                      Survolez un scénario pour voir ses détails
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 2: Basic info ───────────────────────────────────────────── */}
        {step === 'info' && selectedScenario && (
          <div className="max-w-2xl space-y-5">
            <ScenarioBadge scenario={selectedScenario} />

            <div className="bg-white rounded-xl border border-[#D8D8D8] p-5 space-y-4">
              <h2 style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '0.75rem', letterSpacing: '0.05em', textTransform: 'uppercase', color: '#5A5A5A' }}>Informations de base</h2>
              <div>
                <label className="block mb-1.5" style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '0.7rem', letterSpacing: '0.04em', textTransform: 'uppercase', color: '#5A5A5A' }}>Nom de la session *</label>
                <input value={name} onChange={e => setName(e.target.value)}
                  placeholder="ex: Traduction M1 — TD du 14 mai 2026"
                  className="w-full px-3 py-2 rounded-lg border border-[#D8D8D8] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#2B2EB8]"
                  style={{ fontFamily: 'Source Serif Pro, Georgia, serif' }} />
              </div>
              <div>
                <label className="block mb-1.5" style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '0.7rem', letterSpacing: '0.04em', textTransform: 'uppercase', color: '#5A5A5A' }}>Consigne pour les étudiants</label>
                <textarea value={studentConsigne} onChange={e => setStudentConsigne(e.target.value)}
                  placeholder="Décrivez l'activité et les objectifs attendus…" rows={3}
                  className="w-full px-3 py-2 rounded-lg border border-[#D8D8D8] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#2B2EB8] resize-none"
                  style={{ fontFamily: 'Source Serif Pro, Georgia, serif' }} />
              </div>
            </div>

            <div className="bg-white rounded-xl border border-[#D8D8D8] p-5 space-y-4">
              <h2 style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '0.75rem', letterSpacing: '0.05em', textTransform: 'uppercase', color: '#5A5A5A' }}>Accès et durée</h2>
              <div>
                <label className="block mb-2" style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '0.7rem', letterSpacing: '0.04em', textTransform: 'uppercase', color: '#5A5A5A' }}>Durée de validité</label>
                <div className="flex flex-wrap gap-2">
                  {DURATION_OPTIONS.map(opt => (
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
                  <label className="block mb-1.5" style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '0.7rem', letterSpacing: '0.04em', textTransform: 'uppercase', color: '#5A5A5A' }}>Capacité max</label>
                  <input type="number" value={maxParticipants} onChange={e => setMaxParticipants(e.target.value)}
                    placeholder="Illimitée" min="1"
                    className="w-full px-3 py-2 rounded-lg border border-[#D8D8D8] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#2B2EB8]"
                    style={{ fontFamily: 'Source Serif Pro, Georgia, serif' }} />
                </div>
                <div>
                  <label className="block mb-2" style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '0.7rem', letterSpacing: '0.04em', textTransform: 'uppercase', color: '#5A5A5A' }}>Accès</label>
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

            <NavButtons onBack={prevStep} onNext={nextStep} nextLabel="Configurer le prompt →" />
          </div>
        )}

        {/* ── STEP 3: Prompt ───────────────────────────────────────────────── */}
        {step === 'prompt' && selectedScenario && (
          <div className="max-w-2xl space-y-5">
            <ScenarioBadge scenario={selectedScenario} />
            <div className="bg-white rounded-xl border border-[#D8D8D8] p-5">
              <h2 className="mb-4" style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '0.75rem', letterSpacing: '0.05em', textTransform: 'uppercase', color: '#5A5A5A' }}>Prompt pédagogique</h2>
              {selectedScenario.hasStructuredForm
                ? <MissionForm value={missionData} onChange={setMissionData} />
                : <PromptBuilder value={systemPrompt} onChange={setSystemPrompt} />
              }
            </div>
            <NavButtons onBack={prevStep} onNext={nextStep} nextLabel="Choisir la visibilité →" />
          </div>
        )}

        {/* ── STEP 4: Visibility ───────────────────────────────────────────── */}
        {step === 'visibility' && selectedScenario && (
          <div className="max-w-2xl space-y-5">
            <ScenarioBadge scenario={selectedScenario} />
            <div className="bg-white rounded-xl border border-[#D8D8D8] p-5 space-y-4">
              <h2 style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '0.75rem', letterSpacing: '0.05em', textTransform: 'uppercase', color: '#5A5A5A' }}>Visibilité des échanges étudiants</h2>
              <div className="space-y-2">
                {VISIBILITY_OPTIONS.map(opt => (
                  <button key={opt.value} type="button" onClick={() => setVisibility(opt.value)}
                    className={`w-full flex items-start gap-4 px-4 py-3 rounded-xl border transition-all text-left ${visibility === opt.value ? 'border-[#2B2EB8] bg-[#E8E9F8]' : 'border-[#D8D8D8] hover:bg-[#F8F8FF]'}`}>
                    <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 mt-0.5 transition-all ${visibility === opt.value ? 'border-[#00068D] bg-[#00068D]' : 'border-[#D8D8D8]'}`}>
                      {visibility === opt.value && <div className="w-1.5 h-1.5 bg-white rounded-full m-auto mt-[0.15rem]" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span>{opt.icon}</span>
                        <span style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '0.85rem', color: visibility === opt.value ? '#00068D' : '#0D0D0D' }}>
                          {opt.label}
                        </span>
                        {opt.sublabel && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 border border-green-300"
                            style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800 }}>{opt.sublabel}</span>
                        )}
                      </div>
                      <p style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: '0.78rem', color: '#5A5A5A', marginTop: '0.2rem' }}>
                        {opt.description}
                      </p>
                      <p className="mt-1.5 text-[10px] italic" style={{ fontFamily: 'Source Serif Pro, Georgia, serif', color: '#8A8A8A' }}>
                        Bandeau affiché : « {opt.banner} »
                      </p>
                    </div>
                  </button>
                ))}
              </div>
              <div className="bg-orange-50 border border-orange-200 rounded-lg px-4 py-3">
                <p style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: '0.78rem', color: '#7A3200', fontStyle: 'italic' }}>
                  ⚠️ Dans tous les cas, cette session ne donne pas lieu à une notation. Cette mention est automatiquement affichée aux étudiants.
                </p>
              </div>
            </div>
            <NavButtons onBack={prevStep} onNext={nextStep} nextLabel="Choisir les sources →" />
          </div>
        )}

        {/* ── STEP 5: Sources + Agents ─────────────────────────────────────── */}
        {step === 'sources' && selectedScenario && (
          <div className="max-w-2xl space-y-5">
            <ScenarioBadge scenario={selectedScenario} />

            <div className="bg-white rounded-xl border border-[#D8D8D8] p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h2 style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '0.75rem', letterSpacing: '0.05em', textTransform: 'uppercase', color: '#5A5A5A' }}>Agents disponibles</h2>
                <span style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: '0.72rem', color: '#8A8A8A', fontStyle: 'italic' }}>Pré-configuré par le scénario</span>
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

            <NavButtons onBack={prevStep} onNext={nextStep} nextLabel="Récapitulatif →" />
          </div>
        )}

        {/* ── STEP 6: Recap ────────────────────────────────────────────────── */}
        {step === 'recap' && selectedScenario && (
          <div className="max-w-2xl space-y-5">
            <div className="bg-white rounded-xl border border-[#D8D8D8] p-5 space-y-4">
              <h2 style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '0.75rem', letterSpacing: '0.05em', textTransform: 'uppercase', color: '#5A5A5A' }}>Récapitulatif</h2>

              <RecapRow label="Scénario" value={`${selectedScenario.icon} ${selectedScenario.label}`} />
              <RecapRow label="Nom" value={name || '—'} error={!name} />
              <RecapRow label="Visibilité" value={`${visOption.icon} ${visOption.label}`} />
              <RecapRow label="Durée" value={`${DURATION_OPTIONS.find(d => d.hours === validityHours)?.label ?? validityHours + 'h'}`} />
              {selectedAgents.length > 0 && (
                <RecapRow label="Agents" value={selectedAgents.map(s => agents.find(a => a.slug === s)?.label ?? s).join(', ')} />
              )}
              {selectedSources.length > 0 && (
                <RecapRow label="Sources" value={selectedSources.join(', ')} />
              )}
              {getEffectivePrompt() && (
                <div>
                  <p style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '0.68rem', letterSpacing: '0.04em', textTransform: 'uppercase', color: '#8A8A8A', marginBottom: '0.4rem' }}>Prompt</p>
                  <pre className="text-[11px] bg-[#FAFAFA] rounded-lg p-3 max-h-32 overflow-auto whitespace-pre-wrap border border-[#F2F2F2]"
                    style={{ fontFamily: 'Source Serif Pro, Georgia, serif', color: '#3A3A3A', lineHeight: 1.6 }}>
                    {getEffectivePrompt().slice(0, 400)}{getEffectivePrompt().length > 400 ? '…' : ''}
                  </pre>
                </div>
              )}
            </div>

            {error && <p className="text-sm text-red-600 px-1" style={{ fontFamily: 'Source Serif Pro, Georgia, serif' }}>{error}</p>}

            <div className="flex gap-3">
              <button onClick={prevStep} className="flex-1 py-3 rounded-xl border border-[#D8D8D8] text-sm hover:bg-[#F2F2F2] transition-all"
                style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, color: '#5A5A5A' }}>
                ← Modifier
              </button>
              <button onClick={handleSubmit} disabled={loading || !name.trim()}
                className="flex-1 py-3 rounded-xl text-sm disabled:opacity-50 transition-all hover:opacity-90"
                style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, background: '#00068D', color: '#fff', letterSpacing: '0.04em' }}>
                {loading ? 'Création…' : 'CRÉER LA SESSION'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function ScenarioBadge({ scenario }: { scenario: Scenario }) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-[#E8E9F8] border border-[#C5C7F0]">
      <span className="text-xl">{scenario.icon}</span>
      <div>
        <p style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '0.82rem', color: '#00068D' }}>{scenario.label}</p>
        <p style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: '0.75rem', color: '#5A5A5A', fontStyle: 'italic' }}>{scenario.levelLabel}</p>
      </div>
    </div>
  )
}

function RecapRow({ label, value, error }: { label: string; value: string; error?: boolean }) {
  return (
    <div className="flex items-start gap-4 border-b border-[#F2F2F2] pb-3 last:border-0 last:pb-0">
      <span className="w-24 flex-shrink-0" style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '0.7rem', letterSpacing: '0.04em', textTransform: 'uppercase', color: '#8A8A8A' }}>{label}</span>
      <span style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: '0.85rem', color: error ? '#dc2626' : '#0D0D0D' }}>{value}</span>
    </div>
  )
}

function NavButtons({ onBack, onNext, nextLabel }: { onBack: () => void; onNext: () => void; nextLabel: string }) {
  return (
    <div className="flex gap-3">
      <button onClick={onBack} className="px-5 py-3 rounded-xl border border-[#D8D8D8] text-sm hover:bg-[#F2F2F2] transition-all"
        style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, color: '#5A5A5A' }}>
        ← Retour
      </button>
      <button onClick={onNext}
        className="flex-1 py-3 rounded-xl text-sm transition-all hover:opacity-90"
        style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, background: '#00068D', color: '#fff' }}>
        {nextLabel}
      </button>
    </div>
  )
}
