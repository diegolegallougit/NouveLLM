import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

const DIFY_BASE_URL = process.env.DIFY_BASE_URL || 'http://172.19.0.13:5001'
const DIFY_DATASET_KEY = process.env.DIFY_DATASET_API_KEY || ''
const COURS_ACTIFS_DATASET_ID = process.env.DIFY_COURS_ACTIFS_DATASET_ID || ''

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

  // Espace personnel (pas de groupe) — pas d'indexation Dify
  const groupIds: string[] = (() => { try { return JSON.parse(space.enrichmentGroups ?? '[]') } catch { return [] } })()
  if (groupIds.length === 0) {
    return NextResponse.json({ status: 'no_index' })
  }

  // Déjà indexé avec certitude → retour immédiat sans requête Dify
  if (doc.indexingStatus === 'indexed') {
    return NextResponse.json({ status: 'indexed' })
  }

  // Récupérer batch + datasetId depuis metadata
  const meta = (() => { try { return doc.metadata ? JSON.parse(doc.metadata) : null } catch { return null } })()
  const difyBatch: string | null = meta?.difyBatch ?? null
  let targetDatasetId: string | null = meta?.targetDatasetId ?? null

  // Fallback pour vieux documents sans metadata — résoudre depuis le groupe
  if (!targetDatasetId) {
    try {
      const g = await prisma.group.findUnique({ where: { id: groupIds[0] } })
      targetDatasetId = (g?.hasKB && g?.difyDatasetId) ? g.difyDatasetId : COURS_ACTIFS_DATASET_ID || null
    } catch { /* ignore */ }
  }

  // Pas de batch ni datasetId → ne sait pas quoi poller, arrêter le polling
  if (!difyBatch || !targetDatasetId) {
    if (doc.indexingStatus === 'pending') {
      await prisma.spaceDocument.update({ where: { id: docId }, data: { indexingStatus: 'no_index' } })
    }
    return NextResponse.json({ status: 'no_index' })
  }

  // Endpoint batch natif Dify — même logique que le frontend Dify interne
  try {
    const difyRes = await fetch(
      `${DIFY_BASE_URL}/v1/datasets/${targetDatasetId}/batch/${difyBatch}/indexing-status`,
      { headers: { Authorization: `Bearer ${DIFY_DATASET_KEY}` }, signal: AbortSignal.timeout(5000) }
    )

    if (!difyRes.ok) {
      // Erreur Dify transitoire — ne pas mettre en cache, laisser le client réessayer
      return NextResponse.json({ status: 'pending' })
    }

    const data = await difyRes.json() as {
      data?: { id: string; indexing_status: string; completed_segments: number; total_segments: number }[]
    }
    const docStatus = data.data?.[0]

    if (!docStatus) return NextResponse.json({ status: 'pending' })

    const difyStatus = docStatus.indexing_status
    const completed = docStatus.completed_segments ?? 0
    const total = docStatus.total_segments ?? 0
    const progress = total > 0 ? Math.round((completed / total) * 100) : null

    if (difyStatus === 'completed') {
      // Seul état terminal positif — persister en DB
      await prisma.spaceDocument.update({ where: { id: docId }, data: { indexingStatus: 'indexed' } })
      return NextResponse.json({ status: 'indexed', progress: 100 })
    }

    // error / paused / waiting / parsing / cleaning / splitting / indexing
    // → JAMAIS mettre en cache comme 'failed' : Dify peut retry automatiquement
    return NextResponse.json({ status: 'pending', difyStatus, progress })

  } catch {
    return NextResponse.json({ status: 'pending' })
  }
}
