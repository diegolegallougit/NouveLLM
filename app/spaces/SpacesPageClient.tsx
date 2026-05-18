'use client'

import { useState, useEffect, useRef, useCallback, useMemo, useTransition } from 'react'
import Link from 'next/link'
import { SpaceData } from '@/components/spaces/SpaceTree'
import { DocWithDate } from './utils'
import { IconNouveLLM, IconBack } from './components/icons'
import PanelToggle from './components/PanelToggle'
import FolderTree, { SharedSpace } from './components/FolderTree'
import FileList from './components/FileList'
import SpaceMembersDialog from './components/SpaceMembersDialog'

type JournalEntry = { id: string; action: string; entityName: string; createdAt: string; user: { name: string | null; email: string } }

export default function SpacesPageClient({ initialSpaces, sharedSpaces = [], userRole = 'EC' }: {
  initialSpaces: SpaceData[]
  sharedSpaces?: SharedSpace[]
  userRole?: string
}) {
  const [spaces, setSpaces] = useState<SpaceData[]>(initialSpaces)
  const [selectedSpaceId, setSelectedSpaceId] = useState<string | null>(
    initialSpaces.length > 0 ? initialSpaces[0].id : null
  )
  const [expandedIds, setExpandedIds] = useState<Set<string>>(
    new Set(initialSpaces.length > 0 ? [initialSpaces[0].id] : [])
  )
  const [docs, setDocs] = useState<DocWithDate[]>([])
  const [docsLoading, setDocsLoading] = useState(false)
  const [selectedDocIds, setSelectedDocIds] = useState<Set<string>>(new Set())
  const [activeTab, setActiveTab] = useState<'files' | 'journal'>('files')
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([])
  const [journalLoading, setJournalLoading] = useState(false)
  const [mobilePanelView, setMobilePanelView] = useState<'folders' | 'documents'>('folders')
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null)
  const [pendingDocIds, setPendingDocIds] = useState<Set<string>>(new Set())
  const [justIndexedIds, setJustIndexedIds] = useState<Set<string>>(new Set())
  const [dragOver, setDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadMsg, setUploadMsg] = useState('')
  const [uploadError, setUploadError] = useState('')
  const [membersOpen, setMembersOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settingsName, setSettingsName] = useState('')
  const [settingsDesc, setSettingsDesc] = useState('')
  const [settingsAudience, setSettingsAudience] = useState('ALL')
  const [settingsSaving, setSettingsSaving] = useState(false)
  const pendingDocIdsRef = useRef<Set<string>>(new Set())
  const [isSpacesPending, startSpacesTransition] = useTransition()
  const [isRenamePending, startRenameTransition] = useTransition()
  const [isDeletePending, startDeleteTransition] = useTransition()

  const selectedSpace = useMemo(() => spaces.find(s => s.id === selectedSpaceId) ?? null, [spaces, selectedSpaceId])
  const canSetAudience = userRole === 'ADMIN' || userRole === 'RESPONSABLE' || userRole === 'EC'

  const ALLOWED_EXTS = useMemo(() => new Set(['.pdf', '.doc', '.docx', '.txt', '.md', '.csv', '.ppt', '.pptx', '.xls', '.xlsx', '.json']), [])

  useEffect(() => { pendingDocIdsRef.current = pendingDocIds }, [pendingDocIds])

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
          const { status, progress } = await r.json() as { status: string; progress?: number | null }
          if (progress != null) setDocs(prev => prev.map(d => d.id === docId ? { ...d, progress } : d))
          if (status !== 'pending') {
            setDocs(prev => prev.map(d => d.id === docId ? { ...d, indexingStatus: status, progress: null } : d))
            setPendingDocIds(prev => { const s = new Set(prev); s.delete(docId); return s })
            if (status === 'indexed') {
              setJustIndexedIds(prev => new Set([...prev, docId]))
              setTimeout(() => setJustIndexedIds(prev => { const s = new Set(prev); s.delete(docId); return s }), 2000)
            }
          } else if (n >= 72) {
            setDocs(prev => prev.map(d => d.id === docId ? { ...d, indexingStatus: 'failed' } : d))
            setPendingDocIds(prev => { const s = new Set(prev); s.delete(docId); return s })
          }
        } catch { /* skip — réseau transitoire */ }
      }))
    }, 2500)
    return () => clearInterval(intervalId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasPendingDocs, selectedSpaceId])

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

  useEffect(() => {
    if (activeTab !== 'journal' || !selectedSpaceId) return
    setJournalLoading(true)
    fetch(`/api/spaces/${selectedSpaceId}/audit`)
      .then(r => r.json())
      .then(d => setJournalEntries(d.entries ?? []))
      .catch(() => setJournalEntries([]))
      .finally(() => setJournalLoading(false))
  }, [activeTab, selectedSpaceId])

  const loadSpaces = useCallback(() => {
    startSpacesTransition(async () => {
      const r = await fetch('/api/spaces')
      const d = await r.json()
      setSpaces(d.spaces ?? [])
    })
  }, [startSpacesTransition])

  const uploadFiles = useCallback(async (files: File[], sourceUrl?: string) => {
    if (!selectedSpaceId || uploading) return
    setUploadError('')
    const rejected = files.filter(f => !ALLOWED_EXTS.has('.' + (f.name.split('.').pop()?.toLowerCase() ?? '')))
    if (rejected.length) {
      setUploadError(`Format non supporté : ${rejected.map(f => f.name).join(', ')} — Formats acceptés : pdf, docx, pptx, xlsx, txt, md, csv, json`)
      return
    }
    setUploading(true)
    for (const file of files) {
      setUploadMsg(`Importation de ${file.name}…`)
      const tempId = `optimistic-${Date.now()}-${Math.random()}`
      setDocs(prev => [{ id: tempId, name: file.name, displayName: file.name, description: null, folderId: selectedFolderId, mimeType: file.type || null, size: file.size, uploadedAt: new Date().toISOString(), indexingStatus: 'pending', metadata: null } as DocWithDate, ...prev])
      const form = new FormData()
      form.append('file', file)
      if (selectedFolderId) form.append('folderId', selectedFolderId)
      if (sourceUrl) form.append('source_url', sourceUrl)
      try {
        const r = await fetch(`/api/spaces/${selectedSpaceId}/documents`, { method: 'POST', body: form })
        if (r.ok) {
          const data = await r.json()
          setDocs(prev => prev.map(d => d.id === tempId ? data.document : d))
          if (data.document?.indexingStatus === 'pending') setPendingDocIds(prev => new Set([...prev, data.document.id]))
        } else {
          setDocs(prev => prev.filter(d => d.id !== tempId))
          const err = await r.json().catch(() => ({}))
          setUploadError(err.error ?? `Erreur lors de l'importation de ${file.name}`)
        }
      } catch {
        setDocs(prev => prev.filter(d => d.id !== tempId))
        setUploadError(`Erreur réseau lors de l'importation de ${file.name}`)
      }
    }
    setUploadMsg('')
    setUploading(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSpaceId, uploading, selectedFolderId, ALLOWED_EXTS])

  useEffect(() => {
    function onDragOver(e: DragEvent) { if (!selectedSpaceId) return; e.preventDefault(); setDragOver(true) }
    function onDragLeave(e: DragEvent) { if (e.relatedTarget === null) setDragOver(false) }
    function onDrop(e: DragEvent) { e.preventDefault(); setDragOver(false); const files = Array.from(e.dataTransfer?.files ?? []); if (files.length) uploadFiles(files) }
    window.addEventListener('dragover', onDragOver)
    window.addEventListener('dragleave', onDragLeave)
    window.addEventListener('drop', onDrop)
    return () => { window.removeEventListener('dragover', onDragOver); window.removeEventListener('dragleave', onDragLeave); window.removeEventListener('drop', onDrop) }
  }, [selectedSpaceId, uploadFiles])

  const createSpace = useCallback(async (name: string) => {
    const r = await fetch('/api/spaces', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) })
    if (!r.ok) return
    const data = await r.json()
    await loadSpaces()
    setSelectedSpaceId(data.space.id)
    setExpandedIds(prev => new Set([...prev, data.space.id]))
  }, [loadSpaces])

  const renameSpace = useCallback(async (id: string, name: string) => {
    if (!name.trim()) return
    await fetch(`/api/spaces/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: name.trim() }) })
    await loadSpaces()
  }, [loadSpaces])

  const selectSpace = useCallback((id: string) => {
    setSelectedSpaceId(id)
    setExpandedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
    setMobilePanelView('documents')
  }, [])

  const deleteSpace = useCallback((id: string) => {
    startDeleteTransition(async () => {
      await fetch(`/api/spaces/${id}`, { method: 'DELETE' })
      if (selectedSpaceId === id) setSelectedSpaceId(null)
      await fetch('/api/spaces').then(r => r.json()).then(d => setSpaces(d.spaces ?? []))
    })
  }, [selectedSpaceId, startDeleteTransition])

  const createFolder = useCallback(async (name: string) => {
    if (!selectedSpaceId) return
    await fetch(`/api/spaces/${selectedSpaceId}/folders`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) })
    await loadSpaces()
  }, [selectedSpaceId, loadSpaces])

  const deleteFolder = useCallback(async (folderId: string) => {
    if (!selectedSpaceId) return
    await fetch(`/api/spaces/${selectedSpaceId}/folders/${folderId}`, { method: 'DELETE' })
    await loadSpaces()
    setDocs(prev => prev.filter(d => d.folderId !== folderId))
  }, [selectedSpaceId, loadSpaces])

  const renameDoc = useCallback((docId: string, displayName: string) => {
    if (!selectedSpaceId) return
    startRenameTransition(async () => {
      const r = await fetch(`/api/spaces/${selectedSpaceId}/documents/${docId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ displayName }) })
      if (r.ok) { const data = await r.json(); setDocs(prev => prev.map(d => d.id === docId ? { ...d, displayName: data.document.displayName } : d)) }
    })
  }, [selectedSpaceId, startRenameTransition])

  const deleteDoc = useCallback(async (docId: string) => {
    if (!selectedSpaceId) return
    await fetch(`/api/spaces/${selectedSpaceId}/documents/${docId}`, { method: 'DELETE' })
    setDocs(prev => prev.filter(d => d.id !== docId))
  }, [selectedSpaceId])

  const toggleDocVisibility = useCallback(async (docId: string, current: boolean | undefined) => {
    if (!selectedSpaceId) return
    const next = current === false ? true : false
    const r = await fetch(`/api/spaces/${selectedSpaceId}/documents/${docId}/visibility`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isVisible: next }) })
    if (r.ok) setDocs(prev => prev.map(d => d.id === docId ? { ...d, isVisible: next } : d))
  }, [selectedSpaceId])

  const saveDocDates = useCallback(async (docId: string, from: string, until: string) => {
    if (!selectedSpaceId) return
    await fetch(`/api/spaces/${selectedSpaceId}/documents/${docId}/visibility`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ visibleFrom: from || null, visibleUntil: until || null }) })
    setDocs(prev => prev.map(d => d.id === docId ? { ...d, visibleFrom: from || null, visibleUntil: until || null } : d))
  }, [selectedSpaceId])

  const batchVisibility = useCallback(async (action: string, from?: string, until?: string) => {
    if (!selectedSpaceId || selectedDocIds.size === 0) return
    await fetch(`/api/spaces/${selectedSpaceId}/documents/batch-visibility`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ docIds: [...selectedDocIds], action, ...(from !== undefined && { visibleFrom: from || null }), ...(until !== undefined && { visibleUntil: until || null }) }) })
    setDocs(prev => prev.map(d => {
      if (!selectedDocIds.has(d.id)) return d
      if (action === 'activate') return { ...d, isVisible: true }
      if (action === 'hide') return { ...d, isVisible: false }
      if (action === 'archive') return { ...d, isVisible: false, visibleUntil: new Date().toISOString() }
      if (action === 'set-dates') return { ...d, visibleFrom: from || null, visibleUntil: until || null }
      return d
    }))
    setSelectedDocIds(new Set())
  }, [selectedSpaceId, selectedDocIds])

  const openMembers = useCallback(() => {
    if (!selectedSpace) return
    setMembersOpen(true)
  }, [selectedSpace])

  const openSettings = useCallback(() => {
    if (!selectedSpace) return
    setSettingsName(selectedSpace.name)
    setSettingsDesc(selectedSpace.description ?? '')
    setSettingsAudience('ALL')
    setSettingsOpen(true)
  }, [selectedSpace])

  const saveSettings = useCallback(async () => {
    if (!selectedSpaceId) return
    setSettingsSaving(true)
    try {
      await fetch(`/api/spaces/${selectedSpaceId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: settingsName.trim(), description: settingsDesc.trim() || null, ...(canSetAudience && { audience: settingsAudience }) }) })
      setSettingsOpen(false)
      await loadSpaces()
    } finally { setSettingsSaving(false) }
  }, [selectedSpaceId, settingsName, settingsDesc, settingsAudience, canSetAudience, loadSpaces])

  const initiateDeleteFromSettings = useCallback(async () => {
    if (!selectedSpaceId) return
    setSettingsOpen(false)
    const r = await fetch(`/api/spaces/${selectedSpaceId}/members/count`)
    const d = await r.json()
    // Re-open FolderTree's delete confirm via a separate mechanism is not needed:
    // deleteSpace is called directly since settings drawer provides its own confirm
    if (window.confirm(`Supprimer cet espace ?${d.documentCount > 0 ? ` (${d.documentCount} fichier(s) seront supprimés)` : ''}`)) {
      await deleteSpace(selectedSpaceId)
    }
  }, [selectedSpaceId, deleteSpace])

  const fileInputRef = useRef<HTMLInputElement>(null)

  return (
    <div className="flex flex-col bg-[#FAFAFA]" style={{ height: '100vh' }}>
      <header className="flex items-center justify-between px-3 sm:px-6 bg-white border-b border-[#D8D8D8] flex-shrink-0" style={{ height: 'var(--header-h)' }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#00068D' }}>
            <IconNouveLLM />
          </div>
          <span style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'clamp(1.1rem, 4vw, var(--text-lg))', letterSpacing: '-0.02em', color: '#00068D' }}>NouveLLM</span>
          <span className="hidden sm:block w-px h-4 bg-[#D8D8D8]" />
          <span className="hidden sm:inline" style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-sm)', color: '#0D0D0D' }}>Mes dossiers</span>
        </div>
        <Link href="/"
          style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 300, fontSize: 'var(--text-xs)', letterSpacing: '0.04em', color: '#8A8A8A' }}
          className="flex items-center gap-1 hover:text-[#00068D] transition-colors min-h-[44px] px-2"
        >
          <IconBack className="sm:hidden" />
          <span className="hidden sm:inline">← Retour à la conversation</span>
        </Link>
      </header>

      <PanelToggle view={mobilePanelView} onToggle={setMobilePanelView} />

      <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
        <div className={`${mobilePanelView === 'folders' ? 'flex' : 'hidden'} md:flex flex-col border-r border-[#D8D8D8] bg-white md:flex-shrink-0 overflow-y-auto nl-scroll w-full md:w-[280px] transition-opacity ${isSpacesPending || isDeletePending ? 'opacity-60' : ''}`}>
          <FolderTree
            spaces={spaces}
            selectedSpaceId={selectedSpaceId}
            expandedIds={expandedIds}
            sharedSpaces={sharedSpaces}
            onSelectSpace={selectSpace}
            onCreateSpace={createSpace}
            onRenameSpace={renameSpace}
            onDeleteSpace={deleteSpace}
            onDeleteFolder={deleteFolder}
          />
        </div>
        <div className={`${mobilePanelView === 'documents' ? 'flex' : 'hidden'} md:flex flex-col flex-1 overflow-y-auto nl-scroll transition-opacity ${isRenamePending || isDeletePending ? 'opacity-60' : ''}`}>
          <FileList
            hasAnySpace={spaces.length > 0}
            onCreateSpace={createSpace}
            selectedSpace={selectedSpace}
            selectedSpaceId={selectedSpaceId}
            docs={docs}
            docsLoading={docsLoading}
            pendingDocIds={pendingDocIds}
            justIndexedIds={justIndexedIds}
            uploading={uploading}
            uploadMsg={uploadMsg}
            uploadError={uploadError}
            activeTab={activeTab}
            journalEntries={journalEntries}
            journalLoading={journalLoading}
            selectedFolderId={selectedFolderId}
            selectedDocIds={selectedDocIds}
            settingsOpen={settingsOpen}
            settingsName={settingsName}
            settingsDesc={settingsDesc}
            settingsAudience={settingsAudience}
            settingsSaving={settingsSaving}
            canSetAudience={canSetAudience}
            onSetActiveTab={setActiveTab}
            onSetSelectedFolderId={setSelectedFolderId}
            onSetSelectedDocIds={setSelectedDocIds}
            onUploadFiles={uploadFiles}
            onRenameDoc={renameDoc}
            onDeleteDoc={deleteDoc}
            onCreateFolder={createFolder}
            onDeleteFolder={deleteFolder}
            onToggleDocVisibility={toggleDocVisibility}
            onSaveDocDates={saveDocDates}
            onBatchVisibility={batchVisibility}
            onOpenMembers={openMembers}
            onOpenSettings={openSettings}
            onCloseSettings={() => setSettingsOpen(false)}
            onSettingsNameChange={setSettingsName}
            onSettingsDescChange={setSettingsDesc}
            onSettingsAudienceChange={setSettingsAudience}
            onSaveSettings={saveSettings}
            onInitiateDeleteFromSettings={initiateDeleteFromSettings}
          />
        </div>
      </div>

      {membersOpen && selectedSpace && (
        <SpaceMembersDialog
          spaceId={selectedSpace.id}
          spaceName={selectedSpace.name}
          userRole={userRole}
          onClose={() => setMembersOpen(false)}
        />
      )}

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
      <input ref={fileInputRef} type="file" multiple className="hidden"
        accept=".pdf,.docx,.doc,.txt,.md,.pptx,.xlsx,.csv,.json"
        onChange={e => { const files = Array.from(e.target.files ?? []); if (files.length) uploadFiles(files); e.target.value = '' }}
      />
    </div>
  )
}
