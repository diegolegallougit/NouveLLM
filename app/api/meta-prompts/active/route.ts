import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const entry = await prisma.userActiveMetaPrompt.findFirst({
    where: { userId: session.user.id },
    select: { metaPrompt: { select: { id: true, title: true } } },
    orderBy: { activatedAt: 'desc' },
  })

  return NextResponse.json({ active: entry?.metaPrompt ?? null })
}

export async function DELETE() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await prisma.userActiveMetaPrompt.deleteMany({ where: { userId: session.user.id } })

  return NextResponse.json({ ok: true })
}
