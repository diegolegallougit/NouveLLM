import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logAction } from '@/lib/audit'
import { NextRequest, NextResponse } from 'next/server'

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
