'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { SpaceData, SpaceDoc } from '@/components/spaces/SpaceTree'

interface SharedSpace {
  id: string
  name: string
  icon: string
  description: string | null
  audience: string
}

function fileIcon(mime: string | null, name?: string) {
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

function formatSize(b: number | null) {
  if (!b) return ''
  if (b < 1024) return `${b} o`
  if (b < 1048576) return `${Math.round(b / 1024)} Ko`
  return `${(b / 1048576).toFixed(1)} Mo`
}

function formatDate(d?: string) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatAuditAction(action: string): string {
  const map: Record<string, string> = {
    DOCUMENT_UPLOAD: 'a déposé',
    DOCUMENT_DELETE: 'a supprimé',
    DOCUMENT_RENAME: 'a renommé',
    DOCUMENT_DOWNLOAD: 'a téléchargé',
    USER_INVITED: 'a invité',
    USER_REMOVED: 'a retiré',
    SPACE_CREATED: 'a créé l\'espace',
    SPACE_DELETED: 'a supprimé l\'espace',
  }
  return map[action] ?? action
}

interface DocWithDate extends SpaceDoc {
  uploadedAt?: string
  isVisible?: boolean
  visibleFrom?: string | null
  visibleUntil?: string | null
  metadata?: string | null
  indexingStatus?: string
}

export default function SpacesPageClient({ initialSpaces, sharedSpaces = [], userRole = 'EC' }: { initialSpaces: SpaceData[]; sharedSpaces?: SharedSpace[]; userRole?: string }) {
  const [spaces, setSpaces] = useState<SpaceData[]>(initialSpaces)
  const [selectedSpaceId, setSelectedSpaceId] = useState<string | null>(
    initialSpaces.length > 0 ? initialSpaces[0].id : null
  )
  const [expandedIds, setExpandedIds] = useState<Set<string>>(
    new Set(initialSpaces.length > 0 ? [initialSpaces[0].id] : [])
  )

  // Left panel — create space inline
  const [creatingSpace, setCreatingSpace] = useState(false)
  const [newSpaceName, setNewSpaceName] = useState('')
  const newSpaceRef = useRef<HTMLInputElement>(null)

  // Left panel — context menu
  const [ctxSpaceId, setCtxSpaceId] = useState<string | null>(null)
  const [ctxPos, setCtxPos] = useState({ x: 0, y: 0 })
  const ctxRef = useRef<HTMLDivElement>(null)

  // Left panel — rename/delete
  const [renamingSpaceId, setRenamingSpaceId] = useState<string | null>(null)
  const [renameSpaceVal, setRenameSpaceVal] = useState('')
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [deleteDocCount, setDeleteDocCount] = useState<number>(0)

  // Right panel — documents
  const [docs, setDocs] = useState<DocWithDate[]>([])
  const [docsLoading, setDocsLoading] = useState(false)

  // Visibility — batch selection
  const [selectedDocIds, setSelectedDocIds] = useState<Set<string>>(new Set())
  const [batchDatesOpen, setBatchDatesOpen] = useState(false)
  const [batchFrom, setBatchFrom] = useState('')
  const [batchUntil, setBatchUntil] = useState('')
  const [editVisibilityDocId, setEditVisibilityDocId] = useState<string | null>(null)

  // Right panel — create folder inline
  const [creatingFolder, setCreatingFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const newFolderRef = useRef<HTMLInputElement>(null)

  // Folder actions
  const [hoveredFolderId, setHoveredFolderId] = useState<string | null>(null)
  const [deletingFolderId, setDeletingFolderId] = useState<string | null>(null)

  // Upload
  const [dragOver, setDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadMsg, setUploadMsg] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // File actions
  const [hoveredDocId, setHoveredDocId] = useState<string | null>(null)
  const [renamingDocId, setRenamingDocId] = useState<string | null>(null)
  const [renameDocVal, setRenameDocVal] = useState('')
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null)

  // Folder navigation
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null)

  // Upload error
  const [uploadError, setUploadError] = useState('')

  // Indexing status polling
  const [pendingDocIds, setPendingDocIds] = useState<Set<string>>(new Set())
  const [justIndexedIds, setJustIndexedIds] = useState<Set<string>>(new Set())
  const pendingDocIdsRef = useRef<Set<string>>(new Set())

  // Right panel tab
  const [activeTab, setActiveTab] = useState<'files' | 'journal'>('files')

  // Journal
  const [journalEntries, setJournalEntries] = useState<{ id: string; action: string; entityName: string; createdAt: string; user: { name: string | null; email: string } }[]>([])
  const [journalLoading, setJournalLoading] = useState(false)

  // Settings drawer
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settingsName, setSettingsName] = useState('')
  const [settingsDesc, setSettingsDesc] = useState('')
  const [settingsAudience, setSettingsAudience] = useState('ALL')
  const [settingsSaving, setSettingsSaving] = useState(false)

  const selectedSpace = spaces.find(s => s.id === selectedSpaceId) ?? null

  // Keep pendingDocIds ref in sync for use inside polling interval
  useEffect(() => { pendingDocIdsRef.current = pendingDocIds }, [pendingDocIds])

  // Polling — runs when there are pending docs; interval re-reads ref each tick
  const hasPendingDocs = useMemo(() => pendingDocIds.size > 0, [pendingDocIds])
  useEffect(() => {
    if (!hasPendingDocs || !selectedSpaceId) return
    const attempts = new Map<string, number>()

    const intervalId = setInterval(async () => {
      const toCheck = Array.from(pendingDocIdsRef.current)
      await Promise.all(toCheck.map(async (docId) => {
        const n = (attempts.get(docId) ?? 0) + 1
        attempts.set(docId, n)
        try {
          const r = await fetch(`/api/spaces/${selectedSpaceId}/documents/${docId}/status`)
          if (!r.ok) return
          const { status } = await r.json() as { status: string }
          if (status !== 'pending') {
            setDocs(prev => prev.map(d => d.id === docId ? { ...d, indexingStatus: status } : d))
            setPendingDocIds(prev => { const s = new Set(prev); s.delete(docId); return s })
            if (status === 'indexed') {
              setJustIndexedIds(prev => new Set([...prev, docId]))
              setTimeout(() => setJustIndexedIds(prev => { const s = new Set(prev); s.delete(docId); return s }), 2000)
            }
          } else if (n >= 20) {
            setDocs(prev => prev.map(d => d.id === docId ? { ...d, indexingStatus: 'failed' } : d))
            setPendingDocIds(prev => { const s = new Set(prev); s.delete(docId); return s })
          }
        } catch { /* skip — réseau transitoire */ }
      }))
    }, 3000)

    return () => clearInterval(intervalId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasPendingDocs, selectedSpaceId])

  // Load documents when space changes
  useEffect(() => {
    if (!selectedSpaceId) { setDocs([]); setPendingDocIds(new Set()); return }
    setDocsLoading(true)
    setSelectedFolderId(null)
    setUploadError('')
    setSelectedDocIds(new Set())
    setPendingDocIds(new Set())
    fetch(`/api/spaces/${selectedSpaceId}/documents`)
      .then(r => r.json())
      .then(d => {
        const loaded: DocWithDate[] = d.documents ?? []
        setDocs(loaded)
        const stillPending = new Set(loaded.filter(doc => doc.indexingStatus === 'pending').map(doc => doc.id))
        if (stillPending.size > 0) setPendingDocIds(stillPending)
      })
      .catch(() => setDocs([]))
      .finally(() => setDocsLoading(false))
    setActiveTab('files')
  }, [selectedSpaceId])

  // Load journal when tab switches to journal
  useEffect(() => {
    if (activeTab !== 'journal' || !selectedSpaceId) return
    setJournalLoading(true)
    fetch(`/api/spaces/${selectedSpaceId}/audit`)
      .then(r => r.json())
      .then(d => setJournalEntries(d.entries ?? []))
      .catch(() => setJournalEntries([]))
      .finally(() => setJournalLoading(false))
  }, [activeTab, selectedSpaceId])

  // Reload spaces list
  async function loadSpaces() {
    const r = await fetch('/api/spaces')
    const d = await r.json()
    setSpaces(d.spaces ?? [])
  }

  async function toggleDocVisibility(docId: string, current: boolean | undefined) {
    if (!selectedSpaceId) return
    const next = current === false ? true : false
    const r = await fetch(`/api/spaces/${selectedSpaceId}/documents/${docId}/visibility`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isVisible: next }),
    })
    if (r.ok) setDocs(prev => prev.map(d => d.id === docId ? { ...d, isVisible: next } : d))
  }

  async function saveDocDates(docId: string, from: string, until: string) {
    if (!selectedSpaceId) return
    await fetch(`/api/spaces/${selectedSpaceId}/documents/${docId}/visibility`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        visibleFrom: from || null,
        visibleUntil: until || null,
      }),
    })
    setDocs(prev => prev.map(d => d.id === docId ? { ...d, visibleFrom: from || null, visibleUntil: until || null } : d))
    setEditVisibilityDocId(null)
  }

  async function batchVisibility(action: string, from?: string, until?: string) {
    if (!selectedSpaceId || selectedDocIds.size === 0) return
    await fetch(`/api/spaces/${selectedSpaceId}/documents/batch-visibility`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        docIds: [...selectedDocIds],
        action,
        ...(from !== undefined && { visibleFrom: from || null }),
        ...(until !== undefined && { visibleUntil: until || null }),
      }),
    })
    setDocs(prev => prev.map(d => {
      if (!selectedDocIds.has(d.id)) return d
      if (action === 'activate') return { ...d, isVisible: true }
      if (action === 'hide') return { ...d, isVisible: false }
      if (action === 'archive') return { ...d, isVisible: false, visibleUntil: new Date().toISOString() }
      if (action === 'set-dates') return { ...d, visibleFrom: from || null, visibleUntil: until || null }
      return d
    }))
    setSelectedDocIds(new Set())
    setBatchDatesOpen(false)
  }

  function fmtVisibleDate(iso?: string | null) {
    if (!iso) return null
    return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  }

  // Close context menu on outside click
  useEffect(() => {
    function h(e: MouseEvent) {
      if (ctxRef.current && !ctxRef.current.contains(e.target as Node)) setCtxSpaceId(null)
    }
    if (ctxSpaceId) document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [ctxSpaceId])

  // Window drag-and-drop
  const ALLOWED_EXTS = new Set(['.pdf', '.doc', '.docx', '.txt', '.md', '.csv', '.ppt', '.pptx', '.xls', '.xlsx', '.json'])

  const uploadFiles = useCallback(async (files: File[]) => {
    if (!selectedSpaceId || uploading) return
    setUploadError('')

    const rejected = files.filter(f => {
      const ext = '.' + (f.name.split('.').pop()?.toLowerCase() ?? '')
      return !ALLOWED_EXTS.has(ext)
    })
    if (rejected.length) {
      setUploadError(`Format non supporté : ${rejected.map(f => f.name).join(', ')} — Formats acceptés : pdf, docx, pptx, xlsx, txt, md, csv, json`)
      return
    }

    setUploading(true)
    for (const file of files) {
      setUploadMsg(`Importation de ${file.name}…`)

      // Optimistic — ajouter immédiatement avec statut pending
      const tempId = `optimistic-${Date.now()}-${Math.random()}`
      const optimisticDoc: DocWithDate = {
        id: tempId,
        name: file.name,
        displayName: null,
        description: null,
        folderId: selectedFolderId,
        mimeType: file.type || null,
        size: file.size,
        uploadedAt: new Date().toISOString(),
        indexingStatus: 'pending',
        metadata: null,
      }
      setDocs(prev => [optimisticDoc, ...prev])

      const form = new FormData()
      form.append('file', file)
      if (selectedFolderId) form.append('folderId', selectedFolderId)
      try {
        const r = await fetch(`/api/spaces/${selectedSpaceId}/documents`, { method: 'POST', body: form })
        if (r.ok) {
          const data = await r.json()
          // Remplacer l'entrée optimiste par le doc réel
          setDocs(prev => prev.map(d => d.id === tempId ? data.document : d))
          if (data.document?.indexingStatus === 'pending') {
            setPendingDocIds(prev => new Set([...prev, data.document.id]))
          }
        } else {
          // Supprimer l'entrée optimiste en cas d'échec
          setDocs(prev => prev.filter(d => d.id !== tempId))
          const err = await r.json().catch(() => ({}))
          setUploadError(err.error ?? `Erreur lors de l'importation de ${file.name}`)
        }
      } catch {
        setDocs(prev => prev.filter(d => d.id !== tempId))
      }
    }
    setUploadMsg('')
    setUploading(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSpaceId, uploading, selectedFolderId])

  useEffect(() => {
    function onDragOver(e: DragEvent) { if (!selectedSpaceId) return; e.preventDefault(); setDragOver(true) }
    function onDragLeave(e: DragEvent) { if (e.relatedTarget === null) setDragOver(false) }
    function onDrop(e: DragEvent) {
      e.preventDefault(); setDragOver(false)
      const files = Array.from(e.dataTransfer?.files ?? [])
      if (files.length) uploadFiles(files)
    }
    window.addEventListener('dragover', onDragOver)
    window.addEventListener('dragleave', onDragLeave)
    window.addEventListener('drop', onDrop)
    return () => { window.removeEventListener('dragover', onDragOver); window.removeEventListener('dragleave', onDragLeave); window.removeEventListener('drop', onDrop) }
  }, [selectedSpaceId, uploadFiles])

  // Space actions
  async function createSpace() {
    if (!newSpaceName.trim()) return
    const r = await fetch('/api/spaces', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newSpaceName.trim() }),
    })
    if (!r.ok) return
    const data = await r.json()
    setNewSpaceName(''); setCreatingSpace(false)
    await loadSpaces()
    setSelectedSpaceId(data.space.id)
    setExpandedIds(prev => new Set([...prev, data.space.id]))
  }

  async function renameSpace(id: string) {
    if (!renameSpaceVal.trim()) { setRenamingSpaceId(null); return }
    await fetch(`/api/spaces/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: renameSpaceVal.trim() }),
    })
    setRenamingSpaceId(null); await loadSpaces()
  }

  async function initiateDeleteSpace(id: string) {
    const r = await fetch(`/api/spaces/${id}/members/count`)
    const d = await r.json()
    setDeleteDocCount(d.documentCount ?? 0)
    setDeleteConfirmId(id)
    setCtxSpaceId(null)
  }

  async function deleteSpace(id: string) {
    await fetch(`/api/spaces/${id}`, { method: 'DELETE' })
    setDeleteConfirmId(null); setCtxSpaceId(null)
    if (selectedSpaceId === id) setSelectedSpaceId(null)
    await loadSpaces()
  }

  function openContextMenu(e: React.MouseEvent, spaceId: string) {
    e.stopPropagation()
    setCtxPos({ x: e.clientX, y: e.clientY })
    setCtxSpaceId(spaceId)
  }

  function selectSpace(id: string) {
    setSelectedSpaceId(id)
    setExpandedIds(prev => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id); else n.add(id)
      return n
    })
    setCtxSpaceId(null)
  }

  // Folder actions
  async function createFolder() {
    if (!newFolderName.trim() || !selectedSpaceId) return
    const r = await fetch(`/api/spaces/${selectedSpaceId}/folders`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newFolderName.trim() }),
    })
    if (!r.ok) return
    setNewFolderName(''); setCreatingFolder(false)
    await loadSpaces()
  }

  async function deleteFolder(folderId: string) {
    if (!selectedSpaceId) return
    await fetch(`/api/spaces/${selectedSpaceId}/folders/${folderId}`, { method: 'DELETE' })
    setDeletingFolderId(null)
    await loadSpaces()
    // Also remove docs that belonged to this folder
    setDocs(prev => prev.filter(d => d.folderId !== folderId))
  }

  // Document actions
  async function renameDoc(docId: string) {
    if (!renameDocVal.trim() || !selectedSpaceId) { setRenamingDocId(null); return }
    const r = await fetch(`/api/spaces/${selectedSpaceId}/documents/${docId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ displayName: renameDocVal.trim() }),
    })
    if (r.ok) {
      const data = await r.json()
      setDocs(prev => prev.map(d => d.id === docId ? { ...d, displayName: data.document.displayName } : d))
    }
    setRenamingDocId(null)
  }

  async function deleteDoc(docId: string) {
    if (!selectedSpaceId) return
    await fetch(`/api/spaces/${selectedSpaceId}/documents/${docId}`, { method: 'DELETE' })
    setDocs(prev => prev.filter(d => d.id !== docId))
    setDeletingDocId(null)
  }

  // Settings
  function openSettings() {
    if (!selectedSpace) return
    setSettingsName(selectedSpace.name)
    setSettingsDesc(selectedSpace.description ?? '')
    setSettingsOpen(true)
  }

  const canSetAudience = userRole === 'ADMIN' || userRole === 'RESPONSABLE' || userRole === 'EC'

  async function saveSettings() {
    if (!selectedSpaceId) return
    setSettingsSaving(true)
    try {
      await fetch(`/api/spaces/${selectedSpaceId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: settingsName.trim(), description: settingsDesc.trim() || null, ...(canSetAudience && { audience: settingsAudience }) }),
      })
      setSettingsOpen(false); await loadSpaces()
    } finally { setSettingsSaving(false) }
  }

  const totalDocs = docs.length

  return (
    <div className="flex flex-col bg-[#FAFAFA]" style={{ height: '100vh' }}>
      {/* Header */}
      <header className="flex items-center justify-between px-6 bg-white border-b border-[#D8D8D8] flex-shrink-0" style={{ height: 'var(--header-h)' }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#00068D' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M12 3v18M3 12h18" /><path d="M5.6 5.6l12.8 12.8M5.6 18.4l12.8-12.8" /></svg>
          </div>
          <span style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-lg)', letterSpacing: '-0.02em', color: '#00068D' }}>NouveLLM</span>
          <span className="w-px h-4 bg-[#D8D8D8]" />
          <span style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-sm)', color: '#0D0D0D' }}>Mes fichiers</span>
        </div>
        <Link href="/" style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 300, fontSize: 'var(--text-xs)', letterSpacing: '0.04em', color: '#8A8A8A' }}
          className="hover:text-[#00068D] transition-colors">
          ← Retour à la conversation
        </Link>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* ── LEFT PANEL ── */}
        <div className="flex flex-col border-r border-[#D8D8D8] bg-white flex-shrink-0 overflow-y-auto nl-scroll" style={{ width: '280px' }}>
          {/* Section: Mes espaces */}
          <div className="px-3 pt-4 pb-2">
            <p style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-2xs)', color: '#8A8A8A', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Mes espaces</p>
          </div>

          {/* Space list */}
          {spaces.map(space => (
            <div key={space.id}>
              {renamingSpaceId === space.id ? (
                <div className="flex items-center gap-1.5 px-3 py-2 bg-[#F8F8FF]">
                  <span className="text-sm">{space.icon}</span>
                  <input
                    autoFocus
                    value={renameSpaceVal}
                    onChange={e => setRenameSpaceVal(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') renameSpace(space.id); if (e.key === 'Escape') setRenamingSpaceId(null) }}
                    className="flex-1 min-w-0 px-1.5 py-0.5 rounded border border-[#2B2EB8] focus:outline-none text-sm"
                    style={{ fontFamily: 'Source Serif Pro, Georgia, serif' }}
                  />
                  <button aria-label="Valider le renommage" onClick={() => renameSpace(space.id)} className="text-[#00068D] hover:text-[#2B2EB8]" style={{ fontSize: '0.7rem' }}>✓</button>
                  <button aria-label="Annuler le renommage" onClick={() => setRenamingSpaceId(null)} className="text-[#8A8A8A] hover:text-red-500" style={{ fontSize: '0.7rem' }}>✕</button>
                </div>
              ) : deleteConfirmId === space.id ? (
                <div className="px-3 py-2 bg-red-50">
                  {deleteDocCount > 0 && (
                    <p style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: 'var(--text-2xs)', color: '#EF4444', marginBottom: '0.25rem' }}>
                      ⚠ {deleteDocCount} fichier{deleteDocCount > 1 ? 's' : ''} seront supprimés.
                    </p>
                  )}
                  <div className="flex items-center gap-2">
                    <span style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: 'var(--text-xs)', color: '#EF4444', flex: 1 }}>Supprimer &quot;{space.name}&quot; ?</span>
                    <button onClick={() => deleteSpace(space.id)} className="px-2 py-0.5 rounded bg-[#EF4444] text-white" style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-2xs)' }}>Oui</button>
                    <button onClick={() => setDeleteConfirmId(null)} className="px-2 py-0.5 rounded border border-[#D8D8D8] text-[#5A5A5A] hover:bg-[#F2F2F2]" style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-2xs)' }}>Non</button>
                  </div>
                </div>
              ) : (
                <div
                  className={`group flex items-center gap-2 px-3 py-2 cursor-pointer transition-all border-l-2 ${selectedSpaceId === space.id ? 'bg-[#E8E9F8] border-l-[#00068D]' : 'border-l-transparent hover:bg-[#F2F2F2] hover:border-l-[#D8D8D8]'}`}
                  onClick={() => selectSpace(space.id)}
                >
                  <span className="text-sm flex-shrink-0">{space.icon}</span>
                  <span className="flex-1 min-w-0 truncate" style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: 'var(--text-sm)', color: selectedSpaceId === space.id ? '#00068D' : '#0D0D0D' }}>
                    {space.name}
                  </span>
                  <button
                    onClick={e => openContextMenu(e, space.id)}
                    className="opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center justify-center rounded text-[#8A8A8A] hover:bg-[#D8D8D8] transition-all flex-shrink-0"
                    style={{ fontSize: '1rem', lineHeight: 1 }}
                  >
                    ⋮
                  </button>
                </div>
              )}

              {/* Folder tree when expanded */}
              {expandedIds.has(space.id) && selectedSpaceId === space.id && space.folders.length > 0 && (
                <div className="pl-6 pb-1">
                  {space.folders.map(folder => (
                    <div
                      key={folder.id}
                      className="flex items-center justify-between gap-1 px-2 py-1 rounded hover:bg-[#F2F2F2] group"
                      onMouseEnter={() => setHoveredFolderId(folder.id)}
                      onMouseLeave={() => setHoveredFolderId(null)}
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#8A8A8A" strokeWidth="2" strokeLinecap="round"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" /></svg>
                        <span className="truncate" style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: 'var(--text-xs)', color: '#3A3A3A' }}>{folder.name}</span>
                        <span style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 300, fontSize: 'var(--text-2xs)', color: '#C8C8C8' }}>{folder._count.documents}</span>
                      </div>
                      {hoveredFolderId === folder.id && deletingFolderId !== folder.id && (
                        <button
                          onClick={e => { e.stopPropagation(); setDeletingFolderId(folder.id) }}
                          className="flex-shrink-0 w-4 h-4 flex items-center justify-center rounded text-[#C8C8C8] hover:text-[#EF4444] hover:bg-red-50"
                          title="Supprimer le dossier"
                        >
                          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" /></svg>
                        </button>
                      )}
                      {deletingFolderId === folder.id && (
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button onClick={() => deleteFolder(folder.id)} className="text-[8px] px-1.5 py-0.5 rounded bg-[#EF4444] text-white" style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800 }}>Oui</button>
                          <button onClick={() => setDeletingFolderId(null)} className="text-[8px] px-1.5 py-0.5 rounded border border-[#D8D8D8] text-[#5A5A5A]" style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800 }}>Non</button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          {/* Inline create space */}
          {creatingSpace && (
            <div className="flex items-center gap-1.5 px-3 py-2 bg-[#F8F8FF] border-l-2 border-l-[#2B2EB8]">
              <span className="text-sm">📁</span>
              <input
                ref={newSpaceRef}
                autoFocus
                value={newSpaceName}
                onChange={e => setNewSpaceName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') createSpace(); if (e.key === 'Escape') { setCreatingSpace(false); setNewSpaceName('') } }}
                placeholder="Nom de l'espace…"
                className="flex-1 min-w-0 px-1.5 py-0.5 rounded border border-[#2B2EB8] focus:outline-none text-sm"
                style={{ fontFamily: 'Source Serif Pro, Georgia, serif' }}
              />
              <button aria-label="Créer l'espace" onClick={createSpace} className="text-[#00068D] hover:text-[#2B2EB8] flex-shrink-0" style={{ fontSize: '0.7rem' }}>✓</button>
              <button aria-label="Annuler la création" onClick={() => { setCreatingSpace(false); setNewSpaceName('') }} className="text-[#8A8A8A] hover:text-red-500 flex-shrink-0" style={{ fontSize: '0.7rem' }}>✕</button>
            </div>
          )}

          {/* + Nouvel espace */}
          <div className="px-3 py-2">
            <button
              onClick={() => { setCreatingSpace(true); setTimeout(() => newSpaceRef.current?.focus(), 50) }}
              className="flex items-center gap-2 text-[#8A8A8A] hover:text-[#00068D] transition-colors w-full py-1"
              style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-xs)' }}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
              Nouvel espace
            </button>
          </div>

          {/* Divider + institutional */}
          <div className="border-t border-[#F2F2F2] mx-3 my-1" />
          <div className="px-3 pt-2 pb-1">
            <p style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-2xs)', color: '#C8C8C8', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Espaces partagés</p>
          </div>
          {sharedSpaces.length === 0 ? (
            <div className="px-3 py-2">
              <span style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: 'var(--text-xs)', color: '#D8D8D8', fontStyle: 'italic' }}>Aucun espace partagé</span>
            </div>
          ) : sharedSpaces.map(s => (
            <div key={s.id} className="flex items-center gap-2 px-3 py-2 opacity-50 cursor-not-allowed">
              <span className="text-sm">{s.icon}</span>
              <span style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: 'var(--text-sm)', color: '#5A5A5A' }}>{s.name}</span>
              <span style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 300, fontSize: 'var(--text-2xs)', color: '#C8C8C8', marginLeft: 'auto' }}>lecture seule</span>
            </div>
          ))}
          <div className="h-4" />
        </div>

        {/* ── RIGHT PANEL ── */}
        <div className="flex-1 overflow-y-auto nl-scroll">
          {!selectedSpace ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-8">
              <span className="text-5xl mb-4">📂</span>
              <p style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-md)', color: '#0D0D0D' }}>Sélectionnez un espace</p>
              <p style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: 'var(--text-sm)', color: '#8A8A8A', marginTop: '0.5rem', maxWidth: '24rem' }}>
                Choisissez un espace dans la colonne de gauche ou créez-en un nouveau.
              </p>
            </div>
          ) : (
            <div className="p-6 space-y-6">
              {/* Space header */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <span className="text-3xl">{selectedSpace.icon}</span>
                  <div>
                    <h1 style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-xl)', color: '#0D0D0D', letterSpacing: '-0.02em' }}>
                      {selectedSpace.name}
                    </h1>
                    {selectedSpace.description && (
                      <p style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: 'var(--text-sm)', color: '#8A8A8A', marginTop: '0.2rem' }}>
                        {selectedSpace.description}
                      </p>
                    )}
                    <p style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 300, fontSize: 'var(--text-2xs)', color: '#C8C8C8', marginTop: '0.25rem' }}>
                      {selectedSpace.folders.length} dossier{selectedSpace.folders.length !== 1 ? 's' : ''} · {totalDocs} fichier{totalDocs !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <button
                  onClick={openSettings}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#D8D8D8] text-[#8A8A8A] hover:border-[#00068D] hover:text-[#00068D] transition-all flex-shrink-0"
                  style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-xs)' }}
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
                  Paramètres
                </button>
              </div>

              {/* Tab bar */}
              <div className="flex items-center gap-1 border-b border-[#F2F2F2] -mx-6 px-6 mb-2">
                {(['files', 'journal'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-2 -mb-px transition-all border-b-2 ${activeTab === tab ? 'border-[#00068D] text-[#00068D]' : 'border-transparent text-[#8A8A8A] hover:text-[#0D0D0D]'}`}
                    style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-xs)', letterSpacing: '0.04em', textTransform: 'uppercase' }}
                  >
                    {tab === 'files' ? 'Fichiers' : 'Journal'}
                  </button>
                ))}
              </div>

              {/* Breadcrumb */}
              {activeTab === 'files' && selectedFolderId && (() => {
                const folder = selectedSpace?.folders.find(f => f.id === selectedFolderId)
                return (
                  <div className="flex items-center gap-1.5 -mt-2">
                    <button
                      onClick={() => setSelectedFolderId(null)}
                      className="flex items-center gap-1 hover:text-[#00068D] transition-colors"
                      style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-xs)', color: '#8A8A8A' }}
                    >
                      <span className="text-sm">{selectedSpace?.icon}</span>
                      {selectedSpace?.name}
                    </button>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#C8C8C8" strokeWidth="2.5" strokeLinecap="round"><path d="M9 18l6-6-6-6" /></svg>
                    <span className="flex items-center gap-1" style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-xs)', color: '#0D0D0D' }}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="#E8E9F8" stroke="#2B2EB8" strokeWidth="2" strokeLinecap="round"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" /></svg>
                      {folder?.name}
                    </span>
                  </div>
                )
              })()}

              {/* Action bar */}
              {activeTab === 'files' && (<div className="flex items-center gap-2 flex-wrap">
                {!selectedFolderId && (
                  <button
                    onClick={() => { setCreatingFolder(true); setTimeout(() => newFolderRef.current?.focus(), 50) }}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#D8D8D8] bg-white hover:border-[#2B2EB8] hover:text-[#00068D] transition-all"
                    style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-xs)', color: '#0D0D0D' }}
                  >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
                    Nouveau dossier
                  </button>
                )}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#D8D8D8] bg-white hover:border-[#2B2EB8] hover:text-[#00068D] transition-all disabled:opacity-50"
                  style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-xs)', color: '#0D0D0D' }}
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                  Importer
                </button>
                <input ref={fileInputRef} type="file" multiple className="hidden"
                  accept=".pdf,.docx,.doc,.txt,.md,.pptx,.xlsx,.csv,.json"
                  onChange={e => { const files = Array.from(e.target.files ?? []); if (files.length) uploadFiles(files); e.target.value = '' }}
                />
                {(uploading || uploadMsg) && (
                  <span style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: 'var(--text-xs)', color: '#8A8A8A', fontStyle: 'italic' }}>
                    {uploadMsg || 'Importation en cours…'}
                  </span>
                )}
                {uploadError && (
                  <span style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: 'var(--text-xs)', color: '#EF4444' }}>
                    {uploadError}
                  </span>
                )}
              </div>)}

              {/* ── FILES TAB: Folders (root view only) ── */}
              {activeTab === 'files' && !selectedFolderId && (<div>
                <p style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-2xs)', color: '#8A8A8A', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
                  Dossiers
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {selectedSpace.folders.map(folder => (
                    <div
                      key={folder.id}
                      className="group flex items-center gap-3 p-4 bg-white rounded-xl border border-[#D8D8D8] hover:border-[#2B2EB8] hover:shadow-sm transition-all cursor-pointer"
                      onClick={() => setSelectedFolderId(folder.id)}
                      onMouseEnter={() => setHoveredFolderId(folder.id)}
                      onMouseLeave={() => { setHoveredFolderId(null); if (deletingFolderId === folder.id) setDeletingFolderId(null) }}
                    >
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="#E8E9F8" stroke="#2B2EB8" strokeWidth="1.5" strokeLinecap="round"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" /></svg>
                      <div className="flex-1 min-w-0">
                        <p className="truncate" style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-xs)', color: '#0D0D0D' }}>{folder.name}</p>
                        <p style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 300, fontSize: 'var(--text-2xs)', color: '#C8C8C8' }}>{folder._count.documents} fichier{folder._count.documents !== 1 ? 's' : ''}</p>
                      </div>
                      {deletingFolderId === folder.id ? (
                        <div className="flex flex-col gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
                          <button onClick={() => deleteFolder(folder.id)} className="text-[8px] px-1.5 py-0.5 rounded bg-[#EF4444] text-white" style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800 }}>Oui</button>
                          <button onClick={() => setDeletingFolderId(null)} className="text-[8px] px-1.5 py-0.5 rounded border border-[#D8D8D8] text-[#5A5A5A]" style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800 }}>Non</button>
                        </div>
                      ) : hoveredFolderId === folder.id ? (
                        <button
                          onClick={e => { e.stopPropagation(); setDeletingFolderId(folder.id) }}
                          className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded text-[#C8C8C8] hover:text-[#EF4444] hover:bg-red-50 transition-all"
                          title="Supprimer le dossier"
                        >
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" /></svg>
                        </button>
                      ) : null}
                    </div>
                  ))}

                  {/* Inline new folder card */}
                  {creatingFolder ? (
                    <div className="flex items-center gap-2 p-3 bg-[#F8F8FF] rounded-xl border border-[#2B2EB8]">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="#E8E9F8" stroke="#2B2EB8" strokeWidth="1.5" strokeLinecap="round"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" /></svg>
                      <input
                        ref={newFolderRef}
                        autoFocus
                        value={newFolderName}
                        onChange={e => setNewFolderName(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') createFolder(); if (e.key === 'Escape') { setCreatingFolder(false); setNewFolderName('') } }}
                        placeholder="Nom du dossier…"
                        className="flex-1 min-w-0 px-1.5 py-0.5 rounded border border-[#2B2EB8] focus:outline-none text-xs"
                        style={{ fontFamily: 'Source Serif Pro, Georgia, serif' }}
                      />
                      <div className="flex gap-0.5 flex-shrink-0">
                        <button aria-label="Créer le dossier" onClick={createFolder} className="w-5 h-5 flex items-center justify-center text-[#00068D] hover:bg-[#E8E9F8] rounded" style={{ fontSize: '0.65rem' }}>✓</button>
                        <button aria-label="Annuler la création du dossier" onClick={() => { setCreatingFolder(false); setNewFolderName('') }} className="w-5 h-5 flex items-center justify-center text-[#8A8A8A] hover:bg-[#F2F2F2] rounded" style={{ fontSize: '0.65rem' }}>✕</button>
                      </div>
                    </div>
                  ) : null}
                </div>

                {selectedSpace.folders.length === 0 && !creatingFolder && (
                  <div className="flex items-center gap-4 p-6 bg-white rounded-xl border border-dashed border-[#D8D8D8] text-center" style={{ justifyContent: 'center' }}>
                    <div>
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="#F2F2F2" stroke="#D8D8D8" strokeWidth="1.5" strokeLinecap="round" className="mx-auto mb-2"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" /></svg>
                      <p style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: 'var(--text-sm)', color: '#C8C8C8' }}>Aucun dossier pour l&apos;instant</p>
                      <p style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: 'var(--text-xs)', color: '#D8D8D8', marginTop: '0.25rem' }}>Créez un dossier ou importez des fichiers</p>
                    </div>
                  </div>
                )}
              </div>)}

              {/* Files section */}
              {activeTab === 'files' && (docsLoading || docs.length > 0) && (() => {
                const displayDocs = selectedFolderId
                  ? docs.filter(d => d.folderId === selectedFolderId)
                  : docs.filter(d => d.folderId === null)
                if (!docsLoading && displayDocs.length === 0) return null
                const isShared = selectedSpace && selectedSpace.enrichmentGroups !== '[]'
                const allSelected = displayDocs.length > 0 && displayDocs.every(d => selectedDocIds.has(d.id))
                return (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-2xs)', color: '#8A8A8A', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                      Fichiers
                    </p>
                  </div>

                  {/* Batch actions bar — espaces partagés uniquement */}
                  {isShared && displayDocs.length > 0 && (
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input type="checkbox" checked={allSelected}
                          onChange={e => setSelectedDocIds(e.target.checked ? new Set(displayDocs.map(d => d.id)) : new Set())}
                          className="accent-[#00068D]" />
                        <span style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-2xs)', color: '#8A8A8A' }}>
                          {selectedDocIds.size > 0 ? `${selectedDocIds.size} sélectionné(s)` : 'Tout sélectionner'}
                        </span>
                      </label>
                      {selectedDocIds.size > 0 && (
                        <>
                          <button onClick={() => batchVisibility('activate')} className="px-2 py-0.5 rounded border border-green-200 text-green-700 hover:bg-green-50 transition-all" style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-2xs)' }}>Activer</button>
                          <button onClick={() => batchVisibility('hide')} className="px-2 py-0.5 rounded border border-[#D8D8D8] text-[#5A5A5A] hover:bg-[#F2F2F2] transition-all" style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-2xs)' }}>Masquer</button>
                          <button onClick={() => batchVisibility('archive')} className="px-2 py-0.5 rounded border border-orange-200 text-orange-600 hover:bg-orange-50 transition-all" style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-2xs)' }}>Archiver</button>
                          <button onClick={() => setBatchDatesOpen(v => !v)} className="px-2 py-0.5 rounded border border-[#2B2EB8] text-[#00068D] hover:bg-[#E8E9F8] transition-all" style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-2xs)' }}>Définir dates…</button>
                          {batchDatesOpen && (
                            <div className="flex items-center gap-2 ml-1 flex-wrap">
                              <input type="date" value={batchFrom} onChange={e => setBatchFrom(e.target.value)} className="px-2 py-0.5 rounded border border-[#D8D8D8] text-xs focus:outline-none focus:ring-1 focus:ring-[#2B2EB8]" style={{ fontFamily: 'Source Serif Pro, Georgia, serif' }} />
                              <span style={{ fontSize: 'var(--text-2xs)', color: '#8A8A8A' }}>→</span>
                              <input type="date" value={batchUntil} onChange={e => setBatchUntil(e.target.value)} className="px-2 py-0.5 rounded border border-[#D8D8D8] text-xs focus:outline-none focus:ring-1 focus:ring-[#2B2EB8]" style={{ fontFamily: 'Source Serif Pro, Georgia, serif' }} />
                              <button onClick={() => batchVisibility('set-dates', batchFrom, batchUntil)} className="px-2 py-0.5 rounded bg-[#00068D] text-white" style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-2xs)' }}>OK</button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}

                  {docsLoading ? (
                    <div className="flex items-center gap-2 py-4">
                      <div className="w-4 h-4 border-2 border-[#00068D] border-t-transparent rounded-full animate-spin" />
                      <span style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: 'var(--text-xs)', color: '#8A8A8A' }}>Chargement…</span>
                    </div>
                  ) : (
                    <div className="bg-white rounded-xl border border-[#D8D8D8] overflow-hidden">
                      {displayDocs.map((doc, i) => {
                        const isVis = doc.isVisible !== false
                        const meta = (() => { try { return doc.metadata ? JSON.parse(doc.metadata) : null } catch { return null } })()
                        const isPending = doc.indexingStatus === 'pending'
                        const isFailed = doc.indexingStatus === 'failed'
                        const isJustIndexed = justIndexedIds.has(doc.id)
                        return (
                        <div
                          key={doc.id}
                          className={`flex items-start gap-3 px-4 py-3 hover:bg-[#FAFAFA] transition-all group ${i > 0 ? 'border-t border-[#F2F2F2]' : ''} ${!isVis ? 'opacity-60' : ''}`}
                          onMouseEnter={() => setHoveredDocId(doc.id)}
                          onMouseLeave={() => { setHoveredDocId(null); if (deletingDocId === doc.id) setDeletingDocId(null) }}
                        >
                          {isShared && (
                            <input type="checkbox" checked={selectedDocIds.has(doc.id)}
                              onChange={e => setSelectedDocIds(prev => { const s = new Set(prev); e.target.checked ? s.add(doc.id) : s.delete(doc.id); return s })}
                              className="accent-[#00068D] mt-1 flex-shrink-0" />
                          )}
                          <span className="text-lg flex-shrink-0 mt-0.5">
                            {isPending
                              ? <span className="nl-spinner" style={{ width: '1.1rem', height: '1.1rem', display: 'inline-block' }} />
                              : isJustIndexed
                                ? <span style={{ color: '#2e7d32' }}>✓</span>
                                : fileIcon(doc.mimeType, doc.name)
                            }
                          </span>
                          <div className="flex-1 min-w-0">
                            {renamingDocId === doc.id ? (
                              <input
                                autoFocus
                                value={renameDocVal}
                                onChange={e => setRenameDocVal(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') renameDoc(doc.id); if (e.key === 'Escape') setRenamingDocId(null) }}
                                onBlur={() => renameDoc(doc.id)}
                                className="w-full px-2 py-0.5 rounded border border-[#2B2EB8] focus:outline-none text-sm"
                                style={{ fontFamily: 'Source Serif Pro, Georgia, serif' }}
                              />
                            ) : (
                              <>
                                {isPending ? (
                                  <p style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: 'var(--text-sm)', color: '#8A8A8A', fontStyle: 'italic' }}>
                                    Indexation en cours…
                                  </p>
                                ) : (
                                  <p className="truncate" style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: 'var(--text-sm)', color: '#0D0D0D' }}>
                                    {doc.displayName || doc.name}
                                  </p>
                                )}
                                {doc.description && !isPending && (
                                  <p className="truncate" style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: 'var(--text-xs)', color: '#8A8A8A', fontStyle: 'italic' }}>
                                    {doc.description}
                                  </p>
                                )}
                                {/* Badges d'indexation */}
                                <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                                  {doc.indexingStatus === 'indexed' && !isJustIndexed && (
                                    <span title="Document indexé et interrogeable" style={{ color: '#2e7d32', fontSize: 'var(--text-xs)' }}>✓</span>
                                  )}
                                  {isFailed && (
                                    <span title="Non indexé — le document peut être téléchargé mais pas interrogé"
                                      style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: 'var(--text-xs)', color: '#C8C8C8', fontStyle: 'italic' }}>
                                      non indexé
                                    </span>
                                  )}
                                  {/* Visibility badges — espaces partagés */}
                                  {isShared && !isPending && (
                                    <>
                                      <button
                                        onClick={() => toggleDocVisibility(doc.id, doc.isVisible)}
                                        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border transition-all hover:opacity-80 ${isVis ? 'bg-green-50 border-green-200 text-green-700' : 'bg-[#F2F2F2] border-[#D8D8D8] text-[#8A8A8A]'}`}
                                        style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-2xs)' }}
                                      >
                                        <span className={`w-1.5 h-1.5 rounded-full ${isVis ? 'bg-green-500' : 'bg-[#C8C8C8]'}`} />
                                        {isVis ? 'Visible' : 'Masqué'}
                                      </button>
                                      {(doc.visibleFrom || doc.visibleUntil) && editVisibilityDocId !== doc.id && (
                                        <span style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 300, fontSize: 'var(--text-2xs)', color: '#8A8A8A' }}>
                                          {doc.visibleFrom ? `Dès ${fmtVisibleDate(doc.visibleFrom)}` : ''}{doc.visibleFrom && doc.visibleUntil ? ' → ' : ''}{doc.visibleUntil ? `${fmtVisibleDate(doc.visibleUntil)}` : ''}
                                        </span>
                                      )}
                                      {editVisibilityDocId === doc.id ? (
                                        <div className="flex items-center gap-1">
                                          <input type="date" defaultValue={doc.visibleFrom ? doc.visibleFrom.slice(0, 10) : ''} id={`vf-${doc.id}`} className="px-1.5 py-0.5 rounded border border-[#D8D8D8] focus:outline-none focus:ring-1 focus:ring-[#2B2EB8]" style={{ fontSize: 'var(--text-2xs)' }} />
                                          <span style={{ fontSize: 'var(--text-2xs)', color: '#8A8A8A' }}>→</span>
                                          <input type="date" defaultValue={doc.visibleUntil ? doc.visibleUntil.slice(0, 10) : ''} id={`vu-${doc.id}`} className="px-1.5 py-0.5 rounded border border-[#D8D8D8] focus:outline-none focus:ring-1 focus:ring-[#2B2EB8]" style={{ fontSize: 'var(--text-2xs)' }} />
                                          <button onClick={() => {
                                            const f = (document.getElementById(`vf-${doc.id}`) as HTMLInputElement)?.value ?? ''
                                            const u = (document.getElementById(`vu-${doc.id}`) as HTMLInputElement)?.value ?? ''
                                            saveDocDates(doc.id, f, u)
                                          }} className="px-1.5 py-0.5 rounded bg-[#00068D] text-white" style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-2xs)' }}>OK</button>
                                          <button aria-label="Fermer l'édition des dates" onClick={() => setEditVisibilityDocId(null)} className="px-1.5 py-0.5 rounded border border-[#D8D8D8] text-[#5A5A5A]" style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-2xs)' }}>✕</button>
                                        </div>
                                      ) : (
                                        <button aria-label="Modifier les dates de visibilité" onClick={() => setEditVisibilityDocId(doc.id)} className="text-[#8A8A8A] hover:text-[#00068D]" title="Modifier les dates" style={{ fontSize: 'var(--text-xs)' }}>✏</button>
                                      )}
                                    </>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                          <div className="flex items-center gap-3 flex-shrink-0">
                            {doc.uploadedBy && (
                              <span style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 300, fontSize: 'var(--text-2xs)', color: '#C8C8C8' }} title={doc.uploadedBy.email}>
                                {doc.uploadedBy.name ?? doc.uploadedBy.email.split('@')[0]}
                              </span>
                            )}
                            <span style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 300, fontSize: 'var(--text-2xs)', color: '#C8C8C8' }}>{formatSize(doc.size)}</span>
                            {doc.uploadedAt && (
                              <span style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 300, fontSize: 'var(--text-2xs)', color: '#C8C8C8' }}>
                                {formatDate(doc.uploadedAt)}
                              </span>
                            )}
                            {deletingDocId === doc.id ? (
                              <div className="flex items-center gap-1">
                                <button onClick={() => deleteDoc(doc.id)} className="px-2 py-0.5 rounded bg-[#EF4444] text-white" style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-2xs)' }}>Oui</button>
                                <button onClick={() => setDeletingDocId(null)} className="px-2 py-0.5 rounded border border-[#D8D8D8] text-[#5A5A5A] hover:bg-[#F2F2F2]" style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-2xs)' }}>Non</button>
                              </div>
                            ) : hoveredDocId === doc.id && renamingDocId !== doc.id ? (
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <a
                                  href={`/api/spaces/${selectedSpaceId}/documents/${doc.id}`}
                                  download={doc.name}
                                  className="flex items-center gap-1 px-2 py-1 rounded text-[#8A8A8A] hover:bg-[#e8f5e9] hover:text-[#2E7D32] transition-all"
                                  title="Télécharger"
                                >
                                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7,10 12,15 17,10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                                </a>
                                <button
                                  onClick={() => { setRenamingDocId(doc.id); setRenameDocVal(doc.displayName || doc.name) }}
                                  className="flex items-center gap-1 px-2 py-1 rounded text-[#8A8A8A] hover:bg-[#E8E9F8] hover:text-[#00068D] transition-all"
                                  style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-2xs)' }}
                                  title="Renommer"
                                >
                                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                                </button>
                                <button
                                  onClick={() => setDeletingDocId(doc.id)}
                                  className="flex items-center gap-1 px-2 py-1 rounded text-[#8A8A8A] hover:bg-red-50 hover:text-[#EF4444] transition-all"
                                  style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-2xs)' }}
                                  title="Supprimer"
                                >
                                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" /></svg>
                                </button>
                              </div>
                            ) : null}
                          </div>
                        </div>
                        )
                      })}
                    </div>
                  )}
                </div>
                )
              })()}

              {/* Full empty state */}
              {activeTab === 'files' && !docsLoading && docs.length === 0 && selectedSpace.folders.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <span className="text-4xl mb-3">📂</span>
                  <p style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-md)', color: '#0D0D0D' }}>Espace vide</p>
                  <p style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: 'var(--text-sm)', color: '#8A8A8A', marginTop: '0.5rem', maxWidth: '22rem' }}>
                    Créez un dossier pour organiser vos fichiers, ou importez directement des documents.
                  </p>
                </div>
              )}

              {/* ── JOURNAL TAB ── */}
              {activeTab === 'journal' && (
                <div>
                  {journalLoading ? (
                    <div className="flex items-center gap-2 py-8">
                      <div className="w-4 h-4 border-2 border-[#00068D] border-t-transparent rounded-full animate-spin" />
                      <span style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: 'var(--text-xs)', color: '#8A8A8A' }}>Chargement…</span>
                    </div>
                  ) : journalEntries.length === 0 ? (
                    <div className="py-12 text-center">
                      <span className="text-3xl">📋</span>
                      <p style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: 'var(--text-sm)', color: '#8A8A8A', marginTop: '0.75rem' }}>
                        Aucune activité enregistrée pour cet espace.
                      </p>
                    </div>
                  ) : (
                    <div className="bg-white rounded-xl border border-[#D8D8D8] overflow-hidden">
                      {journalEntries.map((entry, i) => (
                        <div key={entry.id} className={`flex items-start gap-3 px-4 py-3 ${i > 0 ? 'border-t border-[#F2F2F2]' : ''}`}>
                          <div className="flex-1 min-w-0">
                            <p style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: 'var(--text-sm)', color: '#0D0D0D' }}>
                              <span className="font-medium">{entry.user.name ?? entry.user.email.split('@')[0]}</span>
                              {' '}{formatAuditAction(entry.action)}{' '}
                              <span style={{ color: '#5A5A5A' }}>{entry.entityName}</span>
                            </p>
                            <p style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 300, fontSize: 'var(--text-2xs)', color: '#C8C8C8', marginTop: '0.1rem' }}>
                              {new Date(entry.createdAt).toLocaleString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── DRAG OVERLAY ── */}
      {dragOver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#00068D]/10 backdrop-blur-[2px]">
          <div className="bg-white rounded-2xl border-2 border-dashed border-[#2B2EB8] p-12 text-center shadow-2xl max-w-sm w-full mx-4">
            <div className="text-5xl mb-4">📄</div>
            <p style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-md)', color: '#00068D' }}>Glissez vos fichiers ici</p>
            <p style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: 'var(--text-sm)', color: '#8A8A8A', marginTop: '0.5rem' }}>ou</p>
            <button
              onClick={() => { setDragOver(false); fileInputRef.current?.click() }}
              className="mt-3 px-4 py-2 rounded-lg border border-[#2B2EB8] text-[#00068D] hover:bg-[#E8E9F8] transition-all"
              style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-xs)' }}
            >
              Parcourir les fichiers
            </button>
            <p style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: 'var(--text-xs)', color: '#C8C8C8', marginTop: '0.75rem' }}>
              PDF, DOCX, TXT, MD — 15 Mo max
            </p>
          </div>
        </div>
      )}

      {/* ── CONTEXT MENU ── */}
      {ctxSpaceId && (
        <div
          ref={ctxRef}
          className="fixed z-50 bg-white rounded-xl border border-[#D8D8D8] shadow-lg py-1 min-w-[160px]"
          style={{ top: ctxPos.y, left: ctxPos.x }}
        >
          {[
            {
              label: 'Renommer', icon: (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
              ),
              action: () => {
                const s = spaces.find(x => x.id === ctxSpaceId)
                if (s) { setRenameSpaceVal(s.name); setRenamingSpaceId(s.id) }
                setCtxSpaceId(null)
              },
              danger: false,
            },
            {
              label: 'Supprimer', icon: (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" /></svg>
              ),
              action: () => { if (ctxSpaceId) initiateDeleteSpace(ctxSpaceId) },
              danger: true,
            },
          ].map(item => (
            <button
              key={item.label}
              onClick={item.action}
              className={`w-full flex items-center gap-2.5 px-4 py-2 text-left transition-all ${item.danger ? 'text-[#EF4444] hover:bg-red-50' : 'text-[#0D0D0D] hover:bg-[#F2F2F2]'}`}
              style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: 'var(--text-sm)' }}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      )}

      {/* ── SETTINGS DRAWER ── */}
      {settingsOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/20" onClick={() => setSettingsOpen(false)} />
          <div className="fixed right-0 top-0 bottom-0 z-50 bg-white border-l border-[#D8D8D8] flex flex-col overflow-y-auto nl-scroll" style={{ width: '320px' }}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#D8D8D8]">
              <h2 style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-md)', color: '#0D0D0D' }}>Paramètres de l&apos;espace</h2>
              <button aria-label="Fermer les paramètres" onClick={() => setSettingsOpen(false)} className="w-7 h-7 flex items-center justify-center rounded text-[#8A8A8A] hover:bg-[#F2F2F2]" style={{ fontSize: '1rem' }}>✕</button>
            </div>

            <div className="flex-1 px-5 py-5 space-y-5">
              <div className="space-y-1.5">
                <label style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-2xs)', color: '#5A5A5A', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                  Nom de l&apos;espace de travail
                </label>
                <input
                  value={settingsName}
                  onChange={e => setSettingsName(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-[#D8D8D8] bg-[#FAFAFA] focus:outline-none focus:ring-2 focus:ring-[#2B2EB8]"
                  style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: 'var(--text-sm)' }}
                />
              </div>

              <div className="space-y-1.5">
                <label style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-2xs)', color: '#5A5A5A', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                  Description
                </label>
                <textarea
                  value={settingsDesc}
                  onChange={e => setSettingsDesc(e.target.value)}
                  rows={3}
                  placeholder="Décrivez le contenu de cet espace…"
                  className="w-full px-3 py-2.5 rounded-lg border border-[#D8D8D8] bg-[#FAFAFA] focus:outline-none focus:ring-2 focus:ring-[#2B2EB8] resize-none"
                  style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: 'var(--text-sm)' }}
                />
              </div>

              {canSetAudience && (
                <div className="space-y-1.5">
                  <label style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-2xs)', color: '#5A5A5A', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                    Audience
                  </label>
                  <select
                    value={settingsAudience}
                    onChange={e => setSettingsAudience(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#D8D8D8] bg-[#FAFAFA] focus:outline-none focus:ring-2 focus:ring-[#2B2EB8]"
                    style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: 'var(--text-sm)' }}
                  >
                    <option value="ALL">Tous les utilisateurs</option>
                    <option value="EC_ONLY">Enseignants-chercheurs uniquement</option>
                    <option value="STUDENT_ONLY">Étudiants uniquement</option>
                    <option value="BIATSS_ONLY">Personnel BIATSS uniquement</option>
                  </select>
                </div>
              )}

              <div className="space-y-2">
                <label style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-2xs)', color: '#5A5A5A', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                  Qui peut enrichir cet espace ?
                </label>
                <div className="space-y-1">
                  {['Moi uniquement', 'Mon UFR', 'Groupes spécifiques'].map(opt => (
                    <label key={opt} className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="enrichment" defaultChecked={opt === 'Moi uniquement'}
                        className="accent-[#00068D]" />
                      <span style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: 'var(--text-sm)', color: '#3A3A3A' }}>{opt}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="px-5 py-4 border-t border-[#F2F2F2] space-y-2">
              <button
                onClick={saveSettings}
                disabled={settingsSaving || !settingsName.trim()}
                className="w-full py-2.5 rounded-xl disabled:opacity-40 hover:opacity-90 transition-all"
                style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-xs)', background: '#00068D', color: '#fff', letterSpacing: '0.04em' }}
              >
                {settingsSaving ? 'Enregistrement…' : 'ENREGISTRER'}
              </button>
              <button
                onClick={() => { if (selectedSpaceId) { setSettingsOpen(false); initiateDeleteSpace(selectedSpaceId) } }}
                className="w-full py-2 rounded-xl border border-red-200 text-[#EF4444] hover:bg-red-50 transition-all"
                style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-xs)' }}
              >
                Supprimer cet espace
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
