import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

async function requireAdmin() {
  const session = await auth()
  const user = session?.user as { id?: string; role?: string } | undefined
  if (!user?.id || user.role !== 'ADMIN') return null
  return user
}

const SENSITIVE_KEYS = new Set(['email', 'apiKey'])

function maskConfig(raw: string | null): Record<string, unknown> | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Record<string, string>
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(parsed)) {
      out[k] = SENSITIVE_KEYS.has(k) ? (v ? '••••••••' : null) : v
    }
    return out
  } catch {
    return null
  }
}

export async function GET() {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const integrations = await prisma.integration.findMany({ orderBy: { slug: 'asc' } })

  const gdriveEnvOk = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)

  const shaped = integrations.map((i) => ({
    slug:      i.slug,
    type:      i.type,
    enabled:   i.enabled,
    config:    maskConfig(i.config),
    visibleTo: i.visibleTo,
    updatedAt: i.updatedAt,
    updatedBy: i.updatedBy,
    ...(i.slug === 'gdrive' && { envConfigured: gdriveEnvOk }),
  }))

  return NextResponse.json({ integrations: shaped })
}
