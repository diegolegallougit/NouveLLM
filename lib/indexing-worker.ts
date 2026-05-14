import { Worker, type Job } from 'bullmq'
import { prisma } from '@/lib/prisma'
import path from 'path'
import fs from 'fs'
import type { IndexingJobPayload } from './indexing-queue'

const DIFY_BASE_URL = process.env.DIFY_BASE_URL ?? 'http://172.19.0.13:5001'
const DIFY_DATASET_KEY = process.env.DIFY_DATASET_API_KEY ?? ''

async function pollCompletion(targetDatasetId: string, batch: string): Promise<'indexed' | 'failed'> {
  for (let i = 0; i < 120; i++) {
    await new Promise(r => setTimeout(r, 5000))
    try {
      const res = await fetch(
        `${DIFY_BASE_URL}/v1/datasets/${targetDatasetId}/documents/${batch}/indexing-status`,
        { headers: { Authorization: `Bearer ${DIFY_DATASET_KEY}` }, signal: AbortSignal.timeout(5000) }
      )
      if (!res.ok) continue
      const data = await res.json() as { data?: { indexing_status: string }[] }
      const status = data.data?.[0]?.indexing_status
      if (status === 'completed') return 'indexed'
    } catch { /* transient */ }
  }
  return 'failed'
}

export function startIndexingWorker() {
  const connection = {
    host: process.env.REDIS_HOST ?? '172.19.0.3',
    port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
    ...(process.env.REDIS_PASSWORD ? { password: process.env.REDIS_PASSWORD } : {}),
  }

  const worker = new Worker<IndexingJobPayload>(
    'nouvellm-indexing',
    async (job: Job<IndexingJobPayload>) => {
      const { docId, indexingJobId, contentPath, filename, targetDatasetId, mimeType, difyDocMetadata } = job.data

      await prisma.indexingJob.update({
        where: { id: indexingJobId },
        data: { status: 'processing', startedAt: new Date(), attempts: { increment: 1 } },
      }).catch(() => {})

      await prisma.spaceDocument.update({
        where: { id: docId },
        data: { indexingStatus: 'pending' },
      }).catch(() => {})

      const fileBuffer = await fs.promises.readFile(contentPath)
      const difyFile = new File([fileBuffer], filename, { type: mimeType })

      const difyForm = new FormData()
      difyForm.append('file', difyFile)
      difyForm.append('data', JSON.stringify({
        indexing_technique: 'high_quality',
        process_rule: { mode: 'automatic' },
        doc_metadata: difyDocMetadata,
      }))

      const uploadRes = await fetch(
        `${DIFY_BASE_URL}/v1/datasets/${targetDatasetId}/document/create_by_file`,
        { method: 'POST', headers: { Authorization: `Bearer ${DIFY_DATASET_KEY}` }, body: difyForm, signal: AbortSignal.timeout(30000) }
      )

      if (!uploadRes.ok) {
        const errBody = await uploadRes.text().catch(() => '')
        throw new Error(`Dify upload failed: ${uploadRes.status} ${errBody.slice(0, 200)}`)
      }

      const uploadData = await uploadRes.json() as { document?: { id: string }; batch?: string }
      const difyFileId = uploadData.document?.id ?? null
      const difyBatch = uploadData.batch

      if (!difyBatch) throw new Error('No batch returned from Dify')

      await prisma.spaceDocument.update({
        where: { id: docId },
        data: {
          difyFileId,
          indexingStatus: 'pending',
          metadata: JSON.stringify({
            difyDocumentId: difyFileId,
            difyBatch,
            targetDatasetId,
            method: difyDocMetadata.processing_method ?? null,
            hasText: true,
          }),
        },
      }).catch(() => {})

      await prisma.indexingJob.update({
        where: { id: indexingJobId },
        data: { difyBatch, targetDatasetId, status: 'processing' },
      }).catch(() => {})

      const finalStatus = await pollCompletion(targetDatasetId, difyBatch)

      await prisma.spaceDocument.update({ where: { id: docId }, data: { indexingStatus: finalStatus } })
      await prisma.indexingJob.update({
        where: { id: indexingJobId },
        data: { status: finalStatus === 'indexed' ? 'completed' : 'failed', completedAt: new Date() },
      })

      if (finalStatus === 'indexed') {
        await fs.promises.unlink(contentPath).catch(() => {})
      }
    },
    { connection, concurrency: 1 }
  )

  worker.on('failed', async (job, err) => {
    if (!job) return
    const { docId, indexingJobId } = job.data
    await prisma.spaceDocument.update({ where: { id: docId }, data: { indexingStatus: 'failed' } }).catch(() => {})
    await prisma.indexingJob.update({
      where: { id: indexingJobId },
      data: { status: 'failed', error: err.message.slice(0, 500), completedAt: new Date() },
    }).catch(() => {})
  })

  console.log('[indexing-worker] BullMQ worker started (concurrency=1)')
  return worker
}
