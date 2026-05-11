export const runtime = 'nodejs'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import archiver from 'archiver'
import { PassThrough } from 'stream'
import { NextResponse } from 'next/server'

function convToMarkdown(conv: {
  title: string | null
  createdAt: Date
  messages: { role: string; content: string; agentUsed: string | null; sources: string | null; createdAt: Date }[]
}): string {
  const lines: string[] = []
  lines.push(`# ${conv.title ?? 'Conversation sans titre'}`)
  lines.push(`*Créée le ${conv.createdAt.toLocaleDateString('fr-FR')}*\n`)

  for (const msg of conv.messages) {
    if (msg.role === 'USER') {
      lines.push(`**Vous**\n\n${msg.content}\n`)
    } else {
      const agent = msg.agentUsed ? ` (@${msg.agentUsed})` : ''
      lines.push(`**NouveLLM**${agent}\n\n${msg.content}`)
      if (msg.sources) {
        try {
          const srcs = JSON.parse(msg.sources) as { title: string; url?: string; domain: string }[]
          if (srcs.length > 0) {
            lines.push('\n*Sources :*')
            srcs.forEach(s => lines.push(`- [${s.title}](${s.url ?? s.domain})`))
          }
        } catch { /* skip */ }
      }
      lines.push('')
    }
  }

  return lines.join('\n')
}

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = session.user.id

  const [conversations, metaPrompts, spaces, userGroups] = await Promise.all([
    prisma.conversation.findMany({
      where: { userId, courseSessionId: null },
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: {
        messages: {
          select: { role: true, content: true, agentUsed: true, sources: true, createdAt: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    }),
    prisma.metaPrompt.findMany({
      where: { authorId: userId, level: 'PERSONAL' },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.documentSpace.findMany({
      where: { ownerId: userId },
      include: { folders: { include: { _count: { select: { documents: true } } } }, _count: { select: { documents: true } } },
    }),
    prisma.userGroup.findMany({
      where: { userId },
      include: { group: { select: { label: true, slug: true } } },
    }),
  ])

  const now = new Date()
  const dateStr = now.toISOString().slice(0, 10)
  const folderName = `nouvellm-export-${dateStr}`

  const pass = new PassThrough()
  const archive = archiver('zip', { zlib: { level: 6 } })
  archive.pipe(pass)

  // conversations/*.md
  for (let i = 0; i < conversations.length; i++) {
    const conv = conversations[i]
    const safe = (conv.title ?? `conversation-${i + 1}`).replace(/[^\w\s-]/g, '').slice(0, 60)
    const filename = `${String(i + 1).padStart(3, '0')}-${safe || `conversation-${i + 1}`}.md`
    archive.append(convToMarkdown(conv), { name: `${folderName}/conversations/${filename}` })
  }

  // meta-prompts.md
  if (metaPrompts.length > 0) {
    const lines = ['# Mes méta-prompts\n']
    for (const mp of metaPrompts) {
      lines.push(`## ${mp.title}`)
      if (mp.description) lines.push(`*${mp.description}*`)
      lines.push(`\`\`\`\n${mp.content}\n\`\`\`\n`)
    }
    archive.append(lines.join('\n'), { name: `${folderName}/meta-prompts.md` })
  }

  // spaces.md
  if (spaces.length > 0) {
    const lines = ['# Mes espaces documentaires\n']
    for (const space of spaces) {
      lines.push(`## ${space.icon} ${space.name}`)
      if (space.description) lines.push(`*${space.description}*`)
      lines.push(`Slug : \`${space.slug}\` — ${space._count.documents} document(s)\n`)
      for (const folder of space.folders) {
        lines.push(`- 📂 ${folder.name} (${folder._count.documents} docs)`)
      }
      lines.push('')
    }
    archive.append(lines.join('\n'), { name: `${folderName}/spaces.md` })
  }

  // metadata.json
  const meta = {
    exportDate: now.toISOString(),
    userId,
    groups: userGroups.map(ug => ({ slug: ug.group.slug, label: ug.group.label })),
    stats: {
      conversations: conversations.length,
      messages: conversations.reduce((s, c) => s + c.messages.length, 0),
      metaPrompts: metaPrompts.length,
      spaces: spaces.length,
    },
  }
  archive.append(JSON.stringify(meta, null, 2), { name: `${folderName}/metadata.json` })

  archive.finalize()

  const chunks: Buffer[] = []
  for await (const chunk of pass) {
    chunks.push(chunk as Buffer)
  }
  const buffer = Buffer.concat(chunks)

  return new Response(buffer, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${folderName}.zip"`,
      'Content-Length': String(buffer.length),
    },
  })
}
