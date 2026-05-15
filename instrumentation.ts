export async function register() {
  // BullMQ worker désactivé — upload direct Dify (v0.4.7)
  // if (process.env.NEXT_RUNTIME === 'nodejs') {
  //   const { startIndexingWorker } = await import('./lib/indexing-worker')
  //   startIndexingWorker()
  // }
}
