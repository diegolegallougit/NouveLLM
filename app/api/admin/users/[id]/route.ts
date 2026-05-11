import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  const user = session?.user as { id?: string; role?: string } | undefined
  if (!user?.id || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json() as { action: 'disable' | 'enable' | 'set_role'; role?: string }

  const target = await prisma.user.findUnique({ where: { id }, select: { id: true, email: true } })
  if (!target) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (body.action === 'disable') {
    await prisma.user.update({
      where: { id },
      data: { deletedAt: new Date() },
    })
  } else if (body.action === 'enable') {
    await prisma.user.update({
      where: { id },
      data: { deletedAt: null },
    })
  } else if (body.action === 'set_role' && body.role) {
    await prisma.user.update({
      where: { id },
      data: { role: body.role as 'STUDENT' | 'EC' | 'ADMIN' },
    })
  }

  return NextResponse.json({ ok: true })
}
