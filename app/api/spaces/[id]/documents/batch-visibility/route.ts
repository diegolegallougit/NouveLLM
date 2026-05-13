import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { syncDocVisibilityToDify } from '@/lib/dify-sync'

type BatchAction = 'activate' | 'hide' | 'archive' | 'set-dates'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: spaceId } = await params
  const space = await prisma.documentSpace.findFirst({ where: { id: spaceId, ownerId: session.user.id } })
  if (!space) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json() as {
    docIds: string[]
    action: BatchAction
    visibleFrom?: string | null
    visibleUntil?: string | null
  }

  const { docIds, action } = body
  if (!docIds?.length || !action) {
    return NextResponse.json({ error: 'docIds et action requis' }, { status: 400 })
  }

  let updateData: Record<string, unknown>
  switch (action) {
    case 'activate':
      updateData = { isVisible: true }
      break
    case 'hide':
      updateData = { isVisible: false }
      break
    case 'archive':
      updateData = { visibleUntil: new Date(), isVisible: false }
      break
    case 'set-dates':
      updateData = {
        ...(body.visibleFrom !== undefined && { visibleFrom: body.visibleFrom ? new Date(body.visibleFrom) : null }),
        ...(body.visibleUntil !== undefined && { visibleUntil: body.visibleUntil ? new Date(body.visibleUntil) : null }),
      }
      break
    default:
      return NextResponse.json({ error: 'Action invalide' }, { status: 400 })
  }

  await prisma.spaceDocument.updateMany({
    where: { id: { in: docIds }, spaceId },
    data: updateData,
  })

  // Sync to Dify non-blocking
  if (space.difyDatasetId) {
    const docs = await prisma.spaceDocument.findMany({ where: { id: { in: docIds }, spaceId } })
    for (const doc of docs) {
      if (doc.difyFileId) {
        syncDocVisibilityToDify(space.difyDatasetId, doc.difyFileId, {
          isVisible: doc.isVisible,
          visibleFrom: doc.visibleFrom,
          visibleUntil: doc.visibleUntil,
        })
      }
    }
  }

  return NextResponse.json({ ok: true, updated: docIds.length })
}
