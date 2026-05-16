import { z } from 'zod'

export const ChatBodySchema = z.object({
  message: z.string().min(1).max(10_000),
  agentSlug: z.string().max(100).optional(),
  sourceSlugs: z.array(z.string().max(200)).max(20).optional(),
  conversationId: z.string().max(200).optional(),
  uploadedFileId: z.string().max(200).optional(),
  courseSessionId: z.string().max(200).optional(),
  prebuiltInputs: z.record(z.string(), z.string().max(5_000)).optional(),
})

export type ChatBody = z.infer<typeof ChatBodySchema>
