'use client'

import { signOut } from 'next-auth/react'
import { useState } from 'react'

interface HeaderProps {
  userName?: string
  userRole?: string
  userInitials?: string
}

export default function Header({ userName = 'Utilisateur', userRole = 'EC', userInitials = 'U' }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [deleteConvsConfirm, setDeleteConvsConfirm] = useState(false)
  const [deleteAccountConfirm, setDeleteAccountConfirm] = useState(false)
  const [working, setWorking] = useState(false)
  const [done, setDone] = useState('')

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
        className="flex items-center justify-between px-6 bg-white border-b border-[#D8D8D8] z-10 flex-shrink-0"
        style={{ height: '56px' }}
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#00068D]">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
              <path d="M12 3v18M3 12h18" />
              <path d="M5.6 5.6l12.8 12.8M5.6 18.4l12.8-12.8" />
            </svg>
          </div>
          <span style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '1.1rem', letterSpacing: '-0.02em', color: '#00068D' }}>
            NouveLLM
          </span>
          <span className="w-px h-4 bg-[#D8D8D8]" />
          <span style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 300, fontSize: '0.7rem', letterSpacing: '0.08em', color: '#8A8A8A', textTransform: 'uppercase' }}>
            Université Sorbonne Nouvelle
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Sessions link for EC */}
          {(userRole === 'EC' || userRole === 'ADMIN') && (
            <a
              href="/sessions"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] text-[#5A5A5A] hover:bg-[#E8E9F8] hover:text-[#00068D] transition-all"
              style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, letterSpacing: '0.04em' }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
              SESSIONS
            </a>
          )}

          {/* Settings */}
          <button
            onClick={() => { setSettingsOpen(true); setMenuOpen(false) }}
            className="w-9 h-9 flex items-center justify-center rounded-lg text-[#8A8A8A] hover:bg-[#E8E9F8] hover:text-[#00068D] transition-all"
            aria-label="Paramètres"
            title="Paramètres"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>

          {/* User chip */}
          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-full bg-[#F2F2F2] border border-[#D8D8D8] hover:bg-[#E8E9F8] transition-all text-left"
            >
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-white flex-shrink-0"
                style={{ background: '#00068D', fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '0.65rem', letterSpacing: '0.04em' }}
              >
                {userInitials}
              </div>
              <div className="flex flex-col items-start leading-tight">
                <span style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontWeight: 600, fontSize: '0.8rem', color: '#0D0D0D' }}>
                  {userName}
                </span>
                <span style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 300, fontSize: '0.6rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#8A8A8A' }}>
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
                    <p className="text-xs font-medium text-[#0D0D0D]" style={{ fontFamily: 'Source Serif Pro, Georgia, serif' }}>{userName}</p>
                    <p className="text-xs text-[#8A8A8A]" style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 300 }}>{roleLabel}</p>
                  </div>
                  <button
                    onClick={() => { setMenuOpen(false); setSettingsOpen(true) }}
                    className="w-full text-left px-3 py-2 text-xs text-[#3A3A3A] hover:bg-[#F2F2F2] transition-colors flex items-center gap-2"
                    style={{ fontFamily: 'Source Serif Pro, Georgia, serif' }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
                    Paramètres & données
                  </button>
                  <button
                    onClick={() => signOut({ callbackUrl: '/login' })}
                    className="w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-red-50 transition-colors"
                    style={{ fontFamily: 'Source Serif Pro, Georgia, serif' }}
                  >
                    Se déconnecter
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Settings modal */}
      {settingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden" style={{ width: 480 }}>
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#D8D8D8]">
              <h2 style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '1rem', color: '#0D0D0D' }}>
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

            <div className="px-6 py-5 space-y-6">
              {/* Profile section */}
              <div>
                <p style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '0.7rem', letterSpacing: '0.06em', color: '#8A8A8A', textTransform: 'uppercase' }} className="mb-3">
                  Profil
                </p>
                <div className="flex items-center gap-3 p-3 rounded-xl bg-[#FAFAFA] border border-[#D8D8D8]">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white flex-shrink-0"
                    style={{ background: '#00068D', fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '0.75rem' }}
                  >
                    {userInitials}
                  </div>
                  <div>
                    <p style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontWeight: 600, fontSize: '0.9rem', color: '#0D0D0D' }}>
                      {userName}
                    </p>
                    <p style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 300, fontSize: '0.65rem', letterSpacing: '0.06em', textTransform: 'uppercase', color: '#8A8A8A' }}>
                      {roleLabel}
                    </p>
                  </div>
                </div>
              </div>

              {/* Data section */}
              <div>
                <p style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '0.7rem', letterSpacing: '0.06em', color: '#8A8A8A', textTransform: 'uppercase' }} className="mb-3">
                  Mes données
                </p>
                <div className="space-y-2">
                  {/* Retention note */}
                  <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-lg bg-[#FFF8E1] border border-[#FFD54F]">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F57F17" strokeWidth="2" strokeLinecap="round" className="flex-shrink-0 mt-0.5">
                      <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" />
                    </svg>
                    <p style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: '0.78rem', color: '#5D4037', lineHeight: '1.5' }}>
                      Vos conversations sont conservées <strong>1 an</strong> puis supprimées automatiquement.
                    </p>
                  </div>

                  {/* Delete conversations */}
                  {done ? (
                    <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-lg bg-[#E8F5E9] border border-[#4CAF50]">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#2E7D32" strokeWidth="2.5" strokeLinecap="round"><path d="M20 6L9 17l-5-5" /></svg>
                      <p style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: '0.8rem', color: '#2E7D32' }}>{done}</p>
                    </div>
                  ) : !deleteConvsConfirm ? (
                    <button
                      onClick={() => setDeleteConvsConfirm(true)}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg border border-[#D8D8D8] bg-white hover:bg-[#F2F2F2] transition-all text-left"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8A8A8A" strokeWidth="2" strokeLinecap="round">
                        <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6M9 6V4h6v2" />
                      </svg>
                      <span style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: '0.85rem', color: '#3A3A3A' }}>
                        Supprimer toutes mes conversations
                      </span>
                    </button>
                  ) : (
                    <div className="px-3.5 py-3 rounded-lg border border-orange-300 bg-orange-50">
                      <p style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: '0.82rem', color: '#92400e' }} className="mb-2">
                        Supprimer <strong>toutes</strong> vos conversations ? Cette action est irréversible.
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={handleDeleteConversations}
                          disabled={working}
                          className="px-3 py-1.5 rounded-lg bg-orange-600 text-white text-xs disabled:opacity-50"
                          style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800 }}
                        >
                          {working ? 'Suppression…' : 'CONFIRMER'}
                        </button>
                        <button
                          onClick={() => setDeleteConvsConfirm(false)}
                          className="px-3 py-1.5 rounded-lg border border-[#D8D8D8] text-xs text-[#8A8A8A] hover:bg-white"
                          style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800 }}
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
                      <span style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: '0.85rem', color: '#3A3A3A' }} className="group-hover:text-red-600">
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
                          className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs disabled:opacity-50"
                          style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800 }}
                        >
                          {working ? 'Suppression…' : 'SUPPRIMER MON COMPTE'}
                        </button>
                        <button
                          onClick={() => setDeleteAccountConfirm(false)}
                          className="px-3 py-1.5 rounded-lg border border-[#D8D8D8] text-xs text-[#8A8A8A] hover:bg-white"
                          style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800 }}
                        >
                          ANNULER
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 pb-5">
              <a
                href="/legal"
                target="_blank"
                style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: '0.75rem', color: '#8A8A8A' }}
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
