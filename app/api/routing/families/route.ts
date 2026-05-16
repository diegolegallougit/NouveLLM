import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userRole = (session.user as { role?: string }).role ?? 'STUDENT'

  const allFamilies = await prisma.routingFamily.findMany({
    where: { active: true },
    orderBy: { order: 'asc' },
    include: {
      questions: {
        orderBy: { order: 'asc' },
        include: {
          options: { orderBy: { order: 'asc' } },
        },
      },
    },
  })

  // Filter by targetRoles — empty string means all roles can see it
  const families = allFamilies.filter(f => {
    if (!f.targetRoles) return true
    const allowed = f.targetRoles.split(',').map(r => r.trim()).filter(Boolean)
    return allowed.length === 0 || allowed.includes(userRole)
  })

  return NextResponse.json({ families })
}
