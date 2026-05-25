export default function NLLogo({ size = 32 }: { size?: number }) {
  return (
    <div style={{
      width: size,
      height: size,
      background: '#00068D',
      borderRadius: Math.round(size * 0.28),
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    }}>
      <svg
        width={size * 0.55}
        height={size * 0.55}
        viewBox="0 0 24 24"
        fill="none"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
      >
        <path d="M12 3v18M3 12h18" />
        <path d="M5.6 5.6l12.8 12.8M5.6 18.4l12.8-12.8" />
      </svg>
    </div>
  )
}
