import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { decrypt } from '@/lib/encryption'
import { Client, isFullPage } from '@notionhq/client'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(_req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { notionToken: true } })
  if (!user?.notionToken) return NextResponse.json({ error: 'Notion non connecté' }, { status: 403 })

  const notion = new Client({ auth: decrypt(user.notionToken) })

  const results = await notion.search({
    filter: { property: 'object', value: 'page' },
    sort: { direction: 'descending', timestamp: 'last_edited_time' },
    page_size: 50,
  })

  const pages = results.results
    .filter(isFullPage)
    .map(p => ({
      id: p.id,
      title: extractTitle(p),
      url: p.url,
      lastEdited: p.last_edited_time,
    }))

  return NextResponse.json({ pages })
}

function extractTitle(page: Parameters<typeof isFullPage>[0] & { properties?: Record<string, unknown> }): string {
  if (!('properties' in page)) return 'Sans titre'
  for (const prop of Object.values(page.properties as Record<string, { type: string; title?: Array<{ plain_text: string }> }>)) {
    if (prop.type === 'title' && prop.title?.[0]?.plain_text) return prop.title[0].plain_text
  }
  return 'Sans titre'
}
