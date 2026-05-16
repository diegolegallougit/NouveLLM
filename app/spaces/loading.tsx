export default function SpacesLoading() {
  return (
    <div className="flex flex-col bg-[#FAFAFA]" style={{ height: '100vh' }}>
      {/* Header skeleton */}
      <div className="flex items-center justify-between px-3 sm:px-6 bg-white border-b border-[#D8D8D8] flex-shrink-0" style={{ height: 'var(--header-h)' }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#D8D8D8] animate-pulse" />
          <div className="h-5 w-28 rounded bg-[#D8D8D8] animate-pulse" />
        </div>
        <div className="h-4 w-36 rounded bg-[#F2F2F2] animate-pulse" />
      </div>

      <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
        {/* Left panel skeleton */}
        <div className="hidden md:flex flex-col border-r border-[#D8D8D8] bg-white md:flex-shrink-0 w-[280px] p-3 gap-2">
          <div className="h-3 w-20 rounded bg-[#F2F2F2] animate-pulse mb-2" />
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center gap-2 px-2 py-2">
              <div className="w-5 h-5 rounded bg-[#F2F2F2] animate-pulse flex-shrink-0" />
              <div className="h-4 rounded bg-[#F2F2F2] animate-pulse flex-1" style={{ width: `${60 + i * 10}%` }} />
            </div>
          ))}
          <div className="border-t border-[#F2F2F2] mx-1 mt-2 mb-2" />
          <div className="h-3 w-24 rounded bg-[#F2F2F2] animate-pulse" />
        </div>

        {/* Right panel skeleton */}
        <div className="flex flex-col flex-1 p-6 gap-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded bg-[#D8D8D8] animate-pulse" />
            <div className="flex flex-col gap-2">
              <div className="h-6 w-48 rounded bg-[#D8D8D8] animate-pulse" />
              <div className="h-3 w-32 rounded bg-[#F2F2F2] animate-pulse" />
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 rounded-xl bg-[#F2F2F2] animate-pulse" />
            ))}
          </div>
          <div className="bg-white rounded-xl border border-[#D8D8D8] overflow-hidden">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className={`flex items-center gap-3 px-4 py-3 ${i > 1 ? 'border-t border-[#F2F2F2]' : ''}`}>
                <div className="w-5 h-5 rounded bg-[#F2F2F2] animate-pulse" />
                <div className="flex-1 h-4 rounded bg-[#F2F2F2] animate-pulse" style={{ width: `${40 + (i % 3) * 20}%` }} />
                <div className="h-3 w-16 rounded bg-[#F2F2F2] animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
