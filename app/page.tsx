import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import ConversationPage from './ConversationPage'

export default async function HomePage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const user = session.user as { id: string; name?: string; email?: string; role?: string }
  const initials = (user.name || user.email || 'U')
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <ConversationPage
      userName={user.name || user.email || 'Utilisateur'}
      userRole={user.role || 'EC'}
      userInitials={initials}
      userId={user.id}
    />
  )
}
