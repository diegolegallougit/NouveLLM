'use client'

import { useState } from 'react'
import SourcesBlock from './SourcesBlock'
import ProcessingState from './ProcessingState'

export interface Source {
  title: string
  domain: string
  url?: string
  icon: string
  tag?: string
}

export interface MessageData {
  id: string
  role: 'user' | 'assistant'
  content: string
  agentUsed?: string
  agentLabel?: string
  sources?: Source[]
  createdAt?: Date
  isStreaming?: boolean
}

function formatTime(date?: Date) {
  if (!date) return "À l’instant"
  return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

interface MessageProps {
  message: MessageData
  userName?: string
  userInitials?: string
  onRegenerate?: () => void
}

export default function Message({ message, userName = 'Vous', userInitials = 'V', onRegenerate }: MessageProps) {
  const [copied, setCopied] = useState(false)
  const isUser = message.role === 'user'

  function handleCopy() {
    navigator.clipboard.writeText(message.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (isUser) {
    return (
      <div className="flex gap-4 items-start">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1"
          style={{ background: '#E8E9F8', color: '#00068D', fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '0.65rem', letterSpacing: '0.04em' }}
        >
          {userInitials}
        </div>
        <div className="flex-1 min-w-0 pt-1">
          <div className="flex items-center gap-2 mb-1.5">
            <span style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '0.7rem', letterSpacing: '0.04em', color: '#0D0D0D', textTransform: 'uppercase' }}>
              {userName}
            </span>
            <span style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 300, fontSize: '0.65rem', letterSpacing: '0.04em', color: '#8A8A8A' }}>
              {formatTime(message.createdAt)}
            </span>
          </div>
          <div
            className="nl-prose"
            style={{ whiteSpace: 'pre-wrap' }}
          >
            {message.content}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex gap-4 items-start group">
      {/* System avatar */}
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
        {/* Meta */}
        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
          <span style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '0.7rem', letterSpacing: '0.04em', color: '#0D0D0D', textTransform: 'uppercase' }}>
            NouveLLM
          </span>
          <span style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 300, fontSize: '0.65rem', letterSpacing: '0.04em', color: '#8A8A8A' }}>
            {formatTime(message.createdAt)}
          </span>
          {message.agentUsed && (
            <>
              <span style={{ color: '#8A8A8A', fontSize: '0.65rem' }}>·</span>
              <span style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 300, fontSize: '0.65rem', letterSpacing: '0.04em', color: '#8A8A8A' }}>
                agent
              </span>
              <span className="nl-token-agent text-[10px]">@{message.agentUsed}</span>
            </>
          )}
        </div>

        {/* Content */}
        {message.isStreaming && !message.content ? (
          <ProcessingState agentSlug={message.agentUsed} />
        ) : (
          <div className={`nl-prose${message.isStreaming ? ' nl-cursor' : ''}`}>
            <div dangerouslySetInnerHTML={{ __html: formatContent(message.content) }} />
          </div>
        )}

        {/* Sources */}
        {!message.isStreaming && <SourcesBlock sources={message.sources || []} />}

        {/* Action bar */}
        {!message.isStreaming && (
          <div className="flex items-center gap-1 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] text-[#8A8A8A] hover:bg-[#F2F2F2] hover:text-[#0D0D0D] transition-all"
              style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 300 }}
              aria-label="Copier la réponse"
            >
              {copied ? (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M20 6L9 17l-5-5" /></svg>
              ) : (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
              )}
              {copied ? 'Copié' : 'Copier'}
            </button>
            {onRegenerate && (
              <button
                onClick={onRegenerate}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] text-[#8A8A8A] hover:bg-[#F2F2F2] hover:text-[#0D0D0D] transition-all"
                style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 300 }}
                aria-label="Régénérer la réponse"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M23 4v6h-6" /><path d="M1 20v-6h6" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></svg>
                Régénérer
              </button>
            )}
            <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] text-[#8A8A8A] hover:bg-[#F2F2F2] hover:text-green-600 transition-all" aria-label="Réponse utile">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" /></svg>
            </button>
            <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] text-[#8A8A8A] hover:bg-[#F2F2F2] hover:text-red-500 transition-all" aria-label="Réponse à améliorer">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17" /></svg>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function formatContent(text: string): string {
  if (!text) return ''
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
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
