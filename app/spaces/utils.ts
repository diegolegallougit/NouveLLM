import { SpaceDoc } from '@/components/spaces/SpaceTree'

export interface DocWithDate extends SpaceDoc {
  uploadedAt?: string
  isVisible?: boolean
  visibleFrom?: string | null
  visibleUntil?: string | null
  metadata?: string | null
  indexingStatus?: string
  progress?: number | null
}

export function fileIcon(mime: string | null, name?: string): string {
  const ext = name?.split('.').pop()?.toLowerCase()
  if (ext === 'md') return '📝'
  if (ext === 'json') return '📋'
  if (ext === 'csv') return '📊'
  if (ext === 'txt') return '📃'
  if (!mime) return '📄'
  if (mime.includes('pdf')) return '📕'
  if (mime.includes('word') || mime.includes('docx') || ext === 'doc' || ext === 'docx') return '📘'
  if (mime.includes('presentation') || mime.includes('pptx') || ext === 'ppt' || ext === 'pptx') return '📙'
  if (mime.includes('spreadsheet') || mime.includes('xlsx') || ext === 'xls' || ext === 'xlsx') return '📗'
  if (mime.includes('json')) return '📋'
  if (mime.includes('csv') || mime.includes('tab-separated')) return '📊'
  if (mime.startsWith('text/')) return '📃'
  return '📄'
}

export function formatSize(b: number | null): string {
  if (!b) return ''
  if (b < 1024) return `${b} o`
  if (b < 1048576) return `${Math.round(b / 1024)} Ko`
  return `${(b / 1048576).toFixed(1)} Mo`
}

export function formatDate(d?: string): string {
  if (!d) return ''
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function formatAuditAction(action: string): string {
  const map: Record<string, string> = {
    DOCUMENT_UPLOAD: 'a déposé',
    DOCUMENT_DELETE: 'a supprimé',
    DOCUMENT_RENAME: 'a renommé',
    DOCUMENT_DOWNLOAD: 'a téléchargé',
    USER_INVITED: 'a invité',
    USER_REMOVED: 'a retiré',
    SPACE_CREATED: "a créé l'espace",
    SPACE_DELETED: "a supprimé l'espace",
  }
  return map[action] ?? action
}

export function fmtVisibleDate(iso?: string | null): string | null {
  if (!iso) return null
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}
