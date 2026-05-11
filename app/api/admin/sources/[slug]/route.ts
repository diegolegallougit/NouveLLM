import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const session = await auth()
  const user = session?.user as { id?: string; role?: string } | undefined
  if (!user?.id || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { slug } = await params
  const body = await req.json() as {
    difyDatasetId?: string
    label?: string
    docCount?: number
    access?: string
    groupIds?: string[]
  }

  const source = await prisma.source.findUnique({ where: { slug } })
  if (!source) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const updated = await prisma.source.update({
    where: { slug },
    data: {
      ...(body.difyDatasetId !== undefined && { difyDatasetId: body.difyDatasetId }),
      ...(body.label !== undefined && { label: body.label }),
      ...(body.docCount !== undefined && { docCount: body.docCount }),
      ...(body.access !== undefined && { access: body.access as 'PUBLIC' | 'RESTRICTED' }),
    },
  })

  if (body.groupIds !== undefined) {
    await prisma.groupSource.deleteMany({ where: { sourceId: source.id } })
    if (body.groupIds.length > 0) {
      await prisma.groupSource.createMany({
        data: body.groupIds.map((groupId) => ({ groupId, sourceId: source.id })),
      })
    }
  }

  return NextResponse.json({ source: updated })
}
