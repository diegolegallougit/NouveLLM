/**
 * Moodle → NouveLLM user sync
 *
 * Fetches enrolled users from a Moodle course via the REST API and
 * upserts them in the NouveLLM database (users + group membership).
 *
 * Usage:
 *   npx tsx scripts/moodle-sync.ts
 *
 * Required env vars:
 *   MOODLE_URL          Base URL of the Moodle instance  (e.g. https://moodle.sorbonne-nouvelle.fr)
 *   MOODLE_TOKEN        Web service token (admin, wsfunction=core_enrol_get_enrolled_users)
 *   MOODLE_COURSE_ID    Numeric course ID to sync
 *   NOUVELLM_GROUP_SLUG NouveLLM group slug to assign synced users to
 *   DATABASE_URL        Prisma DB URL (optional — uses default if omitted)
 */

import { PrismaClient } from '@prisma/client'
import * as https from 'https'
import * as http from 'http'

interface MoodleUser {
  id: number
  username: string
  firstname: string
  lastname: string
  email: string
  roles: { shortname: string }[]
}

function env(key: string): string {
  const v = process.env[key]
  if (!v) {
    console.error(`Missing env var: ${key}`)
    process.exit(1)
  }
  return v
}

async function fetchJson(url: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http
    lib.get(url, (res) => {
      const chunks: Buffer[] = []
      res.on('data', (chunk: Buffer) => chunks.push(chunk))
      res.on('end', () => {
        try { resolve(JSON.parse(Buffer.concat(chunks).toString())) }
        catch (e) { reject(e) }
      })
    }).on('error', reject)
  })
}

async function main() {
  const moodleUrl   = env('MOODLE_URL').replace(/\/$/, '')
  const token       = env('MOODLE_TOKEN')
  const courseId    = env('MOODLE_COURSE_ID')
  const groupSlug   = env('NOUVELLM_GROUP_SLUG')

  const prisma = new PrismaClient()

  // 1. Fetch enrolled users from Moodle
  const apiUrl =
    `${moodleUrl}/webservice/rest/server.php` +
    `?wstoken=${token}` +
    `&wsfunction=core_enrol_get_enrolled_users` +
    `&moodlewsrestformat=json` +
    `&courseid=${courseId}`

  console.log(`Fetching enrolled users for course ${courseId}…`)
  const raw = await fetchJson(apiUrl) as MoodleUser[] | { exception: string; message: string }

  if (!Array.isArray(raw)) {
    console.error('Moodle API error:', (raw as { message: string }).message)
    process.exit(1)
  }

  console.log(`  → ${raw.length} user(s) found in Moodle`)

  // 2. Ensure the target group exists
  const group = await prisma.group.findUnique({ where: { slug: groupSlug } })
  if (!group) {
    console.error(`Group "${groupSlug}" not found in NouveLLM. Create it first via the admin panel.`)
    await prisma.$disconnect()
    process.exit(1)
  }

  // 3. Upsert users + group membership
  let created = 0
  let updated = 0
  let skipped = 0

  for (const mu of raw) {
    if (!mu.email) { skipped++; continue }

    const name = `${mu.firstname} ${mu.lastname}`.trim() || mu.username

    // Determine role: editingteacher / teacher → EC, else STUDENT
    const isTeacher = mu.roles.some(r => ['editingteacher', 'teacher', 'manager'].includes(r.shortname))
    const role = isTeacher ? 'EC' : 'STUDENT'

    // Upsert user
    const existing = await prisma.user.findUnique({ where: { email: mu.email } })
    let userId: string

    if (existing) {
      if (existing.deletedAt) {
        console.log(`  SKIP (deleted): ${mu.email}`)
        skipped++
        continue
      }
      await prisma.user.update({
        where: { email: mu.email },
        data: { name, externalId: String(mu.id) },
      })
      userId = existing.id
      updated++
    } else {
      const created_user = await prisma.user.create({
        data: {
          email: mu.email,
          name,
          role,
          externalId: String(mu.id),
          password: null,
        },
      })
      userId = created_user.id
      created++
    }

    // Upsert group membership
    await prisma.userGroup.upsert({
      where: { userId_groupId: { userId, groupId: group.id } },
      create: { userId, groupId: group.id },
      update: {},
    })
  }

  await prisma.$disconnect()

  console.log(`\nSync complete:`)
  console.log(`  Created : ${created}`)
  console.log(`  Updated : ${updated}`)
  console.log(`  Skipped : ${skipped}`)
  console.log(`  Group   : ${groupSlug} (${group.label})`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
