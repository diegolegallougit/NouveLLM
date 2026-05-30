const DIFY_BASE_URL = process.env.DIFY_BASE_URL || 'http://172.19.0.13:5001'
const DIFY_TTFB_TIMEOUT_MS = 90_000

export interface DifySource {
  document_name: string
  segment_id: string
  score: number
  content: string
  dataset_id?: string
  dataset_name?: string
  document_id?: string
}

export interface ParsedSource {
  title: string
  domain: string
  url?: string
  icon: string
  tag?: string
  excerpt?: string
  difyDocumentId?: string
}

export const AGENT_INPUTS: Record<string, (message: string, uploadedFileId?: string) => Record<string, unknown>> = {
  bibliographie: (msg) => ({
    sujet: msg,
    discipline: 'Sciences Humaines et Sociales',
    niveau: 'Master',
    nb_refs: '10',
  }),
  redaction: (msg) => ({
    doc_type: 'note de service',
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
  analyse: (msg, uploadedFileId?) => ({
    questions: msg,
    ...(uploadedFileId ? { document: { transfer_method: 'local_file', upload_file_id: uploadedFileId } } : {}),
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
  uploadedFileId,
  datasetIds,
  signal,
}: {
  apiKey: string
  query: string
  conversationId?: string
  userId: string
  inputs?: Record<string, unknown>
  uploadedFileId?: string
  datasetIds?: string[]
  signal?: AbortSignal
}): Promise<Response> {
  const mergedInputs: Record<string, unknown> = { ...inputs }
  if (datasetIds && datasetIds.length > 0) {
    mergedInputs.dataset_ids = datasetIds.join(',')
  }

  const body: Record<string, unknown> = {
    inputs: mergedInputs,
    query,
    response_mode: 'streaming',
    conversation_id: conversationId || '',
    user: userId,
  }

  if (uploadedFileId) {
    body.files = [
      {
        type: 'document',
        transfer_method: 'local_file',
        upload_file_id: uploadedFileId,
      },
    ]
  }

  const ttfbController = new AbortController()
  const ttfbTimeoutId = setTimeout(
    () => ttfbController.abort(new Error('TTFB_TIMEOUT')),
    DIFY_TTFB_TIMEOUT_MS
  )
  const combinedSignal = signal
    ? AbortSignal.any([signal, ttfbController.signal])
    : ttfbController.signal

  try {
    return await fetch(`${DIFY_BASE_URL}/v1/chat-messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: combinedSignal,
    })
  } finally {
    clearTimeout(ttfbTimeoutId)
  }
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
      // Use document_name as URL if it's a web-crawled document
      const url: string | undefined = /^https?:\/\//i.test(name) ? name : undefined

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

      if (url) { icon = '🌐' }

      const excerpt = r.content ? r.content.replace(/\s+/g, ' ').trim().slice(0, 220) : undefined

      return { title: name, domain, url, icon, tag, excerpt, difyDocumentId: r.document_id }
    })
}
