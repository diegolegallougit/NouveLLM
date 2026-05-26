import { test, expect } from '@playwright/test'

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3001'
const EMAIL = process.env.TEST_EMAIL!
const PASSWORD = process.env.TEST_PASSWORD!

test('auto-init: /?agent=analyse déclenche message IA sans saisie utilisateur', async ({ page }) => {
  // ── Login ──
  await page.goto(`${BASE}/login`)
  await page.fill('input[type="email"]', EMAIL)
  await page.fill('input[type="password"]', PASSWORD)
  await page.click('button[type="submit"]')
  await page.waitForURL(`${BASE}/`, { timeout: 15_000 })

  // ── Navigate with preselected agent ──
  await page.goto(`${BASE}/?agent=analyse`)

  // ── Wait for streaming indicator or assistant message ──
  // ProcessingState or message content appearing in the chat area
  const chatArea = page.locator('.nl-scroll, [class*="overflow-y-auto"]').first()
  await expect(chatArea).toBeVisible({ timeout: 5_000 })

  // Wait up to 30s for any assistant message content to appear
  const assistantContent = page.locator('text=/./').filter({
    has: page.locator('[class*="space-y"]'),
  })

  // More reliable: wait for the message list to have at least one item
  // ConversationPage renders messages in max-w-[760px] div when messages.length > 0
  await page.waitForSelector('.max-w-\\[760px\\]', { timeout: 30_000 })

  // Verify __init__ is not visible in the current conversation area (sidebar history is excluded)
  const chatAreaText = await page.locator('.max-w-\\[760px\\]').innerText()
  expect(chatAreaText).not.toContain('__init__')

  // Capture assistant message text
  const msgContainer = page.locator('.max-w-\\[760px\\] > div').first()
  const responseText = await msgContainer.textContent({ timeout: 30_000 })

  console.log('\n✓ Réponse IA automatique reçue :')
  console.log('─'.repeat(60))
  console.log(responseText?.trim().slice(0, 500))
  console.log('─'.repeat(60))

  expect(responseText?.length).toBeGreaterThan(10)
})
