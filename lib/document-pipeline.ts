// eslint-disable-next-line @typescript-eslint/no-require-imports
const mammoth = require('mammoth') as {
  convertToMarkdown: (input: { buffer: Buffer }) => Promise<{ value: string; messages: { message: string }[] }>
  convertToHtml: (input: { buffer: Buffer }) => Promise<{ value: string; messages: { message: string }[] }>
}
import * as XLSX from 'xlsx'
// pdf-parse doesn't ship a proper ESM default — require at call site
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse') as (buf: Buffer) => Promise<{ text: string; numpages: number }>

function cleanPdfText(raw: string): string {
  return raw
    .replace(/\r\n/g, '\n')
    // Rejoindre les lignes d'un même paragraphe (simple \n → espace)
    .replace(/([^\n])\n([^\n])/g, '$1 $2')
    .replace(/ {2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    // Supprimer les lignes très courtes isolées (artefacts mise en page, numéros de page)
    .replace(/\n([^\n]{1,15})\n/g, (match, line) => {
      if (/^[A-Z0-9]/.test(line.trim())) return match
      return '\n'
    })
    .trim()
}

export type PipelineResult = {
  content: string
  contentType: 'markdown' | 'json' | 'text'
  method: string
  hasText: boolean
  warnings: string[]
  filename: string
}

export async function processDocument(
  buffer: Buffer,
  filename: string,
  mimeType: string
): Promise<PipelineResult> {
  const ext = filename.split('.').pop()?.toLowerCase() ?? ''
  const warnings: string[] = []

  // DOCX/DOC → Markdown via mammoth
  if (['docx', 'doc'].includes(ext) || mimeType.includes('word')) {
    const result = await mammoth.convertToMarkdown({ buffer })
    warnings.push(...result.messages.map(m => m.message))
    return {
      content: result.value,
      contentType: 'markdown',
      method: 'mammoth',
      hasText: result.value.trim().length > 50,
      warnings,
      filename: filename.replace(/\.[^.]+$/, '.md'),
    }
  }

  // XLSX/XLS → JSON structuré (meilleur que MD pour RAG tabulaire)
  if (['xlsx', 'xls'].includes(ext) || mimeType.includes('spreadsheet') || mimeType.includes('excel')) {
    const workbook = XLSX.read(buffer, { type: 'buffer' })
    const sheets: Record<string, { headers: string[]; rows: Record<string, unknown>[] }> = {}
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName]
      const raw = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, defval: '' }) as string[][]
      if (raw.length === 0) continue
      const headers = raw[0].map(h => String(h ?? '').trim())
      const rows = raw.slice(1).map(row =>
        Object.fromEntries(headers.map((h, i) => [h, row[i] ?? '']))
      )
      sheets[sheetName] = { headers, rows }
    }
    return {
      content: JSON.stringify(sheets, null, 2),
      contentType: 'json',
      method: 'sheetjs-json',
      hasText: Object.keys(sheets).length > 0,
      warnings,
      filename: filename.replace(/\.[^.]+$/, '.json'),
    }
  }

  // CSV → JSON structuré
  if (ext === 'csv') {
    const text = buffer.toString('utf-8')
    const lines = text.split('\n').filter(l => l.trim())
    if (!lines.length) {
      return { content: '{}', contentType: 'json', method: 'csv-json', hasText: false, warnings, filename: filename.replace('.csv', '.json') }
    }
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))
    const rows = lines.slice(1).map(line =>
      Object.fromEntries(
        line.split(',').map((v, i) => [headers[i] ?? `col${i}`, v.trim().replace(/^"|"$/g, '')])
      )
    )
    return {
      content: JSON.stringify({ headers, rows }, null, 2),
      contentType: 'json',
      method: 'csv-json',
      hasText: rows.length > 0,
      warnings,
      filename: filename.replace('.csv', '.json'),
    }
  }

  // PDF → détection scanned ou texte
  if (ext === 'pdf' || mimeType.includes('pdf')) {
    try {
      const data = await pdfParse(buffer)
      const text = data.text.trim()

      // Scanné uniquement si : texte très court ET fichier petit (< 100 Ko)
      // Les PDFs avec polices embarquées peuvent avoir peu de texte extrait
      // mais sont volumineux — Dify gère leur extraction nativement.
      const isLikelyScanned = text.length < 30 && buffer.length < 100_000

      if (isLikelyScanned) {
        return { content: '', contentType: 'text', method: 'pdf-scanned', hasText: false, warnings: ['PDF_SCANNED'], filename }
      }

      if (text.length >= 30) {
        const cleanedText = cleanPdfText(text)
        return {
          content: cleanedText,
          contentType: 'text',
          method: 'pdf-parse',
          hasText: true,
          warnings,
          filename: filename.replace(/\.pdf$/i, '.txt'),
        }
      }

      // Texte court mais fichier volumineux → polices non-standard, Dify gère nativement
      return { content: '', contentType: 'text', method: 'pdf-dify-native', hasText: true, warnings: [], filename }

    } catch {
      // En cas d'erreur pdf-parse → laisser Dify gérer nativement
      return { content: '', contentType: 'text', method: 'pdf-dify-native', hasText: true, warnings: [], filename }
    }
  }

  // PPTX → Markdown par slides
  if (['pptx', 'ppt'].includes(ext) || mimeType.includes('presentation')) {
    try {
      const JSZip = (await import('jszip')).default
      const zip = await JSZip.loadAsync(buffer)
      const slideFiles = Object.keys(zip.files)
        .filter(f => /^ppt\/slides\/slide\d+\.xml$/.test(f))
        .sort((a, b) => parseInt(a.match(/\d+/)?.[0] ?? '0') - parseInt(b.match(/\d+/)?.[0] ?? '0'))
      const slides: string[] = []
      for (let i = 0; i < slideFiles.length; i++) {
        const xml = await zip.files[slideFiles[i]].async('string')
        const texts = [...xml.matchAll(/<a:t[^>]*>([^<]+)<\/a:t>/g)].map(m => m[1].trim()).filter(Boolean)
        if (texts.length) slides.push(`## Slide ${i + 1}\n\n${texts.join('\n\n')}`)
      }
      return {
        content: slides.join('\n\n---\n\n'),
        contentType: 'markdown',
        method: 'pptx',
        hasText: slides.length > 0,
        warnings,
        filename: filename.replace(/\.[^.]+$/, '.md'),
      }
    } catch {
      return { content: '', contentType: 'text', method: 'pptx-error', hasText: false, warnings, filename }
    }
  }

  // TXT, MD, JSON → direct
  if (['txt', 'md', 'json'].includes(ext)) {
    const text = buffer.toString('utf-8')
    return {
      content: text,
      contentType: ext === 'json' ? 'json' : ext === 'md' ? 'markdown' : 'text',
      method: 'direct',
      hasText: text.trim().length > 0,
      warnings,
      filename,
    }
  }

  // Fallback
  return { content: buffer.toString('utf-8'), contentType: 'text', method: 'fallback', hasText: true, warnings, filename }
}
