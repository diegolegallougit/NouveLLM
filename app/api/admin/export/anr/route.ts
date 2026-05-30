import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  const user = session?.user as { id?: string; role?: string } | undefined
  if (!user?.id || user.role !== 'ADMIN') {
    return new Response('Forbidden', { status: 403 })
  }

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  // Utilisateurs actifs ce mois-ci (EC, BIATSS, ADMIN qui ont des conversations)
  const activeUsers = await prisma.user.count({
    where: {
      deletedAt: null,
      role: { not: 'STUDENT' },
      conversations: {
        some: {
          createdAt: { gte: monthStart },
        },
      },
    },
  })

  // Sessions actives
  const totalSessions = await prisma.courseSession.count({
    where: { status: 'ACTIVE' },
  })

  // Conversations ce mois
  const conversationsThisMonth = await prisma.conversation.count({
    where: {
      createdAt: { gte: monthStart },
    },
  })

  // Tokens consommés (approximatif via messages * 500)
  const messagesThisMonth = await prisma.message.count({
    where: {
      createdAt: { gte: monthStart },
    },
  })
  const estimatedTokens = messagesThisMonth * 500

  // Agents distincts utilisés ce mois
  const agentsWithConvs = await prisma.conversation.findMany({
    where: {
      agentSlug: { not: null },
      createdAt: { gte: monthStart },
    },
    select: { agentSlug: true },
    distinct: ['agentSlug'],
  })
  const agentsUsed = agentsWithConvs.length

  // Utilisateurs inscrits (hors étudiants invités)
  const totalUsers = await prisma.user.count({
    where: { deletedAt: null, role: { not: 'STUDENT' } },
  })

  const lines = [
    'mois,utilisateurs_actifs,sessions_totales,conversations_mois,tokens_estimes,agents_utilises,utilisateurs_inscrits',
    `${period},${activeUsers},${totalSessions},${conversationsThisMonth},${estimatedTokens},${agentsUsed},${totalUsers}`,
  ]

  return new Response(lines.join('\n'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="export-anr-${period}.csv"`,
    },
  })
}
