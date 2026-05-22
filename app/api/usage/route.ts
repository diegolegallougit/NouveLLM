import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  const messages = await prisma.message.findMany({
    where: {
      conversation: { userId: session.user.id },
      role: 'ASSISTANT',
      createdAt: { gte: monthStart },
    },
    select: { tokenCount: true, content: true },
  })

  const tokensUsed = messages.reduce(
    (sum, m) => sum + (m.tokenCount ?? Math.ceil(m.content.length / 4)),
    0
  )

  return NextResponse.json({ tokensUsed })
}
