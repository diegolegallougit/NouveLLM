import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'

async function requireScopeAccess(groupId: string) {
  const session = await auth()
  const user = session?.user as { id?: string; role?: string } | undefined
  if (!user?.id) return null
  if (user.role === 'ADMIN') return user
  if (user.role !== 'RESPONSABLE') return null
  const scope = await prisma.scope.findFirst({ where: { userId: user.id, groupId } })
  if (!scope) return null
  return user
}

type CsvRow = { email: string; name: string; role?: string }

function parseCsv(text: string): CsvRow[] {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)
  if (lines.length < 2) return []

  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase())
  const emailIdx = headers.indexOf('email')
  const nameIdx = headers.indexOf('name') !== -1 ? headers.indexOf('name') : headers.indexOf('nom')
  const roleIdx = headers.indexOf('role')

  if (emailIdx === -1 || nameIdx === -1) return []

  return lines.slice(1).map((line) => {
    const cols = line.split(',').map((c) => c.trim().replace(/^"|"$/g, ''))
    return {
      email: cols[emailIdx] ?? '',
      name: cols[nameIdx] ?? '',
      role: roleIdx !== -1 ? cols[roleIdx] : undefined,
    }
  }).filter((r) => r.email && r.name)
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const { groupId } = await params
  const actor = await requireScopeAccess(groupId)
  if (!actor) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'Fichier CSV requis' }, { status: 400 })

  const text = await file.text()
  const rows = parseCsv(text)
  if (rows.length === 0) {
    return NextResponse.json({ error: 'CSV vide ou mal formaté (colonnes: email, name, role?)' }, { status: 400 })
  }

  const results: { email: string; status: 'created' | 'added' | 'already_member' | 'error'; error?: string }[] = []

  for (const row of rows) {
    try {
      let user = await prisma.user.findUnique({ where: { email: row.email } })

      if (!user) {
        const tempPassword = `Temp-${Math.random().toString(36).slice(2, 10)}`
        const role = (row.role ?? 'STUDENT') as never
        user = await prisma.user.create({
          data: {
            email: row.email,
            name: row.name,
            role,
            password: await bcrypt.hash(tempPassword, 10),
          },
        })
        await prisma.userGroup.create({ data: { userId: user.id, groupId } })
        results.push({ email: row.email, status: 'created' })
        continue
      }

      const existing = await prisma.userGroup.findUnique({
        where: { userId_groupId: { userId: user.id, groupId } },
      })

      if (existing) {
        results.push({ email: row.email, status: 'already_member' })
      } else {
        await prisma.userGroup.create({ data: { userId: user.id, groupId } })
        results.push({ email: row.email, status: 'added' })
      }
    } catch (e) {
      results.push({ email: row.email, status: 'error', error: String(e) })
    }
  }

  return NextResponse.json({ results })
}
