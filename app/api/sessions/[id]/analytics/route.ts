import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

// Stopwords French + English to filter out of keyword extraction
const STOPWORDS = new Set([
  'le','la','les','de','du','des','un','une','à','au','aux','et','en','est','je','tu','il','elle',
  'nous','vous','ils','elles','ce','se','sa','son','ses','mon','ma','mes','ton','ta','tes',
  'que','qui','qu','ne','pas','plus','sur','dans','par','pour','avec','sans','ou','mais','donc',
  'or','ni','car','si','très','bien','aussi','plus','moins','tout','tous','même','autre','encore',
  'the','a','an','of','to','in','is','it','and','or','for','with','on','at','from','as',
  'this','that','was','are','be','been','have','has','not','do','what','how','why','when',
  'comment','quoi','quel','quelle','quels','quelles','dont','où','leur','leurs','nous','vous',
  'on','y','c','j','m','t','s','l','d','n','qu','j\'',
])

function extractKeywords(texts: string[], top = 5): string[] {
  const freq: Record<string, number> = {}
  for (const text of texts) {
    const words = text
      .toLowerCase()
      .replace(/[^\p{L}\s]/gu, ' ')
      .split(/\s+/)
      .filter(w => w.length > 3 && !STOPWORDS.has(w))
    for (const w of words) {
      freq[w] = (freq[w] ?? 0) + 1
    }
  }
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, top)
    .map(([w]) => w)
}

function detectBlocking(messages: { role: string; content: string }[]): number {
  let count = 0
  const userMsgs = messages.filter(m => m.role === 'USER')
  for (let i = 0; i < userMsgs.length; i++) {
    const words = userMsgs[i].content.trim().split(/\s+/).length
    if (words < 10) count++
    else if (i > 0) {
      const prev = userMsgs[i - 1].content.toLowerCase().slice(0, 60)
      const curr = userMsgs[i].content.toLowerCase().slice(0, 60)
      const overlap = prev.split(' ').filter(w => curr.includes(w)).length
      if (overlap > 4) count++
    }
  }
  return count
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  const user = session?.user as { id?: string } | undefined
  if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const courseSession = await prisma.courseSession.findUnique({
    where: { id },
    select: { ecUserId: true, visibility: true, maxParticipants: true },
  })
  if (!courseSession) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (courseSession.ecUserId !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Gather conversations + messages for this session
  const conversations = await prisma.conversation.findMany({
    where: { courseSessionId: id },
    include: {
      messages: { select: { role: true, content: true, createdAt: true }, orderBy: { createdAt: 'asc' } },
    },
  })

  const activeStudents = new Set(conversations.map(c => c.userId)).size
  const totalMessages = conversations.reduce((sum, c) => sum + c.messages.filter(m => m.role === 'USER').length, 0)

  // Average duration: last message time - first message time per conversation (in minutes)
  let totalDurationMin = 0
  let convsWithDuration = 0
  for (const c of conversations) {
    if (c.messages.length >= 2) {
      const first = c.messages[0].createdAt.getTime()
      const last = c.messages[c.messages.length - 1].createdAt.getTime()
      totalDurationMin += (last - first) / 60000
      convsWithDuration++
    }
  }
  const avgDuration = convsWithDuration > 0 ? Math.round(totalDurationMin / convsWithDuration) : 0

  // Keywords from all user messages
  const userTexts = conversations.flatMap(c => c.messages.filter(m => m.role === 'USER').map(m => m.content))
  const keywords = extractKeywords(userTexts, 5)

  // Blocking moments across all conversations
  const allMessages = conversations.flatMap(c => c.messages.map(m => ({ role: m.role, content: m.content })))
  const blockingMoments = detectBlocking(allMessages)

  return NextResponse.json({
    analytics: {
      activeStudents,
      maxParticipants: courseSession.maxParticipants,
      totalMessages,
      avgDurationMin: avgDuration,
      keywords,
      blockingMoments,
    },
  })
}
