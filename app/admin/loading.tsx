export default function AdminLoading() {
  return (
    <div className="min-h-screen bg-[#F2F2F2] p-6 sm:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex flex-col gap-2">
          <div className="h-8 w-48 rounded-xl bg-[#D8D8D8] animate-pulse" />
          <div className="h-4 w-32 rounded bg-[#D8D8D8] animate-pulse" />
        </div>
        <div className="h-9 w-28 rounded-xl bg-[#D8D8D8] animate-pulse" />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-white rounded-xl border border-[#D8D8D8] px-5 py-4">
            <div className="h-3 w-20 rounded bg-[#F2F2F2] animate-pulse mb-3" />
            <div className="h-8 w-12 rounded bg-[#D8D8D8] animate-pulse" />
          </div>
        ))}
      </div>

      {/* Table skeleton */}
      <div className="bg-white rounded-xl border border-[#D8D8D8] overflow-hidden">
        <div className="flex items-center gap-4 px-5 py-3 border-b border-[#F2F2F2]">
          {[3, 2, 2, 1].map((w, i) => (
            <div key={i} className={`h-3 rounded bg-[#F2F2F2] animate-pulse flex-shrink-0`} style={{ width: `${w * 4}rem` }} />
          ))}
        </div>
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-[#F2F2F2] last:border-b-0">
            <div className="h-4 w-48 rounded bg-[#F2F2F2] animate-pulse" />
            <div className="h-4 w-32 rounded bg-[#F2F2F2] animate-pulse" />
            <div className="h-4 w-32 rounded bg-[#F2F2F2] animate-pulse" />
            <div className="h-5 w-16 rounded-full bg-[#F2F2F2] animate-pulse ml-auto" />
          </div>
        ))}
      </div>
    </div>
  )
}
