import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const session = await auth()
  const user = session?.user as { id?: string; role?: string } | undefined
  if (!user?.id || user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json() as {
    slug: string
    name: string
    role: string
    description: string
    scope?: string[]
    contactEmail: string
    calendarUrl?: string
    tchapId?: string
  }

  const contact = await prisma.expertContact.create({
    data: {
      slug: body.slug,
      name: body.name,
      role: body.role,
      description: body.description,
      scope: JSON.stringify(body.scope ?? []),
      contactEmail: body.contactEmail,
      calendarUrl: body.calendarUrl,
      tchapId: body.tchapId,
    },
  })

  return NextResponse.json({ contact })
}
