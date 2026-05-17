import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getSpaceAccess, hasMinimumRole } from '@/lib/space-access'
import { NextRequest, NextResponse } from 'next/server'
import { syncDocVisibilityToDify } from '@/lib/dify-sync'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: spaceId, docId } = await params
  const access = await getSpaceAccess(spaceId, session.user.id)
  if (!access) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!hasMinimumRole(access.role, 'MANAGER')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const space = access.space

  const doc = await prisma.spaceDocument.findFirst({ where: { id: docId, spaceId } })
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json() as {
    isVisible?: boolean
    visibleFrom?: string | null
    visibleUntil?: string | null
  }

  const updated = await prisma.spaceDocument.update({
    where: { id: docId },
    data: {
      ...(body.isVisible !== undefined && { isVisible: body.isVisible }),
      ...(body.visibleFrom !== undefined && { visibleFrom: body.visibleFrom ? new Date(body.visibleFrom) : null }),
      ...(body.visibleUntil !== undefined && { visibleUntil: body.visibleUntil ? new Date(body.visibleUntil) : null }),
    },
  })

  if (space.difyDatasetId && updated.difyFileId) {
    syncDocVisibilityToDify(space.difyDatasetId, updated.difyFileId, {
      isVisible: updated.isVisible,
      visibleFrom: updated.visibleFrom,
      visibleUntil: updated.visibleUntil,
    })
  }

  return NextResponse.json({ document: updated })
}
