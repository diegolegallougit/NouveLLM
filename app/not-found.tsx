export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-[#F2F2F2]">
      <div className="w-12 h-12 rounded-2xl bg-[#F0F1FB] border border-[#D8D8D8] flex items-center justify-center">
        <span style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '1.25rem', color: '#00068D' }}>404</span>
      </div>
      <h1 style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-lg)', color: '#0D0D0D' }}>
        Page introuvable
      </h1>
      <p style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: 'var(--text-sm)', color: '#8A8A8A' }}>
        Cette page n'existe pas ou a été déplacée.
      </p>
      <a
        href="/"
        className="px-6 py-3 rounded-xl bg-[#00068D] text-white hover:bg-[#2B2EB8] transition-colors"
        style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-sm)' }}
      >
        ← Retour à l'accueil
      </a>
    </div>
  )
}
