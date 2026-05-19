import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ProfileUpdateSchema } from '@/lib/schemas/profile.schema'
import { NextRequest, NextResponse } from 'next/server'

const PROFILE_SELECT = {
  discipline: true,
  roleExact: true,
  ufr: true,
  niveauxEnseignement: true,
  languesTravail: true,
  sourcesAcademiques: true,
} as const

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: PROFILE_SELECT,
  })

  return NextResponse.json(user ?? {})
}

export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const parsed = ProfileUpdateSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })
  }

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: parsed.data,
    select: PROFILE_SELECT,
  })

  return NextResponse.json(user)
}
