export function syncDocVisibilityToDify(
  datasetId: string,
  difyFileId: string,
  visibility: { isVisible: boolean; visibleFrom: Date | null; visibleUntil: Date | null }
): void {
  if (!datasetId || !difyFileId) return
  const base = process.env.DIFY_BASE_URL || 'http://172.19.0.13:5001'
  fetch(`${base}/v1/datasets/${datasetId}/documents/${difyFileId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${process.env.DIFY_DATASET_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      doc_metadata: {
        is_visible: visibility.isVisible,
        visible_from: visibility.visibleFrom?.toISOString() ?? null,
        visible_until: visibility.visibleUntil?.toISOString() ?? null,
      },
    }),
  }).catch(err => console.warn('[dify-sync] non-blocking error:', err))
}
