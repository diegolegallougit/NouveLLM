'use client'

import { signOut } from 'next-auth/react'
import { useState, useEffect } from 'react'
import MetaPromptsPanel from '@/components/meta-prompts/MetaPromptsPanel'

interface HeaderProps {
  userName?: string
  userRole?: string
  userInitials?: string
  mobileConversationMode?: boolean
  activeAgent?: string | null
  agentLabel?: string | null
  onBack?: () => void
}

export default function Header({ userName = 'Utilisateur', userRole = 'EC', userInitials = 'U', mobileConversationMode = false, activeAgent, agentLabel, onBack }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [mobileCtxOpen, setMobileCtxOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settingsTab, setSettingsTab] = useState<'profile' | 'meta-prompts' | 'sources' | 'data'>('meta-prompts')

  useEffect(() => {
    const handler = () => { setSettingsOpen(true); setSettingsTab('meta-prompts') }
    window.addEventListener('nl:open-settings', handler)
    return () => window.removeEventListener('nl:open-settings', handler)
  }, [])
  const [deleteConvsConfirm, setDeleteConvsConfirm] = useState(false)
  const [deleteAccountConfirm, setDeleteAccountConfirm] = useState(false)
  const [working, setWorking] = useState(false)
  const [done, setDone] = useState('')

  // Profile form state
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileSaved, setProfileSaved] = useState(false)
  const [profileError, setProfileError] = useState('')
  const [discipline, setDiscipline] = useState('')
  const [roleExact, setRoleExact] = useState('')
  const [ufr, setUfr] = useState('')
  const [niveaux, setNiveaux] = useState<string[]>([])
  const [langues, setLangues] = useState<string[]>([])
  const [sources, setSources] = useState<string[]>([])

  // MES SOURCES tab state
  type AcademicSourceItem = { slug: string; label: string; description: string; icon: string }
  type ConnectorItem = { slug: string; label: string; description: string; icon: string; connected: boolean }
  const [sourcesTabLoading, setSourcesTabLoading] = useState(false)
  const [availableSources, setAvailableSources] = useState<AcademicSourceItem[]>([])
  const [availableConnectors, setAvailableConnectors] = useState<ConnectorItem[]>([])
  const [sourcesSaving, setSourcesSaving] = useState(false)
  const [sourcesSaved, setSourcesSaved] = useState(false)
  const [notionToken, setNotionToken] = useState('')
  const [notionConnecting, setNotionConnecting] = useState(false)
  const [notionError, setNotionError] = useState('')

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

  useEffect(() => {
    if (settingsTab !== 'profile' || !settingsOpen) return
    setProfileLoading(true)
    fetch('/api/users/profile')
      .then((r) => r.json())
      .then((data) => {
        setDiscipline(data.discipline ?? '')
        setRoleExact(data.roleExact ?? '')
        setUfr(data.ufr ?? '')
        setNiveaux(data.niveauxEnseignement ? data.niveauxEnseignement.split(',').map((s: string) => s.trim()).filter(Boolean) : [])
        setLangues(data.languesTravail ? data.languesTravail.split(',').map((s: string) => s.trim()).filter(Boolean) : [])
        setSources(data.sourcesAcademiques ? data.sourcesAcademiques.split(',').map((s: string) => s.trim()).filter(Boolean) : [])
      })
      .catch(() => {})
      .finally(() => setProfileLoading(false))
  }, [settingsTab, settingsOpen])

  useEffect(() => {
    if (settingsTab !== 'sources' || !settingsOpen) return
    setSourcesTabLoading(true)
    Promise.all([
      fetch('/api/integrations/sources').then((r) => r.json()),
      fetch('/api/users/profile').then((r) => r.json()),
    ])
      .then(([intData, profileData]) => {
        setAvailableSources(intData.academicSources ?? [])
        setAvailableConnectors(intData.connectors ?? [])
        setSources(profileData.sourcesAcademiques ? profileData.sourcesAcademiques.split(',').map((s: string) => s.trim()).filter(Boolean) : [])
      })
      .catch(() => {})
      .finally(() => setSourcesTabLoading(false))
  }, [settingsTab, settingsOpen])

  async function handleSourcesSave() {
    setSourcesSaving(true)
    setSourcesSaved(false)
    try {
      await fetch('/api/users/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourcesAcademiques: sources.length > 0 ? sources.join(',') : undefined }),
      })
      setSourcesSaved(true)
      setTimeout(() => setSourcesSaved(false), 2500)
    } finally {
      setSourcesSaving(false)
    }
  }

  async function handleNotionConnect() {
    if (!notionToken.trim()) return
    setNotionConnecting(true)
    setNotionError('')
    try {
      const r = await fetch('/api/connectors/notion/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: notionToken.trim() }),
      })
      if (r.ok) {
        setNotionToken('')
        // refresh connectors
        const intData = await fetch('/api/integrations/sources').then((res) => res.json())
        setAvailableConnectors(intData.connectors ?? [])
      } else {
        const d = await r.json()
        setNotionError(d.error ?? 'Token invalide')
      }
    } finally {
      setNotionConnecting(false)
    }
  }

  async function handleNotionDisconnect() {
    await fetch('/api/connectors/notion/connect', { method: 'DELETE' })
    const intData = await fetch('/api/integrations/sources').then((res) => res.json())
    setAvailableConnectors(intData.connectors ?? [])
  }

  async function handleProfileSave() {
    setProfileSaving(true)
    setProfileError('')
    setProfileSaved(false)
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
      setProfileSaved(true)
      setTimeout(() => setProfileSaved(false), 3000)
    } catch {
      setProfileError('Une erreur est survenue. Réessayez.')
    } finally {
      setProfileSaving(false)
    }
  }

  function toggleNiveau(val: string) {
    setNiveaux((prev) => prev.includes(val) ? prev.filter((x) => x !== val) : [...prev, val])
  }

  function toggleLangue(val: string) {
    setLangues((prev) => prev.includes(val) ? prev.filter((x) => x !== val) : [...prev, val])
  }

  const roleLabel =
    userRole === 'ADMIN' ? 'Administrateur' : userRole === 'STUDENT' ? 'Étudiant·e' : 'Enseignant·e-Chercheur·se'

  async function handleDeleteConversations() {
    setWorking(true)
    try {
      const r = await fetch('/api/conversations/all', { method: 'DELETE' })
      const data = await r.json()
      setDone(`${data.deleted} conversation(s) supprimée(s).`)
      setDeleteConvsConfirm(false)
    } finally {
      setWorking(false)
    }
  }

  async function handleDeleteAccount() {
    setWorking(true)
    try {
      await fetch('/api/user/account', { method: 'DELETE' })
      await signOut({ callbackUrl: '/login' })
    } finally {
      setWorking(false)
    }
  }

  return (
    <>
      <header
        className={`bg-white border-b border-[#D8D8D8] z-10 flex-shrink-0 ${
          mobileConversationMode ? 'h-[56px] md:h-[60px]' : 'flex items-center justify-between px-6 h-[56px] md:h-[60px]'
        }`}
      >
        {/* Immersive mobile bar — conversation mode only */}
        {mobileConversationMode && (
          <div className="md:hidden flex items-center justify-between px-4 h-full">
            {/* ☰ drawer toggle */}
            <button
              onClick={onBack}
              className="w-11 h-11 -ml-2 flex items-center justify-center rounded-lg text-[#0D0D0D] hover:bg-[#F2F2F2] transition-all"
              aria-label="Menu"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M3 12h18M3 6h18M3 18h18" />
              </svg>
            </button>

            {/* Center: agent badge or brand */}
            <div className="flex-1 flex items-center justify-center">
              {(activeAgent || agentLabel) ? (
                <div
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg"
                  style={{ background: '#E8E9F8', border: '0.5px solid #C5C7F0' }}
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#00068D" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M12 3v18M3 12h18" />
                    <path d="M5.6 5.6l12.8 12.8M5.6 18.4l12.8-12.8" />
                  </svg>
                  <span style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-xs)', color: '#00068D', letterSpacing: '0.04em' }}>
                    {agentLabel || `@${activeAgent}`}
                  </span>
                </div>
              ) : (
                <span style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-sm)', color: '#00068D', letterSpacing: '-0.01em' }}>
                  NouveLLM
                </span>
              )}
            </div>

            {/* ··· settings */}
            <div className="relative">
              <button
                onClick={() => setMobileCtxOpen(v => !v)}
                className="w-11 h-11 -mr-2 flex items-center justify-center rounded-lg text-[#8A8A8A] hover:bg-[#F2F2F2] transition-all"
                aria-label="Options"
              >
                <svg width="4" height="16" viewBox="0 0 4 16" fill="currentColor">
                  <circle cx="2" cy="2" r="2" /><circle cx="2" cy="8" r="2" /><circle cx="2" cy="14" r="2" />
                </svg>
              </button>
              {mobileCtxOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setMobileCtxOpen(false)} />
                  <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-lg shadow-lg border border-[#D8D8D8] py-1 z-50">
                    <button
                      onClick={() => { setMobileCtxOpen(false); setSettingsOpen(true) }}
                      className="w-full text-left px-3 py-2 text-[#3A3A3A] hover:bg-[#F2F2F2] transition-colors flex items-center gap-2"
                      style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: 'var(--text-sm)' }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
                      Paramètres
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Standard header content — always on desktop, hidden on mobile in conv mode */}
        <div className={mobileConversationMode ? 'hidden md:flex items-center justify-between px-6 h-full w-full' : 'contents'}>
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-4 md:gap-3">
              {/* Hamburger — home screen mobile only */}
              {onBack && (
                <button
                  onClick={onBack}
                  className="md:hidden w-11 h-11 -ml-2 flex items-center justify-center rounded-lg text-[#0D0D0D] hover:bg-[#F2F2F2] transition-all"
                  aria-label="Menu"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M3 12h18M3 6h18M3 18h18" />
                  </svg>
                </button>
              )}
              <div className="flex items-center justify-center w-7 h-7 md:w-8 md:h-8 rounded-lg bg-[#00068D]">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M12 3v18M3 12h18" />
                  <path d="M5.6 5.6l12.8 12.8M5.6 18.4l12.8-12.8" />
                </svg>
              </div>
              <span className="md:text-lg" style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-md)', letterSpacing: '-0.02em', color: '#00068D' }}>
                NouveLLM
              </span>
              <span className="hidden md:block w-px h-4 bg-[#D8D8D8]" />
              <span className="hidden md:inline" style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 300, fontSize: 'var(--text-xs)', letterSpacing: '0.08em', color: '#8A8A8A', textTransform: 'uppercase' }}>
                Université Sorbonne Nouvelle
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-2">
              {userRole === 'ADMIN' && (
                <a
                  href="/admin"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white transition-all"
                  style={{ background: '#00068D', fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-sm)', letterSpacing: '0.06em' }}
                  title="Panel d'administration"
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>
                  ADMIN
                </a>
              )}
            </div>

            <div className="relative">
              {/* Mobile: simple avatar */}
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="md:hidden w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: '#E8E9F8', color: '#00068D', fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '0.625rem', letterSpacing: '0.04em' }}
              >
                {userInitials}
              </button>
              {/* Desktop: full chip */}
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="hidden md:flex items-center gap-2 pl-1 pr-3 py-1 rounded-full bg-[#F2F2F2] border border-[#D8D8D8] hover:bg-[#E8E9F8] transition-all text-left"
              >
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-white flex-shrink-0"
                  style={{ background: '#00068D', fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-2xs)', letterSpacing: '0.04em' }}
                >
                  {userInitials}
                </div>
                <div className="flex flex-col items-start leading-tight">
                  <span style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontWeight: 600, fontSize: 'var(--text-sm)', color: '#0D0D0D' }}>
                    {userName}
                  </span>
                  <span style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 300, fontSize: 'var(--text-xs)', letterSpacing: '0.06em', textTransform: 'uppercase', color: '#8A8A8A' }}>
                    {roleLabel}
                  </span>
                </div>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#8A8A8A" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>

              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 top-full mt-1 w-52 bg-white rounded-lg shadow-lg border border-[#D8D8D8] py-1 z-50">
                    <div className="px-3 py-2 border-b border-[#D8D8D8]">
                      <p style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontWeight: 600, fontSize: 'var(--text-sm)', color: '#0D0D0D' }}>{userName}</p>
                      <p style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 300, fontSize: 'var(--text-xs)', color: '#8A8A8A' }}>{roleLabel}</p>
                    </div>
                    <button
                      onClick={() => { setMenuOpen(false); setSettingsOpen(true) }}
                      className="w-full text-left px-3 py-2 text-[#3A3A3A] hover:bg-[#F2F2F2] transition-colors flex items-center gap-2"
                      style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: 'var(--text-sm)' }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
                      Paramètres & données
                    </button>
                    <button
                      onClick={() => signOut({ callbackUrl: '/login' })}
                      className="w-full text-left px-3 py-2 text-red-600 hover:bg-red-50 transition-colors"
                      style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: 'var(--text-sm)' }}
                    >
                      Se déconnecter
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Settings modal */}
      {settingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden w-[95vw] max-w-[560px]" style={{ maxHeight: '88vh' }}>
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#D8D8D8] flex-shrink-0">
              <h2 style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-md)', color: '#0D0D0D' }}>
                Paramètres
              </h2>
              <button
                onClick={() => { setSettingsOpen(false); setDone(''); setDeleteConvsConfirm(false); setDeleteAccountConfirm(false) }}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-[#8A8A8A] hover:bg-[#F2F2F2] transition-all"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Tab bar */}
            <div className="flex border-b border-[#D8D8D8] px-6 flex-shrink-0">
              {([
                { id: 'meta-prompts', label: 'MÉTA-PROMPTS' },
                { id: 'profile',      label: 'MON PROFIL' },
                { id: 'sources',      label: 'MES SOURCES' },
                { id: 'data',         label: 'MES DONNÉES' },
              ] as const).map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => setSettingsTab(id)}
                  className={`px-0 py-3 mr-6 border-b-2 transition-all ${settingsTab === id ? 'border-[#00068D] text-[#00068D]' : 'border-transparent text-[#8A8A8A] hover:text-[#3A3A3A]'}`}
                  style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-xs)', letterSpacing: '0.06em' }}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Tab content — scrollable */}
            <div className="overflow-y-auto nl-scroll flex-1 px-6 py-5">
              {settingsTab === 'meta-prompts' && <MetaPromptsPanel />}

              {settingsTab === 'profile' && (
                <div className="space-y-6">
                  <div>
                    <p style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 300, fontSize: 'var(--text-sm)', color: '#5A5A5A', lineHeight: '1.6' }}>
                      Ces informations permettent à NouveLLM d&apos;adapter ses réponses à votre contexte professionnel.
                      Elles restent privées et ne sont jamais partagées.
                    </p>
                  </div>

                  {profileLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="w-5 h-5 border-2 border-[#D8D8D8] border-t-[#00068D] rounded-full animate-spin" />
                    </div>
                  ) : (
                    <div className="space-y-5">
                      {/* Discipline */}
                      <div>
                        <label
                          htmlFor="profile-discipline"
                          style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-xs)', letterSpacing: '0.06em', color: '#8A8A8A', textTransform: 'uppercase' }}
                          className="block mb-1.5"
                        >
                          Spécialité académique
                        </label>
                        <input
                          id="profile-discipline"
                          type="text"
                          value={discipline}
                          onChange={(e) => setDiscipline(e.target.value)}
                          placeholder="ex : Traductologie, Littérature comparée…"
                          maxLength={200}
                          className="w-full px-3.5 py-2.5 rounded-lg border border-[#D8D8D8] bg-white focus:outline-none focus:border-[#2B2EB8] focus:ring-1 focus:ring-[#2B2EB8] transition-all"
                          style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: 'var(--text-sm)', color: '#0D0D0D', minHeight: 44 }}
                        />
                      </div>

                      {/* Statut */}
                      <div>
                        <label
                          htmlFor="profile-role"
                          style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-xs)', letterSpacing: '0.06em', color: '#8A8A8A', textTransform: 'uppercase' }}
                          className="block mb-1.5"
                        >
                          Statut
                        </label>
                        <select
                          id="profile-role"
                          value={roleExact}
                          onChange={(e) => setRoleExact(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-lg border border-[#D8D8D8] bg-white focus:outline-none focus:border-[#2B2EB8] focus:ring-1 focus:ring-[#2B2EB8] transition-all appearance-none"
                          style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: 'var(--text-sm)', color: roleExact ? '#0D0D0D' : '#8A8A8A', minHeight: 44 }}
                        >
                          <option value="">— Choisir —</option>
                          {ROLE_OPTIONS.map((r) => (
                            <option key={r} value={r} style={{ color: '#0D0D0D' }}>{r}</option>
                          ))}
                        </select>
                      </div>

                      {/* UFR */}
                      <div>
                        <label
                          htmlFor="profile-ufr"
                          style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-xs)', letterSpacing: '0.06em', color: '#8A8A8A', textTransform: 'uppercase' }}
                          className="block mb-1.5"
                        >
                          UFR / Composante
                        </label>
                        <select
                          id="profile-ufr"
                          value={ufr}
                          onChange={(e) => setUfr(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-lg border border-[#D8D8D8] bg-white focus:outline-none focus:border-[#2B2EB8] focus:ring-1 focus:ring-[#2B2EB8] transition-all appearance-none"
                          style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: 'var(--text-sm)', color: ufr ? '#0D0D0D' : '#8A8A8A', minHeight: 44 }}
                        >
                          <option value="">— Choisir —</option>
                          {UFR_OPTIONS.map((u) => (
                            <option key={u} value={u} style={{ color: '#0D0D0D' }}>{u}</option>
                          ))}
                        </select>
                      </div>

                      {/* Niveaux d'enseignement */}
                      <div>
                        <p style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-xs)', letterSpacing: '0.06em', color: '#8A8A8A', textTransform: 'uppercase' }} className="mb-2">
                          Niveaux d&apos;enseignement
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {NIVEAUX_OPTIONS.map((n) => {
                            const checked = niveaux.includes(n)
                            return (
                              <button
                                key={n}
                                type="button"
                                onClick={() => toggleNiveau(n)}
                                className="px-3 py-2 rounded-lg border transition-all"
                                style={{
                                  minHeight: 44,
                                  fontFamily: 'Gilroy, sans-serif',
                                  fontWeight: checked ? 800 : 300,
                                  fontSize: 'var(--text-sm)',
                                  borderColor: checked ? '#2B2EB8' : '#D8D8D8',
                                  background: checked ? '#E8E9F8' : '#FAFAFA',
                                  color: checked ? '#00068D' : '#5A5A5A',
                                }}
                              >
                                {n}
                              </button>
                            )
                          })}
                        </div>
                      </div>

                      {/* Langues de travail */}
                      <div>
                        <p style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-xs)', letterSpacing: '0.06em', color: '#8A8A8A', textTransform: 'uppercase' }} className="mb-2">
                          Langues de travail
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {LANGUES_OPTIONS.map((l) => {
                            const checked = langues.includes(l)
                            return (
                              <button
                                key={l}
                                type="button"
                                onClick={() => toggleLangue(l)}
                                className="px-3 py-2 rounded-lg border transition-all"
                                style={{
                                  minHeight: 44,
                                  fontFamily: 'Gilroy, sans-serif',
                                  fontWeight: checked ? 800 : 300,
                                  fontSize: 'var(--text-sm)',
                                  letterSpacing: '0.04em',
                                  borderColor: checked ? '#2B2EB8' : '#D8D8D8',
                                  background: checked ? '#E8E9F8' : '#FAFAFA',
                                  color: checked ? '#00068D' : '#5A5A5A',
                                }}
                              >
                                {l.toUpperCase()}
                              </button>
                            )
                          })}
                        </div>
                      </div>

                      {/* Feedback + Submit */}
                      <div className="space-y-2 pt-1">
                        {profileError && (
                          <p style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: 'var(--text-sm)', color: '#dc2626' }}>
                            {profileError}
                          </p>
                        )}
                        {profileSaved && (
                          <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-lg bg-[#E8F5E9] border border-[#4CAF50]">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#2E7D32" strokeWidth="2.5" strokeLinecap="round"><path d="M20 6L9 17l-5-5" /></svg>
                            <p style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: 'var(--text-sm)', color: '#2E7D32' }}>Profil enregistré.</p>
                          </div>
                        )}
                        <button
                          onClick={handleProfileSave}
                          disabled={profileSaving}
                          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg transition-all disabled:opacity-50"
                          style={{
                            background: '#00068D',
                            color: 'white',
                            fontFamily: 'Gilroy, sans-serif',
                            fontWeight: 800,
                            fontSize: 'var(--text-xs)',
                            letterSpacing: '0.06em',
                            minHeight: 44,
                          }}
                        >
                          {profileSaving ? 'Enregistrement…' : 'ENREGISTRER LE PROFIL'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {settingsTab === 'sources' && (
                <div className="space-y-6">
                  {sourcesTabLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="w-5 h-5 border-2 border-[#D8D8D8] border-t-[#00068D] rounded-full animate-spin" />
                    </div>
                  ) : availableSources.length === 0 && availableConnectors.length === 0 ? (
                    <p style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: 'var(--text-sm)', color: '#8A8A8A', fontStyle: 'italic' }}>
                      Aucune source externe configurée par votre institution pour le moment.
                    </p>
                  ) : (
                    <>
                      {/* Academic sources */}
                      {availableSources.length > 0 && (
                        <div>
                          <p style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-xs)', letterSpacing: '0.06em', color: '#8A8A8A', textTransform: 'uppercase' }} className="mb-1">
                            Sources académiques
                          </p>
                          <p style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: 'var(--text-xs)', color: '#8A8A8A', marginBottom: '0.75rem' }}>
                            Sélectionnez les bases que vous souhaitez interroger lors de vos recherches.
                          </p>
                          <div className="grid grid-cols-2 gap-2">
                            {availableSources.map(({ slug, label, description, icon }) => {
                              const checked = sources.includes(slug)
                              return (
                                <button
                                  key={slug}
                                  type="button"
                                  onClick={() => setSources((prev) => prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug])}
                                  className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg border text-left transition-all"
                                  style={{
                                    minHeight: 44,
                                    borderColor: checked ? '#2B2EB8' : '#D8D8D8',
                                    background: checked ? '#E8E9F8' : '#FAFAFA',
                                  }}
                                >
                                  <div
                                    className="mt-0.5 w-3.5 h-3.5 rounded flex-shrink-0 border flex items-center justify-center"
                                    style={{ borderColor: checked ? '#2B2EB8' : '#D8D8D8', background: checked ? '#2B2EB8' : 'white' }}
                                  >
                                    {checked && (
                                      <svg width="8" height="8" viewBox="0 0 10 10" fill="none">
                                        <path d="M1.5 5L4 7.5L8.5 2.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                      </svg>
                                    )}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1.5">
                                      <span style={{ fontSize: '0.85rem' }}>{icon}</span>
                                      <span style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-sm)', color: checked ? '#00068D' : '#0D0D0D' }}>
                                        {label}
                                      </span>
                                    </div>
                                    <div style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: 'var(--text-2xs)', color: '#8A8A8A', marginTop: '1px' }}>
                                      {description}
                                    </div>
                                  </div>
                                </button>
                              )
                            })}
                          </div>
                          <div className="mt-3 flex items-center gap-3">
                            <button
                              onClick={handleSourcesSave}
                              disabled={sourcesSaving}
                              className="px-4 py-2 rounded-lg disabled:opacity-50 hover:opacity-90 transition-all"
                              style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-xs)', letterSpacing: '0.06em', background: '#00068D', color: '#fff', minHeight: 44 }}
                            >
                              {sourcesSaving ? 'Enregistrement…' : 'ENREGISTRER'}
                            </button>
                            {sourcesSaved && (
                              <span style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: 'var(--text-sm)', color: '#2E7D32' }}>✓ Enregistré</span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Connectors */}
                      {availableConnectors.length > 0 && (
                        <div>
                          <p style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-xs)', letterSpacing: '0.06em', color: '#8A8A8A', textTransform: 'uppercase' }} className="mb-3">
                            Connecteurs
                          </p>
                          <div className="space-y-3">
                            {availableConnectors.map((connector) => (
                              <div key={connector.slug} className="p-4 rounded-xl border border-[#D8D8D8] bg-white space-y-3">
                                <div className="flex items-center gap-3">
                                  <span style={{ fontSize: '1.2rem' }}>{connector.icon}</span>
                                  <div className="flex-1">
                                    <p style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-sm)', color: '#0D0D0D' }}>{connector.label}</p>
                                    <p style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: 'var(--text-xs)', color: '#8A8A8A' }}>{connector.description}</p>
                                  </div>
                                  {connector.connected && (
                                    <span style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '0.7rem', background: '#E8F5E9', color: '#2E7D32', borderRadius: 4, padding: '2px 7px' }}>
                                      Connecté
                                    </span>
                                  )}
                                </div>

                                {/* GDrive */}
                                {connector.slug === 'gdrive' && (
                                  connector.connected ? (
                                    <a
                                      href="/api/connectors/gdrive/disconnect"
                                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[#D8D8D8] text-[#8A8A8A] hover:border-red-300 hover:text-red-600 hover:bg-red-50 transition-all"
                                      style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-xs)', letterSpacing: '0.04em', minHeight: 44 }}
                                    >
                                      Déconnecter Google Drive
                                    </a>
                                  ) : (
                                    <a
                                      href="/api/connectors/gdrive/init"
                                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg transition-all"
                                      style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-xs)', letterSpacing: '0.04em', background: '#00068D', color: '#fff', minHeight: 44 }}
                                    >
                                      Connecter Google Drive
                                    </a>
                                  )
                                )}

                                {/* Notion */}
                                {connector.slug === 'notion' && (
                                  connector.connected ? (
                                    <button
                                      onClick={handleNotionDisconnect}
                                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[#D8D8D8] text-[#8A8A8A] hover:border-red-300 hover:text-red-600 hover:bg-red-50 transition-all"
                                      style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-xs)', letterSpacing: '0.04em', minHeight: 44 }}
                                    >
                                      Déconnecter Notion
                                    </button>
                                  ) : (
                                    <div className="space-y-2">
                                      <input
                                        type="password"
                                        value={notionToken}
                                        onChange={(e) => setNotionToken(e.target.value)}
                                        placeholder="Token d'intégration Notion (secret_…)"
                                        className="w-full px-3 py-2 rounded-lg border border-[#D8D8D8] bg-[#FAFAFA] focus:outline-none focus:ring-2 focus:ring-[#2B2EB8]"
                                        style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: 'var(--text-sm)', minHeight: 44 }}
                                      />
                                      {notionError && (
                                        <p style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: 'var(--text-xs)', color: '#dc2626' }}>{notionError}</p>
                                      )}
                                      <button
                                        onClick={handleNotionConnect}
                                        disabled={notionConnecting || !notionToken.trim()}
                                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg disabled:opacity-50 transition-all"
                                        style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-xs)', letterSpacing: '0.04em', background: '#00068D', color: '#fff', minHeight: 44 }}
                                      >
                                        {notionConnecting ? 'Connexion…' : 'Connecter Notion'}
                                      </button>
                                    </div>
                                  )
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {settingsTab === 'data' && (
                <div className="space-y-6">
                  {/* Profile section */}
                  <div>
                    <p style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-xs)', letterSpacing: '0.06em', color: '#8A8A8A', textTransform: 'uppercase' }} className="mb-3">
                      Profil
                    </p>
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-[#FAFAFA] border border-[#D8D8D8]">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white flex-shrink-0"
                        style={{ background: '#00068D', fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-xs)' }}
                      >
                        {userInitials}
                      </div>
                      <div>
                        <p style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontWeight: 600, fontSize: 'var(--text-md)', color: '#0D0D0D' }}>
                          {userName}
                        </p>
                        <p style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 300, fontSize: 'var(--text-xs)', letterSpacing: '0.06em', textTransform: 'uppercase', color: '#8A8A8A' }}>
                          {roleLabel}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Export section */}
                  <div>
                    <p style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-xs)', letterSpacing: '0.06em', color: '#8A8A8A', textTransform: 'uppercase' }} className="mb-3">
                      Export portabilité
                    </p>
                    <button
                      onClick={() => { window.location.href = '/api/user/export' }}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg border border-[#D8D8D8] bg-white hover:bg-[#F0F1FB] hover:border-[#2B2EB8] transition-all text-left"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#5A5A5A" strokeWidth="2" strokeLinecap="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                      <span style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: 'var(--text-sm)', color: '#3A3A3A' }}>
                        Exporter toutes mes données <span style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 300, fontSize: 'var(--text-xs)', color: '#8A8A8A' }}>(conversations, méta-prompts, espaces — .zip)</span>
                      </span>
                    </button>
                  </div>

                  {/* Data management section */}
                  <div>
                    <p style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-xs)', letterSpacing: '0.06em', color: '#8A8A8A', textTransform: 'uppercase' }} className="mb-3">
                      Gestion des données
                    </p>
                    <div className="space-y-2">
                      {/* Retention note */}
                      <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-lg bg-[#FFF8E1] border border-[#FFD54F]">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F57F17" strokeWidth="2" strokeLinecap="round" className="flex-shrink-0 mt-0.5">
                          <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" />
                        </svg>
                        <p style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: 'var(--text-sm)', color: '#5D4037', lineHeight: '1.5' }}>
                          Vos conversations sont conservées <strong>1 an</strong> puis supprimées automatiquement.
                        </p>
                      </div>

                      {/* Delete conversations */}
                      {done ? (
                        <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-lg bg-[#E8F5E9] border border-[#4CAF50]">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#2E7D32" strokeWidth="2.5" strokeLinecap="round"><path d="M20 6L9 17l-5-5" /></svg>
                          <p style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: 'var(--text-sm)', color: '#2E7D32' }}>{done}</p>
                        </div>
                      ) : !deleteConvsConfirm ? (
                        <button
                          onClick={() => setDeleteConvsConfirm(true)}
                          className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg border border-[#D8D8D8] bg-white hover:bg-[#F2F2F2] transition-all text-left"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8A8A8A" strokeWidth="2" strokeLinecap="round">
                            <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6M9 6V4h6v2" />
                          </svg>
                          <span style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: 'var(--text-sm)', color: '#3A3A3A' }}>
                            Supprimer toutes mes conversations
                          </span>
                        </button>
                      ) : (
                        <div className="px-3.5 py-3 rounded-lg border border-orange-300 bg-orange-50">
                          <p style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: 'var(--text-sm)', color: '#92400e' }} className="mb-2">
                            Supprimer <strong>toutes</strong> vos conversations ? Cette action est irréversible.
                          </p>
                          <div className="flex gap-2">
                            <button
                              onClick={handleDeleteConversations}
                              disabled={working}
                              className="px-3 py-1.5 rounded-lg bg-orange-600 text-white disabled:opacity-50"
                              style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-xs)' }}
                            >
                              {working ? 'Suppression…' : 'CONFIRMER'}
                            </button>
                            <button
                              onClick={() => setDeleteConvsConfirm(false)}
                              className="px-3 py-1.5 rounded-lg border border-[#D8D8D8] text-[#8A8A8A] hover:bg-white"
                              style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-xs)' }}
                            >
                              ANNULER
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Delete account */}
                      {!deleteAccountConfirm ? (
                        <button
                          onClick={() => setDeleteAccountConfirm(true)}
                          className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg border border-[#D8D8D8] bg-white hover:bg-red-50 hover:border-red-300 transition-all text-left group"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8A8A8A" strokeWidth="2" strokeLinecap="round" className="group-hover:stroke-red-500">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                          </svg>
                          <span style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: 'var(--text-sm)', color: '#3A3A3A' }} className="group-hover:text-red-600">
                            Supprimer mon compte
                          </span>
                        </button>
                      ) : (
                        <div className="px-3.5 py-3 rounded-lg border border-red-300 bg-red-50">
                          <p style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: '0.82rem', color: '#dc2626' }} className="mb-2">
                            Votre compte et toutes vos données seront supprimés. Cette action est <strong>irréversible</strong>.
                          </p>
                          <div className="flex gap-2">
                            <button
                              onClick={handleDeleteAccount}
                              disabled={working}
                              className="px-3 py-1.5 rounded-lg bg-red-600 text-white disabled:opacity-50"
                              style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-xs)' }}
                            >
                              {working ? 'Suppression…' : 'SUPPRIMER MON COMPTE'}
                            </button>
                            <button
                              onClick={() => setDeleteAccountConfirm(false)}
                              className="px-3 py-1.5 rounded-lg border border-[#D8D8D8] text-[#8A8A8A] hover:bg-white"
                              style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-xs)' }}
                            >
                              ANNULER
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-[#D8D8D8] flex-shrink-0">
              <a
                href="/legal"
                target="_blank"
                style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: 'var(--text-xs)', color: '#8A8A8A' }}
                className="hover:text-[#00068D] underline"
              >
                Mentions légales & protection des données →
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
