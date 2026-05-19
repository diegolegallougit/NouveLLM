-- CreateEnum
CREATE TYPE "IntegrationType" AS ENUM ('CONNECTOR', 'ACADEMIC_SOURCE');

-- CreateTable
CREATE TABLE "Integration" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "type" "IntegrationType" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "config" TEXT,
    "visibleTo" TEXT NOT NULL DEFAULT 'EC,ADMIN',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "Integration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Integration_slug_key" ON "Integration"("slug");
