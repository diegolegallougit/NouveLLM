import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { encrypt, decrypt } from '@/lib/encryption'
import { Client } from '@notionhq/client'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { token } = await req.json() as { token?: string }
  if (!token?.trim()) return NextResponse.json({ error: 'Token requis' }, { status: 400 })

  // Verify the token works before saving
  try {
    const notion = new Client({ auth: token.trim() })
    await notion.users.me({})
  } catch {
    return NextResponse.json({ error: 'Token Notion invalide' }, { status: 422 })
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { notionToken: encrypt(token.trim()) },
  })

  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await prisma.user.update({
    where: { id: session.user.id },
    data: { notionToken: null },
  })

  return NextResponse.json({ ok: true })
}

export async function GET(_req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { notionToken: true } })
  const connected = !!user?.notionToken

  // Return bot info if connected
  if (connected) {
    try {
      const notion = new Client({ auth: decrypt(user!.notionToken!) })
      const me = await notion.users.me({})
      return NextResponse.json({ connected: true, name: me.name ?? 'Notion' })
    } catch {
      return NextResponse.json({ connected: false })
    }
  }

  return NextResponse.json({ connected: false })
}
