export type IntegrationMeta = {
  label: string
  description: string
  icon: string
  type: 'CONNECTOR' | 'ACADEMIC_SOURCE'
  hasEmail?: boolean
  hasApiKey?: boolean
  apiKeyLabel?: string
  noGlobalConfig?: boolean
}

export const INTEGRATION_CATALOG: Record<string, IntegrationMeta> = {
  // ── Connectors ───────────────────────────────────────────────────────────
  gdrive: {
    label: 'Google Drive',
    description: 'Permet aux utilisateurs de connecter leur Google Drive personnel pour importer des documents dans leurs espaces de travail.',
    icon: '📁',
    type: 'CONNECTOR',
  },
  notion: {
    label: 'Notion',
    description: 'Les utilisateurs saisissent leur token Notion dans leurs paramètres pour importer des pages et bases de données.',
    icon: '📝',
    type: 'CONNECTOR',
    noGlobalConfig: true,
  },
  nextcloud: {
    label: 'Nextcloud',
    description: 'Connexion à une instance Nextcloud institutionnelle.',
    icon: '☁️',
    type: 'CONNECTOR',
  },
  onedrive: {
    label: 'OneDrive',
    description: 'Connexion à Microsoft OneDrive / SharePoint.',
    icon: '🗄️',
    type: 'CONNECTOR',
  },
  // ── Academic sources ─────────────────────────────────────────────────────
  openalex: {
    label: 'OpenAlex',
    description: 'Index mondial de publications académiques en accès ouvert.',
    icon: '🌍',
    type: 'ACADEMIC_SOURCE',
    hasEmail: true,
  },
  'semantic-scholar': {
    label: 'Semantic Scholar',
    description: 'Base de données scientifique avec focus IA, neurosciences et sciences cognitives.',
    icon: '🔬',
    type: 'ACADEMIC_SOURCE',
    hasApiKey: true,
    apiKeyLabel: 'Clé API Semantic Scholar',
  },
  arxiv: {
    label: 'ArXiv',
    description: 'Archive de prépublications en sciences, mathématiques et informatique.',
    icon: '📄',
    type: 'ACADEMIC_SOURCE',
  },
  hal: {
    label: 'HAL',
    description: 'Archive ouverte pluridisciplinaire française (CCSD).',
    icon: '🇫🇷',
    type: 'ACADEMIC_SOURCE',
  },
  cairn: {
    label: 'Cairn.info',
    description: 'Portail de revues en sciences humaines et sociales francophones.',
    icon: '📚',
    type: 'ACADEMIC_SOURCE',
  },
  openedition: {
    label: 'OpenEdition',
    description: 'Plateforme de ressources électroniques en SHS (revues, livres, carnets).',
    icon: '📖',
    type: 'ACADEMIC_SOURCE',
  },
  jstor: {
    label: 'JSTOR',
    description: 'Archives numériques de revues académiques anglophones.',
    icon: '📰',
    type: 'ACADEMIC_SOURCE',
  },
  pubmed: {
    label: 'PubMed',
    description: 'Base de données biomédicale et sciences de la vie (NIH).',
    icon: '🧬',
    type: 'ACADEMIC_SOURCE',
  },
  llba: {
    label: 'LLBA',
    description: 'Linguistics and Language Behavior Abstracts.',
    icon: '🗣️',
    type: 'ACADEMIC_SOURCE',
  },
  fiaf: {
    label: 'FIAF',
    description: 'Fédération Internationale des Archives du Film — cinéma et arts visuels.',
    icon: '🎬',
    type: 'ACADEMIC_SOURCE',
  },
  mla: {
    label: 'MLA International Bibliography',
    description: 'Bibliographie internationale de littérature et langues modernes.',
    icon: '✍️',
    type: 'ACADEMIC_SOURCE',
  },
}

export const VISIBLE_TO_OPTIONS = [
  { value: 'EC,ADMIN', label: 'EC et administrateurs' },
  { value: 'EC,ADMIN,RESPONSABLE', label: 'EC, responsables et admins' },
  { value: 'EC,ADMIN,RESPONSABLE,STUDENT,BIATSS', label: 'Tous les utilisateurs' },
]
