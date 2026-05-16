import { z } from 'zod'

// FormData fields for document upload (file itself is validated natively — size, extension)
export const UploadDocumentSchema = z.object({
  folderId: z.string().max(200).nullable().optional(),
})

export type UploadDocument = z.infer<typeof UploadDocumentSchema>
