import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getSpaceAccess, hasMinimumRole } from '@/lib/space-access'
import { NextRequest, NextResponse } from 'next/server'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; folderId: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: spaceId, folderId } = await params
  const access = await getSpaceAccess(spaceId, session.user.id)
  if (!access) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!hasMinimumRole(access.role, 'MANAGER')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { name, description } = body as { name?: string; description?: string }

  const updated = await prisma.documentFolder.update({
    where: { id: folderId, spaceId },
    data: {
      ...(name && { name: name.trim() }),
      ...(description !== undefined && { description: description?.trim() ?? null }),
    },
    include: { _count: { select: { documents: true } } },
  })

  return NextResponse.json({ folder: updated })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; folderId: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: spaceId, folderId } = await params
  const access = await getSpaceAccess(spaceId, session.user.id)
  if (!access) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!hasMinimumRole(access.role, 'MANAGER')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await prisma.documentFolder.delete({ where: { id: folderId, spaceId } })
  return NextResponse.json({ ok: true })
}
