export default function SessionsLoading() {
  return (
    <div className="min-h-screen bg-[#F2F2F2] p-6 sm:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex flex-col gap-2">
          <div className="h-8 w-56 rounded-xl bg-[#D8D8D8] animate-pulse" />
          <div className="h-4 w-40 rounded bg-[#D8D8D8] animate-pulse" />
        </div>
        <div className="h-9 w-36 rounded-xl bg-[#D8D8D8] animate-pulse" />
      </div>

      {/* Session cards */}
      <div className="flex flex-col gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-white rounded-xl border border-[#D8D8D8] px-5 py-4 flex items-start gap-4">
            <div className="flex-1 flex flex-col gap-2">
              <div className="flex items-center gap-3">
                <div className="h-5 w-40 rounded bg-[#D8D8D8] animate-pulse" />
                <div className="h-5 w-16 rounded-full bg-[#F2F2F2] animate-pulse" />
              </div>
              <div className="h-3 w-64 rounded bg-[#F2F2F2] animate-pulse" />
              <div className="flex gap-2 mt-1">
                <div className="h-4 w-24 rounded bg-[#F2F2F2] animate-pulse" />
                <div className="h-4 w-20 rounded bg-[#F2F2F2] animate-pulse" />
              </div>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <div className="h-8 w-20 rounded-lg bg-[#F2F2F2] animate-pulse" />
              <div className="h-8 w-8 rounded-lg bg-[#F2F2F2] animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
