// NouveLLM — Shared chat data: agent palettes, source palettes, sample messages.

// Agent palette — full set for Enseignant
const AGENTS_TEACHER = [
  { key: 'bibliographie', icon: 'book', name: 'bibliographie', desc: 'Construire et formater une bibliographie sourcée.' },
  { key: 'fiche-cours',   icon: 'notebook', name: 'fiche-cours', desc: 'Générer une fiche de cours à partir d’un syllabus.' },
  { key: 'redaction',     icon: 'edit',  name: 'rédaction', desc: 'Rédiger ou reformuler un document académique.' },
  { key: 'module',        icon: 'layers', name: 'module', desc: 'Concevoir un module pédagogique sur N séances.' },
  { key: 'examen',        icon: 'file-text', name: 'examen', desc: 'Préparer un sujet d’examen avec barème.' },
  { key: 'traduction',    icon: 'languages', name: 'traduction', desc: 'Traduire un texte académique en respectant le registre.' },
  { key: 'briefing',      icon: 'briefcase', name: 'briefing', desc: 'Préparer un briefing de réunion à partir de notes.' },
  { key: 'analyse',       icon: 'sparkle', name: 'analyse', desc: 'Analyser un texte ou un corpus.' },
];

// Source palette — full set for Enseignant
const SOURCES_TEACHER = [
  { key: 'formations-usn',  icon: 'graduation-cap', name: 'formations-usn', desc: 'Catalogue officiel des formations USN.', count: 412, scope: 'Institutionnel' },
  { key: 'services-usn',    icon: 'building',  name: 'services-usn', desc: 'Annuaire et procédures des services centraux.', count: 86, scope: 'Institutionnel' },
  { key: 'pedagogie-usn',   icon: 'book-open', name: 'pédagogie-usn', desc: 'Maquettes, syllabus, ressources pédagogiques USN.', count: 1284, scope: 'Institutionnel' },
  { key: 'mes-documents',   icon: 'folder',    name: 'mes-documents', desc: 'Vos espaces personnels et documents partagés.', count: 47, scope: 'Personnel' },
  { key: 'publications-shs',icon: 'database',  name: 'publications-shs', desc: 'HAL-SHS, OpenEdition, Persée — sciences humaines.', count: '218 k', scope: 'Recherche' },
];

// Reduced sets for Étudiant
const AGENTS_STUDENT = [
  { key: 'recherche',     icon: 'search', name: 'recherche', desc: 'Rechercher dans les ressources documentaires USN.' },
  { key: 'redaction',     icon: 'edit',   name: 'rédaction', desc: 'Aide à la rédaction académique (mémoire, dissertation).' },
  { key: 'traduction',    icon: 'languages', name: 'traduction', desc: 'Traduire un texte avec un registre adapté.' },
  { key: 'admin-usn',     icon: 'building', name: 'admin-usn', desc: 'Démarches, scolarité, calendrier universitaire.' },
  { key: 'session-cours', icon: 'graduation-cap', name: 'session-cours', desc: 'Rejoindre une session de cours avec un code EC.' },
];

const SOURCES_STUDENT = [
  { key: 'formations-usn',   icon: 'graduation-cap', name: 'formations-usn', desc: 'Catalogue officiel des formations USN.', count: 412, scope: 'Public' },
  { key: 'services-usn',     icon: 'building', name: 'services-usn', desc: 'Annuaire et procédures des services centraux.', count: 86, scope: 'Public' },
  { key: 'bibliotheques-usn',icon: 'book',  name: 'bibliothèques-usn', desc: 'Catalogues des BU Censier, Champerret, Asie.', count: '1,2 M', scope: 'Public' },
];

// Sample teacher conversation
const TEACHER_THREAD = [
  {
    role: 'user', when: 'Aujourd’hui · 14:32',
    text: 'Bonjour. Pourrais-tu me proposer un plan en 12 séances pour un cours de Licence 2 intitulé « Sociolinguistique et plurilinguisme » ? Je m’appuierai sur la maquette de la mention Sciences du langage. Utilise #pédagogie-usn pour caler les volumes horaires.',
    chips: [{ kind: '#', label: 'pédagogie-usn' }],
  },
  {
    role: 'system',
    agent: 'module',
    when: 'à l’instant',
    text: 'plan-card',
    sources: [
      { tag: '#pédagogie-usn', title: 'Maquette mention Sciences du langage 2025-2029.pdf — p. 14', icon: 'book-open' },
      { tag: '#pédagogie-usn', title: 'Référentiel L2 SDL — UE Sociolinguistique.docx', icon: 'file-text' },
      { tag: '#formations-usn', title: 'Fiche formation L2 Sciences du langage — orientation', icon: 'graduation-cap' },
    ],
  },
];

window.NL_DATA = {
  AGENTS_TEACHER, SOURCES_TEACHER,
  AGENTS_STUDENT, SOURCES_STUDENT,
  TEACHER_THREAD,
};
