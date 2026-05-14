import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
  const session = await auth()
  const user = session?.user as { id?: string; role?: string } | undefined
  if (!user?.id || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [queued, processing, completedToday, failedTotal, recentJobs] = await Promise.all([
    prisma.indexingJob.count({ where: { status: 'queued' } }),
    prisma.indexingJob.count({ where: { status: 'processing' } }),
    prisma.indexingJob.count({ where: { status: 'completed', completedAt: { gte: today } } }),
    prisma.indexingJob.count({ where: { status: 'failed' } }),
    prisma.indexingJob.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        status: true,
        attempts: true,
        error: true,
        createdAt: true,
        startedAt: true,
        completedAt: true,
        spaceDocument: { select: { name: true, spaceId: true } },
      },
    }),
  ])

  return NextResponse.json({ queued, processing, completedToday, failedTotal, recentJobs })
}
