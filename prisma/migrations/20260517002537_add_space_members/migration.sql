-- CreateEnum
CREATE TYPE "SpaceMemberRole" AS ENUM ('READER', 'CONTRIBUTOR', 'MANAGER');

-- CreateTable
CREATE TABLE "SpaceUserMember" (
    "spaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "SpaceMemberRole" NOT NULL DEFAULT 'READER',
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "addedById" TEXT,

    CONSTRAINT "SpaceUserMember_pkey" PRIMARY KEY ("spaceId","userId")
);

-- CreateTable
CREATE TABLE "SpaceGroupMember" (
    "spaceId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "role" "SpaceMemberRole" NOT NULL DEFAULT 'READER',
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "addedById" TEXT,

    CONSTRAINT "SpaceGroupMember_pkey" PRIMARY KEY ("spaceId","groupId")
);

-- AddForeignKey
ALTER TABLE "SpaceUserMember" ADD CONSTRAINT "SpaceUserMember_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "DocumentSpace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpaceUserMember" ADD CONSTRAINT "SpaceUserMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpaceGroupMember" ADD CONSTRAINT "SpaceGroupMember_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "DocumentSpace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpaceGroupMember" ADD CONSTRAINT "SpaceGroupMember_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;
