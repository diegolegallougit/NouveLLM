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

  // Alerte système visible dans le panel admin (/admin)
  await prisma.systemAlert.create({
    data: {
      type: 'REPORT',
      message: `Signalement : "${subject.trim()}" — ${name.trim()}`,
      metadata: JSON.stringify({ reportId: report.id, email: email?.trim() ?? null }),
    },
  }).catch(() => { /* ne doit jamais bloquer le signalement */ })

  // Log email admin (intégration SMTP à brancher via ADMIN_EMAIL)
  if (process.env.ADMIN_EMAIL) {
    console.info(`[REPORT] id=${report.id} sujet="${subject.trim()}" de ${name.trim()} <${email ?? 'anonyme'}> → ${process.env.ADMIN_EMAIL}`)
  }

  return NextResponse.json({ ok: true, id: report.id })
}
