import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logAction } from '@/lib/audit'
import { processDocument } from '@/lib/document-pipeline'
import { ocrPdfWithPixtral } from '@/lib/ocr-pixtral'
import { currentAnneeUniv, defaultVisibleUntil } from '@/lib/academic-calendar'
import { checkRateLimit } from '@/lib/ratelimit'
import { NextRequest, NextResponse } from 'next/server'

const DIFY_BASE_URL = process.env.DIFY_BASE_URL || 'http://172.19.0.13:5001'
const DIFY_DATASET_KEY = process.env.DIFY_DATASET_API_KEY || ''
const COURS_ACTIFS_DATASET_ID = process.env.DIFY_COURS_ACTIFS_DATASET_ID || ''

const ALLOWED_EXTENSIONS = new Set(['.pdf', '.doc', '.docx', '.txt', '.md', '.csv', '.ppt', '.pptx', '.xls', '.xlsx', '.json'])

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: spaceId } = await params
  const space = await prisma.documentSpace.findFirst({ where: { id: spaceId, ownerId: session.user.id } })
  if (!space) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const documents = await prisma.spaceDocument.findMany({
    where: { spaceId },
    orderBy: { uploadedAt: 'asc' },
    include: {
      folder: true,
      uploadedBy: { select: { id: true, name: true, email: true } },
    },
  })

  return NextResponse.json({ documents })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!checkRateLimit(session.user.id, 10, 60_000)) {
    return NextResponse.json({ error: 'Trop de requêtes — réessayez dans une minute' }, { status: 429 })
  }

  const { id: spaceId } = await params
  const space = await prisma.documentSpace.findFirst({ where: { id: spaceId, ownerId: session.user.id } })
  if (!space) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Resolve primary group (first in enrichmentGroups) for KB + diplome metadata
  let spaceGroup: { hasKB: boolean; difyDatasetId: string | null; diplomeRef: { slug: string; ufr: string } | null } | null = null
  try {
    const groupIds: string[] = JSON.parse(space.enrichmentGroups ?? '[]')
    if (groupIds.length > 0) {
      const g = await prisma.group.findUnique({ where: { id: groupIds[0] }, include: { diplomeRef: true } })
      if (g) spaceGroup = { hasKB: g.hasKB, difyDatasetId: g.difyDatasetId ?? null, diplomeRef: g.diplomeRef ?? null }
    }
  } catch { /* enrichmentGroups malformé — pas de groupe */ }

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const folderId = formData.get('folderId') as string | null

  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  if (file.size > 20 * 1024 * 1024) return NextResponse.json({ error: 'File too large (max 20 MB)' }, { status: 413 })

  const ext = '.' + (file.name.split('.').pop()?.toLowerCase() ?? '')
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return NextResponse.json({ error: `Format non supporté (${ext}). Formats acceptés : PDF, Word, Excel, PowerPoint, Markdown, CSV, JSON` }, { status: 400 })
  }

  const fileBuffer = Buffer.from(await file.arrayBuffer())

  // Run document pipeline (conversion + extraction)
  let pipeline = await processDocument(fileBuffer, file.name, file.type)

  // OCR si PDF scanné — try/catch car ocrPdfWithPixtral peut throw (timeout réseau Cortecs)
  if (!pipeline.hasText && pipeline.warnings.includes('PDF_SCANNED')) {
    try {
      const ocrText = await ocrPdfWithPixtral(fileBuffer)
      if (ocrText.length > 100) {
        pipeline = {
          content: ocrText,
          contentType: 'markdown',
          method: 'pixtral-ocr',
          hasText: true,
          warnings: [],
          filename: file.name.replace(/\.pdf$/i, '-ocr.md'),
        }
      }
    } catch (err) {
      console.warn('[upload] OCR Pixtral failed (non-blocking):', err)
      // Laisse pipeline en pdf-scanned → sera archivé sans indexation
    }
  }

  // Validate folderId
  let resolvedFolderId: string | null = null
  if (folderId) {
    const folder = await prisma.documentFolder.findFirst({ where: { id: folderId, spaceId } })
    resolvedFolderId = folder?.id ?? null
  }

  // Select target KB
  const groupKbId = spaceGroup?.hasKB ? spaceGroup.difyDatasetId : null
  const targetDatasetId = groupKbId || COURS_ACTIFS_DATASET_ID

  console.info('[upload] targetDatasetId:', targetDatasetId || '(vide)', '| method:', pipeline.method)

  const difyDocMetadata = {
    space_id: spaceId,
    folder_id: resolvedFolderId ?? null,
    diplome: spaceGroup?.diplomeRef?.slug ?? null,
    ufr: spaceGroup?.diplomeRef?.ufr ?? null,
    audience: 'ALL',
    annee_univ: currentAnneeUniv(),
    uploader: session.user.email,
    visible_from: new Date().toISOString(),
    visible_until: defaultVisibleUntil().toISOString(),
    is_visible: true,
    original_filename: file.name,
    processing_method: pipeline.method,
  }

  async function uploadToDifyDataset(uploadFile: File): Promise<string | null> {
    const difyForm = new FormData()
    difyForm.append('file', uploadFile)
    difyForm.append('data', JSON.stringify({ indexing_technique: 'high_quality', process_rule: { mode: 'automatic' }, doc_metadata: difyDocMetadata }))
    const res = await fetch(
      `${DIFY_BASE_URL}/v1/datasets/${targetDatasetId}/document/create_by_file`,
      { method: 'POST', headers: { Authorization: `Bearer ${DIFY_DATASET_KEY}` }, body: difyForm, signal: AbortSignal.timeout(30000) }
    )
    if (!res.ok) {
      const errBody = await res.text().catch(() => '')
      console.error('[upload] Dify error:', res.status, errBody.slice(0, 300))
      return null
    }
    const data = await res.json()
    return data.document?.id ?? null
  }

  // Upload to Dify — track success/failure for indexingStatus
  let difyFileId = `local-${Date.now()}`
  let indexingStatus = targetDatasetId ? 'pending' : 'no_index'

  if (targetDatasetId && pipeline.hasText) {
    // Choisir le fichier à envoyer à Dify :
    // - PDF natif ou contenu vide → envoyer le PDF original (Dify extrait nativement)
    // - Autres formats → envoyer le contenu converti (txt/md/json)
    let difyFile: File
    if (pipeline.method === 'pdf-dify-native' || !pipeline.content) {
      difyFile = new File([fileBuffer], file.name, { type: file.type || 'application/pdf' })
    } else {
      const contentBlob = new Blob([pipeline.content], {
        type: pipeline.contentType === 'json' ? 'application/json' : 'text/plain; charset=utf-8',
      })
      difyFile = new File([contentBlob], pipeline.filename)
    }
    try {
      const id = await uploadToDifyDataset(difyFile)
      if (id) { difyFileId = id } else { indexingStatus = 'failed' }
    } catch (err) {
      indexingStatus = 'failed'
      console.warn('[upload] Dify upload failed (non-blocking):', err)
    }
  } else if (!pipeline.hasText) {
    // PDF vraiment scanné (image) — archivage brut, pas d'indexation KB
    indexingStatus = 'no_index'
    try {
      const difyForm = new FormData()
      difyForm.append('file', new File([fileBuffer], file.name, { type: file.type }))
      difyForm.append('user', session.user.id)
      const res = await fetch(`${DIFY_BASE_URL}/v1/files/upload`, {
        method: 'POST', headers: { Authorization: `Bearer ${process.env.DIFY_IIIAAS_API_KEY || ''}` }, body: difyForm
      })
      if (res.ok) { const d = await res.json(); difyFileId = d.id ?? difyFileId }
    } catch { /* non-blocking */ }
  }

  const doc = await prisma.spaceDocument.create({
    data: {
      name: file.name,
      displayName: null,
      description: null,
      folderId: resolvedFolderId,
      spaceId,
      difyFileId,
      uploadedById: session.user.id,
      size: file.size,
      mimeType: file.type || null,
      visibleFrom: new Date(),
      visibleUntil: defaultVisibleUntil(),
      isVisible: true,
      diplomeSlug: spaceGroup?.diplomeRef?.slug ?? null,
      anneeUniv: currentAnneeUniv(),
      metadata: JSON.stringify({
        hasText: pipeline.hasText,
        method: pipeline.method,
        targetDatasetId: targetDatasetId || null,
      }),
      indexingStatus,
    },
    include: { folder: true },
  })

  await logAction({
    userId: session.user.id,
    action: 'DOCUMENT_UPLOAD',
    entityType: 'SpaceDocument',
    entityId: doc.id,
    entityName: doc.name,
    spaceId,
  })

  return NextResponse.json({ document: doc }, { status: 201 })
}
