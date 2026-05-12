import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { decrypt } from '@/lib/encryption'
import { Client, isFullBlock } from '@notionhq/client'
import type { BlockObjectResponse } from '@notionhq/client/build/src/api-endpoints'
import { NextRequest, NextResponse } from 'next/server'

const DIFY_BASE_URL = process.env.DIFY_BASE_URL || 'http://172.19.0.5:5001'
const DIFY_IIIAAS_KEY = process.env.DIFY_IIIAAS_API_KEY || ''

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { pageId, spaceId } = await req.json() as { pageId?: string; spaceId?: string }
  if (!pageId || !spaceId) return NextResponse.json({ error: 'pageId et spaceId requis' }, { status: 400 })

  // Verify space ownership
  const space = await prisma.documentSpace.findFirst({ where: { id: spaceId, ownerId: session.user.id } })
  if (!space) return NextResponse.json({ error: 'Espace introuvable' }, { status: 404 })

  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { notionToken: true } })
  if (!user?.notionToken) return NextResponse.json({ error: 'Notion non connecté' }, { status: 403 })

  const notion = new Client({ auth: decrypt(user.notionToken) })

  // Fetch page metadata
  const page = await notion.pages.retrieve({ page_id: pageId })
  const title = extractPageTitle(page)

  // Fetch all blocks recursively
  const markdown = await blocksToMarkdown(notion, pageId)
  const filename = `${title.replace(/[^a-z0-9\s-]/gi, '').trim() || 'notion-page'}.md`

  // Upload to Dify
  const file = new File([markdown], filename, { type: 'text/markdown' })
  const difyForm = new FormData()
  difyForm.append('file', file)
  difyForm.append('user', session.user.id)

  const difyResp = await fetch(`${DIFY_BASE_URL}/v1/files/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${DIFY_IIIAAS_KEY}` },
    body: difyForm,
  })

  let difyFileId = `notion-${Date.now()}`
  if (difyResp.ok) {
    const d = await difyResp.json()
    difyFileId = d.id ?? difyFileId
  }

  const doc = await prisma.spaceDocument.create({
    data: {
      name: filename,
      displayName: title,
      description: `Importé depuis Notion`,
      spaceId,
      difyFileId,
      uploadedById: session.user.id,
      size: Buffer.byteLength(markdown, 'utf8'),
      mimeType: 'text/markdown',
    },
  })

  return NextResponse.json({ document: doc }, { status: 201 })
}

async function blocksToMarkdown(notion: Client, blockId: string, depth = 0): Promise<string> {
  const lines: string[] = []
  let cursor: string | undefined

  do {
    const resp = await notion.blocks.children.list({ block_id: blockId, page_size: 100, start_cursor: cursor })
    cursor = resp.next_cursor ?? undefined

    for (const block of resp.results) {
      if (!isFullBlock(block)) continue
      lines.push(blockToMd(block as BlockObjectResponse, depth))
      if (block.has_children) {
        lines.push(await blocksToMarkdown(notion, block.id, depth + 1))
      }
    }
  } while (cursor)

  return lines.join('\n')
}

function blockToMd(block: BlockObjectResponse, depth: number): string {
  const indent = '  '.repeat(depth)
  type RichText = { plain_text: string }
  const rt = (items: RichText[]) => items.map(t => t.plain_text).join('')

  switch (block.type) {
    case 'heading_1': return `\n# ${rt(block.heading_1.rich_text)}\n`
    case 'heading_2': return `\n## ${rt(block.heading_2.rich_text)}\n`
    case 'heading_3': return `\n### ${rt(block.heading_3.rich_text)}\n`
    case 'paragraph': return `${indent}${rt(block.paragraph.rich_text)}\n`
    case 'bulleted_list_item': return `${indent}- ${rt(block.bulleted_list_item.rich_text)}`
    case 'numbered_list_item': return `${indent}1. ${rt(block.numbered_list_item.rich_text)}`
    case 'to_do': return `${indent}- [${block.to_do.checked ? 'x' : ' '}] ${rt(block.to_do.rich_text)}`
    case 'toggle': return `${indent}**${rt(block.toggle.rich_text)}**`
    case 'quote': return `> ${rt(block.quote.rich_text)}`
    case 'code': return `\`\`\`${block.code.language}\n${rt(block.code.rich_text)}\n\`\`\``
    case 'divider': return '\n---\n'
    case 'callout': return `> ${rt(block.callout.rich_text)}`
    default: return ''
  }
}

function extractPageTitle(page: Awaited<ReturnType<Client['pages']['retrieve']>>): string {
  if (!('properties' in page)) return 'Sans titre'
  for (const prop of Object.values(page.properties as Record<string, { type: string; title?: Array<{ plain_text: string }> }>)) {
    if (prop.type === 'title' && prop.title?.[0]?.plain_text) return prop.title[0].plain_text
  }
  return 'Sans titre'
}
