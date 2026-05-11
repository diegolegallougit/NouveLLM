import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
  const session = await auth()
  const user = session?.user as { id?: string } | undefined
  if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const requests = await prisma.hILRequest.findMany({
    where: { userId: user.id },
    include: { expert: { select: { name: true, role: true, contactEmail: true } } },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ requests })
}
