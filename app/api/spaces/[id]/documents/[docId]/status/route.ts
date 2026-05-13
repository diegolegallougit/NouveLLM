import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

const DIFY_BASE_URL = process.env.DIFY_BASE_URL || 'http://172.19.0.13:5001'
const DIFY_DATASET_KEY = process.env.DIFY_DATASET_API_KEY || ''

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: spaceId, docId } = await params

  const space = await prisma.documentSpace.findFirst({ where: { id: spaceId, ownerId: session.user.id } })
  if (!space) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const doc = await prisma.spaceDocument.findFirst({ where: { id: docId, spaceId } })
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Already resolved — return immediately without hitting Dify
  if (doc.indexingStatus !== 'pending') {
    return NextResponse.json({ status: doc.indexingStatus })
  }

  // Never reached Dify (upload failed before creation)
  if (doc.difyFileId.startsWith('local-')) {
    await prisma.spaceDocument.update({ where: { id: docId }, data: { indexingStatus: 'failed' } })
    return NextResponse.json({ status: 'failed' })
  }

  const meta = (() => { try { return doc.metadata ? JSON.parse(doc.metadata) : null } catch { return null } })()
  const datasetId: string | null = meta?.targetDatasetId ?? null

  if (!datasetId) return NextResponse.json({ status: 'pending' })

  // Check status via Dify dataset documents list
  try {
    const res = await fetch(
      `${DIFY_BASE_URL}/v1/datasets/${datasetId}/documents?limit=100`,
      { headers: { Authorization: `Bearer ${DIFY_DATASET_KEY}` }, signal: AbortSignal.timeout(5000) }
    )
    if (!res.ok) return NextResponse.json({ status: 'pending' })

    const data = await res.json() as { data?: { id: string; indexing_status: string }[] }
    const entry = (data.data ?? []).find(d => d.id === doc.difyFileId)

    if (!entry) return NextResponse.json({ status: 'pending' })

    const difyStatus = entry.indexing_status ?? ''
    let newStatus: string
    if (difyStatus === 'completed') newStatus = 'indexed'
    else if (difyStatus === 'error' || difyStatus === 'failed') newStatus = 'failed'
    else newStatus = 'pending'

    if (newStatus !== 'pending') {
      await prisma.spaceDocument.update({ where: { id: docId }, data: { indexingStatus: newStatus } })
    }

    return NextResponse.json({ status: newStatus })
  } catch {
    return NextResponse.json({ status: 'pending' })
  }
}
