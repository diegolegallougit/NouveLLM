import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logAction } from '@/lib/audit'
import { processDocument } from '@/lib/document-pipeline'
import { ocrPdfWithPixtral } from '@/lib/ocr-pixtral'
import { currentAnneeUniv, defaultVisibleUntil } from '@/lib/academic-calendar'
import { checkRateLimit } from '@/lib/ratelimit'
import { UploadDocumentSchema } from '@/lib/schemas/spaces.schema'
import { encryptBuffer } from '@/lib/encryption'
import { getSpaceAccess, hasMinimumRole } from '@/lib/space-access'
import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import fs from 'fs'
import path from 'path'

const DOCS_STORAGE = path.join(process.cwd(), '.data', 'space-docs')

const DIFY_BASE_URL = process.env.DIFY_BASE_URL || 'http://172.19.0.13:5001'
// Write ops (create_by_file, update, delete) nécessitent une clé user-scoped (editor) depuis Dify v1.9.0
// Fallback sur DIFY_DATASET_API_KEY pour les instances self-hosted qui l'acceptent encore
const DIFY_WRITE_KEY = process.env.DIFY_KNOWLEDGE_WRITE_KEY || process.env.DIFY_DATASET_API_KEY || ''
const COURS_ACTIFS_DATASET_ID = process.env.DIFY_COURS_ACTIFS_DATASET_ID || ''

const ALLOWED_EXTENSIONS = new Set(['.pdf', '.doc', '.docx', '.txt', '.md', '.csv', '.ppt', '.pptx', '.xls', '.xlsx', '.json'])

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: spaceId } = await params
  const access = await getSpaceAccess(spaceId, session.user.id)
  if (!access) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!hasMinimumRole(access.role, 'READER')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const space = access.space

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
  const access = await getSpaceAccess(spaceId, session.user.id)
  if (!access) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!hasMinimumRole(access.role, 'CONTRIBUTOR')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const space = access.space

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

  const fieldsParsed = UploadDocumentSchema.safeParse({
    folderId: formData.get('folderId') ?? null,
    sourceUrl: formData.get('source_url') ?? undefined,
  })
  if (!fieldsParsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  const folderId = fieldsParsed.data.folderId ?? null
  const sourceUrl = fieldsParsed.data.sourceUrl ?? null

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

  // ── Personal space — store locally + upload to Dify for chat reference ──────
  if (!spaceGroup) {
    const docId = randomUUID()
    const useOriginal = !pipeline.content || pipeline.method === 'pdf-dify-native'
    const storedExt = useOriginal
      ? '.' + (file.name.split('.').pop()?.toLowerCase() ?? 'bin')
      : pipeline.contentType === 'json' ? '.json' : '.md'
    const storedFilename = `${docId}${storedExt}`
    try {
      await fs.promises.mkdir(DOCS_STORAGE, { recursive: true })
      const rawContent = useOriginal ? fileBuffer : Buffer.from(pipeline.content, 'utf-8')
      // TODO: les fichiers antérieurs au chiffrement (avant 2025-12) sont stockés en clair.
      // Migration one-shot à prévoir avant déploiement institutionnel sept. 2026.
      await fs.promises.writeFile(path.join(DOCS_STORAGE, storedFilename), encryptBuffer(rawContent))
    } catch (err) {
      console.error('[upload] local write failed:', err)
      return NextResponse.json({ error: "Erreur lors de l'enregistrement du fichier." }, { status: 500 })
    }

    // Upload vers Dify /v1/files/upload pour référencement dans le chat
    let difyFileId: string | null = null
    try {
      const difyForm = new FormData()
      difyForm.append('file', new File([fileBuffer], file.name, { type: file.type }))
      difyForm.append('user', session.user.id)
      const res = await fetch(`${DIFY_BASE_URL}/v1/files/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.DIFY_IIIAAS_API_KEY || ''}` },
        body: difyForm,
        signal: AbortSignal.timeout(15000),
      })
      if (res.ok) {
        const data = await res.json() as { id?: string }
        difyFileId = data.id ?? null
      } else {
        const errBody = await res.text().catch(() => '')
        console.warn('[upload] Dify /v1/files/upload error:', res.status, errBody.slice(0, 200))
      }
    } catch (err) {
      console.warn('[upload] Dify /v1/files/upload non-blocking failed:', err)
    }

    const doc = await prisma.spaceDocument.create({
      data: {
        id: docId, name: file.name, displayName: null, description: null,
        folderId: resolvedFolderId, spaceId, difyFileId, storedFilename,
        uploadedById: session.user.id, size: file.size, mimeType: file.type || null,
        visibleFrom: new Date(), visibleUntil: defaultVisibleUntil(), isVisible: true,
        diplomeSlug: null, anneeUniv: currentAnneeUniv(),
        metadata: JSON.stringify({ hasText: pipeline.hasText, method: pipeline.method, targetDatasetId: null }),
        indexingStatus: difyFileId ? 'completed' : 'no_index',
      },
      include: { folder: true },
    })
    await logAction({ userId: session.user.id, action: 'DOCUMENT_UPLOAD', entityType: 'SpaceDocument', entityId: doc.id, entityName: doc.name, spaceId })
    return NextResponse.json({ document: doc }, { status: 201 })
  }

  // ── Group space — resolve target KB ──────────────────────────────────────────
  const targetDatasetId = (spaceGroup.hasKB ? spaceGroup.difyDatasetId : null) || COURS_ACTIFS_DATASET_ID

  const difyDocMetadata = {
    space_id: spaceId,
    folder_id: resolvedFolderId ?? null,
    diplome: spaceGroup.diplomeRef?.slug ?? null,
    ufr: spaceGroup.diplomeRef?.ufr ?? null,
    audience: 'ALL',
    annee_univ: currentAnneeUniv(),
    user_ref: session.user.id,
    visible_from: new Date().toISOString(),
    visible_until: defaultVisibleUntil().toISOString(),
    is_visible: true,
    original_filename: file.name,
    processing_method: pipeline.method,
    ...(sourceUrl && { source_url: sourceUrl }),
  }

  // ── Scanned PDF (no text) — archive to Dify files, no KB indexing ────────────
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
          name: file.name, displayName: null, description: null,
          folderId: resolvedFolderId, spaceId, difyFileId,
          uploadedById: session.user.id, size: file.size, mimeType: file.type || null,
          visibleFrom: new Date(), visibleUntil: defaultVisibleUntil(), isVisible: true,
          diplomeSlug: spaceGroup.diplomeRef?.slug ?? null, anneeUniv: currentAnneeUniv(),
          metadata: JSON.stringify({ hasText: false, method: pipeline.method, targetDatasetId: null, ...(sourceUrl && { source_url: sourceUrl }) }),
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

  // ── Upload vers KB Dify via create_by_file ────────────────────────────────────
  let difyBatch: string | null = null
  let difyFileId: string | null = null
  let indexingStatus = targetDatasetId ? 'pending' : 'no_index'

  if (targetDatasetId && pipeline.hasText) {
    try {
      // PDF natif → envoyer le PDF original (Dify extrait nativement)
      // Autres formats → envoyer le contenu converti (txt/md/json)
      let difyFile: File
      if (pipeline.method === 'pdf-dify-native' || !pipeline.content) {
        difyFile = new File([fileBuffer], file.name, { type: file.type || 'application/pdf' })
      } else {
        const contentBlob = new Blob([pipeline.content], {
          type: pipeline.contentType === 'json' ? 'application/json' : 'text/plain; charset=utf-8',
        })
        difyFile = new File([contentBlob], pipeline.filename)
      }

      const difyForm = new FormData()
      difyForm.append('file', difyFile)
      difyForm.append('data', JSON.stringify({
        indexing_technique: 'high_quality',
        process_rule: { mode: 'automatic' },
        doc_metadata: difyDocMetadata,
      }))

      const res = await fetch(
        `${DIFY_BASE_URL}/v1/datasets/${targetDatasetId}/document/create_by_file`,
        { method: 'POST', headers: { Authorization: `Bearer ${DIFY_WRITE_KEY}` }, body: difyForm, signal: AbortSignal.timeout(30000) }
      )

      if (res.ok) {
        const data = await res.json() as { document?: { id: string }; batch?: string }
        difyFileId = data.document?.id ?? null
        difyBatch = data.batch ?? null
      } else {
        const errBody = await res.text().catch(() => '')
        console.error('[upload] Dify create_by_file error:', res.status, errBody.slice(0, 300))
        indexingStatus = 'failed'
      }
    } catch (err) {
      console.warn('[upload] Dify upload failed:', err)
      indexingStatus = 'failed'
    }
  }

  let doc: Awaited<ReturnType<typeof prisma.spaceDocument.create>>
  try {
    doc = await prisma.spaceDocument.create({
      data: {
        name: file.name, displayName: null, description: null,
        folderId: resolvedFolderId, spaceId,
        difyFileId: difyFileId ?? (indexingStatus === 'failed' ? `local-${Date.now()}` : null),
        storedFilename: null,
        uploadedById: session.user.id, size: file.size, mimeType: file.type || null,
        visibleFrom: new Date(), visibleUntil: defaultVisibleUntil(), isVisible: true,
        diplomeSlug: spaceGroup.diplomeRef?.slug ?? null, anneeUniv: currentAnneeUniv(),
        metadata: JSON.stringify({
          difyDocumentId: difyFileId,
          difyBatch,
          hasText: true,
          method: pipeline.method,
          targetDatasetId: targetDatasetId || null,
          ...(sourceUrl && { source_url: sourceUrl }),
        }),
        indexingStatus,
      },
      include: { folder: true },
    })
  } catch (err) {
    console.error('[upload] prisma.create failed:', err)
    return NextResponse.json({ error: "Erreur lors de l'enregistrement en base de données." }, { status: 500 })
  }

  await logAction({ userId: session.user.id, action: 'DOCUMENT_UPLOAD', entityType: 'SpaceDocument', entityId: doc.id, entityName: doc.name, spaceId })
  return NextResponse.json({ document: doc }, { status: 201 })
}
