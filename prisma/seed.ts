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
    inputSchema: JSON.stringify({
      fields: [
        { key: 'sujet', label: 'Sujet de recherche', type: 'text', required: true, placeholder: 'Ex: LLM et pédagogie universitaire' },
        { key: 'discipline', label: 'Discipline', type: 'select', required: false, default: 'Sciences Humaines et Sociales',
          options: ['Sciences Humaines et Sociales', 'Linguistique', 'Littérature', 'Arts', 'Communication', 'Didactique', 'Traductologie'] },
        { key: 'niveau', label: 'Niveau', type: 'select', required: false, default: 'Master',
          options: ['Licence', 'Master', 'Doctorat', 'Recherche'] },
        { key: 'nb_refs', label: 'Nombre de références', type: 'number', required: false, default: '10' },
      ],
    }),
  },
  {
    slug: 'fiche-cours',
    label: 'Fiche de cours ECTS',
    icon: '📋',
    description: 'Générer une fiche de cours structurée selon le format ECTS',
    difyAppId: '57371497',
    difyApiKey: 'app-tcKjyVchUk9pGuX2gD0ahS9N',
    inputSchema: JSON.stringify({
      fields: [
        { key: 'titre_cours', label: 'Titre du cours', type: 'text', required: true, placeholder: 'Ex: Introduction à la traductologie' },
        { key: 'objectifs', label: 'Objectifs pédagogiques', type: 'textarea', required: true, placeholder: 'Compétences visées à l\'issue du cours...' },
        { key: 'contenu', label: 'Contenu du cours', type: 'textarea', required: false, placeholder: 'Thèmes, séquences, bibliographie...' },
        { key: 'credits', label: 'Crédits ECTS', type: 'number', required: false, default: '3' },
        { key: 'ufr', label: 'UFR', type: 'text', required: false, default: 'LCCE' },
      ],
    }),
  },
  {
    slug: 'redaction',
    label: 'Rédaction administrative',
    icon: '✍️',
    description: 'Rédiger des notes, comptes-rendus et rapports institutionnels',
    difyAppId: 'c8efa9a8',
    difyApiKey: 'app-WTpAbWtJjoXmREIyyGD5HsRA',
    inputSchema: null,
  },
  {
    slug: 'module',
    label: 'Module pédagogique',
    icon: '📖',
    description: 'Concevoir un module pédagogique complet avec objectifs et activités',
    difyAppId: '4e61f3d0',
    difyApiKey: 'app-wzAfkcN8jotGMiWvLrArpI6U',
    inputSchema: JSON.stringify({
      fields: [
        { key: 'syllabus', label: 'Syllabus ou plan brut', type: 'textarea', required: true, placeholder: 'Ex: Semaine 1 — Introduction, Semaine 2 — Théories...' },
        { key: 'niveau', label: 'Niveau', type: 'select', required: false, default: 'Licence',
          options: ['Licence', 'Master'] },
        { key: 'nb_seances', label: 'Nombre de séances', type: 'number', required: false, default: '12' },
      ],
    }),
  },
  {
    slug: 'examen',
    label: "Sujet d'examen",
    icon: '🎯',
    description: "Créer un sujet d'examen avec barème et rubriques d'évaluation",
    difyAppId: '491b85d3',
    difyApiKey: 'app-2F6wx8wCLrYJUWPflA9XptAv',
    inputSchema: JSON.stringify({
      fields: [
        { key: 'competences', label: 'Objectifs de compétences', type: 'textarea', required: true, placeholder: 'Ex: Maîtriser les théories de la traduction, analyser un texte...' },
        { key: 'contenu_cours', label: 'Contenu du cours', type: 'textarea', required: false, placeholder: 'Thèmes abordés, bibliographie du cours...' },
        { key: 'niveau', label: 'Niveau', type: 'select', required: false, default: 'Licence',
          options: ['Licence', 'Master'] },
        { key: 'format_exam', label: 'Format souhaité', type: 'select', required: false, default: 'questions ouvertes',
          options: ['dissertation', 'commentaire de texte', 'questions courtes', 'cas pratique', 'questions ouvertes'] },
      ],
    }),
  },
  {
    slug: 'traduction',
    label: 'Traduction SHS',
    icon: '🌍',
    description: 'Traduire des textes en sciences humaines et sociales',
    difyAppId: '28f57c10',
    difyApiKey: 'app-MmlIJNfrOmubTvVDjp02xmIM',
    inputSchema: JSON.stringify({
      fields: [
        { key: 'texte', label: 'Texte à traduire', type: 'textarea', required: true, placeholder: 'Collez votre texte ici...' },
        { key: 'langue_cible', label: 'Langue cible', type: 'select', required: false, default: 'anglais',
          options: ['anglais', 'espagnol', 'allemand', 'italien', 'portugais'] },
      ],
    }),
  },
  {
    slug: 'briefing',
    label: 'Briefing réunion',
    icon: '📊',
    description: 'Préparer un briefing structuré pour une réunion ou présentation',
    difyAppId: 'b6d0e043',
    difyApiKey: 'app-NfW6zhWLdmaR28N04DJDKwl6',
    inputSchema: null,
  },
  {
    slug: 'analyse',
    label: 'Analyse de document',
    icon: '🔍',
    description: 'Analyser et synthétiser un document ou corpus',
    difyAppId: '42d1e2a6',
    difyApiKey: 'app-aLqrSrbGUAAyff850fc5juas',
    inputSchema: null,
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
    docCount: 20,
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

  // ── BIATSS group ──────────────────────────────────────────────────────────
  const biatssGroup = await prisma.group.upsert({
    where: { slug: 'biatss_base' },
    update: {},
    create: {
      slug: 'biatss_base',
      label: 'Personnel administratif et technique',
      type: 'SYSTEME',
      quotaTokens: 100000,
      allowPersonalSources: false,
    },
  })

  // Link BIATSS-appropriate agents to biatss_base
  for (const slug of ['redaction', 'analyse', 'briefing']) {
    const agent = await prisma.agent.findUnique({ where: { slug } })
    if (agent) {
      await prisma.groupAgent.upsert({
        where: { groupId_agentId: { groupId: biatssGroup.id, agentId: agent.id } },
        update: {},
        create: { groupId: biatssGroup.id, agentId: agent.id },
      })
    }
  }

  // ── RESPONSABLE demo user ─────────────────────────────────────────────────
  const responsableUser = await prisma.user.upsert({
    where: { email: 'responsable.traductologie@sorbonne-nouvelle.fr' },
    update: {},
    create: {
      email: 'responsable.traductologie@sorbonne-nouvelle.fr',
      name: 'Marie Dupont',
      password: hashedPassword,
      role: 'RESPONSABLE',
      onboarded: true,
    },
  })

  await prisma.userGroup.upsert({
    where: { userId_groupId: { userId: responsableUser.id, groupId: ecBase.id } },
    update: {},
    create: { userId: responsableUser.id, groupId: ecBase.id },
  })

  // Assign ec_base as Marie Dupont's scope
  await prisma.scope.upsert({
    where: { userId_groupId: { userId: responsableUser.id, groupId: ecBase.id } },
    update: {},
    create: { userId: responsableUser.id, groupId: ecBase.id },
  })

  // ── BIATSS demo user ───────────────────────────────────────────────────────
  const biatssUser = await prisma.user.upsert({
    where: { email: 'scolarite@sorbonne-nouvelle.fr' },
    update: {},
    create: {
      email: 'scolarite@sorbonne-nouvelle.fr',
      name: 'Service Scolarité',
      password: hashedPassword,
      role: 'BIATSS',
      onboarded: true,
    },
  })

  await prisma.userGroup.upsert({
    where: { userId_groupId: { userId: biatssUser.id, groupId: biatssGroup.id } },
    update: {},
    create: { userId: biatssUser.id, groupId: biatssGroup.id },
  })

  // ── Routing families ──────────────────────────────────────────────────────
  const ROUTING_FAMILIES = [
    {
      slug: 'produire-document',
      label: 'Produire un document',
      icon: '✍️',
      description: 'Rédiger, structurer, exporter un contenu',
      order: 1,
      questions: [{
        question: 'Quel type de document ?',
        order: 1,
        options: [
          { label: 'Note de service / CR / Rapport', agentSlug: 'redaction', order: 1 },
          { label: 'Fiche de cours ECTS', agentSlug: 'fiche-cours', order: 2 },
          { label: 'Questionnaire LimeSurvey', agentSlug: null, order: 3, comingSoon: true },
          { label: 'Autre document', agentSlug: 'redaction', order: 4 },
        ],
      }],
    },
    {
      slug: 'travailler-cours',
      label: 'Travailler sur mes cours',
      icon: '📚',
      description: 'Concevoir, optimiser, évaluer mes enseignements',
      order: 2,
      questions: [{
        question: 'Que voulez-vous faire ?',
        order: 1,
        options: [
          { label: 'Concevoir un module pédagogique', agentSlug: 'module', order: 1 },
          { label: "Préparer un sujet d'examen", agentSlug: 'examen', order: 2 },
          { label: 'Optimiser/séquencer un cours', agentSlug: null, order: 3, comingSoon: true },
          { label: 'Créer une session étudiants', agentSlug: 'session-cours', order: 4 },
        ],
      }],
    },
    {
      slug: 'chercher-comprendre',
      label: 'Chercher et comprendre',
      icon: '🔍',
      description: 'Explorer la littérature, analyser des documents',
      order: 3,
      questions: [{
        question: 'Que cherchez-vous ?',
        order: 1,
        options: [
          { label: 'Une bibliographie disciplinaire', agentSlug: 'bibliographie', order: 1 },
          { label: 'Analyser un document uploadé', agentSlug: 'analyse', order: 2 },
          { label: 'Répondre à une question libre', agentSlug: null, order: 3 },
        ],
      }],
    },
    {
      slug: 'transformer-contenu',
      label: 'Transformer un contenu',
      icon: '🌍',
      description: 'Traduire, reformuler, adapter',
      order: 4,
      questions: [{
        question: 'Quel type de transformation ?',
        order: 1,
        options: [
          { label: 'Traduire un texte SHS', agentSlug: 'traduction', order: 1 },
          { label: 'Reformuler / adapter le niveau', agentSlug: 'redaction', order: 2 },
        ],
      }],
    },
    {
      slug: 'piloter-evaluer',
      label: 'Piloter et évaluer',
      icon: '📊',
      description: 'Préparer des réunions, bilans, rapports',
      order: 5,
      questions: [{
        question: 'Quel besoin ?',
        order: 1,
        options: [
          { label: 'Préparer une réunion / COPIL', agentSlug: 'briefing', order: 1 },
          { label: 'Bilan annuel de cours', agentSlug: null, order: 2, comingSoon: true },
          { label: "Rapport d'activité", agentSlug: 'redaction', order: 3 },
        ],
      }],
    },
    {
      slug: 'aide-humaine',
      label: "Demander de l'aide humaine",
      icon: '🤝',
      description: "Contacter un expert : IP, documentaliste, service admin",
      order: 6,
      questions: [],
    },
  ]

  for (const fam of ROUTING_FAMILIES) {
    const { questions, ...famData } = fam
    const family = await prisma.routingFamily.upsert({
      where: { slug: famData.slug },
      update: { label: famData.label, icon: famData.icon, description: famData.description, order: famData.order },
      create: famData,
    })
    // Only seed questions if they don't exist yet
    const existingCount = await prisma.routingQuestion.count({ where: { familyId: family.id } })
    if (existingCount === 0) {
      for (const q of questions) {
        const { options, ...qData } = q
        const question = await prisma.routingQuestion.create({
          data: { ...qData, familyId: family.id },
        })
        for (const opt of options) {
          const { comingSoon, ...optRest } = opt as typeof opt & { comingSoon?: boolean }
          await prisma.routingOption.create({
            data: { ...optRest, questionId: question.id, comingSoon: comingSoon ?? false },
          })
        }
      }
    }
  }

  // ── BIATSS routing options in "Produire un document" ─────────────────────
  const produireFamily = await prisma.routingFamily.findUnique({ where: { slug: 'produire-document' } })
  if (produireFamily) {
    const produireQuestion = await prisma.routingQuestion.findFirst({ where: { familyId: produireFamily.id, order: 1 } })
    if (produireQuestion) {
      const biatssOptions = [
        { label: 'Compte-rendu de réunion', agentSlug: 'redaction', order: 10 },
        { label: 'Note administrative', agentSlug: 'redaction', order: 11 },
        { label: 'Courrier officiel', agentSlug: 'redaction', order: 12 },
      ]
      for (const opt of biatssOptions) {
        const existing = await prisma.routingOption.findFirst({
          where: { questionId: produireQuestion.id, label: opt.label },
        })
        if (!existing) {
          await prisma.routingOption.create({
            data: { ...opt, questionId: produireQuestion.id, comingSoon: false },
          })
        }
      }
    }
  }

  // ── Expert contacts ────────────────────────────────────────────────────────
  const EXPERT_CONTACTS = [
    {
      slug: 'ingenieur-pedagogique',
      name: 'Service BAPP',
      role: "Bureau d'Accompagnement à la Pédagogie et aux Projets",
      description: 'Concevoir ou restructurer un module, scénario pédagogique, outils d\'évaluation',
      scope: JSON.stringify(['ec_base']),
      contactEmail: 'bapp@sorbonne-nouvelle.fr',
    },
    {
      slug: 'bibliothecaire',
      name: 'Bibliothèques USN',
      role: 'Documentaliste / Bibliothécaire',
      description: 'Ressources documentaires, accès bases de données, HAL, droits d\'auteur',
      scope: JSON.stringify(['ec_base', 'student_base']),
      contactEmail: 'bibliotheques@sorbonne-nouvelle.fr',
    },
    {
      slug: 'service-scolarite',
      name: 'Service scolarité',
      role: 'Scolarité centrale',
      description: 'Procédures administratives, maquettes, habilitations, inscriptions',
      scope: JSON.stringify(['ec_base', 'student_base']),
      contactEmail: 'scolarite@sorbonne-nouvelle.fr',
    },
  ]

  for (const ec of EXPERT_CONTACTS) {
    await prisma.expertContact.upsert({
      where: { slug: ec.slug },
      update: { name: ec.name, role: ec.role, description: ec.description, contactEmail: ec.contactEmail },
      create: ec,
    })
  }

  // ── DocumentSpaces sample ─────────────────────────────────────────────────
  const existingSpace = await prisma.documentSpace.findUnique({ where: { slug: 'cours-traductologie-l3' } })
  if (!existingSpace) {
    const space = await prisma.documentSpace.create({
      data: {
        slug: 'cours-traductologie-l3',
        name: 'Cours Traductologie L3',
        description: 'Supports de cours Traductologie L3 — UFR LCCE',
        icon: '📖',
        ownerId: ecUser.id,
        enrichmentGroups: JSON.stringify(['ec_langues']),
      },
    })

    const folderCM = await prisma.documentFolder.create({
      data: { name: 'Cours magistraux', slug: 'cours-magistraux', spaceId: space.id },
    })
    const folderRessources = await prisma.documentFolder.create({
      data: { name: 'Ressources', slug: 'ressources', spaceId: space.id },
    })

    await prisma.spaceDocument.createMany({
      data: [
        {
          name: 'CM1_v3_final_VRAI.pdf',
          displayName: 'Introduction à la traductologie',
          description: 'Présentation des théories fondatrices de la discipline et des grands courants.',
          folderId: folderCM.id,
          spaceId: space.id,
          difyFileId: 'stub-file-001',
          uploadedById: ecUser.id,
          size: 204800,
          mimeType: 'application/pdf',
        },
        {
          name: 'CM2_Ladmiral_Meschonnic.pdf',
          displayName: 'Théories de Ladmiral et Meschonnic',
          description: 'Analyse comparée des théories sourcières et ciblistes en traductologie.',
          folderId: folderCM.id,
          spaceId: space.id,
          difyFileId: 'stub-file-002',
          uploadedById: ecUser.id,
          size: 186000,
          mimeType: 'application/pdf',
        },
        {
          name: 'glossaire_traductologie.pdf',
          displayName: 'Glossaire de traductologie',
          description: 'Lexique des termes techniques de la traductologie pour étudiants L3.',
          folderId: folderRessources.id,
          spaceId: space.id,
          difyFileId: 'stub-file-003',
          uploadedById: ecUser.id,
          size: 98000,
          mimeType: 'application/pdf',
        },
      ],
    })
  }

  // ── MetaPrompts institutionnels ───────────────────────────────────────────
  const INSTITUTIONAL_META_PROMPTS = [
    {
      title: 'Assistant Traductologie USN',
      description: 'Contexte spécialisé en traductologie universitaire',
      content: 'Tu es un assistant spécialisé en traductologie. Tu maîtrises les théories de Ladmiral, Meschonnic et Berman. Tu cites toujours en français. Tu t\'adresses à des universitaires.',
      level: 'INSTITUTIONAL' as const,
      isPublic: true,
    },
    {
      title: 'Rédaction administrative USN',
      description: 'Style administratif Sorbonne Nouvelle',
      content: 'Tu rédiges des documents administratifs pour l\'Université Sorbonne Nouvelle (Paris 3). Tu respectes les conventions de l\'administration française. Tu es formel, précis, concis.',
      level: 'INSTITUTIONAL' as const,
      isPublic: true,
    },
    {
      title: 'Recherche SHS avancée',
      description: 'Mode recherche en sciences humaines et sociales',
      content: 'Tu aides un chercheur en sciences humaines et sociales. Tu cites les sources systématiquement avec DOI ou lien HAL. Tu mentionnes les débats académiques actuels.',
      level: 'INSTITUTIONAL' as const,
      isPublic: true,
    },
  ]

  for (const mp of INSTITUTIONAL_META_PROMPTS) {
    const existing = await prisma.metaPrompt.findFirst({ where: { title: mp.title, level: 'INSTITUTIONAL' } })
    if (!existing) {
      await prisma.metaPrompt.create({ data: mp })
    }
  }

  // ── SessionScenarios v2.0 ───────────────────────────────────────────────
  const SCENARIOS_V2 = [
    {
      slug: 'revision-corpus-borne',
      label: 'Révision sur corpus borné',
      level: 1,
      levelLabel: 'Niveau 1 — Entrée',
      icon: '📖',
      shortDescription: "L'IA répond depuis le corpus du cours — elle ne sait rien en dehors.",
      fullDescription: "En période de révisions, les étudiants interrogent le contenu du cours. L'IA répond en s'appuyant uniquement sur les documents fournis, cite ses sources à chaque réponse, et signale explicitement ce qui dépasse le corpus. Elle ne donne pas les réponses aux questions d'examen — elle aide l'étudiant à retrouver la logique dans le cours.",
      disciplineHint: 'Toutes disciplines',
      levelHint: 'L1 à M2 — période de révisions',
      defaultAgentSlugs: JSON.stringify(['analyse', 'recherche']),
      defaultDuration: '1 semaine',
      defaultSaveHistory: true,
      defaultVisibility: 0,
      systemPromptTemplate: `Tu réponds aux questions des étudiants sur le cours de [matière].
Tes réponses s'appuient uniquement sur les documents fournis dans cette session.
Si une question dépasse le corpus, dis-le explicitement : "Ce point n'est pas dans les documents fournis."

Ne donne pas directement les réponses aux questions d'examen que l'étudiant formule.
Aide-le plutôt à retrouver la logique dans le cours :
pose la question qui l'oriente vers la bonne section du document.

Pour chaque réponse, indique la source : nom du document et section.

Niveau attendu : [L1 — explications détaillées et vocabulaire accessible / M1 — articulations conceptuelles / M2 — implications théoriques et positions des auteurs]`,
      studentConsigne: "Interrogez NouveLLM sur les notions du cours de [matière]. Il s'appuie uniquement sur les documents chargés dans la session et cite ses sources à chaque réponse. Si votre question dépasse le corpus, il vous le dira.",
      hasBroadcast: false, hasStructuredForm: false, order: 1,
    },
    {
      slug: 'corpus-degrade',
      label: 'Le corpus dégradé',
      level: 2,
      levelLabel: 'Niveau 2 — Regard critique',
      icon: '🔍',
      shortDescription: "Corpus avec erreurs délibérées non signalées. L'étudiant produit le livrable ET identifie les problèmes.",
      fullDescription: "L'enseignant fournit un corpus comportant une ou plusieurs erreurs délibérées non signalées : traduction publiée avec des choix contestables, source biaisée mêlée à des sources fiables, analyse comportant des arguments faibles. L'IA s'appuie sur ce corpus tel quel — elle ne sait pas qu'il contient des problèmes. L'étudiant doit produire le résultat attendu en ayant détecté et isolé le problème.",
      disciplineHint: 'Traductologie, Histoire, Journalisme, Sciences politiques, Études littéraires',
      levelHint: 'L3 à M2',
      defaultAgentSlugs: JSON.stringify(['analyse']),
      defaultDuration: '3 heures',
      defaultSaveHistory: false,
      defaultVisibility: 0,
      systemPromptTemplate: `Tu travailles avec des étudiants de [niveau] en [discipline].
Le corpus qui t'a été fourni contient des éléments problématiques — tu ne sais pas lesquels.
Tu ne dois en aucun cas signaler qu'il pourrait y avoir des erreurs dans le corpus.
Tu t'appuies sur les documents tels qu'ils te sont fournis, sans les mettre en doute.

Quand un étudiant soumet un résultat ou une analyse, réponds uniquement avec des questions :
- Sur quoi t'appuies-tu pour affirmer cela ?
- Où as-tu trouvé cette information dans le corpus ?
- As-tu vérifié cette affirmation dans les autres documents ?

Tu ne valides pas, tu ne confirmes pas, tu ne corriges pas.
Tu renvoies toujours l'étudiant vers le corpus pour qu'il construise lui-même son jugement.`,
      studentConsigne: "Travaillez sur le corpus fourni pour produire [livrable attendu]. Attention : certains éléments du corpus peuvent être inexacts, incomplets ou orientés. Votre rendu devra identifier les problèmes détectés, expliquer comment vous les avez repérés, et justifier les choix faits pour votre production.",
      hasBroadcast: false, hasStructuredForm: false, order: 2,
    },
    {
      slug: 'revelateur-conformisme',
      label: 'Le révélateur de conformisme',
      level: 2,
      levelLabel: 'Niveau 2 — Regard critique',
      icon: '🪞',
      shortDescription: "L'IA révèle ses propres biais. Les étudiants analysent ce que la réponse ne dit pas.",
      fullDescription: "L'IA produit une réponse sur un sujet disciplinaire depuis ses données d'entraînement — massivement anglophones, occidentales, contemporaines. L'étudiant doit identifier ce que cette réponse ne dit pas : quelle tradition intellectuelle elle marginalise, quelle position minoritaire elle efface, quel cadre dominant elle reproduit sans le nommer.",
      disciplineHint: 'Littératures francophones, Traductologie, Sciences du langage, Études postcoloniales',
      levelHint: 'M1 à M2',
      defaultAgentSlugs: JSON.stringify(['analyse', 'recherche']),
      defaultDuration: '2 heures',
      defaultSaveHistory: false,
      defaultVisibility: 0,
      systemPromptTemplate: `Tu travailles avec des étudiants de [niveau] en [discipline].
Pour chaque question sur [sujet], réponds depuis tes connaissances générales
sans consulter les documents fournis dans cette session.
Donne une réponse complète, bien structurée, académiquement convaincante.

Quand l'étudiant soumet une analyse de ta réponse (préfixée par "ANALYSE :"), ne te défends pas.
Pose des questions qui approfondissent son analyse :
- Quels textes du corpus confirment ce que tu identifies ?
- Y a-t-il d'autres éléments absents que tu n'as pas encore nommés ?
- Comment formulerais-tu ce que cette tradition apporte que ma réponse ne contient pas ?

Tu ne te justifies pas sur tes biais — tu aides l'étudiant à les nommer précisément.`,
      studentConsigne: "Posez à NouveLLM une question sur [sujet]. Lisez attentivement sa réponse. Puis, en vous appuyant sur le corpus fourni, soumettez votre analyse en la préfixant de « ANALYSE : ». Identifiez : (1) quel cadre de référence structure implicitement cette réponse, (2) quelles voix ou traditions sont absentes, (3) ce qu'une lecture depuis [tradition spécifique] apporterait.",
      hasBroadcast: false, hasStructuredForm: false, order: 3,
    },
    {
      slug: 'corpus-multilingue',
      label: 'Corpus multilingue comparé',
      level: 2,
      levelLabel: 'Niveau 2 — Regard critique',
      icon: '🌍',
      shortDescription: "Textes équivalents en plusieurs langues. L'IA aide à repérer les variations sans jamais trancher.",
      fullDescription: "Les étudiants travaillent sur des textes équivalents en plusieurs langues — le même discours, la même loi, le même texte littéraire dans 3 ou 4 versions linguistiques. Ils comparent les structures, les choix lexicaux, les implicites culturels. L'IA est bornée au corpus multilingue fourni et pose des questions pour approfondir l'analyse — elle ne tranche jamais sur quelle version est préférable.",
      disciplineHint: 'Linguistique comparée, Traductologie, Études européennes, FLE',
      levelHint: 'L3 à M2',
      defaultAgentSlugs: JSON.stringify(['analyse', 'traduction']),
      defaultDuration: '2 heures',
      defaultSaveHistory: false,
      defaultVisibility: 0,
      systemPromptTemplate: `Tu travailles avec des étudiants de [niveau] en [discipline].
Tu t'appuies uniquement sur les documents multilingues fournis dans cette session.

Quand un étudiant soumet une observation sur les textes, pose des questions
qui approfondissent son analyse sans prendre position toi-même :
- Comment cet élément est-il rendu dans les autres versions ?
- Qu'est-ce que cette différence de formulation implique sur le plan [stylistique / culturel / sémantique] ?
- Sur quoi t'appuies-tu pour affirmer que cette version est plus [explicite / neutre / précise] ?
- Y a-t-il d'autres occurrences de ce phénomène dans le corpus ?

Tu ne proposes jamais quelle version est préférable ou plus correcte.
Tu poses la question qui force l'étudiant à argumenter lui-même.`,
      studentConsigne: "Analysez les versions linguistiques du corpus fourni. Pour chaque variation que vous identifiez entre les versions, soumettez votre observation à NouveLLM — il vous posera des questions pour approfondir votre analyse. Votre rendu doit présenter au moins [N] variations analysées avec leur argumentation.",
      hasBroadcast: false, hasStructuredForm: false, order: 4,
    },
    {
      slug: 'revision-adversariale',
      label: 'La révision adversariale',
      level: 3,
      levelLabel: 'Niveau 3 — Révision exigeante',
      icon: '⚔️',
      shortDescription: "L'IA conteste chaque affirmation. L'étudiant tient sa position ou la corrige.",
      fullDescription: "L'étudiant révise en interrogeant le corpus du cours. Mais l'IA ne valide pas — elle conteste. Pour chaque affirmation que l'étudiant formule, elle cherche dans le corpus une nuance, une exception, une position contradictoire. L'étudiant doit tenir sa position avec des références précises, ou la corriger.",
      disciplineHint: 'Toutes disciplines — particulièrement master recherche',
      levelHint: 'M1 à Doctorat',
      defaultAgentSlugs: JSON.stringify(['analyse']),
      defaultDuration: '2 heures',
      defaultSaveHistory: true,
      defaultVisibility: 0,
      systemPromptTemplate: `Tu travailles avec un étudiant de [niveau] qui révise [matière] pour [type d'évaluation].
Tu t'appuies uniquement sur les documents fournis. Si une question dépasse le corpus, dis-le.

Ton rôle n'est pas de valider ce que l'étudiant sait.
Pour chaque affirmation qu'il formule, cherche dans le corpus :
- Une nuance que l'affirmation ignore
- Une exception au principe qu'il énonce
- Une position d'auteur qui contredit ou complique ce qu'il dit
- Un exemple qui teste la limite de son affirmation

Tu ne corriges pas directement les erreurs.
Tu poses la question qui force l'étudiant à trouver lui-même la correction dans le corpus.
Indique toujours le document et la section sur lesquels tu t'appuies pour objecter.

Niveau d'exigence :
[L3 — questions sur les notions / M1 — questions sur les positions des auteurs / M2 — questions sur les enjeux théoriques]`,
      studentConsigne: "Révisez [matière] en soumettant à NouveLLM vos propres formulations des notions clés. NouveLLM va contester chaque affirmation — tenez votre position avec des références précises, ou corrigez-la si la contestation est fondée.",
      hasBroadcast: false, hasStructuredForm: false, order: 5,
    },
    {
      slug: 'miroir-lacunes',
      label: 'Le miroir des lacunes',
      level: 3,
      levelLabel: 'Niveau 3 — Révision exigeante',
      icon: '💡',
      shortDescription: "Phase 1 : l'IA répond avec défauts non signalés. Phase 2 : elle révèle ce que l'étudiant n'a pas vu.",
      fullDescription: "Les étudiants de premier cycle n'ont pas encore les bases pour juger ce que l'IA produit. Ce scénario retourne ce problème en ressource pédagogique. L'IA répond depuis ses connaissances générales — avec des imprécisions intégrées non signalées. L'étudiant évalue ces réponses du mieux qu'il peut. Puis l'enseignant déclenche la Phase 2 : l'IA révèle ce qu'elle a dit d'inexact.",
      disciplineHint: 'Toutes disciplines — spécifique L1-L2',
      levelHint: "L1-L2 — séance d'introduction disciplinaire",
      defaultAgentSlugs: JSON.stringify(['analyse']),
      defaultDuration: '1h30',
      defaultSaveHistory: true,
      defaultVisibility: 1,
      systemPromptTemplate: `Cette session se déroule en deux phases.
L'enseignant signalera le passage à la phase 2 en envoyant le message "[PHASE 2]".

PHASE 1 — Réponses depuis tes connaissances générales
Réponds aux questions des étudiants sur [domaine disciplinaire] depuis tes connaissances générales.
Donne des réponses qui semblent convaincantes et bien structurées.
Intègre dans certaines réponses : une imprécision, une généralisation abusive,
un angle dominant qui marginalise une tradition minoritaire, ou une affirmation trop peu nuancée.
Ne signale pas toi-même ces problèmes.

PHASE 2 — Révélation
Quand tu reçois le message "[PHASE 2]", révèle pour chaque réponse donnée :
- Ce qui était exact
- Ce qui était inexact, imprécis ou biaisé
- Ce qu'un étudiant maîtrisant [domaine] aurait su détecter
- Quelle connaissance précise il faudrait avoir pour faire ce jugement`,
      studentConsigne: "Posez à NouveLLM 3 à 5 questions sur [domaine]. Pour chaque réponse, notez : ce qui vous semble correct, ce qui vous semble douteux, ce que vous ne pouvez pas évaluer. Quand votre enseignant annonce la Phase 2, NouveLLM révèle ce que chaque réponse contenait comme problème.",
      hasBroadcast: true, hasStructuredForm: false, order: 6,
    },
    {
      slug: 'mission-professionnelle',
      label: 'La mission professionnelle',
      level: 4,
      levelLabel: 'Niveau 4 — Mise en situation professionnelle',
      icon: '🎭',
      shortDescription: "Scénario narratif à conséquences irréversibles. L'IA joue les parties prenantes de la mission.",
      fullDescription: "L'étudiant joue un professionnel débutant confronté à une mission réelle. L'IA joue successivement les parties prenantes — client, expert, collègue, hiérarchie — et fait avancer un scénario dont l'enseignant a défini les points de bascule. Les décisions ont des conséquences narratives immédiates et irréversibles.",
      disciplineHint: 'Traductologie (ESIT), FLE (DFLE), Cinéma-Audiovisuel (CAV), Masters professionnels',
      levelHint: 'M1 à M2',
      defaultAgentSlugs: JSON.stringify([]),
      defaultDuration: '3 heures',
      defaultSaveHistory: true,
      defaultVisibility: 2,
      systemPromptTemplate: `Tu es le maître du jeu d'un scénario professionnel pour des étudiants de [niveau] en [discipline].

CONTEXTE DU SCÉNARIO
[Description de la situation : organisation, mission confiée, enjeux]

PERSONNAGES QUE TU INCARNES
[Liste des personnages avec leur rôle, leurs intérêts, leur relation à l'étudiant]

PLAN NARRATIF
Situation de départ : [ce que l'étudiant reçoit au début]
Point de bascule 1 : [condition de déclenchement]
→ Si bien géré : [suite du scénario]
→ Si mal géré : [bifurcation et conséquences]
Point de bascule 2 : [condition de déclenchement]
→ Si bien géré : [dénouement A]
→ Si mal géré : [dénouement B]

RÈGLES DU JEU
Tu fais avancer le scénario en permanence. Tu ne l'interromps pas pour donner des conseils.
Les conséquences des décisions sont immédiates et narratives.
Si l'étudiant essaie de "sortir du jeu", reste dans le personnage.
En fin de session, sors du rôle et propose un débriefing des moments clés.`,
      studentConsigne: "Vous êtes [personnage et situation de départ]. NouveLLM joue les personnes que vous rencontrerez dans cette mission. Vos décisions ont des conséquences — il n'y a pas de retour en arrière. À la fin, NouveLLM fait le débriefing des moments clés avec vous.",
      hasBroadcast: false, hasStructuredForm: true, order: 7,
    },
    {
      slug: 'personnalise',
      label: 'Session personnalisée',
      level: null,
      levelLabel: 'Configuration libre',
      icon: '⚙️',
      shortDescription: "Configurer librement tous les paramètres de la session.",
      fullDescription: "Accès à la configuration complète : choix des agents, des sources, du prompt d'accompagnement, du niveau de visibilité. Pour les enseignants expérimentés ou les besoins non couverts par les scénarios proposés.",
      disciplineHint: null,
      levelHint: null,
      defaultAgentSlugs: JSON.stringify([]),
      defaultDuration: '2 heures',
      defaultSaveHistory: false,
      defaultVisibility: 0,
      systemPromptTemplate: '',
      studentConsigne: '',
      hasBroadcast: false, hasStructuredForm: false, order: 8,
    },
  ]

  for (const sc of SCENARIOS_V2) {
    await prisma.sessionScenario.upsert({
      where: { slug: sc.slug },
      update: sc,
      create: sc,
    })
  }

  console.log('Seed complete.')
  console.log('Demo EC:    camille.daniaux@sorbonne-nouvelle.fr / demo1234')
  console.log('Admin:      transvers.art@gmail.com / demo1234')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
