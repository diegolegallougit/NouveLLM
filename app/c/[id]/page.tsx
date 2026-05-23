import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import ConversationPage from '@/app/ConversationPage'

export const dynamic = 'force-dynamic'

export default async function ConversationRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  // Middleware already ensures auth — session is always valid here
  if (!session?.user?.id) redirect('/')

  const user = session.user as { id: string; name?: string; email?: string; role?: string }

  const conv = await prisma.conversation.findFirst({
    where: { id, userId: user.id },
    select: { id: true },
  })
  if (!conv) redirect('/')

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { onboarded: true, role: true, discipline: true },
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
      discipline={dbUser?.discipline ?? undefined}
      initialConversationId={id}
    />
  )
}
