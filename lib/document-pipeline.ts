import { MarkItDown } from 'markitdown-ts'
import * as XLSX from 'xlsx'
import { parse as parseCsv } from 'csv-parse/sync'

const markitdown = new MarkItDown()

// markitdown-ts PdfConverter wraps pdf-parse without paragraph reconstruction
// → cleanPdfText est encore nécessaire pour éviter le micro-chunking Dify
function cleanPdfText(raw: string): string {
  return raw
    .replace(/\r\n/g, '\n')
    .replace(/([^\n])\n([^\n])/g, '$1 $2')
    .replace(/ {2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
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

  // DOCX/DOC → Markdown via markitdown-ts (mammoth→HTML→turndown)
  if (['docx', 'doc'].includes(ext) || mimeType.includes('word')) {
    try {
      const result = await markitdown.convertBuffer(buffer, { file_extension: '.docx' })
      const markdown = result?.markdown ?? ''
      if (markdown.trim().length > 50) {
        return {
          content: markdown,
          contentType: 'markdown',
          method: 'markitdown',
          hasText: true,
          warnings,
          filename: filename.replace(/\.[^.]+$/, '.md'),
        }
      }
    } catch { /* fall through to Dify native */ }
    // .doc ou échec conversion → Dify extrait nativement
    return { content: '', contentType: 'text', method: 'pdf-dify-native', hasText: true, warnings, filename }
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
    try {
      const rows = parseCsv(buffer, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        relax_quotes: true,
        bom: true,
      }) as Record<string, string>[]
      const headers = rows.length > 0 ? Object.keys(rows[0]) : []
      return {
        content: JSON.stringify({ headers, rows }, null, 2),
        contentType: 'json',
        method: 'csv-json',
        hasText: rows.length > 0,
        warnings,
        filename: filename.replace(/\.csv$/i, '.json'),
      }
    } catch {
      return { content: '{}', contentType: 'json', method: 'csv-json', hasText: false, warnings, filename: filename.replace(/\.csv$/i, '.json') }
    }
  }

  // PDF → markitdown-ts (wraps pdf-parse) + cleanPdfText pour reconstruction paragraphes
  if (ext === 'pdf' || mimeType.includes('pdf')) {
    try {
      const result = await markitdown.convertBuffer(buffer, { file_extension: '.pdf' })
      const markdown = result?.markdown ?? ''
      const cleanedText = cleanPdfText(markdown)

      if (cleanedText.length < 100 && buffer.length < 100_000) {
        return { content: '', contentType: 'text', method: 'pdf-scanned', hasText: false, warnings: ['PDF_SCANNED'], filename }
      }

      if (cleanedText.length >= 100) {
        return {
          content: cleanedText,
          contentType: 'markdown',
          method: 'markitdown',
          hasText: true,
          warnings,
          filename: filename.replace(/\.pdf$/i, '.md'),
        }
      }

      // Texte insuffisant + gros fichier → Dify extrait nativement
      return { content: '', contentType: 'text', method: 'pdf-dify-native', hasText: true, warnings: [], filename }

    } catch {
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
