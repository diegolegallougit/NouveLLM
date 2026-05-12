import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getAuthedClient } from '@/lib/gdrive'
import { google } from 'googleapis'
import { NextRequest, NextResponse } from 'next/server'

const DIFY_BASE_URL = process.env.DIFY_BASE_URL || 'http://172.19.0.5:5001'
const DIFY_IIIAAS_KEY = process.env.DIFY_IIIAAS_API_KEY || ''

const GOOGLE_DOCS_MIME = 'application/vnd.google-apps.document'
const EXPORT_MIME = 'text/plain'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { fileId, spaceId } = await req.json() as { fileId?: string; spaceId?: string }
  if (!fileId || !spaceId) return NextResponse.json({ error: 'fileId et spaceId requis' }, { status: 400 })

  const space = await prisma.documentSpace.findFirst({ where: { id: spaceId, ownerId: session.user.id } })
  if (!space) return NextResponse.json({ error: 'Espace introuvable' }, { status: 404 })

  const oauth2 = await getAuthedClient(session.user.id)
  if (!oauth2) return NextResponse.json({ error: 'Google Drive non connecté' }, { status: 403 })

  const drive = google.drive({ version: 'v3', auth: oauth2 })

  // Get file metadata
  const meta = await drive.files.get({ fileId, fields: 'id,name,mimeType,size' })
  const fileName = meta.data.name ?? 'gdrive-file'
  const isGoogleDoc = meta.data.mimeType === GOOGLE_DOCS_MIME

  // Download file content
  let buffer: Buffer
  let mimeType: string
  let finalName: string

  if (isGoogleDoc) {
    const exportResp = await drive.files.export({ fileId, mimeType: EXPORT_MIME }, { responseType: 'arraybuffer' })
    buffer = Buffer.from(exportResp.data as ArrayBuffer)
    mimeType = EXPORT_MIME
    finalName = `${fileName}.txt`
  } else {
    const downloadResp = await drive.files.get({ fileId, alt: 'media' }, { responseType: 'arraybuffer' })
    buffer = Buffer.from(downloadResp.data as ArrayBuffer)
    mimeType = meta.data.mimeType ?? 'application/octet-stream'
    finalName = fileName
  }

  if (buffer.length > 20 * 1024 * 1024) {
    return NextResponse.json({ error: 'Fichier trop volumineux (max 20 MB)' }, { status: 413 })
  }

  // Upload to Dify
  const file = new File([new Uint8Array(buffer)], finalName, { type: mimeType })
  const difyForm = new FormData()
  difyForm.append('file', file)
  difyForm.append('user', session.user.id)

  const difyResp = await fetch(`${DIFY_BASE_URL}/v1/files/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${DIFY_IIIAAS_KEY}` },
    body: difyForm,
  })

  let difyFileId = `gdrive-${Date.now()}`
  if (difyResp.ok) {
    const d = await difyResp.json()
    difyFileId = d.id ?? difyFileId
  }

  const doc = await prisma.spaceDocument.create({
    data: {
      name: finalName,
      displayName: fileName,
      description: 'Importé depuis Google Drive',
      spaceId,
      difyFileId,
      uploadedById: session.user.id,
      size: buffer.length,
      mimeType,
    },
  })

  return NextResponse.json({ document: doc }, { status: 201 })
}
