// OCR pour PDFs scannés via Pixtral 2409 sur Cortecs
// Modèle vision Mistral, 83.7% ChartQA, conçu pour l'extraction depuis images de documents
// Endpoint compatible OpenAI — même provider que dans Dify

export async function ocrPdfWithPixtral(buffer: Buffer): Promise<string> {
  const CORTECS_BASE_URL = process.env.CORTECS_BASE_URL ?? 'https://api.cortecs.ai/v1'
  const CORTECS_API_KEY = process.env.CORTECS_API_KEY ?? ''

  if (!CORTECS_API_KEY) {
    console.warn('[ocr-pixtral] CORTECS_API_KEY non configurée — OCR désactivé')
    return ''
  }

  const base64 = buffer.toString('base64')

  const response = await fetch(`${CORTECS_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${CORTECS_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'pixtral-12b-2409',
      messages: [{
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'Extrais tout le texte de ce document en préservant sa structure (titres avec #, paragraphes, tableaux en Markdown). Retourne uniquement le texte structuré en Markdown, sans aucun commentaire.',
          },
          {
            type: 'image_url',
            image_url: { url: `data:application/pdf;base64,${base64}` },
          },
        ],
      }],
      max_tokens: 8000,
      temperature: 0.1,
    }),
    signal: AbortSignal.timeout(60000),
  })

  if (!response.ok) {
    console.warn('[ocr-pixtral] API error:', response.status, await response.text())
    return ''
  }

  const data = await response.json()
  return data.choices?.[0]?.message?.content ?? ''
}
