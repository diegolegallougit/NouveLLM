interface Source {
  title: string
  domain: string
  url?: string
  icon: string
  tag?: string
}

interface SourcesBlockProps {
  sources: Source[]
}

export default function SourcesBlock({ sources }: SourcesBlockProps) {
  if (!sources || sources.length === 0) {
    return (
      <div className="mt-3 pt-3 border-t border-[#D8D8D8]">
        <p className="text-xs text-[#8A8A8A] italic" style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 300 }}>
          Réponse basée sur les connaissances générales — aucune source documentaire consultée
        </p>
      </div>
    )
  }

  return (
    <div className="mt-3 pt-3 border-t border-[#D8D8D8]">
      <p
        className="text-xs font-semibold uppercase tracking-wider text-[#8A8A8A] mb-2"
        style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, letterSpacing: '0.1em' }}
      >
        Sources consultées
      </p>
      <div className="space-y-1">
        {sources.map((source, i) => (
          <a
            key={i}
            href={source.url || '#'}
            target={source.url ? '_blank' : undefined}
            rel={source.url ? 'noopener noreferrer' : undefined}
            onClick={source.url ? undefined : (e) => e.preventDefault()}
            className="flex items-center gap-2 text-xs group cursor-pointer"
          >
            <span className="text-base flex-shrink-0">{source.icon}</span>
            <span className="flex-1 min-w-0 flex items-center gap-1.5">
              {source.tag && (
                <span
                  className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-[#E8E9F8] text-[#00068D] border border-[#2B2EB8] flex-shrink-0"
                  style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800 }}
                >
                  {source.tag}
                </span>
              )}
              <span className="font-medium text-[#3A3A3A] group-hover:text-[#00068D] truncate transition-colors" style={{ fontFamily: 'Source Serif Pro, Georgia, serif' }}>
                {source.title}
              </span>
            </span>
            <span className="text-[#8A8A8A] group-hover:text-[#2B2EB8] transition-colors flex-shrink-0 flex items-center gap-1">
              <span>→</span>
              <span className="text-[#2B2EB8] underline underline-offset-2">{source.domain}</span>
            </span>
          </a>
        ))}
      </div>
    </div>
  )
}
