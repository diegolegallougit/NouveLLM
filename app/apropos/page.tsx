'use client'

import { useState } from 'react'

const SUBJECTS = [
  'Réponse incorrecte ou trompeuse',
  'Contenu inapproprié',
  'Problème technique',
  'Données personnelles',
  'Autre',
]

export default function AproposPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !subject || !message.trim()) return
    setSending(true)
    setError('')
    try {
      const res = await fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim() || undefined, subject, message: message.trim() }),
      })
      if (!res.ok) {
        const d = await res.json()
        setError(d.error ?? 'Une erreur est survenue')
        return
      }
      setSent(true)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      {/* Header */}
      <div className="border-b border-[#D8D8D8] bg-white">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-3">
          <a href="/" className="flex items-center gap-2 group">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: '#00068D' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" /></svg>
            </div>
            <span style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '0.9rem', color: '#00068D', letterSpacing: '0.04em' }}>NouveLLM</span>
          </a>
          <span style={{ color: '#D8D8D8' }}>/</span>
          <span style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: '0.85rem', color: '#8A8A8A' }}>À propos</span>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-12 space-y-16">

        {/* About section */}
        <section className="space-y-6">
          <h1 style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '1.8rem', color: '#0D0D0D', letterSpacing: '-0.02em' }}>
            NouveLLM
          </h1>
          <p style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: '1rem', color: '#3A3A3A', lineHeight: 1.8 }}>
            NouveLLM est une plateforme d&apos;intelligence artificielle pédagogique développée par et pour l&apos;Université Sorbonne Nouvelle. Elle met à disposition des étudiants, enseignants-chercheurs et personnels un accès souverain à des modèles de langage configurés pour les besoins académiques.
          </p>
          <p style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: '1rem', color: '#3A3A3A', lineHeight: 1.8 }}>
            Les réponses générées par NouveLLM sont produites par des systèmes d&apos;IA et peuvent contenir des inexactitudes. Elles ne remplacent pas un avis professionnel, juridique ou médical. Vérifiez toujours les informations importantes auprès de sources fiables.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            {[
              { icon: '🏛️', title: 'Souveraineté', desc: 'Hébergé sur l\'infrastructure USN, vos données restent en Europe.' },
              { icon: '🎓', title: 'Pédagogie', desc: 'Conçu pour accompagner l\'enseignement et la recherche.' },
              { icon: '🔒', title: 'Confidentialité', desc: 'Vos échanges ne sont pas utilisés pour entraîner des modèles.' },
            ].map(item => (
              <div key={item.title} className="bg-white rounded-xl border border-[#D8D8D8] p-4 space-y-2">
                <span className="text-xl">{item.icon}</span>
                <p style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '0.85rem', color: '#0D0D0D' }}>{item.title}</p>
                <p style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: '0.82rem', color: '#5A5A5A', lineHeight: 1.5 }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Report form */}
        <section className="space-y-6">
          <div>
            <h2 style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '1.2rem', color: '#0D0D0D' }}>
              Signaler un problème
            </h2>
            <p style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: '0.88rem', color: '#8A8A8A', marginTop: '0.25rem', lineHeight: 1.6 }}>
              Une réponse incorrecte, un contenu inapproprié, un problème technique ? Signalez-le ci-dessous.
            </p>
          </div>

          {sent ? (
            <div className="bg-[#E8F5E9] border border-[#A5D6A7] rounded-xl p-6 flex items-start gap-4">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2E7D32" strokeWidth="2.5" strokeLinecap="round" className="flex-shrink-0 mt-0.5"><path d="M20 6L9 17l-5-5" /></svg>
              <div>
                <p style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '0.9rem', color: '#2E7D32' }}>Signalement envoyé</p>
                <p style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: '0.85rem', color: '#5A5A5A', marginTop: '0.25rem' }}>
                  Merci pour votre retour. Notre équipe en prendra connaissance.
                </p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-[#D8D8D8] p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '0.72rem', color: '#5A5A5A', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                    Nom *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Marie Dupont"
                    className="w-full px-3 py-2.5 rounded-lg border border-[#D8D8D8] bg-[#FAFAFA] text-sm focus:outline-none focus:ring-2 focus:ring-[#2B2EB8]"
                    style={{ fontFamily: 'Source Serif Pro, Georgia, serif' }}
                  />
                </div>
                <div className="space-y-1.5">
                  <label style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '0.72rem', color: '#5A5A5A', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                    Email (optionnel)
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="marie.dupont@sorbonne-nouvelle.fr"
                    className="w-full px-3 py-2.5 rounded-lg border border-[#D8D8D8] bg-[#FAFAFA] text-sm focus:outline-none focus:ring-2 focus:ring-[#2B2EB8]"
                    style={{ fontFamily: 'Source Serif Pro, Georgia, serif' }}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '0.72rem', color: '#5A5A5A', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                  Objet *
                </label>
                <select
                  required
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-[#D8D8D8] bg-[#FAFAFA] text-sm focus:outline-none focus:ring-2 focus:ring-[#2B2EB8]"
                  style={{ fontFamily: 'Source Serif Pro, Georgia, serif' }}
                >
                  <option value="">Sélectionnez un objet…</option>
                  {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div className="space-y-1.5">
                <label style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '0.72rem', color: '#5A5A5A', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                  Message *
                </label>
                <textarea
                  required
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="Décrivez le problème rencontré…"
                  rows={5}
                  className="w-full px-3 py-2.5 rounded-lg border border-[#D8D8D8] bg-[#FAFAFA] text-sm focus:outline-none focus:ring-2 focus:ring-[#2B2EB8] resize-none"
                  style={{ fontFamily: 'Source Serif Pro, Georgia, serif' }}
                />
              </div>

              {error && (
                <p style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: '0.85rem', color: '#EF4444' }}>{error}</p>
              )}

              <button
                type="submit"
                disabled={sending || !name.trim() || !subject || !message.trim()}
                className="px-6 py-2.5 rounded-xl text-sm disabled:opacity-40 transition-all hover:opacity-90"
                style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, background: '#00068D', color: '#fff', letterSpacing: '0.04em' }}
              >
                {sending ? 'Envoi…' : 'ENVOYER LE SIGNALEMENT'}
              </button>
            </form>
          )}
        </section>

        {/* Footer */}
        <footer className="border-t border-[#D8D8D8] pt-8 pb-4">
          <p style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: '0.78rem', color: '#8A8A8A', lineHeight: 1.6 }}>
            NouveLLM — Université Sorbonne Nouvelle · Les contenus générés par l&apos;IA peuvent être inexacts. Ne prenez pas de décisions importantes sur la seule base des réponses de cet outil.
          </p>
        </footer>

      </div>
    </div>
  )
}
