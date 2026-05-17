import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getSpaceAccess, hasMinimumRole } from '@/lib/space-access'
import { NextRequest, NextResponse } from 'next/server'

function slugify(name: string) {
  return name.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '')
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: spaceId } = await params
  const access = await getSpaceAccess(spaceId, session.user.id)
  if (!access) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!hasMinimumRole(access.role, 'CONTRIBUTOR')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const space = access.space

  const body = await req.json()
  const { name, description, parentId } = body as { name: string; description?: string; parentId?: string }
  if (!name?.trim()) return NextResponse.json({ error: 'name requis' }, { status: 400 })

  let slug = slugify(name)
  const existing = await prisma.documentFolder.findUnique({ where: { spaceId_slug: { spaceId, slug } } })
  if (existing) slug = `${slug}-${Date.now()}`

  const folder = await prisma.documentFolder.create({
    data: {
      name: name.trim(),
      slug,
      description: description?.trim() ?? null,
      spaceId,
      parentId: parentId ?? null,
    },
    include: { _count: { select: { documents: true } } },
  })

  return NextResponse.json({ folder }, { status: 201 })
}
