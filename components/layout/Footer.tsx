export default function Footer({ tokenCount = 0, tokenLimit = 2000000 }: { tokenCount?: number; tokenLimit?: number }) {
  const pct = Math.min(100, Math.round((tokenCount / tokenLimit) * 100))
  const tokensDisplay = tokenCount > 999 ? `${(tokenCount / 1000).toFixed(0)} k` : tokenCount

  return (
    <footer
      className="flex items-center justify-between px-6 bg-white border-t border-[#D8D8D8] flex-shrink-0"
      style={{ height: '32px' }}
    >
      <div className="flex items-center gap-4">
        <span style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 300, fontSize: '0.7rem', letterSpacing: '0.06em', color: '#8A8A8A', textTransform: 'uppercase' }}>
          Université Sorbonne Nouvelle
        </span>
        <span className="w-px h-3 bg-[#D8D8D8]" />
        <span style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 300, fontSize: '0.7rem', letterSpacing: '0.06em', color: '#8A8A8A', textTransform: 'uppercase' }}>
          INTEGRIA · France 2030
        </span>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 300, fontSize: '0.65rem', letterSpacing: '0.04em', color: '#8A8A8A' }}>
            Ce mois : {tokensDisplay} / {(tokenLimit / 1000).toFixed(0)}k tokens
          </span>
          <div className="w-16 h-1.5 rounded-full bg-[#D8D8D8] overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${pct}%`, background: pct > 80 ? '#dc2626' : pct > 60 ? '#f97316' : '#00068D' }}
            />
          </div>
        </div>
      </div>
    </footer>
  )
}
