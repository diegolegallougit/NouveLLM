import { PrismaClient } from '@prisma/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import path from 'path'

const dbPath = path.resolve(process.cwd(), 'nouvellm.db')
const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` })
const prisma = new PrismaClient({ adapter })

async function main() {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 365)

  const { count } = await prisma.conversation.deleteMany({
    where: { createdAt: { lt: cutoff } },
  })

  console.log(`[cleanup] ${new Date().toISOString()} — ${count} conversation(s) supprimée(s) (>365 jours)`)

  // Also purge hard-deleted user accounts older than 30 days
  const softDeleteCutoff = new Date()
  softDeleteCutoff.setDate(softDeleteCutoff.getDate() - 30)

  await prisma.user.deleteMany({
    where: {
      deletedAt: { lt: softDeleteCutoff },
    },
  })
}

main().catch(console.error).finally(() => prisma.$disconnect())
