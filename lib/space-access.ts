import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'
import { SpaceMemberRole } from '@prisma/client'

export type EffectiveRole = 'OWNER' | SpaceMemberRole

type SpaceWithMembers = Prisma.DocumentSpaceGetPayload<{
  include: { userMembers: true; groupMembers: true }
}>

export type SpaceAccess = {
  space: SpaceWithMembers
  role: EffectiveRole
}

const ROLE_RANK: Record<EffectiveRole, number> = {
  READER: 0,
  CONTRIBUTOR: 1,
  MANAGER: 2,
  OWNER: 3,
}

export function hasMinimumRole(actual: EffectiveRole, minimum: EffectiveRole): boolean {
  return ROLE_RANK[actual] >= ROLE_RANK[minimum]
}

export async function getSpaceAccess(
  spaceId: string,
  userId: string
): Promise<SpaceAccess | null> {
  const [space, userGroups] = await Promise.all([
    prisma.documentSpace.findUnique({
      where: { id: spaceId },
      include: {
        userMembers: { where: { userId } },
        groupMembers: true,
      },
    }),
    prisma.userGroup.findMany({
      where: { userId },
      select: { groupId: true },
    }),
  ])

  if (!space) return null

  // Cast: the filtered `userMembers` is still typed SpaceUserMember[]
  const s = space as SpaceWithMembers

  if (s.ownerId === userId) return { space: s, role: 'OWNER' }

  if (s.userMembers.length > 0) return { space: s, role: s.userMembers[0].role }

  const userGroupIds = new Set(userGroups.map((g) => g.groupId))
  const inherited = s.groupMembers.filter((m) => userGroupIds.has(m.groupId))

  if (inherited.length === 0) return null

  const best = inherited.reduce((a, b) =>
    ROLE_RANK[b.role] > ROLE_RANK[a.role] ? b : a
  )
  return { space: s, role: best.role }
}
