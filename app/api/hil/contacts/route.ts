import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
  const session = await auth()
  const user = session?.user as { id?: string } | undefined
  if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userGroups = await prisma.userGroup.findMany({
    where: { userId: user.id },
    select: { group: { select: { slug: true } } },
  })
  const groupSlugs = userGroups.map(ug => ug.group.slug)

  const allContacts = await prisma.expertContact.findMany({
    where: { active: true },
    orderBy: { name: 'asc' },
  })

  const contacts = allContacts.filter(c => {
    const scope: string[] = JSON.parse(c.scope)
    return scope.length === 0 || scope.some(s => groupSlugs.includes(s))
  })

  return NextResponse.json({ contacts })
}
