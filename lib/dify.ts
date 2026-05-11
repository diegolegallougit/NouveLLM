const DIFY_BASE_URL = process.env.DIFY_BASE_URL || 'http://172.19.0.5:5001'

export interface DifySource {
  document_name: string
  segment_id: string
  score: number
  content: string
  dataset_name?: string
  document_id?: string
}

export interface ParsedSource {
  title: string
  domain: string
  url?: string
  icon: string
  tag?: string
}

export const AGENT_INPUTS: Record<string, (message: string) => Record<string, string>> = {
  bibliographie: (msg) => ({
    sujet: msg,
    discipline: 'SHS',
    niveau: 'Master',
    nb_refs: '10',
  }),
  redaction: (msg) => ({
    type_document: 'note',
    contexte: msg,
    destinataires: '',
  }),
  module: (msg) => ({
    syllabus: msg,
    niveau: 'Licence',
    discipline: 'Sciences humaines et sociales',
    objectifs: msg,
  }),
  examen: (msg) => ({
    competences: msg,
    contenu_cours: '',
    niveau: 'Licence',
    format_exam: 'questions ouvertes',
  }),
  traduction: (msg) => ({
    texte: msg,
    langue_cible: 'anglais',
  }),
  briefing: (msg) => ({
    contexte: msg,
    sujet: msg,
  }),
  analyse: (msg) => ({
    question: msg,
  }),
  'fiche-cours': (msg) => ({
    titre: msg,
    titre_cours: msg,
    objectifs: '',
    contenu: '',
    niveau: 'Licence',
    credits: '3',
    ufr: 'LCCE',
  }),
}

export async function streamDifyChat({
  apiKey,
  query,
  conversationId,
  userId,
  inputs = {},
}: {
  apiKey: string
  query: string
  conversationId?: string
  userId: string
  inputs?: Record<string, string>
}): Promise<Response> {
  const body = {
    inputs,
    query,
    response_mode: 'streaming',
    conversation_id: conversationId || '',
    user: userId,
  }

  return fetch(`${DIFY_BASE_URL}/v1/chat-messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
}

export function parseDifySources(retrieverResources: DifySource[]): ParsedSource[] {
  if (!retrieverResources || retrieverResources.length === 0) return []

  return retrieverResources
    .filter((r) => r.score > 0.1)
    .slice(0, 6)
    .map((r) => {
      const name = r.document_name || 'Document'
      const dataset = r.dataset_name || ''

      let icon = '📄'
      let tag: string | undefined
      let domain = 'sorbonne-nouvelle.fr'
      const url: string | undefined = undefined

      if (dataset.toLowerCase().includes('formation')) {
        icon = '🎓'; domain = 'sorbonne-nouvelle.fr'
      } else if (dataset.toLowerCase().includes('service')) {
        icon = '🏛️'; domain = 'sorbonne-nouvelle.fr'
      } else if (dataset.toLowerCase().includes('pédag')) {
        icon = '📐'; domain = 'sorbonne-nouvelle.fr'
      } else if (dataset.toLowerCase().includes('publication') || dataset.toLowerCase().includes('shs')) {
        icon = '📰'; tag = 'SHS'
        domain = name.includes('openedition') ? 'openedition.org' : 'hal.science'
      } else if (dataset.toLowerCase().includes('integria')) {
        icon = '🔬'; domain = 'integria-anr.fr'
      }

      return { title: name, domain, url, icon, tag }
    })
}
