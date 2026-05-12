-- CreateTable
CREATE TABLE "SessionScenario" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "level" INTEGER,
    "levelLabel" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "shortDescription" TEXT NOT NULL,
    "fullDescription" TEXT NOT NULL,
    "disciplineHint" TEXT,
    "levelHint" TEXT,
    "defaultAgentSlugs" TEXT NOT NULL DEFAULT '[]',
    "defaultDuration" TEXT NOT NULL,
    "defaultSaveHistory" BOOLEAN NOT NULL DEFAULT false,
    "defaultVisibility" INTEGER NOT NULL DEFAULT 0,
    "systemPromptTemplate" TEXT NOT NULL,
    "studentConsigne" TEXT NOT NULL,
    "hasBroadcast" BOOLEAN NOT NULL DEFAULT false,
    "hasStructuredForm" BOOLEAN NOT NULL DEFAULT false,
    "difyWorkflowOverride" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_CourseSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "systemPrompt" TEXT,
    "validUntil" DATETIME NOT NULL,
    "maxParticipants" INTEGER,
    "access" TEXT NOT NULL DEFAULT 'OPEN',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "scenarioSlug" TEXT,
    "visibility" INTEGER NOT NULL DEFAULT 0,
    "studentConsigne" TEXT,
    "ecUserId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CourseSession_ecUserId_fkey" FOREIGN KEY ("ecUserId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_CourseSession" ("access", "code", "createdAt", "description", "ecUserId", "id", "maxParticipants", "name", "status", "systemPrompt", "validUntil") SELECT "access", "code", "createdAt", "description", "ecUserId", "id", "maxParticipants", "name", "status", "systemPrompt", "validUntil" FROM "CourseSession";
DROP TABLE "CourseSession";
ALTER TABLE "new_CourseSession" RENAME TO "CourseSession";
CREATE UNIQUE INDEX "CourseSession_code_key" ON "CourseSession"("code");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "SessionScenario_slug_key" ON "SessionScenario"("slug");
