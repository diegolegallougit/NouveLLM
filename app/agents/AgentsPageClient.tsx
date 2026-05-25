'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'

const FAMILIES = [
  {
    label: 'Recherche',
    icon: '🔍',
    bg: '#E8F5E9',
    agents: [
      { slug: 'recherche',     label: 'Recherche documentaire', desc: 'Exploration de corpus, sources USN et KB INTEGRIA', soon: false },
      { slug: 'bibliographie', label: 'Bibliographie annotée',  desc: 'Synthèse avec citations HAL, OpenAlex', soon: false },
      { slug: null,            label: 'Financements & AAP',     desc: 'Appels à projets ouverts, financements ANR, Europe', soon: true },
    ],
  },
  {
    label: 'Pédagogie',
    icon: '🎓',
    bg: '#E8E9F8',
    agents: [
      { slug: 'fiche-cours', label: 'Fiche de cours ECTS',  desc: 'Fiches conformes standards LMD et USN', soon: false },
      { slug: 'module',      label: 'Module pédagogique',   desc: 'Syllabus, objectifs, progressivité', soon: false },
      { slug: 'examen',      label: "Sujet d'examen",       desc: 'Calibré par niveau et compétences', soon: false },
    ],
  },
  {
    label: 'Rédaction',
    icon: '✍️',
    bg: '#FFF8E1',
    agents: [
      { slug: 'redaction',  label: 'Rédaction administrative', desc: 'Documents institutionnels, courriers USN', soon: false },
      { slug: 'briefing',   label: 'Briefing & synthèse',      desc: 'Réunions, comptes-rendus, notes', soon: false },
      { slug: 'traduction', label: 'Traduction SHS',           desc: 'Glossaire terminologique et notes de traducteur', soon: false },
    ],
  },
  {
    label: 'Analyse',
    icon: '🔬',
    bg: '#FCE4EC',
    agents: [
      { slug: 'analyse', label: 'Analyse de document',   desc: 'Analyse critique, thèmes, comparaison corpus', soon: false },
      { slug: null,      label: 'Analyse de données',    desc: 'Tableaux, statistiques, visualisation', soon: true },
      { slug: null,      label: 'Concepteur de séances', desc: 'Conception de scénarios pédagogiques', soon: true },
    ],
  },
]

interface Props {
  userName: string
  userRole: string
  userInitials: string
}

export default function AgentsPageClient({ userName, userRole, userInitials }: Props) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const q = query.toLowerCase()

  const filtered = FAMILIES.map(f => ({
    ...f,
    agents: f.agents.filter(a =>
      !q || a.label.toLowerCase().includes(q) || a.desc.toLowerCase().includes(q)
    ),
  })).filter(f => f.agents.length > 0)

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col">
      <Header userName={userName} userRole={userRole} userInitials={userInitials} />

      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto space-y-6">

          {/* Header */}
          <div>
            <button
              onClick={() => router.back()}
              className="flex items-center gap-1.5 mb-4 transition-all"
              style={{ padding: '6px 12px', borderRadius: 8, background: '#F2F2F2',
                       fontFamily: 'Gilroy, sans-serif', fontWeight: 800,
                       fontSize: 'var(--text-xs)', color: '#5A5A5A', border: 'none', cursor: 'pointer' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#E8E9F8')}
              onMouseLeave={e => (e.currentTarget.style.background = '#F2F2F2')}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                   strokeWidth="2.5" strokeLinecap="round">
                <path d="M19 12H5M5 12l7-7M5 12l7 7" />
              </svg>
              Retour
            </button>

            <h1 style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800,
                         fontSize: 'var(--text-lg)', color: '#0D0D0D' }}>
              Agents disponibles
            </h1>
            <p style={{ fontFamily: 'Source Serif Pro, Georgia, serif',
                        fontSize: 'var(--text-sm)', color: '#8A8A8A', marginTop: 4 }}>
              Tapez @ dans le chat pour utiliser un agent directement
            </p>

            {/* Search bar */}
            <div className="mt-4" style={{ maxWidth: 380 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, height: 36,
                            background: '#F2F2F2', borderRadius: 8, padding: '0 12px' }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#8A8A8A"
                     strokeWidth="2.5" strokeLinecap="round" style={{ flexShrink: 0 }}>
                  <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
                </svg>
                <input
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Filtrer les agents..."
                  style={{ background: 'transparent', border: 'none', flex: 1, outline: 'none',
                           fontFamily: 'Gilroy, sans-serif', fontSize: 'var(--text-xs)', color: '#0D0D0D' }}
                />
              </div>
            </div>
          </div>

          {/* Familles */}
          {filtered.map(family => (
            <div key={family.label}>
              <div className="flex items-center gap-2 mb-3">
                <div style={{ width: 28, height: 28, borderRadius: 7, background: family.bg,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 14 }}>
                  {family.icon}
                </div>
                <span style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800,
                               fontSize: 'var(--text-xs)', letterSpacing: '0.06em',
                               color: '#0D0D0D', textTransform: 'uppercase' }}>
                  {family.label}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {family.agents.map(agent => (
                  <button
                    key={agent.label}
                    type="button"
                    onClick={() => { if (!agent.soon && agent.slug) router.push('/?agent=' + agent.slug) }}
                    className={[
                      'flex flex-col items-start text-left p-4 rounded-xl border transition-all bg-white',
                      agent.soon
                        ? 'border-dashed border-[#D8D8D8] opacity-60 cursor-default'
                        : 'border-[#D8D8D8] hover:border-[#2B2EB8] hover:bg-[#F0F1FB] cursor-pointer',
                    ].join(' ')}
                  >
                    <div className="flex items-start justify-between w-full mb-2 gap-2">
                      <span style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800,
                                     fontSize: 'var(--text-sm)', color: '#0D0D0D' }}>
                        {agent.label}
                      </span>
                      {agent.soon && (
                        <span style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800,
                                       fontSize: 'var(--text-2xs)', background: '#F2F2F2',
                                       color: '#8A8A8A', borderRadius: 4, padding: '2px 6px',
                                       flexShrink: 0 }}>
                          À venir
                        </span>
                      )}
                    </div>
                    <p style={{ fontFamily: 'Source Serif Pro, Georgia, serif',
                                fontSize: 'var(--text-xs)', color: '#8A8A8A', lineHeight: 1.4 }}>
                      {agent.desc}
                    </p>
                    {!agent.soon && agent.slug && (
                      <span className="mt-3 nl-token-agent" style={{ fontSize: 'var(--text-2xs)' }}>
                        @{agent.slug}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <p style={{ fontFamily: 'Source Serif Pro, Georgia, serif',
                        fontSize: 'var(--text-sm)', color: '#8A8A8A',
                        textAlign: 'center', padding: '40px 0' }}>
              Aucun agent ne correspond à votre recherche.
            </p>
          )}

        </div>
      </main>

      <Footer userRole={userRole} />
    </div>
  )
}
