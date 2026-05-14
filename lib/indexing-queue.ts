import { Queue } from 'bullmq'

export interface IndexingJobPayload {
  docId: string
  indexingJobId: string
  spaceId: string
  userId: string
  contentPath: string
  filename: string
  targetDatasetId: string
  mimeType: string
  difyDocMetadata: Record<string, unknown>
}

const connection = {
  host: process.env.REDIS_HOST ?? '172.19.0.3',
  port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
  ...(process.env.REDIS_PASSWORD ? { password: process.env.REDIS_PASSWORD } : {}),
}

export const indexingQueue = new Queue<IndexingJobPayload>('nouvellm-indexing', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 30_000 },
    removeOnComplete: 100,
    removeOnFail: 200,
  },
})
