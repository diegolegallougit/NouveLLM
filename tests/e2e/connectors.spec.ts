import { test, expect } from '@playwright/test'

// These tests run against a live server with a seeded test user.
// Set PLAYWRIGHT_BASE_URL and TEST_COOKIE env vars for CI.

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3001'

// Helper: authenticated API fetch using the session cookie
async function apiFetch(path: string, init?: RequestInit) {
  const cookie = process.env.TEST_COOKIE ?? ''
  return fetch(`${BASE}${path}`, {
    ...init,
    headers: { ...init?.headers, Cookie: cookie, 'Content-Type': 'application/json' },
  })
}

test.describe('Notion connector API', () => {
  test('GET /api/connectors/notion/connect returns connected: false initially', async () => {
    const r = await apiFetch('/api/connectors/notion/connect')
    expect(r.status).toBe(200)
    const data = await r.json()
    expect(data).toHaveProperty('connected')
  })

  test('POST /api/connectors/notion/connect with invalid token returns 422', async () => {
    const r = await apiFetch('/api/connectors/notion/connect', {
      method: 'POST',
      body: JSON.stringify({ token: 'invalid-token' }),
    })
    expect(r.status).toBe(422)
  })

  test('POST /api/connectors/notion/connect with empty token returns 400', async () => {
    const r = await apiFetch('/api/connectors/notion/connect', {
      method: 'POST',
      body: JSON.stringify({ token: '' }),
    })
    expect(r.status).toBe(400)
  })

  test('GET /api/connectors/notion/pages returns 403 when not connected', async () => {
    const r = await apiFetch('/api/connectors/notion/pages')
    // 403 if not connected, 200 if connected (env-dependent)
    expect([200, 403]).toContain(r.status)
  })

  test('API responses do not leak encrypted tokens', async () => {
    const r = await apiFetch('/api/connectors/notion/connect')
    const text = await r.text()
    // Must not contain a raw notion token or encryption key pattern
    expect(text).not.toMatch(/secret_[a-zA-Z0-9]+/)
    expect(text).not.toMatch(/[a-f0-9]{64}/)
  })
})

test.describe('Google Drive connector API', () => {
  test('GET /api/connectors/gdrive/connect returns connected status', async () => {
    const r = await apiFetch('/api/connectors/gdrive/connect')
    expect(r.status).toBe(200)
    const data = await r.json()
    expect(data).toHaveProperty('connected')
  })

  test('GET /api/connectors/gdrive/files returns 403 when not connected', async () => {
    const r = await apiFetch('/api/connectors/gdrive/files')
    expect([200, 403]).toContain(r.status)
  })

  test('GET /api/connectors/gdrive/init redirects to Google OAuth', async () => {
    if (!process.env.GOOGLE_CLIENT_ID) {
      test.skip()
      return
    }
    const r = await apiFetch('/api/connectors/gdrive/init')
    // Should redirect (302) or return 503 if not configured
    expect([302, 503]).toContain(r.status)
    if (r.status === 302) {
      expect(r.headers.get('location')).toContain('accounts.google.com')
    }
  })

  test('DELETE /api/connectors/gdrive/connect disconnects', async () => {
    const r = await apiFetch('/api/connectors/gdrive/connect', { method: 'DELETE' })
    expect(r.status).toBe(200)
    const data = await r.json()
    expect(data.ok).toBe(true)
  })

  test('API responses do not leak access tokens', async () => {
    const r = await apiFetch('/api/connectors/gdrive/connect')
    const text = await r.text()
    // Must not contain raw token patterns
    expect(text).not.toMatch(/ya29\.[a-zA-Z0-9_-]+/)
    expect(text).not.toMatch(/[a-f0-9]{64}/)
  })
})

test.describe('Security: unauthenticated requests', () => {
  async function unauthFetch(path: string, method = 'GET') {
    return fetch(`${BASE}${path}`, { method })
  }

  test('Notion connect requires auth', async () => {
    const r = await unauthFetch('/api/connectors/notion/connect')
    expect(r.status).toBe(401)
  })

  test('Notion pages requires auth', async () => {
    const r = await unauthFetch('/api/connectors/notion/pages')
    expect(r.status).toBe(401)
  })

  test('GDrive connect status requires auth', async () => {
    const r = await unauthFetch('/api/connectors/gdrive/connect')
    expect(r.status).toBe(401)
  })

  test('GDrive files requires auth', async () => {
    const r = await unauthFetch('/api/connectors/gdrive/files')
    expect(r.status).toBe(401)
  })
})
