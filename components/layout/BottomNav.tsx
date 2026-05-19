'use client'

import { usePathname } from 'next/navigation'

interface BottomNavProps {
  userRole?: string
  drawerOpen: boolean
  onToggleDrawer: () => void
  onOpenSettings: () => void
}

export default function BottomNav({ userRole, drawerOpen, onToggleDrawer, onOpenSettings }: BottomNavProps) {
  const isStudent = userRole === 'STUDENT'
  const pathname = usePathname()

  const chatActive    = isStudent || drawerOpen
  const dossierActive = pathname === '/spaces' || (pathname?.startsWith('/spaces/') ?? false)
  const seanceActive  = pathname === '/sessions' || (pathname?.startsWith('/sessions/') ?? false)

  const labelStyle = (active: boolean): React.CSSProperties => ({
    fontFamily: 'Gilroy, sans-serif',
    fontWeight: 300,
    fontSize: 11,
    color: active ? '#00068D' : '#8A8A8A',
    lineHeight: 1,
  })

  const iconWrap = (active: boolean) =>
    `flex items-center justify-center w-9 h-9 rounded-xl transition-all ${active ? 'bg-[#E8E9F8]' : ''}`

  const iconColor = (active: boolean) => ({ color: active ? '#00068D' : '#8A8A8A' })

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-[#D8D8D8] flex"
      style={{ height: 56 }}
    >
      {/* Chat / Historique */}
      <button
        onClick={isStudent ? undefined : onToggleDrawer}
        className="flex-1 flex flex-col items-center justify-center gap-1"
        style={{ minHeight: 56 }}
        aria-label="Historique des conversations"
      >
        <div className={iconWrap(chatActive)} style={iconColor(chatActive)}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </div>
        <span style={labelStyle(chatActive)}>Chat</span>
      </button>

      {/* Dossiers — masqué pour STUDENT */}
      {!isStudent && (
        <a
          href="/spaces"
          className="flex-1 flex flex-col items-center justify-center gap-1 no-underline"
          style={{ minHeight: 56 }}
          aria-label="Mes dossiers"
        >
          <div className={iconWrap(dossierActive)} style={iconColor(dossierActive)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <span style={labelStyle(dossierActive)}>Dossiers</span>
        </a>
      )}

      {/* Séances — masqué pour STUDENT */}
      {!isStudent && (
        <a
          href="/sessions"
          className="flex-1 flex flex-col items-center justify-center gap-1 no-underline"
          style={{ minHeight: 56 }}
          aria-label="Séances"
        >
          <div className={iconWrap(seanceActive)} style={iconColor(seanceActive)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
            </svg>
          </div>
          <span style={labelStyle(seanceActive)}>Séances</span>
        </a>
      )}

      {/* Réglages */}
      <button
        onClick={onOpenSettings}
        className="flex-1 flex flex-col items-center justify-center gap-1"
        style={{ minHeight: 56 }}
        aria-label="Paramètres"
      >
        <div className={iconWrap(false)} style={iconColor(false)}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </div>
        <span style={labelStyle(false)}>Réglages</span>
      </button>
    </nav>
  )
}
