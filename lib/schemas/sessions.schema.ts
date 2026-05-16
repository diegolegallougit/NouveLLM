import { z } from 'zod'

export const CreateSessionSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2_000).optional(),
  systemPrompt: z.string().max(10_000).optional(),
  studentConsigne: z.string().max(5_000).optional(),
  scenarioSlug: z.string().max(100).optional(),
  visibility: z.number().int().min(0).max(100).optional(),
  validUntil: z.string().datetime({ message: 'validUntil must be an ISO date string' }),
  maxParticipants: z.number().int().min(1).max(10_000).optional(),
  access: z.enum(['OPEN', 'CLOSED']).optional(),
  agentSlugs: z.array(z.string().max(100)).max(20).optional(),
  sourceSlugs: z.array(z.string().max(200)).max(50).optional(),
})

export type CreateSession = z.infer<typeof CreateSessionSchema>
