export default function Loading() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[#F2F2F2]">
      <span className="nl-spinner" />
      <p style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 300, fontSize: 'var(--text-xs)', color: '#8A8A8A' }}>
        Chargement…
      </p>
    </div>
  )
}
