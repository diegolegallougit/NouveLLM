'use client'

import { useEffect, useState } from 'react'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'

const NIVEAUX_OPTIONS = ['L1', 'L2', 'L3', 'M1', 'M2', 'M2-pro', 'Doctorat']
const LANGUES_OPTIONS = ['fr', 'en', 'ar', 'es', 'it', 'de', 'pt']
const ROLE_OPTIONS = ['MCF', 'PR', 'PRAG', 'ATER', 'Doctorant·e', 'BIATSS-A', 'BIATSS-B', 'Vacataire']
const UFR_OPTIONS = [
  'Arts & Médias',
  'Langues, Littératures, Civilisations et Sociétés Étrangères (LLCSE)',
  'Littérature, Linguistique, Didactique (LLD)',
  'Monde Anglophone',
  'IHEAL',
  'ESIT',
  'ICM',
  'INSPÉ de Paris',
  'Autre',
]

interface Props {
  userName: string
  userRole: string
  userInitials: string
  isCredentials: boolean
}

export default function ProfilePageClient({ userName, userRole, userInitials, isCredentials }: Props) {
  // Profile state
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [discipline, setDiscipline] = useState('')
  const [roleExact, setRoleExact] = useState('')
  const [ufr, setUfr] = useState('')
  const [niveaux, setNiveaux] = useState<string[]>([])
  const [langues, setLangues] = useState<string[]>([])

  // Password state
  const [pwCurrent, setPwCurrent] = useState('')
  const [pwNext, setPwNext] = useState('')
  const [pwConfirm, setPwConfirm] = useState('')
  const [pwSaving, setPwSaving] = useState(false)
  const [pwSaved, setPwSaved] = useState(false)
  const [pwError, setPwError] = useState('')

  useEffect(() => {
    fetch('/api/users/profile')
      .then((r) => r.json())
      .then((data) => {
        setDiscipline(data.discipline ?? '')
        setRoleExact(data.roleExact ?? '')
        setUfr(data.ufr ?? '')
        setNiveaux(data.niveauxEnseignement ? data.niveauxEnseignement.split(',').map((s: string) => s.trim()).filter(Boolean) : [])
        setLangues(data.languesTravail ? data.languesTravail.split(',').map((s: string) => s.trim()).filter(Boolean) : [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function handleSave() {
    setSaving(true)
    setError('')
    setSaved(false)
    try {
      const r = await fetch('/api/users/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          discipline: discipline || undefined,
          roleExact: roleExact || undefined,
          ufr: ufr || undefined,
          niveauxEnseignement: niveaux.length > 0 ? niveaux.join(',') : undefined,
          languesTravail: langues.length > 0 ? langues.join(',') : undefined,
        }),
      })
      if (!r.ok) throw new Error()
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch {
      setError('Une erreur est survenue. Réessayez.')
    } finally {
      setSaving(false)
    }
  }

  async function handlePasswordSave() {
    setPwSaving(true)
    setPwError('')
    setPwSaved(false)
    try {
      const r = await fetch('/api/users/password', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current: pwCurrent, next: pwNext, confirm: pwConfirm }),
      })
      const data = await r.json()
      if (!r.ok) { setPwError(data.error ?? 'Erreur'); return }
      setPwSaved(true)
      setPwCurrent(''); setPwNext(''); setPwConfirm('')
      setTimeout(() => setPwSaved(false), 3000)
    } finally {
      setPwSaving(false)
    }
  }

  function toggleNiveau(val: string) {
    setNiveaux((prev) => prev.includes(val) ? prev.filter((x) => x !== val) : [...prev, val])
  }
  function toggleLangue(val: string) {
    setLangues((prev) => prev.includes(val) ? prev.filter((x) => x !== val) : [...prev, val])
  }

  const inputCls = 'w-full px-3.5 py-2.5 rounded-lg border border-[#D8D8D8] bg-white focus:outline-none focus:border-[#2B2EB8] focus:ring-1 focus:ring-[#2B2EB8] transition-all'
  const inputStyle = { fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: 'var(--text-sm)', color: '#0D0D0D', minHeight: 44 }
  const labelStyle = { fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-xs)', letterSpacing: '0.06em', color: '#8A8A8A', textTransform: 'uppercase' as const }

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col">
      <Header userName={userName} userRole={userRole} userInitials={userInitials} />

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">

          {/* Titre */}
          <div>
            <a
              href="/"
              className="inline-flex items-center gap-1.5 mb-5 transition-all"
              style={{ padding: '6px 12px', borderRadius: 8, background: '#F2F2F2',
                       fontFamily: 'Gilroy, sans-serif', fontWeight: 800,
                       fontSize: 'var(--text-xs)', color: '#5A5A5A', textDecoration: 'none' }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = '#E8E9F8')}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = '#F2F2F2')}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M19 12H5M5 12l7-7M5 12l7 7" />
              </svg>
              Retour
            </a>
            <h1 style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-lg)', color: '#0D0D0D' }}>
              Mon profil
            </h1>
            <p className="mt-1" style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: 'var(--text-sm)', color: '#8A8A8A' }}>
              Ces informations permettent à NouveLLM d&apos;adapter ses réponses à votre contexte professionnel.
              Elles restent privées et ne sont jamais partagées.
            </p>
          </div>

          {/* Formulaire profil */}
          <div className="bg-white rounded-2xl border border-[#D8D8D8] p-6 space-y-5">
            <p style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-xs)', letterSpacing: '0.08em', color: '#8A8A8A', textTransform: 'uppercase' }}>
              Informations professionnelles
            </p>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-5 h-5 border-2 border-[#D8D8D8] border-t-[#00068D] rounded-full animate-spin" />
              </div>
            ) : (
              <div className="space-y-5">
                {/* Discipline */}
                <div>
                  <label htmlFor="discipline" style={labelStyle} className="block mb-1.5">
                    Spécialité académique
                  </label>
                  <input
                    id="discipline"
                    type="text"
                    value={discipline}
                    onChange={(e) => setDiscipline(e.target.value)}
                    placeholder="ex : Traductologie, Littérature comparée…"
                    maxLength={200}
                    className={inputCls}
                    style={inputStyle}
                  />
                </div>

                {/* Statut */}
                <div>
                  <label htmlFor="roleExact" style={labelStyle} className="block mb-1.5">
                    Statut
                  </label>
                  <select
                    id="roleExact"
                    value={roleExact}
                    onChange={(e) => setRoleExact(e.target.value)}
                    className={inputCls + ' appearance-none'}
                    style={{ ...inputStyle, color: roleExact ? '#0D0D0D' : '#8A8A8A' }}
                  >
                    <option value="">— Choisir —</option>
                    {ROLE_OPTIONS.map((r) => <option key={r} value={r} style={{ color: '#0D0D0D' }}>{r}</option>)}
                  </select>
                </div>

                {/* UFR */}
                <div>
                  <label htmlFor="ufr" style={labelStyle} className="block mb-1.5">
                    UFR / Composante
                  </label>
                  <select
                    id="ufr"
                    value={ufr}
                    onChange={(e) => setUfr(e.target.value)}
                    className={inputCls + ' appearance-none'}
                    style={{ ...inputStyle, color: ufr ? '#0D0D0D' : '#8A8A8A' }}
                  >
                    <option value="">— Choisir —</option>
                    {UFR_OPTIONS.map((u) => <option key={u} value={u} style={{ color: '#0D0D0D' }}>{u}</option>)}
                  </select>
                </div>

                {/* Niveaux */}
                <div>
                  <p style={labelStyle} className="mb-2">Niveaux d&apos;enseignement</p>
                  <div className="flex flex-wrap gap-2">
                    {NIVEAUX_OPTIONS.map((n) => {
                      const checked = niveaux.includes(n)
                      return (
                        <button key={n} type="button" onClick={() => toggleNiveau(n)}
                          className="px-3 py-2 rounded-lg border transition-all"
                          style={{ minHeight: 44, fontFamily: 'Gilroy, sans-serif', fontWeight: checked ? 800 : 300,
                                   fontSize: 'var(--text-sm)', borderColor: checked ? '#2B2EB8' : '#D8D8D8',
                                   background: checked ? '#E8E9F8' : '#FAFAFA', color: checked ? '#00068D' : '#5A5A5A' }}>
                          {n}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Langues */}
                <div>
                  <p style={labelStyle} className="mb-2">Langues de travail</p>
                  <div className="flex flex-wrap gap-2">
                    {LANGUES_OPTIONS.map((l) => {
                      const checked = langues.includes(l)
                      return (
                        <button key={l} type="button" onClick={() => toggleLangue(l)}
                          className="px-3 py-2 rounded-lg border transition-all"
                          style={{ minHeight: 44, fontFamily: 'Gilroy, sans-serif', fontWeight: checked ? 800 : 300,
                                   fontSize: 'var(--text-sm)', letterSpacing: '0.04em',
                                   borderColor: checked ? '#2B2EB8' : '#D8D8D8',
                                   background: checked ? '#E8E9F8' : '#FAFAFA', color: checked ? '#00068D' : '#5A5A5A' }}>
                          {l.toUpperCase()}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Feedback + submit */}
                <div className="space-y-2 pt-1">
                  {error && (
                    <p style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: 'var(--text-sm)', color: '#dc2626' }}>{error}</p>
                  )}
                  {saved && (
                    <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-lg bg-[#E8F5E9] border border-[#4CAF50]">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#2E7D32" strokeWidth="2.5" strokeLinecap="round"><path d="M20 6L9 17l-5-5" /></svg>
                      <p style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: 'var(--text-sm)', color: '#2E7D32' }}>Profil enregistré.</p>
                    </div>
                  )}
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg transition-all disabled:opacity-50"
                    style={{ background: '#00068D', color: 'white', fontFamily: 'Gilroy, sans-serif',
                             fontWeight: 800, fontSize: 'var(--text-xs)', letterSpacing: '0.06em', minHeight: 44 }}
                  >
                    {saving ? 'Enregistrement…' : 'ENREGISTRER LE PROFIL'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Mot de passe — credentials uniquement */}
          {isCredentials && (
            <div className="bg-white rounded-2xl border border-[#D8D8D8] p-6 space-y-5">
              <p style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-xs)', letterSpacing: '0.08em', color: '#8A8A8A', textTransform: 'uppercase' }}>
                Changer de mot de passe
              </p>

              <div className="space-y-4">
                <div>
                  <label htmlFor="pw-current" style={labelStyle} className="block mb-1.5">Mot de passe actuel</label>
                  <input
                    id="pw-current"
                    type="password"
                    value={pwCurrent}
                    onChange={(e) => setPwCurrent(e.target.value)}
                    autoComplete="current-password"
                    className={inputCls}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label htmlFor="pw-next" style={labelStyle} className="block mb-1.5">Nouveau mot de passe</label>
                  <input
                    id="pw-next"
                    type="password"
                    value={pwNext}
                    onChange={(e) => setPwNext(e.target.value)}
                    autoComplete="new-password"
                    className={inputCls}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label htmlFor="pw-confirm" style={labelStyle} className="block mb-1.5">Confirmer le nouveau mot de passe</label>
                  <input
                    id="pw-confirm"
                    type="password"
                    value={pwConfirm}
                    onChange={(e) => setPwConfirm(e.target.value)}
                    autoComplete="new-password"
                    className={inputCls}
                    style={inputStyle}
                  />
                </div>

                {pwError && (
                  <p style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: 'var(--text-sm)', color: '#dc2626' }}>{pwError}</p>
                )}
                {pwSaved && (
                  <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-lg bg-[#E8F5E9] border border-[#4CAF50]">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#2E7D32" strokeWidth="2.5" strokeLinecap="round"><path d="M20 6L9 17l-5-5" /></svg>
                    <p style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: 'var(--text-sm)', color: '#2E7D32' }}>Mot de passe modifié.</p>
                  </div>
                )}

                <button
                  onClick={handlePasswordSave}
                  disabled={pwSaving || !pwCurrent || !pwNext || !pwConfirm}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg transition-all disabled:opacity-50"
                  style={{ background: '#00068D', color: 'white', fontFamily: 'Gilroy, sans-serif',
                           fontWeight: 800, fontSize: 'var(--text-xs)', letterSpacing: '0.06em', minHeight: 44 }}
                >
                  {pwSaving ? 'Enregistrement…' : 'CHANGER LE MOT DE PASSE'}
                </button>
              </div>
            </div>
          )}

        </div>
      </main>

      <Footer userRole={userRole} />
    </div>
  )
}
