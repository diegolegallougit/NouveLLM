import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  const user = session?.user as { id?: string; role?: string } | undefined
  if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json() as { status: 'PENDING' | 'SENT' | 'COMPLETED' }

  const allowedStatuses: string[] = user.role === 'ADMIN' ? ['PENDING', 'SENT', 'COMPLETED'] : ['PENDING']
  if (!allowedStatuses.includes(body.status)) {
    return NextResponse.json({ error: 'Forbidden — statut réservé aux admins' }, { status: 403 })
  }

  const existing = await prisma.hILRequest.findFirst({ where: { id, userId: user.id } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const updated = await prisma.hILRequest.update({
    where: { id },
    data: { status: body.status },
  })

  return NextResponse.json({ request: updated })
}
