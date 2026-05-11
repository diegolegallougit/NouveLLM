import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function DELETE() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const id = session.user.id

  // Delete all conversations (messages cascade)
  await prisma.conversation.deleteMany({ where: { userId: id } })

  // Soft-delete: anonymize user data and mark deletedAt
  await prisma.user.update({
    where: { id },
    data: {
      email: `deleted_${id}@deleted.local`,
      name: null,
      password: null,
      deletedAt: new Date(),
    },
  })

  return NextResponse.json({ ok: true })
}
