import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { isVisible } from '@/lib/permissions'
import SpacesPageClient from './SpacesPageClient'

export default async function SpacesPage() {
  const session = await auth()
  const user = session?.user as { id?: string; role?: string } | undefined
  if (!user?.id) redirect('/login')
  if (user.role === 'STUDENT') redirect('/')

  const role = (user.role ?? 'EC') as Parameters<typeof isVisible>[1]

  const spaces = await prisma.documentSpace.findMany({
    where: { ownerId: user.id },
    orderBy: { createdAt: 'asc' },
    include: {
      folders: {
        orderBy: { createdAt: 'asc' },
        include: {
          _count: { select: { documents: true } },
          children: {
            include: { _count: { select: { documents: true } } },
          },
        },
        where: { parentId: null },
      },
      _count: { select: { documents: true } },
    },
  })

  const sharedSpaces = await prisma.documentSpace.findMany({
    where: { ownerId: { not: user.id } },
    orderBy: { createdAt: 'asc' },
    select: { id: true, name: true, icon: true, description: true, audience: true },
  })

  const visibleShared = sharedSpaces.filter((s) => isVisible(s.audience, role))

  return <SpacesPageClient initialSpaces={spaces} sharedSpaces={visibleShared} userRole={role} />
}
