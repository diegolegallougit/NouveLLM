'use client'

interface PanelToggleProps {
  view: 'folders' | 'documents'
  onToggle: (view: 'folders' | 'documents') => void
}

export default function PanelToggle({ view, onToggle }: PanelToggleProps) {
  return (
    <div className="flex md:hidden border-b border-[#D8D8D8] bg-white flex-shrink-0">
      {(['folders', 'documents'] as const).map(v => (
        <button
          key={v}
          onClick={() => onToggle(v)}
          className={`flex-1 py-2.5 text-center border-b-2 transition-all ${view === v ? 'border-[#00068D] text-[#00068D]' : 'border-transparent text-[#8A8A8A]'}`}
          style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-xs)', letterSpacing: '0.04em' }}
        >
          {v === 'folders' ? 'Espaces' : 'Fichiers'}
        </button>
      ))}
    </div>
  )
}
