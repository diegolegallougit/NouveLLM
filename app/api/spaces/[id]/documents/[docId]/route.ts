import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
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

  const doc = await prisma.spaceDocument.update({
    where: { id: docId },
    data: {
      ...(displayName !== undefined && { displayName: displayName?.trim() ?? null }),
      ...(description !== undefined && { description: description?.trim() ?? null }),
      ...(folderId !== undefined && { folderId: folderId ?? null }),
    },
    include: { folder: true },
  })

  return NextResponse.json({ document: doc })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; docId: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: spaceId, docId } = await params
  const space = await prisma.documentSpace.findFirst({ where: { id: spaceId, ownerId: session.user.id } })
  if (!space) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.spaceDocument.delete({ where: { id: docId } })
  return NextResponse.json({ ok: true })
}
