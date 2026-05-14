import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logAction } from '@/lib/audit'
import { processDocument } from '@/lib/document-pipeline'
import { ocrPdfWithPixtral } from '@/lib/ocr-pixtral'
import { currentAnneeUniv, defaultVisibleUntil } from '@/lib/academic-calendar'
import { checkRateLimit } from '@/lib/ratelimit'
import { indexingQueue } from '@/lib/indexing-queue'
import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import fs from 'fs'
import path from 'path'

const DOCS_STORAGE = path.join(process.cwd(), '.data', 'space-docs')
const QUEUE_STORAGE = path.join(process.cwd(), '.data', 'indexing-queue')

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

  // Resolve primary group for KB + diplome metadata
  let spaceGroup: { hasKB: boolean; difyDatasetId: string | null; diplomeRef: { slug: string; ufr: string } | null } | null = null
  try {
    const groupIds: string[] = JSON.parse(space.enrichmentGroups ?? '[]')
    if (groupIds.length > 0) {
      const g = await prisma.group.findUnique({ where: { id: groupIds[0] }, include: { diplomeRef: true } })
      if (g) spaceGroup = { hasKB: g.hasKB, difyDatasetId: g.difyDatasetId ?? null, diplomeRef: g.diplomeRef ?? null }
    }
  } catch { /* enrichmentGroups malformé */ }

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

  let pipeline: Awaited<ReturnType<typeof processDocument>>
  try {
    pipeline = await processDocument(fileBuffer, file.name, file.type)
  } catch (err) {
    console.error('[upload] processDocument failed:', err)
    return NextResponse.json({ error: 'Impossible de lire le fichier — il est peut-être corrompu ou protégé.' }, { status: 422 })
  }

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
    }
  }

  // Validate folderId
  let resolvedFolderId: string | null = null
  if (folderId) {
    const folder = await prisma.documentFolder.findFirst({ where: { id: folderId, spaceId } })
    resolvedFolderId = folder?.id ?? null
  }

  // ── Personal space — store locally, no indexing ──────────────────────────────
  if (!spaceGroup) {
    const docId = randomUUID()
    const useOriginal = !pipeline.content || pipeline.method === 'pdf-dify-native'
    const storedExt = useOriginal
      ? '.' + (file.name.split('.').pop()?.toLowerCase() ?? 'bin')
      : pipeline.contentType === 'json' ? '.json' : '.md'
    const storedFilename = `${docId}${storedExt}`
    try {
      await fs.promises.mkdir(DOCS_STORAGE, { recursive: true })
      await fs.promises.writeFile(
        path.join(DOCS_STORAGE, storedFilename),
        useOriginal ? fileBuffer : Buffer.from(pipeline.content, 'utf-8')
      )
    } catch (err) {
      console.error('[upload] local write failed:', err)
      return NextResponse.json({ error: "Erreur lors de l'enregistrement du fichier." }, { status: 500 })
    }

    const doc = await prisma.spaceDocument.create({
      data: {
        id: docId,
        name: file.name,
        displayName: null,
        description: null,
        folderId: resolvedFolderId,
        spaceId,
        difyFileId: null,
        storedFilename,
        uploadedById: session.user.id,
        size: file.size,
        mimeType: file.type || null,
        visibleFrom: new Date(),
        visibleUntil: defaultVisibleUntil(),
        isVisible: true,
        diplomeSlug: null,
        anneeUniv: currentAnneeUniv(),
        metadata: JSON.stringify({ hasText: pipeline.hasText, method: pipeline.method, targetDatasetId: null }),
        indexingStatus: 'no_index',
      },
      include: { folder: true },
    })

    await logAction({ userId: session.user.id, action: 'DOCUMENT_UPLOAD', entityType: 'SpaceDocument', entityId: doc.id, entityName: doc.name, spaceId })
    return NextResponse.json({ document: doc }, { status: 201 })
  }

  // ── Group space — resolve target KB ─────────────────────────────────────────
  const targetDatasetId = (spaceGroup.hasKB ? spaceGroup.difyDatasetId : null) || COURS_ACTIFS_DATASET_ID

  const difyDocMetadata = {
    space_id: spaceId,
    folder_id: resolvedFolderId ?? null,
    diplome: spaceGroup.diplomeRef?.slug ?? null,
    ufr: spaceGroup.diplomeRef?.ufr ?? null,
    audience: 'ALL',
    annee_univ: currentAnneeUniv(),
    uploader: session.user.email,
    visible_from: new Date().toISOString(),
    visible_until: defaultVisibleUntil().toISOString(),
    is_visible: true,
    original_filename: file.name,
    processing_method: pipeline.method,
  }

  // ── Scanned PDF (no text) — archive to Dify files, no indexing ──────────────
  if (!pipeline.hasText) {
    let difyFileId = `local-${Date.now()}`
    try {
      const difyForm = new FormData()
      difyForm.append('file', new File([fileBuffer], file.name, { type: file.type }))
      difyForm.append('user', session.user.id)
      const res = await fetch(`${DIFY_BASE_URL}/v1/files/upload`, {
        method: 'POST', headers: { Authorization: `Bearer ${process.env.DIFY_IIIAAS_API_KEY || ''}` }, body: difyForm,
        signal: AbortSignal.timeout(10000),
      })
      if (res.ok) { const d = await res.json(); difyFileId = d.id ?? difyFileId }
    } catch { /* non-blocking */ }

    let doc: Awaited<ReturnType<typeof prisma.spaceDocument.create>>
    try {
      doc = await prisma.spaceDocument.create({
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
          diplomeSlug: spaceGroup.diplomeRef?.slug ?? null,
          anneeUniv: currentAnneeUniv(),
          metadata: JSON.stringify({ hasText: false, method: pipeline.method, targetDatasetId: null }),
          indexingStatus: 'no_index',
        },
        include: { folder: true },
      })
    } catch (err) {
      console.error('[upload] prisma.create failed (scanned):', err)
      return NextResponse.json({ error: "Erreur lors de l'enregistrement en base de données." }, { status: 500 })
    }
    await logAction({ userId: session.user.id, action: 'DOCUMENT_UPLOAD', entityType: 'SpaceDocument', entityId: doc.id, entityName: doc.name, spaceId })
    return NextResponse.json({ document: doc }, { status: 201 })
  }

  // ── No target dataset — fall back to local storage ───────────────────────────
  if (!targetDatasetId) {
    const docId = randomUUID()
    const storedExt = '.' + (file.name.split('.').pop()?.toLowerCase() ?? 'bin')
    const storedFilename = `${docId}${storedExt}`
    try {
      await fs.promises.mkdir(DOCS_STORAGE, { recursive: true })
      await fs.promises.writeFile(path.join(DOCS_STORAGE, storedFilename), fileBuffer)
    } catch (err) {
      console.error('[upload] local write failed (no dataset):', err)
      return NextResponse.json({ error: "Erreur lors de l'enregistrement du fichier." }, { status: 500 })
    }
    const doc = await prisma.spaceDocument.create({
      data: {
        id: docId, name: file.name, displayName: null, description: null,
        folderId: resolvedFolderId, spaceId, difyFileId: null, storedFilename,
        uploadedById: session.user.id, size: file.size, mimeType: file.type || null,
        visibleFrom: new Date(), visibleUntil: defaultVisibleUntil(), isVisible: true,
        diplomeSlug: spaceGroup.diplomeRef?.slug ?? null, anneeUniv: currentAnneeUniv(),
        metadata: JSON.stringify({ hasText: pipeline.hasText, method: pipeline.method, targetDatasetId: null }),
        indexingStatus: 'no_index',
      },
      include: { folder: true },
    })
    await logAction({ userId: session.user.id, action: 'DOCUMENT_UPLOAD', entityType: 'SpaceDocument', entityId: doc.id, entityName: doc.name, spaceId })
    return NextResponse.json({ document: doc }, { status: 201 })
  }

  // ── Queue for BullMQ indexing ─────────────────────────────────────────────────
  const docId = randomUUID()

  // Determine content file to store for the worker
  const useOriginalFile = pipeline.method === 'pdf-dify-native' || !pipeline.content
  let contentBuffer: Buffer
  let difyFilename: string
  let difyMimeType: string

  if (useOriginalFile) {
    contentBuffer = fileBuffer
    difyFilename = file.name
    difyMimeType = file.type || 'application/pdf'
  } else {
    contentBuffer = Buffer.from(pipeline.content, 'utf-8')
    difyFilename = pipeline.filename
    difyMimeType = pipeline.contentType === 'json' ? 'application/json' : 'text/plain; charset=utf-8'
  }

  const contentExt = difyFilename.split('.').pop() ?? 'bin'
  const contentFilename = `${docId}.${contentExt}`
  const contentPath = path.join(QUEUE_STORAGE, contentFilename)

  try {
    await fs.promises.mkdir(QUEUE_STORAGE, { recursive: true })
    await fs.promises.writeFile(contentPath, contentBuffer)
  } catch (err) {
    console.error('[upload] queue storage write failed:', err)
    return NextResponse.json({ error: "Erreur lors de l'enregistrement du fichier." }, { status: 500 })
  }

  let doc: Awaited<ReturnType<typeof prisma.spaceDocument.create>>
  let indexingJobRecord: { id: string }
  try {
    doc = await prisma.spaceDocument.create({
      data: {
        id: docId,
        name: file.name,
        displayName: null,
        description: null,
        folderId: resolvedFolderId,
        spaceId,
        difyFileId: null,
        storedFilename: null,
        uploadedById: session.user.id,
        size: file.size,
        mimeType: file.type || null,
        visibleFrom: new Date(),
        visibleUntil: defaultVisibleUntil(),
        isVisible: true,
        diplomeSlug: spaceGroup.diplomeRef?.slug ?? null,
        anneeUniv: currentAnneeUniv(),
        metadata: JSON.stringify({ hasText: true, method: pipeline.method, targetDatasetId }),
        indexingStatus: 'queued',
      },
      include: { folder: true },
    })

    indexingJobRecord = await prisma.indexingJob.create({
      data: {
        spaceDocumentId: docId,
        userId: session.user.id,
        status: 'queued',
        targetDatasetId,
        metadata: JSON.stringify({ contentPath, filename: difyFilename }),
      },
      select: { id: true },
    })
  } catch (err) {
    console.error('[upload] prisma.create failed:', err)
    await fs.promises.unlink(contentPath).catch(() => {})
    return NextResponse.json({ error: "Erreur lors de l'enregistrement en base de données." }, { status: 500 })
  }

  try {
    await indexingQueue.add('index-doc', {
      docId,
      indexingJobId: indexingJobRecord.id,
      spaceId,
      userId: session.user.id,
      contentPath,
      filename: difyFilename,
      targetDatasetId,
      mimeType: difyMimeType,
      difyDocMetadata,
    })
  } catch (err) {
    console.error('[upload] BullMQ enqueue failed:', err)
    // Don't fail the request — job can be retried via admin or manual re-upload
    // The document is already in DB with 'queued' status; worker won't pick it up
    // but it's better than losing the upload entirely
  }

  await logAction({ userId: session.user.id, action: 'DOCUMENT_UPLOAD', entityType: 'SpaceDocument', entityId: doc.id, entityName: doc.name, spaceId })
  return NextResponse.json({ document: doc }, { status: 201 })
}
