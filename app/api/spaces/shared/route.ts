import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isVisible } from '@/lib/permissions'
import { NextResponse } from 'next/server'

export async function GET() {
  const session = await auth()
  const user = session?.user as { id?: string; role?: string } | undefined
  if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const role = (user.role ?? 'EC') as Parameters<typeof isVisible>[1]

  const spaces = await prisma.documentSpace.findMany({
    where: { ownerId: { not: user.id } },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      name: true,
      icon: true,
      description: true,
      audience: true,
    },
  })

  const visible = spaces.filter((s) => isVisible(s.audience, role))

  return NextResponse.json({ spaces: visible })
}
