import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const session = await auth()
  const user = session?.user as { id?: string; role?: string } | undefined
  if (!user?.id || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { slug } = await params
  const body = await req.json() as {
    difyAppId?: string
    difyApiKey?: string
    status?: string
    groupIds?: string[]
  }

  const agent = await prisma.agent.findUnique({ where: { slug } })
  if (!agent) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const updated = await prisma.agent.update({
    where: { slug },
    data: {
      ...(body.difyAppId !== undefined && { difyAppId: body.difyAppId }),
      ...(body.difyApiKey !== undefined && { difyApiKey: body.difyApiKey }),
      ...(body.status !== undefined && { status: body.status as 'ACTIVE' | 'BETA' | 'DISABLED' }),
    },
  })

  // Sync group associations if provided
  if (body.groupIds !== undefined) {
    await prisma.groupAgent.deleteMany({ where: { agentId: agent.id } })
    if (body.groupIds.length > 0) {
      await prisma.groupAgent.createMany({
        data: body.groupIds.map((groupId) => ({ groupId, agentId: agent.id })),
      })
    }
  }

  return NextResponse.json({ agent: updated })
}
