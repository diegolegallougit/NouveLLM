import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createOAuth2Client } from '@/lib/gdrive'
import { randomBytes } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(_req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return NextResponse.json({ error: 'Google OAuth non configuré' }, { status: 503 })
  }

  const csrfToken = randomBytes(32).toString('hex')
  await prisma.user.update({
    where: { id: session.user.id },
    data: { gdriveOAuthState: csrfToken },
  })

  const oauth2 = createOAuth2Client()
  const url = oauth2.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: ['https://www.googleapis.com/auth/drive.readonly'],
    state: `${session.user.id}:${csrfToken}`,
  })

  return NextResponse.redirect(url)
}
