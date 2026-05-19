import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { encrypt, decrypt } from '@/lib/encryption'
import { IntegrationPatchSchema } from '@/lib/schemas/integration.schema'
import { NextRequest, NextResponse } from 'next/server'

async function requireAdmin() {
  const session = await auth()
  const user = session?.user as { id?: string; role?: string } | undefined
  if (!user?.id || user.role !== 'ADMIN') return null
  return user
}

const MASK = '••••••••'
const SENSITIVE_KEYS = new Set(['email', 'apiKey'])

function buildConfig(
  existing: string | null,
  incoming: { email?: string; apiKey?: string },
): string {
  const current = (() => {
    if (!existing) return {} as Record<string, string>
    try { return JSON.parse(existing) as Record<string, string> } catch { return {} }
  })()

  const updated = { ...current }

  for (const [k, v] of Object.entries(incoming) as [string, string | undefined][]) {
    if (v === undefined) continue
    if (v === MASK) continue          // keep existing encrypted value
    if (v === '') {
      delete updated[k]               // clear the field
    } else {
      updated[k] = SENSITIVE_KEYS.has(k) ? encrypt(v) : v
    }
  }

  return JSON.stringify(updated)
}

function maskConfig(raw: string | null): Record<string, unknown> | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Record<string, string>
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(parsed)) {
      out[k] = SENSITIVE_KEYS.has(k) ? (v ? MASK : null) : v
    }
    return out
  } catch { return null }
}

// Expose decrypted config only for testing — not called from UI
export function readConfig(raw: string | null): Record<string, string> | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Record<string, string>
    const out: Record<string, string> = {}
    for (const [k, v] of Object.entries(parsed)) {
      try { out[k] = SENSITIVE_KEYS.has(k) ? decrypt(v) : v } catch { out[k] = v }
    }
    return out
  } catch { return null }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { slug } = await params
  const integration = await prisma.integration.findUnique({ where: { slug } })
  if (!integration) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const parsed = IntegrationPatchSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  const { enabled, visibleTo, config: incomingConfig } = parsed.data

  const newConfig = incomingConfig
    ? buildConfig(integration.config, incomingConfig)
    : undefined

  const updated = await prisma.integration.update({
    where: { slug },
    data: {
      ...(enabled !== undefined && { enabled }),
      ...(visibleTo !== undefined && { visibleTo }),
      ...(newConfig !== undefined && { config: newConfig }),
      updatedBy: admin.id,
    },
  })

  return NextResponse.json({ integration: { ...updated, config: maskConfig(updated.config) } })
}
