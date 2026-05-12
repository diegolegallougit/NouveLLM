import { auth } from '@/lib/auth'
import { getAuthedClient } from '@/lib/gdrive'
import { google } from 'googleapis'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(_req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const oauth2 = await getAuthedClient(session.user.id)
  if (!oauth2) return NextResponse.json({ error: 'Google Drive non connecté' }, { status: 403 })

  const drive = google.drive({ version: 'v3', auth: oauth2 })
  const resp = await drive.files.list({
    pageSize: 50,
    orderBy: 'modifiedTime desc',
    fields: 'files(id,name,mimeType,modifiedTime,size)',
    q: "trashed=false and (mimeType='application/pdf' or mimeType='text/plain' or mimeType='application/vnd.google-apps.document' or mimeType contains 'word')",
  })

  const files = (resp.data.files ?? []).map(f => ({
    id: f.id,
    name: f.name,
    mimeType: f.mimeType,
    modifiedTime: f.modifiedTime,
    size: f.size ? parseInt(f.size) : null,
  }))

  return NextResponse.json({ files })
}
