import { prisma } from '@/lib/prisma'
import { createOAuth2Client } from '@/lib/gdrive'
import { encrypt } from '@/lib/encryption'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const userId = searchParams.get('state')
  const error = searchParams.get('error')

  if (error || !code || !userId) {
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/?gdrive_error=1`)
  }

  const oauth2 = createOAuth2Client()
  const { tokens } = await oauth2.getToken(code)

  if (!tokens.access_token || !tokens.refresh_token) {
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/?gdrive_error=2`)
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      googleAccessToken: encrypt(tokens.access_token),
      googleRefreshToken: encrypt(tokens.refresh_token),
      googleTokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
    },
  })

  return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/?gdrive_connected=1`)
}
