import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { INTEGRATION_CATALOG } from '@/lib/integration-catalog'
import { NextResponse } from 'next/server'

export async function GET() {
  const session = await auth()
  const user = session?.user as { id?: string; role?: string } | undefined
  if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const role = user.role ?? 'EC'

  const [integrations, userData] = await Promise.all([
    prisma.integration.findMany({ where: { enabled: true } }),
    prisma.user.findUnique({
      where: { id: user.id },
      select: { notionToken: true, googleAccessToken: true },
    }),
  ])

  const visible = integrations.filter((i) =>
    i.visibleTo.split(',').map((r) => r.trim()).includes(role)
  )

  const academicSources = visible
    .filter((i) => i.type === 'ACADEMIC_SOURCE')
    .map((i) => {
      const meta = INTEGRATION_CATALOG[i.slug]
      return {
        slug: i.slug,
        label: meta?.label ?? i.slug,
        description: meta?.description ?? '',
        icon: meta?.icon ?? '📄',
      }
    })

  const connectors = visible
    .filter((i) => i.type === 'CONNECTOR')
    .map((i) => {
      const meta = INTEGRATION_CATALOG[i.slug]
      const connected =
        i.slug === 'notion'
          ? !!userData?.notionToken
          : i.slug === 'gdrive'
            ? !!userData?.googleAccessToken
            : false

      return {
        slug: i.slug,
        label: meta?.label ?? i.slug,
        description: meta?.description ?? '',
        icon: meta?.icon ?? '🔌',
        connected,
      }
    })

  return NextResponse.json({ academicSources, connectors })
}
