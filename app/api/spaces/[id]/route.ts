import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

async function getSpaceForUser(id: string, userId: string) {
  return prisma.documentSpace.findFirst({ where: { id, ownerId: userId } })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const space = await getSpaceForUser(id, session.user.id)
  if (!space) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const { name, description, icon, enrichmentGroups, audience } = body as {
    name?: string
    description?: string
    icon?: string
    enrichmentGroups?: string[]
    audience?: string
  }

  const updated = await prisma.documentSpace.update({
    where: { id },
    data: {
      ...(name && { name: name.trim() }),
      ...(description !== undefined && { description: description?.trim() ?? null }),
      ...(icon && { icon }),
      ...(enrichmentGroups !== undefined && { enrichmentGroups: JSON.stringify(enrichmentGroups) }),
      ...(audience && { audience: audience as never }),
    },
  })

  return NextResponse.json({ space: updated })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const space = await getSpaceForUser(id, session.user.id)
  if (!space) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.documentSpace.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
