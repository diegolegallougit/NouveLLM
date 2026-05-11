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

  // Get user's groups quota (take highest)
  const userGroups = await prisma.userGroup.findMany({
    where: { userId: session.user.id },
    include: { group: { select: { quotaTokens: true } } },
  })
  const quotaTokens = userGroups.reduce(
    (max, ug) => Math.max(max, ug.group.quotaTokens),
    100000
  )

  // Sum tokens used this month
  const messages = await prisma.message.findMany({
    where: {
      conversation: { userId: session.user.id },
      role: 'ASSISTANT',
      createdAt: { gte: monthStart },
    },
    select: { tokenCount: true, content: true },
  })

  const tokensUsed = messages.reduce((sum, m) => {
    // Use stored count or estimate from content length (~4 chars/token)
    return sum + (m.tokenCount ?? Math.ceil(m.content.length / 4))
  }, 0)

  const pct = Math.min(100, Math.round((tokensUsed / quotaTokens) * 100))
  const available = Math.max(0, 100 - pct)

  return NextResponse.json({ tokensUsed, quotaTokens, pct, available })
}
