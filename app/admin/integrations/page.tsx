'use client'

import { useEffect, useState, useCallback } from 'react'
import { INTEGRATION_CATALOG, VISIBLE_TO_OPTIONS } from '@/lib/integration-catalog'

const MASK = '••••••••'

type IntegrationData = {
  slug: string
  type: 'CONNECTOR' | 'ACADEMIC_SOURCE'
  enabled: boolean
  config: Record<string, string | null> | null
  visibleTo: string
  updatedAt: string
  updatedBy: string | null
  envConfigured?: boolean
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-md)', color: '#0D0D0D', marginBottom: '1rem' }}>
      {children}
    </h2>
  )
}

function Badge({ children, variant = 'default' }: { children: React.ReactNode; variant?: 'default' | 'coming' | 'ok' | 'warn' }) {
  const styles = {
    default: { background: '#F2F2F2', color: '#8A8A8A' },
    coming:  { background: '#F2F2F2', color: '#8A8A8A' },
    ok:      { background: '#E8F5E9', color: '#2E7D32' },
    warn:    { background: '#FFF3E0', color: '#E65100' },
  }
  const s = styles[variant]
  return (
    <span style={{ ...s, fontFamily: 'Gilroy, sans-serif', fontWeight: 300, fontSize: '0.7rem', borderRadius: 4, padding: '2px 7px' }}>
      {children}
    </span>
  )
}

function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="relative flex-shrink-0 w-10 h-5 rounded-full transition-colors disabled:opacity-40"
      style={{ background: checked ? '#00068D' : '#D8D8D8' }}
      aria-checked={checked}
      role="switch"
    >
      <span
        className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform"
        style={{ transform: checked ? 'translateX(20px)' : 'translateX(2px)' }}
      />
    </button>
  )
}

// ─── Card for a single integration ───────────────────────────────────────────

function IntegrationCard({
  data,
  onSave,
}: {
  data: IntegrationData
  onSave: (slug: string, patch: { enabled?: boolean; visibleTo?: string; config?: { email?: string; apiKey?: string } }) => Promise<void>
}) {
  const meta = INTEGRATION_CATALOG[data.slug]
  const isComingSoon = data.config?.status === 'coming_soon'
  const [enabled, setEnabled] = useState(data.enabled)
  const [visibleTo, setVisibleTo] = useState(data.visibleTo)
  const [email, setEmail] = useState<string>(data.config?.email ?? '')
  const [apiKey, setApiKey] = useState<string>(data.config?.apiKey ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const isDirty =
    enabled !== data.enabled ||
    visibleTo !== data.visibleTo ||
    (meta?.hasEmail && email !== (data.config?.email ?? '')) ||
    (meta?.hasApiKey && apiKey !== (data.config?.apiKey ?? ''))

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    await onSave(data.slug, {
      enabled,
      visibleTo,
      config: {
        ...(meta?.hasEmail  && { email }),
        ...(meta?.hasApiKey && { apiKey }),
      },
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div
      className="bg-white rounded-xl border p-5 space-y-4 transition-opacity"
      style={{ borderColor: isComingSoon ? '#F2F2F2' : '#D8D8D8', opacity: isComingSoon ? 0.65 : 1 }}
    >
      {/* Header row */}
      <div className="flex items-center gap-3">
        <span style={{ fontSize: '1.4rem' }}>{meta?.icon ?? '🔌'}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-sm)', color: '#0D0D0D' }}>
              {meta?.label ?? data.slug}
            </span>
            {isComingSoon && <Badge variant="coming">En développement</Badge>}
            {data.slug === 'gdrive' && !isComingSoon && (
              <Badge variant={data.envConfigured ? 'ok' : 'warn'}>
                {data.envConfigured ? 'OAuth configuré' : 'Vars .env manquantes'}
              </Badge>
            )}
          </div>
          <p style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: 'var(--text-xs)', color: '#8A8A8A', marginTop: '1px' }}>
            {meta?.description}
          </p>
        </div>
        {!isComingSoon && (
          <Toggle checked={enabled} onChange={setEnabled} />
        )}
      </div>

      {/* Config fields — only for enabled non-coming-soon */}
      {!isComingSoon && enabled && (
        <div className="space-y-3 pt-1 border-t border-[#F2F2F2]">
          {/* GDrive env info */}
          {data.slug === 'gdrive' && (
            <div className="px-3 py-2.5 rounded-lg bg-[#F8F8FF] border border-[#E8E9F8]">
              <p style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-2xs)', letterSpacing: '0.04em', color: '#5A5A5A' }}>
                CONFIGURATION OAUTH
              </p>
              <p style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: 'var(--text-xs)', color: '#8A8A8A', marginTop: '0.25rem' }}>
                Définissez <code className="bg-[#F2F2F2] px-1 rounded text-[10px]">GOOGLE_CLIENT_ID</code> et{' '}
                <code className="bg-[#F2F2F2] px-1 rounded text-[10px]">GOOGLE_CLIENT_SECRET</code> dans votre fichier <code className="bg-[#F2F2F2] px-1 rounded text-[10px]">.env</code>.
                Ces credentials ne sont pas stockés en base de données.
              </p>
            </div>
          )}

          {/* Notion info */}
          {data.slug === 'notion' && meta?.noGlobalConfig && (
            <div className="px-3 py-2.5 rounded-lg bg-[#F8F8FF] border border-[#E8E9F8]">
              <p style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: 'var(--text-xs)', color: '#8A8A8A' }}>
                Pas de configuration globale — chaque utilisateur saisit son propre token dans ses paramètres.
              </p>
            </div>
          )}

          {/* OpenAlex email */}
          {meta?.hasEmail && (
            <div>
              <label style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-2xs)', letterSpacing: '0.04em', color: '#5A5A5A', textTransform: 'uppercase' }} className="block mb-1">
                Email polite pool
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="contact@exemple.fr (optionnel — améliore le quota)"
                className="w-full px-3 py-2 rounded-lg border border-[#D8D8D8] bg-[#FAFAFA] focus:outline-none focus:ring-2 focus:ring-[#2B2EB8]"
                style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: 'var(--text-sm)', minHeight: 44 }}
              />
            </div>
          )}

          {/* Semantic Scholar / API key */}
          {meta?.hasApiKey && (
            <div>
              <label style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-2xs)', letterSpacing: '0.04em', color: '#5A5A5A', textTransform: 'uppercase' }} className="block mb-1">
                {meta.apiKeyLabel ?? 'Clé API'}
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={apiKey === MASK ? '••••••••' : 'Clé API…'}
                className="w-full px-3 py-2 rounded-lg border border-[#D8D8D8] bg-[#FAFAFA] focus:outline-none focus:ring-2 focus:ring-[#2B2EB8]"
                style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: 'var(--text-sm)', minHeight: 44 }}
              />
            </div>
          )}

          {/* Visible to */}
          {data.type === 'ACADEMIC_SOURCE' && (
            <div>
              <label style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-2xs)', letterSpacing: '0.04em', color: '#5A5A5A', textTransform: 'uppercase' }} className="block mb-1">
                Visible pour
              </label>
              <select
                value={visibleTo}
                onChange={(e) => setVisibleTo(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[#D8D8D8] bg-[#FAFAFA] focus:outline-none focus:ring-2 focus:ring-[#2B2EB8]"
                style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: 'var(--text-sm)', minHeight: 44 }}
              >
                {VISIBLE_TO_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          )}

          {/* Save */}
          {isDirty && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 rounded-lg disabled:opacity-40 hover:opacity-90 transition-all"
              style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-xs)', background: '#00068D', color: '#fff', minHeight: 44, letterSpacing: '0.04em' }}
            >
              {saving ? 'Enregistrement…' : 'ENREGISTRER'}
            </button>
          )}
          {saved && !isDirty && (
            <span style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: 'var(--text-xs)', color: '#2E7D32' }}>✓ Enregistré</span>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminIntegrationsPage() {
  const [integrations, setIntegrations] = useState<IntegrationData[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    fetch('/api/admin/integrations')
      .then((r) => r.json())
      .then((d) => setIntegrations(d.integrations ?? []))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const handleSave = useCallback(async (
    slug: string,
    patch: { enabled?: boolean; visibleTo?: string; config?: { email?: string; apiKey?: string } },
  ) => {
    await fetch(`/api/admin/integrations/${slug}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    load()
  }, [load])

  const connectors     = integrations.filter((i) => i.type === 'CONNECTOR')
  const academicSources = integrations.filter((i) => i.type === 'ACADEMIC_SOURCE')

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-lg)', color: '#0D0D0D' }}>
          Intégrations
        </h1>
        <p style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: 'var(--text-sm)', color: '#8A8A8A', marginTop: '0.25rem' }}>
          Activez les connecteurs et les sources académiques disponibles pour vos utilisateurs.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 border-2 border-[#D8D8D8] border-t-[#00068D] rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Section 1 — Connecteurs */}
          <div>
            <SectionTitle>Connecteurs fichiers</SectionTitle>
            <div className="space-y-3">
              {connectors.map((c) => (
                <IntegrationCard key={c.slug} data={c} onSave={handleSave} />
              ))}
            </div>
          </div>

          {/* Section 2 — Sources académiques */}
          <div>
            <SectionTitle>Sources académiques</SectionTitle>
            <div className="space-y-3">
              {academicSources.map((s) => (
                <IntegrationCard key={s.slug} data={s} onSave={handleSave} />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
