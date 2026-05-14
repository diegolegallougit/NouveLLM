export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startIndexingWorker } = await import('./lib/indexing-worker')
    startIndexingWorker()
  }
}
