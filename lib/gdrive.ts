import { google } from 'googleapis'
import { prisma } from '@/lib/prisma'
import { encrypt, decrypt } from '@/lib/encryption'

export function createOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.NEXTAUTH_URL}/api/connectors/gdrive/callback`
  )
}

export async function getAuthedClient(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { googleAccessToken: true, googleRefreshToken: true, googleTokenExpiry: true },
  })

  if (!user?.googleAccessToken || !user?.googleRefreshToken) return null

  const oauth2 = createOAuth2Client()
  oauth2.setCredentials({
    access_token: decrypt(user.googleAccessToken),
    refresh_token: decrypt(user.googleRefreshToken),
    expiry_date: user.googleTokenExpiry?.getTime(),
  })

  // Persist refreshed tokens automatically
  oauth2.on('tokens', async (tokens) => {
    const update: Record<string, string | Date> = {}
    if (tokens.access_token) update.googleAccessToken = encrypt(tokens.access_token)
    if (tokens.refresh_token) update.googleRefreshToken = encrypt(tokens.refresh_token)
    if (tokens.expiry_date) update.googleTokenExpiry = new Date(tokens.expiry_date)
    if (Object.keys(update).length > 0) {
      await prisma.user.update({ where: { id: userId }, data: update })
    }
  })

  return oauth2
}
