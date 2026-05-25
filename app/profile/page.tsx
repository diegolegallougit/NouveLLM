import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import ProfilePageClient from './ProfilePageClient'

export const dynamic = 'force-dynamic'

export default async function ProfilePage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const user = session.user as { id: string; name?: string; email?: string; role?: string }
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { password: true },
  })

  const initials = (user.name || user.email || 'U')
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <ProfilePageClient
      userName={user.name || user.email || 'Utilisateur'}
      userRole={(user as { role?: string }).role || 'EC'}
      userInitials={initials}
      isCredentials={!!dbUser?.password}
    />
  )
}
