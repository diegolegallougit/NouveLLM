import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

async function requireAdmin() {
  const session = await auth()
  const user = session?.user as { role?: string } | undefined
  if (user?.role !== 'ADMIN') return null
  return user
}

export async function GET() {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const diplomes = await prisma.diplomeRef.findMany({ orderBy: [{ ufr: 'asc' }, { niveau: 'asc' }, { label: 'asc' }] })
  return NextResponse.json({ diplomes })
}

export async function POST(req: NextRequest) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json() as { slug?: string; label?: string; niveau?: string; ufr?: string }
  const { slug, label, niveau, ufr } = body
  if (!slug?.trim() || !label?.trim() || !niveau?.trim() || !ufr?.trim()) {
    return NextResponse.json({ error: 'slug, label, niveau et ufr sont requis' }, { status: 400 })
  }
  if (!/^[a-z0-9-]+$/.test(slug)) {
    return NextResponse.json({ error: 'Slug : minuscules, chiffres et - uniquement' }, { status: 400 })
  }
  const diplome = await prisma.diplomeRef.create({
    data: { slug: slug.trim(), label: label.trim(), niveau: niveau.trim(), ufr: ufr.trim() },
  })
  return NextResponse.json({ diplome }, { status: 201 })
}
