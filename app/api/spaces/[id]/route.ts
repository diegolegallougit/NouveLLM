import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getSpaceAccess, hasMinimumRole } from '@/lib/space-access'
import { NextRequest, NextResponse } from 'next/server'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const access = await getSpaceAccess(id, session.user.id)
  if (!access) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!hasMinimumRole(access.role, 'MANAGER')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

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
  const access = await getSpaceAccess(id, session.user.id)
  if (!access) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (access.role !== 'OWNER') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await prisma.documentSpace.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
