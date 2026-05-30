/**
 * Point d'entrée du worker BullMQ NouveLLM.
 * Lance le worker d'indexation en tâche de fond.
 * Usage: npx tsx start-worker.ts
 */
import { startIndexingWorker } from '@/lib/indexing-worker'

console.log('[start-worker] Démarrage du worker BullMQ...')
const worker = startIndexingWorker()

// Gestion de l'arrêt propre
process.on('SIGINT', async () => {
  console.log('[start-worker] Arrêt du worker...')
  await worker.close()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  console.log('[start-worker] Arrêt du worker...')
  await worker.close()
  process.exit(0)
})
