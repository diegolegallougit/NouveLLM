import { z } from 'zod'

const csvMax = (max: number) =>
  z
    .string()
    .max(max)
    .optional()
    .transform((v) => (v?.trim() === '' ? undefined : v))

export const ProfileUpdateSchema = z.object({
  discipline:          z.string().max(200).optional(),
  roleExact:           z.string().max(100).optional(),
  ufr:                 z.string().max(100).optional(),
  niveauxEnseignement: csvMax(200),
  languesTravail:      csvMax(200),
  sourcesAcademiques:  csvMax(300),
})

export type ProfileUpdate = z.infer<typeof ProfileUpdateSchema>
