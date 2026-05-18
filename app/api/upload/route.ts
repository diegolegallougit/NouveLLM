import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

const DIFY_BASE_URL = process.env.DIFY_BASE_URL || 'http://172.19.0.5:5001'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const agentSlug = formData.get('agentSlug') as string | null

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  if (file.size > 20 * 1024 * 1024) {
    return NextResponse.json({ error: 'File too large (max 20 MB)' }, { status: 413 })
  }

  let apiKey = process.env.DIFY_IIIAAS_API_KEY || ''
  if (agentSlug) {
    const agent = await prisma.agent.findUnique({ where: { slug: agentSlug }, select: { difyApiKey: true } })
    if (agent) apiKey = agent.difyApiKey
  }

  const difyForm = new FormData()
  difyForm.append('file', file)
  difyForm.append('user', session.user.id)

  const difyResponse = await fetch(`${DIFY_BASE_URL}/v1/files/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: difyForm,
  })

  if (!difyResponse.ok) {
    const err = await difyResponse.text()
    return NextResponse.json({ error: 'Upload failed', details: err }, { status: 502 })
  }

  const data = await difyResponse.json()
  return NextResponse.json(data)
}
