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
              allowedSources: {
                include: { source: true },
              },
            },
          },
        },
      },
    },
  })

  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const sourceMap = new Map<string, { slug: string; label: string; icon: string; description: string; docCount: number | null; access: string }>()
  for (const ug of user.groups) {
    for (const gs of ug.group.allowedSources) {
      const s = gs.source
      sourceMap.set(s.slug, {
        slug: s.slug,
        label: s.label,
        icon: s.icon,
        description: s.description,
        docCount: s.docCount,
        access: s.access,
      })
    }
  }

  return NextResponse.json({ sources: Array.from(sourceMap.values()) })
}
