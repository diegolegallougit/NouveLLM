import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import SpacesPageClient from './SpacesPageClient'

export default async function SpacesPage() {
  const session = await auth()
  const user = session?.user as { id?: string; role?: string } | undefined
  if (!user?.id) redirect('/login')
  if (user.role === 'STUDENT') redirect('/')

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

  return <SpacesPageClient initialSpaces={spaces} />
}
