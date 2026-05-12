import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const session = await auth()
  const user = session?.user as { id?: string } | undefined

  const body = await req.json() as {
    name?: string
    email?: string
    subject?: string
    message?: string
  }

  const { name, email, subject, message } = body

  if (!name?.trim() || !subject?.trim() || !message?.trim()) {
    return NextResponse.json({ error: 'name, subject et message sont requis' }, { status: 400 })
  }

  const report = await prisma.report.create({
    data: {
      name: name.trim(),
      email: email?.trim() || null,
      subject: subject.trim(),
      message: message.trim(),
      userId: user?.id ?? null,
    },
  })

  return NextResponse.json({ ok: true, id: report.id })
}
