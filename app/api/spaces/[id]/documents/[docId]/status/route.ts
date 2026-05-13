import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

const DIFY_BASE_URL = process.env.DIFY_BASE_URL || 'http://172.19.0.13:5001'
const DIFY_DATASET_KEY = process.env.DIFY_DATASET_API_KEY || ''
const COURS_ACTIFS_DATASET_ID = process.env.DIFY_COURS_ACTIFS_DATASET_ID || ''

function mapDifyStatus(difyStatus: string): 'indexed' | 'failed' | 'pending' {
  if (difyStatus === 'completed') return 'indexed'
  if (difyStatus === 'error' || difyStatus === 'failed') return 'failed'
  return 'pending'
}

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

  // Already resolved — return immediately
  if (doc.indexingStatus !== 'pending') {
    return NextResponse.json({ status: doc.indexingStatus })
  }

  // Personal space or pre-Dify upload
  if (!doc.difyFileId || doc.difyFileId.startsWith('local-')) {
    await prisma.spaceDocument.update({ where: { id: docId }, data: { indexingStatus: 'failed' } })
    return NextResponse.json({ status: 'failed' })
  }

  const meta = (() => { try { return doc.metadata ? JSON.parse(doc.metadata) : null } catch { return null } })()
  let datasetId: string | null = meta?.targetDatasetId ?? null
  const difyBatch: string | null = meta?.difyBatch ?? null

  // Old documents without metadata — resolve datasetId from space enrichmentGroups
  if (!datasetId) {
    try {
      const groupIds: string[] = JSON.parse(space.enrichmentGroups ?? '[]')
      if (groupIds.length > 0) {
        const g = await prisma.group.findUnique({ where: { id: groupIds[0] } })
        datasetId = (g?.hasKB && g?.difyDatasetId) ? g.difyDatasetId : COURS_ACTIFS_DATASET_ID || null
      }
    } catch { /* ignore */ }
  }

  if (!datasetId) {
    // No way to check — personal space or unknown dataset
    await prisma.spaceDocument.update({ where: { id: docId }, data: { indexingStatus: 'no_index' } })
    return NextResponse.json({ status: 'no_index' })
  }

  try {
    let difyStatus: string | undefined

    // Strategy 1: batch endpoint (precise, O(1)) — available for documents uploaded with recent code
    if (difyBatch) {
      const res = await fetch(
        `${DIFY_BASE_URL}/v1/datasets/${datasetId}/documents/${difyBatch}/indexing-status`,
        { headers: { Authorization: `Bearer ${DIFY_DATASET_KEY}` }, signal: AbortSignal.timeout(5000) }
      )
      if (res.ok) {
        const data = await res.json() as { data?: { id: string; indexing_status: string }[] }
        const entry = (data.data ?? []).find(d => d.id === doc.difyFileId) ?? data.data?.[0]
        difyStatus = entry?.indexing_status
      }
    }

    // Strategy 2: list endpoint scan — fallback for old documents or when batch endpoint fails
    if (!difyStatus) {
      let page = 1
      outer: while (page <= 5) {
        const res = await fetch(
          `${DIFY_BASE_URL}/v1/datasets/${datasetId}/documents?limit=100&page=${page}`,
          { headers: { Authorization: `Bearer ${DIFY_DATASET_KEY}` }, signal: AbortSignal.timeout(5000) }
        )
        if (!res.ok) break
        const data = await res.json() as { data?: { id: string; indexing_status: string }[]; has_more?: boolean }
        const entry = (data.data ?? []).find(d => d.id === doc.difyFileId)
        if (entry) { difyStatus = entry.indexing_status; break outer }
        if (!data.has_more) break
        page++
      }
    }

    if (!difyStatus) return NextResponse.json({ status: 'pending' })

    const newStatus = mapDifyStatus(difyStatus)
    if (newStatus !== 'pending') {
      await prisma.spaceDocument.update({ where: { id: docId }, data: { indexingStatus: newStatus } })
    }

    return NextResponse.json({ status: newStatus })
  } catch {
    return NextResponse.json({ status: 'pending' })
  }
}
