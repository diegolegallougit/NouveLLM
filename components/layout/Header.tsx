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

  const roleLabel = userRole === 'ADMIN' ? 'Administrateur' : userRole === 'STUDENT' ? 'Étudiant' : 'Enseignant-Chercheur'

  return (
    <header className="flex items-center justify-between px-6 bg-white border-b border-[#D8D8D8] z-10 flex-shrink-0" style={{ height: '56px' }}>
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
        <button
          className="w-9 h-9 flex items-center justify-center rounded-lg text-[#8A8A8A] hover:bg-[#E8E9F8] hover:text-[#00068D] transition-all"
          aria-label="Aide"
          title="Aide"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
            <path d="M12 17h.01" />
          </svg>
        </button>
        <button
          className="w-9 h-9 flex items-center justify-center rounded-lg text-[#8A8A8A] hover:bg-[#E8E9F8] hover:text-[#00068D] transition-all"
          aria-label="Notifications"
          title="Notifications"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
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
            <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-[#D8D8D8] py-1 z-50">
              <div className="px-3 py-2 border-b border-[#D8D8D8]">
                <p className="text-xs font-medium text-[#0D0D0D]" style={{ fontFamily: 'Source Serif Pro, Georgia, serif' }}>{userName}</p>
                <p className="text-xs text-[#8A8A8A]" style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 300 }}>{roleLabel}</p>
              </div>
              <button
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                style={{ fontFamily: 'Source Serif Pro, Georgia, serif' }}
              >
                Se déconnecter
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
