// Sliding-window in-memory rate limiter — resets on server restart, sufficient for single-instance
interface RLWindow {
  count: number
  resetAt: number
}

const store = new Map<string, RLWindow>()

export function checkRateLimit(userId: string, max = 30, windowMs = 60_000): boolean {
  const key = `rl:${userId}`
  const now = Date.now()
  const w = store.get(key)

  if (!w || now >= w.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }

  if (w.count >= max) return false

  w.count++
  return true
}
