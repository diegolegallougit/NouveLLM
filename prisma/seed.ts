import { PrismaClient } from '@prisma/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import bcrypt from 'bcryptjs'
import path from 'path'

const dbPath = path.resolve(process.cwd(), 'nouvellm.db')
const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` })
const prisma = new PrismaClient({ adapter })

const AGENTS = [
  {
    slug: 'bibliographie',
    label: 'Bibliographie annotée',
    icon: '📚',
    description: 'Construire et formater une bibliographie sourcée avec citations académiques',
    difyAppId: '77c02f51',
    difyApiKey: 'app-zcayNaOB7fzPtzZ7JKHvoyge',
  },
  {
    slug: 'fiche-cours',
    label: 'Fiche de cours ECTS',
    icon: '📋',
    description: 'Générer une fiche de cours structurée selon le format ECTS',
    difyAppId: '57371497',
    difyApiKey: 'app-tcKjyVchUk9pGuX2gD0ahS9N',
  },
  {
    slug: 'redaction',
    label: 'Rédaction administrative',
    icon: '✍️',
    description: 'Rédiger des notes, comptes-rendus et rapports institutionnels',
    difyAppId: 'c8efa9a8',
    difyApiKey: 'app-WTpAbWtJjoXmREIyyGD5HsRA',
  },
  {
    slug: 'module',
    label: 'Module pédagogique',
    icon: '📖',
    description: 'Concevoir un module pédagogique complet avec objectifs et activités',
    difyAppId: '4e61f3d0',
    difyApiKey: 'app-wzAfkcN8jotGMiWvLrArpI6U',
  },
  {
    slug: 'examen',
    label: "Sujet d'examen",
    icon: '🎯',
    description: "Créer un sujet d'examen avec barème et rubriques d'évaluation",
    difyAppId: '491b85d3',
    difyApiKey: 'app-2F6wx8wCLrYJUWPflA9XptAv',
  },
  {
    slug: 'traduction',
    label: 'Traduction SHS',
    icon: '🌍',
    description: 'Traduire des textes en sciences humaines et sociales',
    difyAppId: '28f57c10',
    difyApiKey: 'app-MmlIJNfrOmubTvVDjp02xmIM',
  },
  {
    slug: 'briefing',
    label: 'Briefing réunion',
    icon: '📊',
    description: 'Préparer un briefing structuré pour une réunion ou présentation',
    difyAppId: 'b6d0e043',
    difyApiKey: 'app-NfW6zhWLdmaR28N04DJDKwl6',
  },
  {
    slug: 'analyse',
    label: 'Analyse de document',
    icon: '🔍',
    description: 'Analyser et synthétiser un document ou corpus',
    difyAppId: '42d1e2a6',
    difyApiKey: 'app-aLqrSrbGUAAyff850fc5juas',
  },
]

const SOURCES = [
  {
    slug: 'formations-usn',
    label: 'Formations USN',
    icon: '🎓',
    description: 'Diplômes, licences, masters, formations de la Sorbonne Nouvelle',
    difyDatasetId: 'a1111111-0001-4000-8000-000000000001',
    docCount: 11,
    access: 'PUBLIC' as const,
  },
  {
    slug: 'services-usn',
    label: 'Services USN',
    icon: '🏛️',
    description: 'Bibliothèque, scolarité, relations internationales, SUAPS et services universitaires',
    difyDatasetId: 'a1111111-0002-4000-8000-000000000002',
    docCount: 17,
    access: 'PUBLIC' as const,
  },
  {
    slug: 'pedagogie-usn',
    label: 'Pédagogie & Outils',
    icon: '📐',
    description: "Ressources pédagogiques, outils numériques et dispositifs d'enseignement USN",
    difyDatasetId: 'a1111111-0003-4000-8000-000000000003',
    docCount: 12,
    access: 'PUBLIC' as const,
  },
  {
    slug: 'publications-shs',
    label: 'Publications académiques SHS',
    icon: '📰',
    description: 'Articles et publications en sciences humaines et sociales — HAL, OpenEdition',
    difyDatasetId: '0175621b-bb0c-49ab-9ae3-cd05819d10ca',
    docCount: 137,
    access: 'RESTRICTED' as const,
  },
  {
    slug: 'integria',
    label: 'Documentation INTEGRIA',
    icon: '🔬',
    description: 'Documentation du projet INTEGRIA ANR-25-CMAS-0024',
    difyDatasetId: '27b128ca-4493-407d-9848-20096e4d4d2e',
    docCount: 32,
    access: 'RESTRICTED' as const,
  },
]

async function main() {
  console.log('Seeding database...')

  // Create ec_base group
  const ecBase = await prisma.group.upsert({
    where: { slug: 'ec_base' },
    update: {},
    create: {
      slug: 'ec_base',
      label: 'Enseignants-Chercheurs — Base',
      type: 'SYSTEME',
      quotaTokens: 2000000,
      allowPersonalSources: true,
    },
  })

  // Create admin group
  const adminGroup = await prisma.group.upsert({
    where: { slug: 'admin' },
    update: {},
    create: {
      slug: 'admin',
      label: 'Administrateurs',
      type: 'SYSTEME',
      quotaTokens: 999999999,
      allowPersonalSources: true,
    },
  })

  // Upsert all agents
  for (const agentData of AGENTS) {
    await prisma.agent.upsert({
      where: { slug: agentData.slug },
      update: agentData,
      create: agentData,
    })
  }

  // Upsert all sources
  for (const sourceData of SOURCES) {
    await prisma.source.upsert({
      where: { slug: sourceData.slug },
      update: sourceData,
      create: sourceData,
    })
  }

  // Link all agents to ec_base group
  const agents = await prisma.agent.findMany()
  for (const agent of agents) {
    await prisma.groupAgent.upsert({
      where: { groupId_agentId: { groupId: ecBase.id, agentId: agent.id } },
      update: {},
      create: { groupId: ecBase.id, agentId: agent.id },
    })
    await prisma.groupAgent.upsert({
      where: { groupId_agentId: { groupId: adminGroup.id, agentId: agent.id } },
      update: {},
      create: { groupId: adminGroup.id, agentId: agent.id },
    })
  }

  // Link all sources to ec_base group
  const sources = await prisma.source.findMany()
  for (const source of sources) {
    await prisma.groupSource.upsert({
      where: { groupId_sourceId: { groupId: ecBase.id, sourceId: source.id } },
      update: {},
      create: { groupId: ecBase.id, sourceId: source.id },
    })
    await prisma.groupSource.upsert({
      where: { groupId_sourceId: { groupId: adminGroup.id, sourceId: source.id } },
      update: {},
      create: { groupId: adminGroup.id, sourceId: source.id },
    })
  }

  // Create demo EC user
  const hashedPassword = await bcrypt.hash('demo1234', 10)
  const ecUser = await prisma.user.upsert({
    where: { email: 'camille.daniaux@sorbonne-nouvelle.fr' },
    update: {},
    create: {
      email: 'camille.daniaux@sorbonne-nouvelle.fr',
      name: 'Camille Daniaux',
      password: hashedPassword,
      role: 'EC',
      onboarded: true,
    },
  })

  // Link EC user to ec_base group
  await prisma.userGroup.upsert({
    where: { userId_groupId: { userId: ecUser.id, groupId: ecBase.id } },
    update: {},
    create: { userId: ecUser.id, groupId: ecBase.id },
  })

  // Create admin user
  const adminUser = await prisma.user.upsert({
    where: { email: 'transvers.art@gmail.com' },
    update: {},
    create: {
      email: 'transvers.art@gmail.com',
      name: 'Diego Le Gallou',
      password: hashedPassword,
      role: 'ADMIN',
      onboarded: true,
    },
  })

  await prisma.userGroup.upsert({
    where: { userId_groupId: { userId: adminUser.id, groupId: adminGroup.id } },
    update: {},
    create: { userId: adminUser.id, groupId: adminGroup.id },
  })

  console.log('Seed complete.')
  console.log('Demo EC:    camille.daniaux@sorbonne-nouvelle.fr / demo1234')
  console.log('Admin:      transvers.art@gmail.com / demo1234')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
