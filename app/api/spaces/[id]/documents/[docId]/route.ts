import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logAction } from '@/lib/audit'
import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const DOCS_STORAGE = path.join(process.cwd(), '.data', 'space-docs')

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string; docId: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: spaceId, docId } = await params
  const space = await prisma.documentSpace.findFirst({ where: { id: spaceId, ownerId: session.user.id } })
  if (!space) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const doc = await prisma.spaceDocument.findFirst({ where: { id: docId, spaceId } })
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const filePath = path.join(DOCS_STORAGE, docId)
  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: 'Fichier non disponible au téléchargement' }, { status: 404 })
  }

  const buffer = await fs.promises.readFile(filePath)

  await logAction({
    userId: session.user.id,
    action: 'DOCUMENT_DOWNLOAD',
    entityType: 'SpaceDocument',
    entityId: docId,
    entityName: doc.displayName ?? doc.name,
    spaceId,
  })

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': doc.mimeType ?? 'application/octet-stream',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(doc.name)}`,
      'Content-Length': buffer.length.toString(),
    },
  })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; docId: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: spaceId, docId } = await params
  const space = await prisma.documentSpace.findFirst({ where: { id: spaceId, ownerId: session.user.id } })
  if (!space) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const { displayName, description, folderId } = body as {
    displayName?: string
    description?: string
    folderId?: string | null
  }

  // Validate folderId if provided
  if (folderId !== undefined && folderId !== null) {
    const folder = await prisma.documentFolder.findFirst({ where: { id: folderId, spaceId } })
    if (!folder) return NextResponse.json({ error: 'Invalid folderId' }, { status: 400 })
  }

  const existing = await prisma.spaceDocument.findUnique({ where: { id: docId }, select: { name: true, displayName: true } })

  const doc = await prisma.spaceDocument.update({
    where: { id: docId },
    data: {
      ...(displayName !== undefined && { displayName: displayName?.trim() ?? null }),
      ...(description !== undefined && { description: description?.trim() ?? null }),
      ...(folderId !== undefined && { folderId: folderId ?? null }),
    },
    include: { folder: true },
  })

  if (displayName !== undefined && displayName !== existing?.displayName) {
    await logAction({
      userId: session.user.id,
      action: 'DOCUMENT_RENAME',
      entityType: 'SpaceDocument',
      entityId: docId,
      entityName: displayName?.trim() ?? existing?.name ?? docId,
      spaceId,
    })
  }

  return NextResponse.json({ document: doc })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; docId: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: spaceId, docId } = await params
  const space = await prisma.documentSpace.findFirst({ where: { id: spaceId, ownerId: session.user.id } })
  if (!space) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const doc = await prisma.spaceDocument.findUnique({ where: { id: docId }, select: { name: true, displayName: true } })
  await prisma.spaceDocument.delete({ where: { id: docId } })

  await logAction({
    userId: session.user.id,
    action: 'DOCUMENT_DELETE',
    entityType: 'SpaceDocument',
    entityId: docId,
    entityName: doc?.displayName ?? doc?.name ?? docId,
    spaceId,
  })

  return NextResponse.json({ ok: true })
}
