'use client'

import { useEffect, useState } from 'react'
import HILRequestModal from './HILRequestModal'

interface ExpertContact {
  id: string
  slug: string
  name: string
  role: string
  description: string
  contactEmail: string
}

interface HILContactPanelProps {
  conversationId?: string
  onBack: () => void
  onDone: () => void
}

export default function HILContactPanel({ conversationId, onBack, onDone }: HILContactPanelProps) {
  const [contacts, setContacts] = useState<ExpertContact[]>([])
  const [selected, setSelected] = useState<ExpertContact | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/hil/contacts')
      .then(r => r.json())
      .then(d => setContacts(d.contacts ?? []))
      .finally(() => setLoading(false))
  }, [])

  const ICONS: Record<string, string> = {
    'ingenieur-pedagogique': '👩‍🏫',
    'bibliothecaire': '📚',
    'service-scolarite': '🏛️',
  }

  return (
    <>
      {selected && (
        <HILRequestModal
          contact={selected}
          conversationId={conversationId}
          onClose={() => setSelected(null)}
          onDone={onDone}
        />
      )}

      <div className="flex flex-col items-center justify-center min-h-full py-12 px-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#E8E9F8] mb-5">
            <span className="text-2xl">🤝</span>
          </div>
          <h2 style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '1.3rem', color: '#0D0D0D' }}>
            Contacter un expert
          </h2>
          <p className="mt-1.5 text-sm text-[#8A8A8A]" style={{ fontFamily: 'Source Serif Pro, Georgia, serif' }}>
            Un spécialiste humain pourra vous accompagner personnellement
          </p>
        </div>

        <div className="w-full max-w-md space-y-2.5">
          {loading && (
            <div className="text-center py-6">
              <div className="w-5 h-5 border-2 border-[#00068D] border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          )}
          {!loading && contacts.length === 0 && (
            <p className="text-center text-sm text-[#8A8A8A]" style={{ fontFamily: 'Source Serif Pro, Georgia, serif' }}>
              Aucun contact disponible pour votre profil.
            </p>
          )}
          {contacts.map(contact => (
            <button
              key={contact.id}
              onClick={() => setSelected(contact)}
              className="w-full flex items-start gap-4 px-4 py-4 rounded-xl border border-[#D8D8D8] bg-white hover:bg-[#F0F1FB] hover:border-[#2B2EB8] transition-all text-left"
            >
              <span className="text-2xl flex-shrink-0 mt-0.5">{ICONS[contact.slug] ?? '👤'}</span>
              <div className="flex-1 min-w-0">
                <p style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '0.9rem', color: '#0D0D0D' }}>
                  {contact.name}
                </p>
                <p style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 300, fontSize: '0.72rem', color: '#8A8A8A', marginTop: '0.1rem' }}>
                  {contact.role}
                </p>
                <p style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: '0.78rem', color: '#5A5A5A', marginTop: '0.25rem', lineHeight: 1.5 }}>
                  {contact.description}
                </p>
              </div>
              <svg className="flex-shrink-0 mt-1" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#C8C8C8" strokeWidth="2.5" strokeLinecap="round">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          ))}

          <button
            onClick={onBack}
            className="flex items-center gap-1.5 mt-2 px-3 py-1.5 rounded-lg text-sm text-[#8A8A8A] hover:text-[#0D0D0D] hover:bg-[#F2F2F2] transition-all"
            style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 300 }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M19 12H5M5 12l7-7M5 12l7 7" />
            </svg>
            Retour
          </button>
        </div>
      </div>
    </>
  )
}
