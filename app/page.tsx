import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import ConversationPage from './ConversationPage'

export default async function HomePage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const user = session.user as { id: string; name?: string; email?: string; role?: string }

  // Fresh DB read for onboarded status (not cached in JWT)
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { onboarded: true, role: true },
  })

  const initials = (user.name || user.email || 'U')
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <ConversationPage
      userName={user.name || user.email || 'Utilisateur'}
      userRole={dbUser?.role || user.role || 'EC'}
      userInitials={initials}
      userId={user.id}
      needsOnboarding={!dbUser?.onboarded}
    />
  )
}
