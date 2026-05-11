'use client'

import { useState, useRef } from 'react'

export interface SpaceDoc {
  id: string
  name: string
  displayName: string | null
  description: string | null
  folderId: string | null
  mimeType: string | null
  size: number | null
}

export interface SpaceFolder {
  id: string
  name: string
  slug: string
  description: string | null
  _count: { documents: number }
  children?: SpaceFolder[]
  documents?: SpaceDoc[]
}

export interface SpaceData {
  id: string
  slug: string
  name: string
  icon: string
  description: string | null
  enrichmentGroups: string
  difyDatasetId: string | null
  folders: SpaceFolder[]
  _count: { documents: number }
}

interface SpaceTreeProps {
  space: SpaceData
  onFolderToken?: (token: string) => void
  onRefresh: () => void
}

function fileIcon(mimeType: string | null) {
  if (!mimeType) return '📄'
  if (mimeType.includes('pdf')) return '📕'
  if (mimeType.includes('word') || mimeType.includes('docx')) return '📘'
  if (mimeType.includes('presentation') || mimeType.includes('pptx')) return '📙'
  if (mimeType.startsWith('text/')) return '📄'
  if (mimeType.includes('spreadsheet') || mimeType.includes('xlsx')) return '📗'
  return '📄'
}

function formatSize(bytes: number | null) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} ko`
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
}

interface FolderSectionProps {
  folder: SpaceFolder
  spaceId: string
  spaceSlug: string
  onFolderToken?: (token: string) => void
  onRefresh: () => void
  depth?: number
}

function FolderSection({ folder, spaceId, spaceSlug, onFolderToken, onRefresh, depth = 0 }: FolderSectionProps) {
  const [expanded, setExpanded] = useState(true)
  const [docs, setDocs] = useState<SpaceDoc[]>([])
  const [docsLoaded, setDocsLoaded] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [editingDoc, setEditingDoc] = useState<string | null>(null)
  const [editDisplayName, setEditDisplayName] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function loadDocs() {
    if (docsLoaded) return
    try {
      const r = await fetch(`/api/spaces/${spaceId}/documents`)
      const data = await r.json()
      const folderDocs = (data.documents ?? []).filter((d: SpaceDoc) => d.folderId === folder.id)
      setDocs(folderDocs)
      setDocsLoaded(true)
    } catch { /* silent */ }
  }

  async function refreshDocs() {
    try {
      const r = await fetch(`/api/spaces/${spaceId}/documents`)
      const data = await r.json()
      const folderDocs = (data.documents ?? []).filter((d: SpaceDoc) => d.folderId === folder.id)
      setDocs(folderDocs)
    } catch { /* silent */ }
  }

  async function handleUpload(file: File) {
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('folderId', folder.id)
      const r = await fetch(`/api/spaces/${spaceId}/documents`, { method: 'POST', body: fd })
      if (r.ok) {
        await refreshDocs()
        onRefresh()
      }
    } finally { setUploading(false) }
  }

  async function handleDeleteDoc(docId: string) {
    if (!confirm('Supprimer ce document ?')) return
    await fetch(`/api/spaces/${spaceId}/documents/${docId}`, { method: 'DELETE' })
    setDocs(d => d.filter(x => x.id !== docId))
    onRefresh()
  }

  async function handleSaveDisplayName(docId: string) {
    await fetch(`/api/spaces/${spaceId}/documents/${docId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ displayName: editDisplayName }),
    })
    setDocs(d => d.map(x => x.id === docId ? { ...x, displayName: editDisplayName } : x))
    setEditingDoc(null)
  }

  async function handleCreateSubFolder() {
    if (!newFolderName.trim()) return
    await fetch(`/api/spaces/${spaceId}/folders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newFolderName.trim(), parentId: folder.id }),
    })
    setNewFolderName('')
    setCreating(false)
    onRefresh()
  }

  async function handleDropDoc(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const docId = e.dataTransfer.getData('docId')
    if (!docId) return
    await fetch(`/api/spaces/${spaceId}/documents/${docId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folderId: folder.id }),
    })
    onRefresh()
    setDocsLoaded(false)
    await refreshDocs()
  }

  function handleToggle() {
    if (!expanded) loadDocs()
    setExpanded(v => !v)
  }

  // Load docs when first rendered expanded
  if (expanded && !docsLoaded) { loadDocs() }

  const totalDocs = folder._count.documents
  const indentClass = depth > 0 ? 'ml-4' : ''

  return (
    <div className={indentClass}>
      <div
        className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-[#F2F2F2] group cursor-pointer transition-colors ${dragOver ? 'bg-[#E8E9F8] ring-1 ring-[#2B2EB8]' : ''}`}
        onClick={handleToggle}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDropDoc}
      >
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#8A8A8A" strokeWidth="2.5" strokeLinecap="round"
          className={`flex-shrink-0 transition-transform ${expanded ? 'rotate-90' : ''}`}>
          <path d="M9 18l6-6-6-6" />
        </svg>
        <span className="text-sm flex-shrink-0">📂</span>
        <span className="flex-1 min-w-0 text-[11px] text-[#3A3A3A] truncate"
          style={{ fontFamily: 'Source Serif Pro, Georgia, serif' }}>
          {folder.name}
        </span>
        <span className="text-[9px] text-[#8A8A8A] flex-shrink-0"
          style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 300 }}>
          {totalDocs} doc{totalDocs !== 1 ? 's' : ''}
        </span>
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
          onClick={e => e.stopPropagation()}>
          {onFolderToken && (
            <button
              onClick={() => onFolderToken(`${spaceSlug}/${folder.slug}`)}
              className="w-5 h-5 flex items-center justify-center rounded text-[#8A8A8A] hover:text-[#2e7d32] hover:bg-[#e8f5e9] transition-all"
              title="Insérer token #espace/dossier"
            >
              <span className="text-[9px] font-bold">#</span>
            </button>
          )}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-5 h-5 flex items-center justify-center rounded text-[#8A8A8A] hover:text-[#00068D] hover:bg-[#E8E9F8] transition-all"
            title="Uploader un document"
          >
            {uploading ? (
              <span className="nl-spinner" style={{ width: 8, height: 8 }} />
            ) : (
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17,8 12,3 7,8" /><line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            )}
          </button>
        </div>
      </div>

      <input ref={fileInputRef} type="file" className="hidden"
        accept=".pdf,.doc,.docx,.txt,.md,.csv,.ppt,.pptx,.xls,.xlsx"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = '' }} />

      {expanded && (
        <div className="ml-4 space-y-0.5">
          {docs.map(doc => (
            <div key={doc.id}
              className="flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-[#F2F2F2] group/doc cursor-default"
              draggable
              onDragStart={e => { e.dataTransfer.setData('docId', doc.id) }}>
              <span className="text-xs flex-shrink-0">{fileIcon(doc.mimeType)}</span>
              {editingDoc === doc.id ? (
                <input
                  autoFocus
                  value={editDisplayName}
                  onChange={e => setEditDisplayName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleSaveDisplayName(doc.id); if (e.key === 'Escape') setEditingDoc(null) }}
                  onBlur={() => handleSaveDisplayName(doc.id)}
                  className="flex-1 min-w-0 text-[11px] px-1 py-0.5 rounded border border-[#2B2EB8] focus:outline-none"
                  style={{ fontFamily: 'Source Serif Pro, Georgia, serif' }}
                />
              ) : (
                <span
                  className="flex-1 min-w-0 text-[11px] text-[#3A3A3A] truncate"
                  style={{ fontFamily: 'Source Serif Pro, Georgia, serif' }}
                  title={doc.description ?? undefined}
                  onDoubleClick={() => { setEditingDoc(doc.id); setEditDisplayName(doc.displayName ?? doc.name) }}>
                  {doc.displayName ?? doc.name}
                </span>
              )}
              <span className="text-[9px] text-[#C8C8C8] flex-shrink-0">{formatSize(doc.size)}</span>
              <div className="flex items-center gap-0.5 opacity-0 group-hover/doc:opacity-100 transition-opacity flex-shrink-0">
                <button
                  onClick={() => { setEditingDoc(doc.id); setEditDisplayName(doc.displayName ?? doc.name) }}
                  className="w-4 h-4 flex items-center justify-center rounded text-[#8A8A8A] hover:text-[#00068D] hover:bg-[#E8E9F8]"
                  title="Renommer"
                >
                  <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
                <button
                  onClick={() => handleDeleteDoc(doc.id)}
                  className="w-4 h-4 flex items-center justify-center rounded text-[#8A8A8A] hover:text-red-500 hover:bg-red-50"
                  title="Supprimer"
                >
                  <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          ))}

          {/* Sub-folders (max 1 level) */}
          {(folder.children ?? []).map(child => (
            <FolderSection key={child.id} folder={child} spaceId={spaceId} spaceSlug={spaceSlug}
              onFolderToken={onFolderToken} onRefresh={onRefresh} depth={depth + 1} />
          ))}

          {/* Create subfolder (depth 0 only) */}
          {depth === 0 && (
            creating ? (
              <div className="flex items-center gap-1 px-2 py-1">
                <input
                  autoFocus
                  value={newFolderName}
                  onChange={e => setNewFolderName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleCreateSubFolder(); if (e.key === 'Escape') setCreating(false) }}
                  placeholder="Nom du sous-dossier"
                  className="flex-1 min-w-0 text-[11px] px-2 py-0.5 rounded border border-[#D8D8D8] focus:outline-none focus:ring-1 focus:ring-[#2B2EB8]"
                  style={{ fontFamily: 'Source Serif Pro, Georgia, serif' }}
                />
                <button onClick={handleCreateSubFolder}
                  className="text-[9px] px-2 py-0.5 rounded bg-[#00068D] text-white"
                  style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800 }}>OK</button>
                <button onClick={() => setCreating(false)}
                  className="text-[9px] px-1.5 py-0.5 rounded border border-[#D8D8D8] text-[#8A8A8A]"
                  style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 300 }}>✕</button>
              </div>
            ) : null
          )}
        </div>
      )}
    </div>
  )
}

export default function SpaceTree({ space, onFolderToken, onRefresh }: SpaceTreeProps) {
  const [expanded, setExpanded] = useState(true)
  const [showNewFolder, setShowNewFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleCreateFolder() {
    if (!newFolderName.trim()) return
    await fetch(`/api/spaces/${space.id}/folders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newFolderName.trim() }),
    })
    setNewFolderName('')
    setShowNewFolder(false)
    onRefresh()
  }

  async function handleUploadRoot(file: File) {
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const r = await fetch(`/api/spaces/${space.id}/documents`, { method: 'POST', body: fd })
      if (r.ok) onRefresh()
    } finally { setUploading(false) }
  }

  return (
    <div className="select-none">
      {/* Space header */}
      <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-[#F2F2F2] group cursor-pointer transition-colors"
        onClick={() => setExpanded(v => !v)}>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#8A8A8A" strokeWidth="2.5" strokeLinecap="round"
          className={`flex-shrink-0 transition-transform ${expanded ? 'rotate-90' : ''}`}>
          <path d="M9 18l6-6-6-6" />
        </svg>
        <span className="text-sm flex-shrink-0">{space.icon}</span>
        <span className="flex-1 min-w-0 text-[11px] font-medium text-[#0D0D0D] truncate"
          style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800 }}>
          {space.name}
        </span>
        <span className="text-[9px] text-[#8A8A8A] flex-shrink-0"
          style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 300 }}>
          {space._count.documents} doc{space._count.documents !== 1 ? 's' : ''}
        </span>
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
          onClick={e => e.stopPropagation()}>
          <button
            onClick={() => setShowNewFolder(v => !v)}
            className="w-5 h-5 flex items-center justify-center rounded text-[#8A8A8A] hover:text-[#00068D] hover:bg-[#E8E9F8] transition-all"
            title="Nouveau dossier"
          >
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-5 h-5 flex items-center justify-center rounded text-[#8A8A8A] hover:text-[#00068D] hover:bg-[#E8E9F8] transition-all"
            title="Uploader à la racine"
          >
            {uploading ? (
              <span className="nl-spinner" style={{ width: 8, height: 8 }} />
            ) : (
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17,8 12,3 7,8" /><line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            )}
          </button>
        </div>
      </div>

      <input ref={fileInputRef} type="file" className="hidden"
        accept=".pdf,.doc,.docx,.txt,.md,.csv,.ppt,.pptx,.xls,.xlsx"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleUploadRoot(f); e.target.value = '' }} />

      {expanded && (
        <div className="ml-3 space-y-0.5">
          {/* New folder form */}
          {showNewFolder && (
            <div className="flex items-center gap-1 px-2 py-1 bg-[#F8F8FF] rounded-lg">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#8A8A8A" strokeWidth="2" strokeLinecap="round">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              </svg>
              <input
                autoFocus
                value={newFolderName}
                onChange={e => setNewFolderName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleCreateFolder(); if (e.key === 'Escape') setShowNewFolder(false) }}
                placeholder="Nom du dossier"
                className="flex-1 min-w-0 text-[11px] px-1.5 py-0.5 rounded border border-[#D8D8D8] focus:outline-none focus:ring-1 focus:ring-[#2B2EB8]"
                style={{ fontFamily: 'Source Serif Pro, Georgia, serif' }}
              />
              <button onClick={handleCreateFolder}
                className="text-[9px] px-2 py-0.5 rounded bg-[#00068D] text-white"
                style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800 }}>OK</button>
              <button onClick={() => setShowNewFolder(false)}
                className="text-[9px] px-1.5 py-0.5 rounded border border-[#D8D8D8] text-[#8A8A8A]">✕</button>
            </div>
          )}

          {space.folders.length === 0 && !showNewFolder ? (
            <p className="px-2 py-1 text-[10px] text-[#C8C8C8] italic"
              style={{ fontFamily: 'Source Serif Pro, Georgia, serif' }}>
              Aucun dossier — cliquez + pour en créer un
            </p>
          ) : (
            space.folders.map(folder => (
              <FolderSection key={folder.id} folder={folder} spaceId={space.id} spaceSlug={space.slug}
                onFolderToken={onFolderToken} onRefresh={onRefresh} />
            ))
          )}
        </div>
      )}
    </div>
  )
}
