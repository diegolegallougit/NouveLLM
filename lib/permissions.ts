import type { Role } from '@prisma/client'

export type UserRole = Role

export function canManageUsers(role: UserRole): boolean {
  return role === 'RESPONSABLE' || role === 'ADMIN'
}

export function canCreateInstitutionalContent(role: UserRole): boolean {
  return role === 'EC' || role === 'RESPONSABLE' || role === 'ADMIN'
}

export function canAccessAdminPanel(role: UserRole): boolean {
  return role === 'ADMIN'
}

export function canAccessScopePanel(role: UserRole): boolean {
  return role === 'RESPONSABLE' || role === 'ADMIN'
}

export function canUploadToSharedSpace(role: UserRole): boolean {
  return role === 'EC' || role === 'RESPONSABLE' || role === 'ADMIN'
}

export function isVisible(audienceField: string, role: UserRole): boolean {
  if (audienceField === 'ALL') return true
  if (audienceField === 'EC_ONLY') return role === 'EC' || role === 'RESPONSABLE' || role === 'ADMIN'
  if (audienceField === 'STUDENT_ONLY') return role === 'STUDENT' || role === 'ADMIN'
  if (audienceField === 'BIATSS_ONLY') return role === 'BIATSS' || role === 'ADMIN'
  return true
}

export const ROLE_LABELS: Record<UserRole, string> = {
  STUDENT: 'Étudiant·e',
  BIATSS: 'BIATSS',
  EC: 'Enseignant·e-chercheur·se',
  RESPONSABLE: 'Responsable',
  ADMIN: 'Administrateur·trice',
}

export const ROLE_BADGE_COLORS: Record<UserRole, string> = {
  STUDENT: 'bg-gray-100 text-gray-600',
  BIATSS: 'bg-amber-100 text-amber-700',
  EC: 'bg-blue-100 text-blue-700',
  RESPONSABLE: 'bg-purple-100 text-purple-700',
  ADMIN: 'bg-red-100 text-red-700',
}
