import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

async function requireAdmin() {
  const session = await auth()
  const user = session?.user as { role?: string } | undefined
  if (user?.role !== 'ADMIN') return null
  return user
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const body = await req.json() as { label?: string; niveau?: string; ufr?: string; actif?: boolean }
  const diplome = await prisma.diplomeRef.update({
    where: { id },
    data: {
      ...(body.label !== undefined && { label: body.label.trim() }),
      ...(body.niveau !== undefined && { niveau: body.niveau.trim() }),
      ...(body.ufr !== undefined && { ufr: body.ufr.trim() }),
      ...(body.actif !== undefined && { actif: body.actif }),
    },
  })
  return NextResponse.json({ diplome })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  await prisma.diplomeRef.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
