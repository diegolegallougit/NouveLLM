import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
  const session = await auth()
  const user = session?.user as { id?: string; role?: string } | undefined
  if (!user?.id || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Never expose message content — only metadata
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      onboarded: true,
      deletedAt: true,
      createdAt: true,
      groups: {
        select: {
          group: { select: { slug: true, label: true } },
        },
      },
      conversations: {
        orderBy: { updatedAt: 'desc' },
        take: 1,
        select: { updatedAt: true },
      },
    },
  })

  // Shape: no content, no message text
  const shaped = users.map((u) => ({
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    onboarded: u.onboarded,
    disabled: u.deletedAt !== null,
    createdAt: u.createdAt,
    groups: u.groups.map((g) => g.group.label),
    lastActivity: u.conversations[0]?.updatedAt ?? null,
  }))

  return NextResponse.json({ users: shaped })
}
