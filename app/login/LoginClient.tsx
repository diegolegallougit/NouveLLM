'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'

interface LoginClientProps {
  proConnectEnabled: boolean
}

export default function LoginClient({ proConnectEnabled }: LoginClientProps) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [pcLoading, setPcLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const result = await signIn('credentials', { email, password, redirect: false })
    if (result?.error) {
      setError('Identifiants incorrects. Vérifiez votre email et mot de passe.')
      setLoading(false)
    } else {
      router.push('/')
    }
  }

  async function handleProConnect() {
    if (!proConnectEnabled) return
    setPcLoading(true)
    await signIn('proconnect', { callbackUrl: '/' })
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#F2F2F2' }}>
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-4 bg-white border-b border-[#D8D8D8]">
        <div className="flex items-center gap-3">
          <span style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '1.25rem', letterSpacing: '-0.02em', color: '#00068D' }}>
            NouveLLM
          </span>
          <span className="w-px h-4 bg-[#D8D8D8]" />
          <span style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 300, fontSize: '0.75rem', letterSpacing: '0.06em', color: '#8A8A8A', textTransform: 'uppercase' }}>
            Université Sorbonne Nouvelle
          </span>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {/* Logo card */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#00068D] mb-5 shadow-lg">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.4" strokeLinecap="round">
                <path d="M12 3v18M3 12h18" />
                <path d="M5.6 5.6l12.8 12.8M5.6 18.4l12.8-12.8" />
              </svg>
            </div>
            <h1 style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '1.75rem', letterSpacing: '-0.02em', color: '#0D0D0D' }}>
              Bienvenue sur NouveLLM
            </h1>
            <p className="mt-2 text-sm text-[#8A8A8A]">
              Service IA institutionnel · Sorbonne Nouvelle
            </p>
          </div>

          {/* Login form */}
          <div className="bg-white rounded-2xl shadow-sm border border-[#D8D8D8] p-8">
            {/* SSO button (disabled placeholder) */}
            <button
              disabled
              className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-lg border border-[#D8D8D8] text-[#8A8A8A] cursor-not-allowed mb-4"
              style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '0.875rem', letterSpacing: '0.04em' }}
              title="Connexion CAS/LDAP USN — disponible après configuration DSI"
            >
              <span className="w-5 h-5 text-[#D8D8D8]">
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/></svg>
              </span>
              Se connecter avec mon compte USN
              <span className="ml-auto text-xs font-normal opacity-60">Juin 2026</span>
            </button>

            {/* ProConnect button */}
            <div className="relative mb-4">
              <button
                onClick={handleProConnect}
                disabled={!proConnectEnabled || pcLoading}
                className={`w-full flex items-center justify-center gap-3 py-3 px-4 rounded-lg border text-sm font-medium transition-all ${
                  proConnectEnabled
                    ? 'border-[#003189] text-[#003189] hover:bg-[#f0f4ff] cursor-pointer'
                    : 'border-[#D8D8D8] text-[#B0B0B0] cursor-not-allowed'
                }`}
                style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, letterSpacing: '0.04em', fontSize: '0.875rem' }}
                title={proConnectEnabled ? 'Se connecter avec ProConnect' : 'Disponible après configuration par la DSI USN'}
              >
                {pcLoading ? (
                  <span className="nl-spinner" />
                ) : (
                  <span className="text-base">🏛️</span>
                )}
                Se connecter avec ProConnect
                {!proConnectEnabled && (
                  <span className="ml-auto text-[10px] font-normal opacity-60" style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 300 }}>
                    Non configuré
                  </span>
                )}
              </button>
              {!proConnectEnabled && (
                <p className="mt-1 text-center text-[10px] text-[#B0B0B0]" style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontStyle: 'italic' }}>
                  Disponible après configuration par la DSI USN
                </p>
              )}
            </div>

            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#D8D8D8]" />
              </div>
              <div className="relative flex justify-center text-xs text-[#8A8A8A] uppercase tracking-wider">
                <span className="bg-white px-3" style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 300 }}>
                  Accès pilote
                </span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="email"
                  className="block text-xs font-semibold uppercase tracking-wider text-[#8A8A8A] mb-1.5"
                  style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 300 }}
                >
                  Adresse email
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-[#D8D8D8] bg-white text-[#0D0D0D] text-sm focus:outline-none focus:ring-2 focus:ring-[#2B2EB8] focus:border-transparent transition-all"
                  style={{ fontFamily: 'Source Serif Pro, Georgia, serif' }}
                  placeholder="prenom.nom@sorbonne-nouvelle.fr"
                  autoComplete="email"
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-xs font-semibold uppercase tracking-wider text-[#8A8A8A] mb-1.5"
                  style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 300 }}
                >
                  Mot de passe
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-[#D8D8D8] bg-white text-[#0D0D0D] text-sm focus:outline-none focus:ring-2 focus:ring-[#2B2EB8] focus:border-transparent transition-all"
                  style={{ fontFamily: 'Source Serif Pro, Georgia, serif' }}
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                  <span>⚠</span>
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-lg text-white transition-all disabled:opacity-70 flex items-center justify-center gap-2"
                style={{
                  background: '#00068D',
                  fontFamily: 'Gilroy, sans-serif',
                  fontWeight: 800,
                  fontSize: '0.875rem',
                  letterSpacing: '0.04em',
                }}
              >
                {loading ? (
                  <>
                    <span className="nl-spinner" />
                    Connexion en cours…
                  </>
                ) : (
                  <>
                    Connexion
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 px-8 bg-white border-t border-[#D8D8D8] flex items-center justify-center gap-6">
        <span className="text-xs text-[#8A8A8A]" style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 300 }}>
          Université Sorbonne Nouvelle
        </span>
        <span className="w-px h-3 bg-[#D8D8D8]" />
        <span className="text-xs text-[#8A8A8A]" style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 300 }}>
          INTEGRIA · ANR France 2030
        </span>
        <span className="w-px h-3 bg-[#D8D8D8]" />
        <span className="text-xs text-[#8A8A8A]" style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 300 }}>
          Données hébergées en France
        </span>
      </footer>
    </div>
  )
}
