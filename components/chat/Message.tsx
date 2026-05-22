'use client'

import { useState } from 'react'
import SourcesBlock from './SourcesBlock'
import ProcessingState from './ProcessingState'
import { sanitizeHtml } from '@/lib/sanitize'

export interface Source {
  title: string
  domain: string
  url?: string
  icon: string
  tag?: string
  excerpt?: string
}

export interface MessageData {
  id: string
  role: 'user' | 'assistant'
  content: string
  agentUsed?: string
  agentLabel?: string
  sources?: Source[]
  hasProcessedFile?: boolean
  sourceMode?: string
  createdAt?: Date
  isStreaming?: boolean
  feedback?: 'positive' | 'negative' | null
}

function formatTime(date?: Date) {
  if (!date) return "À l’instant"
  return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}


interface MessageProps {
  message: MessageData
  userName?: string
  userInitials?: string
  onRegenerate?: () => void
}

const HIL_REGEX = /\[HIL_SUGGESTION:([a-z0-9-]+)\]/

export default function Message({ message, userName = 'Vous', userInitials = 'V', onRegenerate }: MessageProps) {
  const [copied, setCopied] = useState(false)
  const [feedback, setFeedback] = useState<'positive' | 'negative' | null>(message.feedback ?? null)
  const isUser = message.role === 'user'

  // Detect HIL suggestion token in assistant content
  const hilMatch = !isUser ? message.content.match(HIL_REGEX) : null
  const hilSlug = hilMatch ? hilMatch[1] : null
  const cleanContent = hilSlug ? message.content.replace(HIL_REGEX, '').trim() : message.content

  function handleCopy() {
    navigator.clipboard.writeText(cleanContent)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleExportMD() {
    const date = new Date().toLocaleDateString('fr-FR')
    const sourcesSection = message.sources && message.sources.length > 0
      ? `\n\n---\n**Sources consultées**\n${message.sources.map(s => `- [${s.title}](${s.url ?? s.domain})`).join('\n')}`
      : ''
    const md = `# Réponse NouveLLM\n*${date}*\n\n${cleanContent}${sourcesSection}`
    const blob = new Blob([md], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `nouvellm-${Date.now()}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleFeedback(value: 'positive' | 'negative') {
    const next = feedback === value ? null : value
    setFeedback(next)
    if (!message.id.startsWith('assistant-')) {
      await fetch(`/api/messages/${message.id}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedback: next ?? 'positive' }),
      }).catch(() => null)
    }
  }

  if (isUser) {
    return (
      <>
        {/* Mobile: bubble right-aligned */}
        <div className="md:hidden flex justify-end">
          <div
            className="max-w-[78%] px-4 py-3"
            style={{ background: '#00068D', borderRadius: '14px 14px 3px 14px', color: 'white' }}
          >
            <p style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: '0.875rem', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>
              {message.content}
            </p>
          </div>
        </div>

        {/* Desktop: avatar + text */}
        <div className="hidden md:flex gap-4 items-start">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1"
            style={{ background: '#E8E9F8', color: '#00068D', fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-2xs)', letterSpacing: '0.04em' }}
          >
            {userInitials}
          </div>
          <div className="flex-1 min-w-0 pt-1">
            <div className="flex items-center gap-2 mb-1.5">
              <span style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-xs)', letterSpacing: '0.04em', color: '#0D0D0D', textTransform: 'uppercase' }}>
                {userName}
              </span>
              <span style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 300, fontSize: 'var(--text-2xs)', letterSpacing: '0.04em', color: '#8A8A8A' }}>
                {formatTime(message.createdAt)}
              </span>
            </div>
            <div className="nl-prose" style={{ whiteSpace: 'pre-wrap' }}>
              {message.content}
            </div>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      {/* Mobile: bubble left-aligned */}
      <div className="md:hidden flex justify-start">
        <div
          className="max-w-[88%] px-4 py-3"
          style={{ background: '#F5F5F8', borderRadius: '14px 14px 14px 3px' }}
        >
          {message.isStreaming && !message.content ? (
            <ProcessingState agentSlug={message.agentUsed} sourceMode={message.sourceMode} />
          ) : (
            <div className={`nl-prose${message.isStreaming ? ' nl-cursor' : ''}`}>
              <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(formatContent(cleanContent)) }} />
            </div>
          )}
          {!message.isStreaming && <SourcesBlock sources={message.sources || []} hasProcessedFile={message.hasProcessedFile} sourceMode={message.sourceMode} hasAcademicSources={(message.sources == null || message.sources.length === 0) && message.sourceMode === 'academic'} />}
        </div>
      </div>

      {/* Desktop: avatar + text + action bar */}
      <div className="hidden md:flex gap-4 items-start group">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1 relative"
          style={{ background: '#00068D' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
            <path d="M12 3v18M3 12h18" />
            <path d="M5.6 5.6l12.8 12.8M5.6 18.4l12.8-12.8" />
          </svg>
        </div>

        <div className="flex-1 min-w-0 pt-1">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-xs)', letterSpacing: '0.04em', color: '#0D0D0D', textTransform: 'uppercase' }}>
              NouveLLM
            </span>
            <span style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 300, fontSize: 'var(--text-2xs)', letterSpacing: '0.04em', color: '#8A8A8A' }}>
              {formatTime(message.createdAt)}
            </span>
            {message.agentUsed && (
              <>
                <span style={{ color: '#8A8A8A', fontSize: 'var(--text-2xs)' }}>·</span>
                <span style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 300, fontSize: 'var(--text-2xs)', letterSpacing: '0.04em', color: '#8A8A8A' }}>
                  agent
                </span>
                <span className="nl-token-agent">@{message.agentUsed}</span>
              </>
            )}
          </div>

          {message.isStreaming && !message.content ? (
            <ProcessingState agentSlug={message.agentUsed} sourceMode={message.sourceMode} />
          ) : (
            <div className={`nl-prose${message.isStreaming ? ' nl-cursor' : ''}`}>
              <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(formatContent(cleanContent)) }} />
            </div>
          )}

          {!message.isStreaming && hilSlug && (
            <div className="mt-3 flex items-center gap-3 px-3 py-2.5 rounded-xl bg-[#E8E9F8] border border-[#C5C7F0]">
              <span className="text-base flex-shrink-0">💡</span>
              <p style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: '0.82rem', color: '#00068D', flex: 1 }}>
                Vous pourriez bénéficier d&apos;un accompagnement humain pour cette question.
              </p>
              <a
                href="#hil"
                onClick={(e) => {
                  e.preventDefault()
                  window.dispatchEvent(new CustomEvent('hil:open', { detail: { slug: hilSlug } }))
                }}
                className="flex-shrink-0 px-3 py-1.5 rounded-lg border border-[#2B2EB8] text-[#00068D] hover:bg-[#2B2EB8] hover:text-white transition-all"
                style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-xs)' }}
              >
                Contacter →
              </a>
            </div>
          )}

          {!message.isStreaming && <SourcesBlock sources={message.sources || []} hasProcessedFile={message.hasProcessedFile} sourceMode={message.sourceMode} hasAcademicSources={(message.sources == null || message.sources.length === 0) && message.sourceMode === 'academic'} />}

          {!message.isStreaming && message.content && (
            <p className="mt-2" style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: 'var(--text-2xs)', color: '#C8C8C8', fontStyle: 'italic' }}>
              NouveLLM peut faire des erreurs — vérifiez les informations importantes. <a href="/apropos" className="underline hover:text-[#8A8A8A] transition-colors">En savoir plus</a>
            </p>
          )}

          {/* Action bar — desktop only */}
          {!message.isStreaming && (
            <div className="hidden md:flex items-center gap-1 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[#8A8A8A] hover:bg-[#F2F2F2] hover:text-[#0D0D0D] transition-all"
                style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 300, fontSize: 'var(--text-xs)' }}
                aria-label="Copier la réponse"
              >
                {copied ? (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M20 6L9 17l-5-5" /></svg>
                ) : (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
                )}
                {copied ? 'Copié' : 'Copier'}
              </button>
              <button
                onClick={handleExportMD}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[#8A8A8A] hover:bg-[#F2F2F2] hover:text-[#0D0D0D] transition-all"
                style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 300, fontSize: 'var(--text-xs)' }}
                aria-label="Exporter en Markdown"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7,10 12,15 17,10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                .md
              </button>
              {onRegenerate && (
                <button
                  onClick={onRegenerate}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[#8A8A8A] hover:bg-[#F2F2F2] hover:text-[#0D0D0D] transition-all"
                  style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 300, fontSize: 'var(--text-xs)' }}
                  aria-label="Régénérer la réponse"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M23 4v6h-6" /><path d="M1 20v-6h6" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></svg>
                  Régénérer
                </button>
              )}
              <button
                onClick={() => handleFeedback('positive')}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md transition-all ${feedback === 'positive' ? 'bg-green-50 text-green-600' : 'text-[#8A8A8A] hover:bg-[#F2F2F2] hover:text-green-600'}`}
                aria-label="Réponse utile"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill={feedback === 'positive' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" /></svg>
              </button>
              <button
                onClick={() => handleFeedback('negative')}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md transition-all ${feedback === 'negative' ? 'bg-red-50 text-red-500' : 'text-[#8A8A8A] hover:bg-[#F2F2F2] hover:text-red-500'}`}
                aria-label="Réponse à améliorer"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill={feedback === 'negative' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17" /></svg>
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

function formatContent(text: string): string {
  if (!text) return ''
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // Markdown links [label](url) → clickable anchor
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, (_, label, url) =>
      `<a href="${url}" target="_blank" rel="noopener noreferrer" class="nl-link">${label}</a>`)
    // Inline citation markers [N] → anchor link (future-proof for UX-013C)
    // Negative lookahead (?!\]) avoids matching [[N]] or [HIL_SUGGESTION:...]
    .replace(/\[(\d{1,2})\](?!\])/g, (_, n) => `<a href="#source-${n}" class="nl-cite">[${n}]</a>`)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>[\s\S]*?<\/li>)/, '<ul>$1</ul>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>')
    .replace(/^(?!<[hHuUoOlLpP])(.+)$/, '<p>$1</p>')
    || `<p>${text}</p>`
}
