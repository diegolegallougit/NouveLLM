'use client'

import { useState } from 'react'
import { AgentConfig, AgentFormField } from './AgentPalette'

interface AgentFormModalProps {
  agent: AgentConfig
  onSubmit: (inputs: Record<string, string>, displayMessage: string) => void
  onCancel: () => void
}

function buildDisplayMessage(agent: AgentConfig, values: Record<string, string>): string {
  const schema = agent.inputSchema!
  const parts: string[] = []
  for (const field of schema.fields) {
    const val = values[field.key]?.trim()
    if (val) {
      if (field.type === 'textarea') {
        parts.push(val.length > 80 ? val.slice(0, 80) + '…' : val)
      } else {
        parts.push(`${field.label} : ${val}`)
      }
    }
  }
  return parts.length > 0 ? parts.join(' · ') : agent.label
}

export default function AgentFormModal({ agent, onSubmit, onCancel }: AgentFormModalProps) {
  const schema = agent.inputSchema!
  const initial: Record<string, string> = {}
  for (const f of schema.fields) {
    initial[f.key] = f.default ?? ''
  }
  const [values, setValues] = useState<Record<string, string>>(initial)
  const [errors, setErrors] = useState<Record<string, boolean>>({})

  function handleChange(key: string, val: string) {
    setValues((v) => ({ ...v, [key]: val }))
    if (errors[key]) setErrors((e) => ({ ...e, [key]: false }))
  }

  function handleSubmit() {
    const newErrors: Record<string, boolean> = {}
    for (const field of schema.fields) {
      if (field.required && !values[field.key]?.trim()) {
        newErrors[field.key] = true
      }
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }
    const inputs: Record<string, string> = {}
    for (const field of schema.fields) {
      const val = values[field.key]?.trim()
      if (val) inputs[field.key] = val
    }
    onSubmit(inputs, buildDisplayMessage(agent, values))
  }

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ background: 'rgba(0,0,0,0.45)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel() }}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full mx-4 overflow-hidden flex flex-col"
        style={{ maxWidth: '540px', maxHeight: '90vh' }}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E8E8E8]" style={{ background: '#F0F1FB' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{agent.icon}</span>
              <div>
                <p style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: '0.9rem', color: '#00068D' }}>
                  {agent.label}
                </p>
                <p style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: '0.75rem', color: '#8A8A8A' }}>
                  {agent.description}
                </p>
              </div>
            </div>
            <button
              onClick={onCancel}
              className="w-8 h-8 flex items-center justify-center rounded-full text-[#8A8A8A] hover:bg-[#E8E8E8] transition-all"
              aria-label="Fermer"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Fields */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4 nl-scroll">
          {schema.fields.map((field: AgentFormField) => (
            <div key={field.key}>
              <label
                htmlFor={`af-${field.key}`}
                style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 700, fontSize: '0.78rem', color: '#0D0D0D', display: 'block', marginBottom: '6px' }}
              >
                {field.label}
                {field.required && <span style={{ color: '#00068D', marginLeft: '3px' }}>*</span>}
              </label>

              {field.type === 'select' ? (
                <select
                  id={`af-${field.key}`}
                  value={values[field.key] ?? ''}
                  onChange={(e) => handleChange(field.key, e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-[#2B2EB8]"
                  style={{
                    fontFamily: 'Source Serif Pro, Georgia, serif',
                    borderColor: errors[field.key] ? '#ef4444' : '#D8D8D8',
                    background: 'white',
                    color: '#0D0D0D',
                  }}
                >
                  {field.options?.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              ) : field.type === 'textarea' ? (
                <textarea
                  id={`af-${field.key}`}
                  value={values[field.key] ?? ''}
                  onChange={(e) => handleChange(field.key, e.target.value)}
                  placeholder={field.placeholder}
                  rows={4}
                  className="w-full px-3 py-2 rounded-lg border text-sm resize-none transition-all focus:outline-none focus:ring-2 focus:ring-[#2B2EB8]"
                  style={{
                    fontFamily: 'Source Serif Pro, Georgia, serif',
                    borderColor: errors[field.key] ? '#ef4444' : '#D8D8D8',
                    color: '#0D0D0D',
                  }}
                />
              ) : (
                <input
                  id={`af-${field.key}`}
                  type={field.type === 'number' ? 'number' : 'text'}
                  value={values[field.key] ?? ''}
                  onChange={(e) => handleChange(field.key, e.target.value)}
                  placeholder={field.placeholder}
                  className="w-full px-3 py-2 rounded-lg border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-[#2B2EB8]"
                  style={{
                    fontFamily: 'Source Serif Pro, Georgia, serif',
                    borderColor: errors[field.key] ? '#ef4444' : '#D8D8D8',
                    color: '#0D0D0D',
                  }}
                />
              )}

              {errors[field.key] && (
                <p style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: '0.72rem', color: '#ef4444', marginTop: '4px' }}>
                  Ce champ est obligatoire.
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#E8E8E8] flex items-center justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-sm transition-all hover:bg-[#F2F2F2]"
            style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 700, color: '#8A8A8A' }}
          >
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            className="flex items-center gap-2 px-5 py-2 rounded-lg text-white text-sm transition-all hover:opacity-90"
            style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, background: '#00068D', letterSpacing: '0.04em' }}
          >
            LANCER
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
