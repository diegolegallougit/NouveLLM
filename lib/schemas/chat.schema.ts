import { z } from 'zod'

export const ChatBodySchema = z.object({
  message: z.string().min(1).max(10_000),
  agentSlug: z.string().max(100).nullish(),
  sourceSlugs: z.array(z.string().max(200)).max(20).nullish(),
  conversationId: z.string().max(200).nullish(),
  uploadedFileId: z.string().max(200).nullish(),
  courseSessionId: z.string().max(200).nullish(),
  prebuiltInputs: z.record(z.string(), z.string().max(5_000)).nullish(),
  sourceMode: z.enum(['usn', 'academic', 'web', 'all', 'docs']).nullish(),
})

export type ChatBody = z.infer<typeof ChatBodySchema>
