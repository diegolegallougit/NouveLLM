import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
  const session = await auth()
  const user = session?.user as { id?: string } | undefined
  if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userGroups = await prisma.userGroup.findMany({
    where: { userId: user.id },
    select: { groupId: true },
  })
  const groupIds = userGroups.map(g => g.groupId)

  const alreadyAnswered = await prisma.surveyResponse.findMany({
    where: { userId: user.id },
    select: { surveyId: true },
  })
  const answeredIds = alreadyAnswered.map(r => r.surveyId)

  const surveys = await prisma.survey.findMany({
    where: {
      active: true,
      id: { notIn: answeredIds },
      OR: [
        { groupId: null },
        { groupId: { in: groupIds } },
      ],
    },
    include: {
      questions: { orderBy: { order: 'asc' } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ surveys })
}
