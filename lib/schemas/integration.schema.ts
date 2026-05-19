import { z } from 'zod'

export const IntegrationPatchSchema = z.object({
  enabled:   z.boolean().optional(),
  visibleTo: z.string().max(200).optional(),
  config: z
    .object({
      email:  z.string().max(200).optional(),
      apiKey: z.string().max(500).optional(),
    })
    .optional(),
})

export type IntegrationPatch = z.infer<typeof IntegrationPatchSchema>
