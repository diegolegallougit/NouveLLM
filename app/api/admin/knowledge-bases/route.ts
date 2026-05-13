import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

const DIFY_BASE_URL = process.env.DIFY_BASE_URL || 'http://172.19.0.13:5001'
const DIFY_DATASET_KEY = process.env.DIFY_DATASET_API_KEY || ''

async function getDifyDatasetInfo(datasetId: string): Promise<{ docCount?: number; ok: boolean }> {
  if (!DIFY_DATASET_KEY || !datasetId) return { ok: false }
  try {
    const r = await fetch(`${DIFY_BASE_URL}/v1/datasets?limit=100`, {
      headers: { Authorization: `Bearer ${DIFY_DATASET_KEY}` },
      signal: AbortSignal.timeout(5000),
    })
    if (!r.ok) return { ok: false }
    const data = await r.json() as { data: { id: string; document_count: number }[] }
    const ds = data.data?.find((d) => d.id === datasetId)
    if (!ds) return { ok: false }
    return { ok: true, docCount: ds.document_count }
  } catch {
    return { ok: false }
  }
}

export async function GET() {
  const session = await auth()
  const user = session?.user as { role?: string } | undefined
  if (user?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const sources = await prisma.source.findMany({ orderBy: { slug: 'asc' } })
  const ufrGroups = await prisma.group.findMany({ where: { type: 'UFR', hasKB: true } })
  const coursActifsId = process.env.DIFY_COURS_ACTIFS_DATASET_ID ?? ''

  // Institutional KBs (Sources)
  const institutionalResults = await Promise.all(
    sources.map(async (source) => {
      const dify = await getDifyDatasetInfo(source.difyDatasetId)
      return {
        id: source.id,
        slug: source.slug,
        label: source.label,
        icon: source.icon,
        difyDatasetId: source.difyDatasetId,
        access: source.access,
        docCountDb: source.docCount,
        docCountDify: dify.ok ? dify.docCount : null,
        difyOk: dify.ok,
        category: 'institutional' as const,
        description: 'KB institutionnelle',
      }
    })
  )

  // KB cours-actifs
  const coursActifsInfo = await getDifyDatasetInfo(coursActifsId)
  const coursActifsResult = {
    id: 'cours-actifs',
    slug: 'cours-actifs',
    label: 'cours-actifs',
    icon: '📚',
    difyDatasetId: coursActifsId,
    access: 'RESTRICTED',
    docCountDb: null,
    docCountDify: coursActifsInfo.ok ? coursActifsInfo.docCount : null,
    difyOk: coursActifsId ? coursActifsInfo.ok : false,
    category: 'shared' as const,
    description: 'Espaces EC personnels + diplômes sans KB dédiée',
    warning: !coursActifsId ? 'DIFY_COURS_ACTIFS_DATASET_ID non configurée dans .env' : null,
  }

  // UFR KBs
  const ufrResults = await Promise.all(
    ufrGroups.map(async (g) => {
      const dify = await getDifyDatasetInfo(g.difyDatasetId ?? '')
      return {
        id: g.id,
        slug: `ufr-${g.slug}`,
        label: `UFR — ${g.label}`,
        icon: '🏛',
        difyDatasetId: g.difyDatasetId ?? '',
        access: 'RESTRICTED',
        docCountDb: null,
        docCountDify: dify.ok ? dify.docCount : null,
        difyOk: dify.ok,
        category: 'ufr' as const,
        description: `KB dédiée groupe ${g.slug}`,
        warning: null,
      }
    })
  )

  return NextResponse.json({ knowledgeBases: [...institutionalResults, coursActifsResult, ...ufrResults] })
}
