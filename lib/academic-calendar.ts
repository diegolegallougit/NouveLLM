export function currentAnneeUniv(): string {
  const now = new Date()
  const year = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1
  return `${year}-${year + 1}`
}

export function defaultVisibleUntil(): Date {
  const now = new Date()
  const endYear = now.getMonth() >= 8 ? now.getFullYear() + 1 : now.getFullYear()
  return new Date(`${endYear}-08-31T23:59:59.000Z`)
}

export function isDocumentVisible(doc: {
  isVisible: boolean
  visibleFrom: Date | null
  visibleUntil: Date | null
}): boolean {
  if (!doc.isVisible) return false
  const now = new Date()
  if (doc.visibleFrom && doc.visibleFrom > now) return false
  if (doc.visibleUntil && doc.visibleUntil < now) return false
  return true
}
