import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  const user = session?.user as { id?: string } | undefined
  if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json() as { answers: number[] }

  const survey = await prisma.survey.findUnique({
    where: { id },
    include: { questions: { orderBy: { order: 'asc' } } },
  })
  if (!survey || !survey.active) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const existing = await prisma.surveyResponse.findUnique({
    where: { surveyId_userId: { surveyId: id, userId: user.id } },
  })
  if (existing) return NextResponse.json({ error: 'Already answered' }, { status: 409 })

  const score = survey.questions.reduce((acc, q, i) => {
    if (q.correct !== null && q.correct !== undefined && body.answers[i] === q.correct) return acc + 1
    return acc
  }, 0)

  const tokenEarned = survey.tokenReward

  await prisma.surveyResponse.create({
    data: {
      surveyId: id,
      userId: user.id,
      answers: JSON.stringify(body.answers),
      score,
      tokenEarned,
    },
  })

  return NextResponse.json({ score, total: survey.questions.length, tokenEarned })
}
