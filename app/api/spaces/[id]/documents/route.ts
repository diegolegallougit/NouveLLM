import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logAction } from '@/lib/audit'
import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const DIFY_BASE_URL = process.env.DIFY_BASE_URL || 'http://172.19.0.5:5001'
const DIFY_IIIAAS_KEY = process.env.DIFY_IIIAAS_API_KEY || ''
const DOCS_STORAGE = path.join(process.cwd(), '.data', 'space-docs')

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

async function autoGenerateMeta(filename: string, textContent?: string): Promise<{ displayName: string; description: string }> {
  const preview = textContent?.slice(0, 500) ?? ''
  const prompt = `Analyse ce fichier et génère exactement deux lignes:
TITRE: [titre clair en français, 5-10 mots, sans guillemets]
DESCRIPTION: [une phrase de 15-25 mots décrivant le contenu, sans guillemets]

Fichier: "${filename}"${preview ? `\nExtrait: "${preview}"` : ''}`

  try {
    const resp = await fetch(`${DIFY_BASE_URL}/v1/chat-messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${DIFY_IIIAAS_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        inputs: {},
        query: prompt,
        response_mode: 'blocking',
        user: 'system-autogen',
      }),
      signal: AbortSignal.timeout(15000),
    })

    if (!resp.ok) throw new Error('Dify error')
    const data = await resp.json()
    const text: string = data.answer ?? ''

    const titleMatch = text.match(/TITRE\s*:\s*(.+)/i)
    const descMatch = text.match(/DESCRIPTION\s*:\s*(.+)/i)

    return {
      displayName: titleMatch?.[1]?.trim() ?? cleanFilename(filename),
      description: descMatch?.[1]?.trim() ?? '',
    }
  } catch {
    return { displayName: cleanFilename(filename), description: '' }
  }
}

function cleanFilename(name: string): string {
  return name.replace(/\.[^.]+$/, '').replace(/[_-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).trim()
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: spaceId } = await params
  const space = await prisma.documentSpace.findFirst({ where: { id: spaceId, ownerId: session.user.id } })
  if (!space) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const folderId = formData.get('folderId') as string | null

  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  if (file.size > 20 * 1024 * 1024) return NextResponse.json({ error: 'File too large (max 20 MB)' }, { status: 413 })

  const ext = '.' + (file.name.split('.').pop()?.toLowerCase() ?? '')
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return NextResponse.json({ error: `Format non supporté (${ext}). Formats acceptés : pdf, docx, pptx, xlsx, txt, md, csv` }, { status: 400 })
  }

  // Read buffer before sending to Dify (Blob supports multiple reads)
  const fileBuffer = Buffer.from(await file.arrayBuffer())

  // Upload to Dify files API
  const difyForm = new FormData()
  difyForm.append('file', new File([fileBuffer], file.name, { type: file.type }))
  difyForm.append('user', session.user.id)

  const difyResp = await fetch(`${DIFY_BASE_URL}/v1/files/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${DIFY_IIIAAS_KEY}` },
    body: difyForm,
  })

  let difyFileId = `local-${Date.now()}`
  if (difyResp.ok) {
    const difyData = await difyResp.json()
    difyFileId = difyData.id ?? difyFileId
  }

  // Auto-generate displayName + description
  let textContent: string | undefined
  if (file.type.startsWith('text/') || file.name.endsWith('.md') || file.name.endsWith('.txt')) {
    try { textContent = fileBuffer.toString('utf-8') } catch { /* skip */ }
  }

  const { displayName, description } = await autoGenerateMeta(file.name, textContent)

  // Validate folderId belongs to this space
  let resolvedFolderId: string | null = null
  if (folderId) {
    const folder = await prisma.documentFolder.findFirst({ where: { id: folderId, spaceId } })
    resolvedFolderId = folder?.id ?? null
  }

  const doc = await prisma.spaceDocument.create({
    data: {
      name: file.name,
      displayName,
      description: description || null,
      folderId: resolvedFolderId,
      spaceId,
      difyFileId,
      uploadedById: session.user.id,
      size: file.size,
      mimeType: file.type || null,
    },
    include: { folder: true },
  })

  // Save file locally for future downloads
  await fs.promises.mkdir(DOCS_STORAGE, { recursive: true })
  await fs.promises.writeFile(path.join(DOCS_STORAGE, doc.id), fileBuffer)

  await logAction({
    userId: session.user.id,
    action: 'DOCUMENT_UPLOAD',
    entityType: 'SpaceDocument',
    entityId: doc.id,
    entityName: doc.displayName ?? doc.name,
    spaceId,
  })

  return NextResponse.json({ document: doc }, { status: 201 })
}
