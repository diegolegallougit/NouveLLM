import { z } from 'zod'

// FormData fields for document upload (file itself is validated natively — size, extension)
export const UploadDocumentSchema = z.object({
  folderId: z.string().max(200).nullable().optional(),
})

export type UploadDocument = z.infer<typeof UploadDocumentSchema>

const SpaceMemberRoleSchema = z.enum(['READER', 'CONTRIBUTOR', 'MANAGER'])

const xorMember = (d: { userId?: string; groupId?: string }) =>
  !!(d.userId ?? d.groupId) && !(d.userId && d.groupId)

export const AddMemberSchema = z
  .object({
    userId:  z.string().optional(),
    groupId: z.string().optional(),
    role:    SpaceMemberRoleSchema,
  })
  .refine(xorMember, { message: 'Exactly one of userId or groupId is required' })

export const RemoveMemberSchema = z
  .object({
    userId:  z.string().optional(),
    groupId: z.string().optional(),
  })
  .refine(xorMember, { message: 'Exactly one of userId or groupId is required' })

export type AddMember    = z.infer<typeof AddMemberSchema>
export type RemoveMember = z.infer<typeof RemoveMemberSchema>
