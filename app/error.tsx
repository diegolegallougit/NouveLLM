'use client'

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-[#F2F2F2]">
      <div className="w-12 h-12 rounded-2xl bg-[#00068D] flex items-center justify-center">
        <span className="text-white text-xl" style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800 }}>!</span>
      </div>
      <h1 style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-lg)', color: '#00068D' }}>
        Une erreur est survenue
      </h1>
      <p style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: 'var(--text-sm)', color: '#8A8A8A' }}>
        {error.message || 'Erreur inattendue — nos équipes ont été notifiées.'}
      </p>
      <button
        onClick={reset}
        className="px-6 py-3 rounded-xl bg-[#00068D] text-white hover:bg-[#2B2EB8] transition-colors"
        style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-sm)' }}
      >
        Réessayer
      </button>
      <a
        href="/"
        className="hover:text-[#00068D] transition-colors"
        style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 300, fontSize: 'var(--text-xs)', color: '#8A8A8A' }}
      >
        ← Retour à l'accueil
      </a>
    </div>
  )
}
