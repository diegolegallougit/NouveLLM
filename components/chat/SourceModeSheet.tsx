'use client'

interface SourceModeSheetProps {
  isOpen: boolean
  sourceMode: 'docs' | 'usn' | 'academic' | 'web' | 'all'
  onSourceModeChange: (mode: 'docs' | 'usn' | 'academic' | 'web' | 'all') => void
  onClose: () => void
  onFileClick: () => void
}

const SOURCE_OPTIONS = [
  {
    mode: 'docs' as const,
    icon: '📂',
    label: 'Mes docs',
    desc: 'Vos dossiers et documents personnels',
    activeBg: '#E8E9F8',
    activeColor: '#00068D',
  },
  {
    mode: 'usn' as const,
    icon: '🏛️',
    label: 'USN',
    desc: 'Bases institutionnelles Sorbonne Nouvelle',
    activeBg: '#FFF8E1',
    activeColor: '#E65100',
  },
  {
    mode: 'academic' as const,
    icon: '🔬',
    label: 'Académique',
    desc: 'HAL, OpenAlex, sources vérifiées',
    activeBg: '#E8F5E9',
    activeColor: '#2E7D32',
  },
  {
    mode: 'web' as const,
    icon: '🌐',
    label: 'Web',
    desc: 'Recherche web en temps réel',
    activeBg: '#E3F2FD',
    activeColor: '#1565C0',
  },
  {
    mode: 'all' as const,
    icon: '⚡',
    label: 'Tout',
    desc: 'Toutes les sources combinées',
    activeBg: '#F3E5F5',
    activeColor: '#6A1B9A',
  },
]

export default function SourceModeSheet({ isOpen, sourceMode, onSourceModeChange, onClose, onFileClick }: SourceModeSheetProps) {
  return (
    <>
      {/* Overlay */}
      <div
        className="md:hidden fixed inset-0 z-[59] bg-black/40 transition-opacity duration-200"
        style={{ opacity: isOpen ? 1 : 0, pointerEvents: isOpen ? 'auto' : 'none' }}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        className="md:hidden fixed bottom-0 left-0 right-0 z-[60] bg-white"
        style={{
          borderRadius: '20px 20px 0 0',
          boxShadow: '0 -4px 24px rgba(0,0,0,0.12)',
          transform: isOpen ? 'translateY(0)' : 'translateY(100%)',
          transition: isOpen
            ? 'transform 250ms cubic-bezier(0.32, 0.72, 0, 1)'
            : 'transform 200ms ease-in',
          paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
        }}
        role="dialog"
        aria-modal="true"
        aria-label="Sources et options"
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-5">
          <div className="w-10 rounded-full bg-gray-300" style={{ height: 4 }} />
        </div>

        {/* Joindre un fichier */}
        <button
          type="button"
          onClick={onFileClick}
          className="w-full flex items-center gap-3 px-5 py-4 hover:bg-gray-50 active:bg-gray-100 transition-colors text-left"
        >
          <div className="w-9 h-9 rounded-full bg-[#FFF8E1] flex items-center justify-center flex-shrink-0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F57F17" strokeWidth="2" strokeLinecap="round">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
            </svg>
          </div>
          <span style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-sm)', color: '#0D0D0D' }}>
            Joindre un fichier
          </span>
        </button>

        <hr className="border-[#F0F0F0] mx-5" />

        {/* Mode de recherche */}
        <div className="px-5 pt-4 pb-2">
          <p style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-xs)', letterSpacing: '0.08em', color: '#8A8A8A', textTransform: 'uppercase' }}>
            Mode de recherche
          </p>
        </div>

        {SOURCE_OPTIONS.map(({ mode, icon, label, desc, activeBg, activeColor }) => {
          const active = sourceMode === mode
          const disabled = mode === 'web'
          return (
            <button
              key={mode}
              type="button"
              onClick={() => {
                if (!disabled) {
                  onSourceModeChange(mode)
                  setTimeout(onClose, 150)
                }
              }}
              className={`w-full flex items-center gap-3 px-5 py-3.5 transition-all text-left ${disabled ? 'opacity-40 cursor-not-allowed' : 'active:opacity-70'}`}
              style={{ background: active ? activeBg : 'transparent' }}
            >
              <span style={{ fontSize: '1.25rem', flexShrink: 0 }}>{icon}</span>
              <div className="flex-1 min-w-0">
                <p style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-sm)', color: active ? activeColor : '#0D0D0D' }}>
                  {label}
                </p>
                <p style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: 'var(--text-xs)', color: '#8A8A8A', lineHeight: 1.4 }}>
                  {disabled ? 'Disponible prochainement' : desc}
                </p>
              </div>
              {active && (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={activeColor} strokeWidth="2.5" strokeLinecap="round" className="flex-shrink-0">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              )}
            </button>
          )
        })}

        <div className="h-2" />
      </div>
    </>
  )
}
