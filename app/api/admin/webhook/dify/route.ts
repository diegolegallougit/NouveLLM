import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

const WEBHOOK_SECRET = process.env.DIFY_WEBHOOK_SECRET ?? ''

export async function POST(req: NextRequest) {
  // Optional: verify secret header
  if (WEBHOOK_SECRET) {
    const sig = req.headers.get('x-dify-signature') ?? ''
    if (sig !== WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  let body: Record<string, unknown>
  try { body = await req.json() } catch { body = {} }

  const type = (body.event as string) ?? 'workflow_error'
  const message = (body.message as string) ?? JSON.stringify(body).slice(0, 200)

  await prisma.systemAlert.create({
    data: {
      type,
      message,
      metadata: JSON.stringify(body),
    },
  })

  return NextResponse.json({ ok: true })
}
