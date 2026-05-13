import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { checkRateLimit } from '@/lib/ratelimit'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const session = await auth()
  const user = session?.user as { id?: string; name?: string } | undefined
  if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!checkRateLimit(user.id, 3, 300_000)) {
    return NextResponse.json({ error: 'Limite atteinte — réessayez dans 5 minutes' }, { status: 429 })
  }

  const body = await req.json() as {
    expertContactId: string
    conversationId?: string
    userMessage: string
    contextSummary: string
  }

  if (!body.expertContactId || !body.contextSummary) {
    return NextResponse.json({ error: 'expertContactId and contextSummary required' }, { status: 400 })
  }

  const expert = await prisma.expertContact.findUnique({ where: { id: body.expertContactId } })
  if (!expert) return NextResponse.json({ error: 'Expert not found' }, { status: 404 })

  const request = await prisma.hILRequest.create({
    data: {
      userId: user.id,
      expertContactId: body.expertContactId,
      conversationId: body.conversationId ?? null,
      contextSummary: body.contextSummary,
      userMessage: body.userMessage,
      status: 'SENT',
    },
  })

  console.info('[HIL] request created', { expertId: expert.id, userId: user.id })

  // TODO: replace with nodemailer in production
  // await sendEmail({
  //   to: expert.contactEmail,
  //   subject: `[NouveLLM] Demande d'accompagnement — ${expert.name}`,
  //   text: `Résumé: ${body.contextSummary}\n\nMessage: ${body.userMessage}`,
  // })

  return NextResponse.json({ request })
}
