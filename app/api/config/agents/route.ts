import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      groups: {
        include: {
          group: {
            include: {
              allowedAgents: {
                include: { agent: true },
              },
            },
          },
        },
      },
    },
  })

  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const agentMap = new Map<string, { slug: string; label: string; icon: string; description: string; status: string }>()
  for (const ug of user.groups) {
    for (const ga of ug.group.allowedAgents) {
      const a = ga.agent
      if (a.status !== 'DISABLED') {
        agentMap.set(a.slug, {
          slug: a.slug,
          label: a.label,
          icon: a.icon,
          description: a.description,
          status: a.status,
        })
      }
    }
  }

  return NextResponse.json({ agents: Array.from(agentMap.values()) })
}
