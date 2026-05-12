import { prisma } from '@/lib/prisma'
import type { AuditAction } from '@prisma/client'

interface LogActionParams {
  userId: string
  action: AuditAction
  entityType: string
  entityId: string
  entityName: string
  spaceId?: string
  groupId?: string
  metadata?: Record<string, unknown>
}

export async function logAction(params: LogActionParams): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        entityName: params.entityName,
        spaceId: params.spaceId,
        groupId: params.groupId,
        metadata: params.metadata ? JSON.stringify(params.metadata) : undefined,
      },
    })
  } catch {
    // Audit must never break the main flow
  }
}
