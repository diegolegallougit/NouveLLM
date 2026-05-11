'use client'

import { useState } from 'react'

interface ExpertContact {
  id: string
  name: string
  role: string
  contactEmail: string
}

interface HILRequestModalProps {
  contact: ExpertContact
  conversationId?: string
  onClose: () => void
  onDone: () => void
}

export default function HILRequestModal({ contact, conversationId, onClose, onDone }: HILRequestModalProps) {
  const [contextSummary, setContextSummary] = useState('')
  const [userMessage, setUserMessage] = useState('')
  const [generating, setGenerating] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)
  const [summaryGenerated, setSummaryGenerated] = useState(false)

  async function generateSummary() {
    if (!conversationId) {
      setContextSummary("Aucune conversation en cours — demande sans contexte spécifique.")
      setSummaryGenerated(true)
      return
    }
    setGenerating(true)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: "Résume en 3-4 phrases le contexte de travail et la demande spécifique de cet EC, pour qu'un expert humain comprenne immédiatement de quoi il s'agit sans lire toute la conversation. Sois factuel et précis.",
          conversationId,
        }),
      })
      if (!res.ok || !res.body) throw new Error('API error')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let summary = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const event = JSON.parse(line.slice(6))
            if (event.type === 'chunk') summary += event.text
          } catch { /* skip */ }
        }
      }
      setContextSummary(summary.trim() || "Contexte non disponible.")
      setSummaryGenerated(true)
    } catch {
      setContextSummary("Résumé automatique indisponible — décrivez votre demande ci-dessous.")
      setSummaryGenerated(true)
    } finally {
      setGenerating(false)
    }
  }

  async function submit() {
    setSubmitting(true)
    try {
      const res = await fetch('/api/hil/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expertContactId: contact.id,
          conversationId,
          contextSummary,
          userMessage,
        }),
      })
      if (res.ok) setSent(true)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={sent ? onDone : onClose} />
      <div className="relative bg-white rounded-2xl border border-[#D8D8D8] w-full max-w-lg shadow-xl">

        {/* Header */}
        <div className="px-6 py-4 border-b border-[#F2F2F2] flex items-center justify-between">
          <div>
            <h2 style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '1rem', color: '#0D0D0D' }}>
              Demande à {contact.name}
            </h2>
            <p style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: '0.78rem', color: '#8A8A8A' }}>
              {contact.role} · {contact.contactEmail}
            </p>
          </div>
          <button onClick={sent ? onDone : onClose} className="p-2 rounded-lg hover:bg-[#F2F2F2]" aria-label="Fermer">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#5A5A5A" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {sent ? (
            <div className="text-center py-6 space-y-3">
              <div className="w-12 h-12 rounded-full bg-[#E8F5E9] flex items-center justify-center mx-auto">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2E7D32" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </div>
              <p style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '1rem', color: '#0D0D0D' }}>
                Demande envoyée
              </p>
              <p style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: '0.85rem', color: '#5A5A5A' }}>
                {contact.name} a été notifié·e et reviendra vers vous prochainement.
              </p>
              <button onClick={onDone} className="mt-2 px-6 py-2.5 rounded-xl text-sm"
                style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, background: '#00068D', color: '#fff' }}>
                FERMER
              </button>
            </div>
          ) : (
            <>
              {/* Context summary */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '0.7rem', letterSpacing: '0.04em', textTransform: 'uppercase', color: '#5A5A5A' }}>
                    Contexte généré automatiquement
                  </label>
                  {!summaryGenerated && (
                    <button
                      onClick={generateSummary}
                      disabled={generating}
                      className="text-[10px] px-2.5 py-1 rounded-lg border border-[#D8D8D8] hover:bg-[#E8E9F8] hover:border-[#2B2EB8] transition-all disabled:opacity-50"
                      style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, color: '#00068D' }}
                    >
                      {generating ? '…' : '✨ Générer'}
                    </button>
                  )}
                </div>
                {summaryGenerated ? (
                  <textarea
                    value={contextSummary}
                    onChange={e => setContextSummary(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2.5 rounded-lg border border-[#D8D8D8] bg-[#FAFAFA] text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#2B2EB8]"
                    style={{ fontFamily: 'Source Serif Pro, Georgia, serif', lineHeight: 1.6 }}
                  />
                ) : (
                  <div
                    className="px-3 py-2.5 rounded-lg border border-dashed border-[#D8D8D8] bg-[#FAFAFA] text-sm text-[#C8C8C8] cursor-pointer hover:border-[#2B2EB8] transition-all"
                    style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontStyle: 'italic' }}
                    onClick={generateSummary}
                  >
                    Cliquez sur &ldquo;Générer&rdquo; pour créer un résumé de votre contexte de travail…
                  </div>
                )}
              </div>

              {/* User message */}
              <div>
                <label style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '0.7rem', letterSpacing: '0.04em', textTransform: 'uppercase', color: '#5A5A5A' }}>
                  Votre message complémentaire <span style={{ fontWeight: 300, textTransform: 'none' }}>(optionnel)</span>
                </label>
                <textarea
                  value={userMessage}
                  onChange={e => setUserMessage(e.target.value)}
                  placeholder="Précisez votre demande, vos disponibilités, contraintes particulières…"
                  rows={3}
                  className="mt-1.5 w-full px-3 py-2.5 rounded-lg border border-[#D8D8D8] bg-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#2B2EB8]"
                  style={{ fontFamily: 'Source Serif Pro, Georgia, serif' }}
                />
              </div>
            </>
          )}
        </div>

        {!sent && (
          <div className="px-6 pb-5 flex items-center justify-between gap-3">
            <button onClick={onClose} className="px-4 py-2.5 rounded-xl border border-[#D8D8D8] text-sm hover:bg-[#F2F2F2] transition-all"
              style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 300, color: '#5A5A5A' }}>
              Annuler
            </button>
            <button
              onClick={submit}
              disabled={submitting || !summaryGenerated}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm disabled:opacity-40 transition-all hover:opacity-90"
              style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, background: '#00068D', color: '#fff' }}
            >
              {submitting ? '…' : (
                <>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M22 2L11 13" /><path d="M22 2L15 22l-4-9-9-4 20-7z" />
                  </svg>
                  Envoyer la demande
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
