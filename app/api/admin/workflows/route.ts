import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

const DIFY_BASE_URL = process.env.DIFY_BASE_URL || 'http://172.19.0.5:5001'

async function checkDifyApp(apiKey: string): Promise<{ name?: string; mode?: string; ok: boolean; latency?: number }> {
  const start = Date.now()
  try {
    const r = await fetch(`${DIFY_BASE_URL}/v1/info`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(4000),
    })
    const latency = Date.now() - start
    if (!r.ok) return { ok: false, latency }
    const data = await r.json()
    return { ok: true, name: data.name, mode: data.mode, latency }
  } catch {
    return { ok: false, latency: Date.now() - start }
  }
}

export async function GET() {
  const session = await auth()
  const user = session?.user as { role?: string } | undefined
  if (user?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const agents = await prisma.agent.findMany({ orderBy: { slug: 'asc' } })

  const results = await Promise.all(
    agents.map(async (agent) => {
      const status = await checkDifyApp(agent.difyApiKey)
      return {
        slug: agent.slug,
        label: agent.label,
        icon: agent.icon,
        difyAppId: agent.difyAppId,
        difyApiKey: agent.difyApiKey.slice(0, 12) + '…',
        agentStatus: agent.status,
        difyOk: status.ok,
        difyName: status.name,
        latency: status.latency,
      }
    })
  )

  return NextResponse.json({ workflows: results })
}
