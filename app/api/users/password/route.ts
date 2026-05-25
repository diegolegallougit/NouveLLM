export const runtime = 'nodejs'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'

export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({})) as Record<string, unknown>
  const { current, next, confirm } = body as { current?: string; next?: string; confirm?: string }

  if (!current || !next || !confirm)
    return NextResponse.json({ error: 'Champs manquants' }, { status: 400 })
  if (next !== confirm)
    return NextResponse.json({ error: 'Les mots de passe ne correspondent pas' }, { status: 400 })
  if (next.length < 8)
    return NextResponse.json({ error: 'Minimum 8 caractères requis' }, { status: 400 })

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { password: true },
  })

  if (!user?.password)
    return NextResponse.json({ error: 'Compte SSO — pas de mot de passe local' }, { status: 403 })

  const valid = await bcrypt.compare(current, user.password)
  if (!valid)
    return NextResponse.json({ error: 'Mot de passe actuel incorrect' }, { status: 401 })

  const hashed = await bcrypt.hash(next, 12)
  await prisma.user.update({ where: { id: session.user.id }, data: { password: hashed } })

  return NextResponse.json({ ok: true })
}
