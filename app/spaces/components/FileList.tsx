'use client'

import { useState, useRef, memo, useCallback, useMemo } from 'react'
import { SpaceData } from '@/components/spaces/SpaceTree'
import { DocWithDate, fileIcon, formatSize, formatDate, formatAuditAction, fmtVisibleDate } from '../utils'
import { IconFolder, IconTrash, IconPlus, IconSettings, IconChevronRight, IconUpload, IconDownload, IconPencil } from './icons'
import BatchActions from './BatchActions'

type JournalEntry = { id: string; action: string; entityName: string; createdAt: string; user: { name: string | null; email: string } }

interface FileListProps {
  selectedSpace: SpaceData | null
  selectedSpaceId: string | null
  docs: DocWithDate[]
  docsLoading: boolean
  pendingDocIds: Set<string>
  justIndexedIds: Set<string>
  uploading: boolean
  uploadMsg: string
  uploadError: string
  activeTab: 'files' | 'journal'
  journalEntries: JournalEntry[]
  journalLoading: boolean
  selectedFolderId: string | null
  selectedDocIds: Set<string>
  settingsOpen: boolean
  settingsName: string
  settingsDesc: string
  settingsAudience: string
  settingsSaving: boolean
  canSetAudience: boolean
  onSetActiveTab: (tab: 'files' | 'journal') => void
  onSetSelectedFolderId: (id: string | null) => void
  onSetSelectedDocIds: React.Dispatch<React.SetStateAction<Set<string>>>
  onUploadFiles: (files: File[], sourceUrl?: string) => Promise<void>
  onRenameDoc: (docId: string, name: string) => void
  onDeleteDoc: (docId: string) => Promise<void>
  onCreateFolder: (name: string) => Promise<void>
  onDeleteFolder: (folderId: string) => Promise<void>
  onToggleDocVisibility: (docId: string, current: boolean | undefined) => Promise<void>
  onSaveDocDates: (docId: string, from: string, until: string) => Promise<void>
  onBatchVisibility: (action: string, from?: string, until?: string) => Promise<void>
  onOpenSettings: () => void
  onCloseSettings: () => void
  onSettingsNameChange: (v: string) => void
  onSettingsDescChange: (v: string) => void
  onSettingsAudienceChange: (v: string) => void
  onSaveSettings: () => Promise<void>
  onInitiateDeleteFromSettings: () => void
}

const FileList = memo(function FileList({
  selectedSpace, selectedSpaceId, docs, docsLoading, pendingDocIds, justIndexedIds,
  uploading, uploadMsg, uploadError, activeTab, journalEntries, journalLoading,
  selectedFolderId, selectedDocIds,
  settingsOpen, settingsName, settingsDesc, settingsAudience, settingsSaving, canSetAudience,
  onSetActiveTab, onSetSelectedFolderId, onSetSelectedDocIds,
  onUploadFiles, onRenameDoc, onDeleteDoc, onCreateFolder, onDeleteFolder,
  onToggleDocVisibility, onSaveDocDates, onBatchVisibility, onOpenSettings,
  onCloseSettings, onSettingsNameChange, onSettingsDescChange, onSettingsAudienceChange,
  onSaveSettings, onInitiateDeleteFromSettings,
}: FileListProps) {
  const [hoveredDocId, setHoveredDocId] = useState<string | null>(null)
  const [renamingDocId, setRenamingDocId] = useState<string | null>(null)
  const [renameDocVal, setRenameDocVal] = useState('')
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null)
  const [hoveredFolderId, setHoveredFolderId] = useState<string | null>(null)
  const [deletingFolderId, setDeletingFolderId] = useState<string | null>(null)
  const [creatingFolder, setCreatingFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [editVisibilityDocId, setEditVisibilityDocId] = useState<string | null>(null)
  const [pendingFiles, setPendingFiles] = useState<File[] | null>(null)
  const [sourceUrlInput, setSourceUrlInput] = useState('')
  const [sourceUrlError, setSourceUrlError] = useState('')
  const newFolderRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const sourceUrlRef = useRef<HTMLInputElement>(null)

  function handleFilesSelected(files: File[]) {
    if (!files.length) return
    setPendingFiles(files)
    setSourceUrlInput('')
    setSourceUrlError('')
    setTimeout(() => sourceUrlRef.current?.focus(), 50)
  }

  function handleUploadConfirm() {
    if (!pendingFiles) return
    const url = sourceUrlInput.trim()
    if (url) {
      try { new URL(url) } catch {
        setSourceUrlError('URL invalide — ex : https://hal.science/...')
        return
      }
    }
    onUploadFiles(pendingFiles, url || undefined)
    setPendingFiles(null)
    setSourceUrlInput('')
    setSourceUrlError('')
  }

  function handleUploadCancel() {
    setPendingFiles(null)
    setSourceUrlInput('')
    setSourceUrlError('')
  }

  const isShared = useMemo(() => selectedSpace != null && selectedSpace.enrichmentGroups !== '[]', [selectedSpace])

  const displayDocs = useMemo(
    () => selectedFolderId ? docs.filter(d => d.folderId === selectedFolderId) : docs.filter(d => d.folderId === null),
    [docs, selectedFolderId]
  )

  const totalDocs = docs.length

  const handleRenameDoc = useCallback((docId: string) => {
    if (!renameDocVal.trim()) { setRenamingDocId(null); return }
    onRenameDoc(docId, renameDocVal.trim())
    setRenamingDocId(null)
  }, [renameDocVal, onRenameDoc])

  const handleCreateFolder = useCallback(async () => {
    if (!newFolderName.trim()) return
    await onCreateFolder(newFolderName.trim())
    setNewFolderName('')
    setCreatingFolder(false)
  }, [newFolderName, onCreateFolder])

  if (!selectedSpace) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-8">
        <span className="text-5xl mb-4">📂</span>
        <p style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-md)', color: '#0D0D0D' }}>Sélectionnez un espace</p>
        <p style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: 'var(--text-sm)', color: '#8A8A8A', marginTop: '0.5rem', maxWidth: '24rem' }}>
          Choisissez un espace dans la colonne de gauche ou créez-en un nouveau.
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
        {/* Space header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="text-3xl">{selectedSpace.icon}</span>
            <div>
              <h1 style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'clamp(1.25rem, 5vw, var(--text-xl))', color: '#0D0D0D', letterSpacing: '-0.02em' }}>
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
            onClick={onOpenSettings}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#D8D8D8] text-[#8A8A8A] hover:border-[#00068D] hover:text-[#00068D] transition-all flex-shrink-0"
            style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-xs)' }}
          >
            <IconSettings />
            Paramètres
          </button>
        </div>

        {/* Tab bar */}
        <div className="flex items-center gap-1 border-b border-[#F2F2F2] -mx-6 px-6 mb-2">
          {(['files', 'journal'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => onSetActiveTab(tab)}
              className={`px-4 py-2 -mb-px transition-all border-b-2 ${activeTab === tab ? 'border-[#00068D] text-[#00068D]' : 'border-transparent text-[#8A8A8A] hover:text-[#0D0D0D]'}`}
              style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-xs)', letterSpacing: '0.04em', textTransform: 'uppercase' }}
            >
              {tab === 'files' ? 'Fichiers' : 'Journal'}
            </button>
          ))}
        </div>

        {/* Breadcrumb */}
        {activeTab === 'files' && selectedFolderId && (() => {
          const folder = selectedSpace.folders.find(f => f.id === selectedFolderId)
          return (
            <div className="flex items-center gap-1.5 -mt-2">
              <button
                onClick={() => onSetSelectedFolderId(null)}
                className="flex items-center gap-1 hover:text-[#00068D] transition-colors"
                style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-xs)', color: '#8A8A8A' }}
              >
                <span className="text-sm">{selectedSpace.icon}</span>
                {selectedSpace.name}
              </button>
              <IconChevronRight stroke="#C8C8C8" />
              <span className="flex items-center gap-1" style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-xs)', color: '#0D0D0D' }}>
                <IconFolder size={11} fill="#E8E9F8" stroke="#2B2EB8" strokeWidth={2} />
                {folder?.name}
              </span>
            </div>
          )
        })()}

        {/* Action bar */}
        {activeTab === 'files' && (
          <div className="flex items-center gap-2 flex-wrap">
            {!selectedFolderId && (
              <button
                onClick={() => { setCreatingFolder(true); setTimeout(() => newFolderRef.current?.focus(), 50) }}
                className="flex items-center gap-1.5 px-3 py-2 min-h-[44px] rounded-lg border border-[#D8D8D8] bg-white hover:border-[#2B2EB8] hover:text-[#00068D] transition-all"
                style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-xs)', color: '#0D0D0D' }}
              >
                <IconPlus size={11} />
                Nouveau dossier
              </button>
            )}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-1.5 px-3 py-2 min-h-[44px] rounded-lg border border-[#D8D8D8] bg-white hover:border-[#2B2EB8] hover:text-[#00068D] transition-all disabled:opacity-50"
              style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-xs)', color: '#0D0D0D' }}
            >
              <IconUpload />
              Importer
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              accept=".pdf,.docx,.doc,.txt,.md,.pptx,.xlsx,.csv,.json"
              onChange={e => { const files = Array.from(e.target.files ?? []); if (files.length) handleFilesSelected(files); e.target.value = '' }}
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
          </div>
        )}

        {/* Source URL modal — shown after file selection, before upload */}
        {activeTab === 'files' && pendingFiles && (
          <div className="rounded-xl border border-[#2B2EB8] bg-[#F8F8FF] p-4 space-y-3">
            <div>
              <p style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-xs)', color: '#00068D', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                {pendingFiles.length === 1 ? pendingFiles[0].name : `${pendingFiles.length} fichiers sélectionnés`}
              </p>
              {pendingFiles.length > 1 && (
                <p style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: 'var(--text-xs)', color: '#8A8A8A', marginTop: '0.2rem' }}>
                  {pendingFiles.map(f => f.name).join(', ')}
                </p>
              )}
            </div>
            <div className="space-y-1">
              <label style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-2xs)', color: '#5A5A5A', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                URL source <span style={{ fontWeight: 300, textTransform: 'none' }}>(optionnel)</span>
              </label>
              <input
                ref={sourceUrlRef}
                type="url"
                value={sourceUrlInput}
                onChange={e => { setSourceUrlInput(e.target.value); setSourceUrlError('') }}
                onKeyDown={e => { if (e.key === 'Enter') handleUploadConfirm(); if (e.key === 'Escape') handleUploadCancel() }}
                placeholder="https://hal.science/hal-... ou https://www.univ-paris3.fr/..."
                className="w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-1 transition-all"
                style={{
                  fontFamily: 'Source Serif Pro, Georgia, serif',
                  fontSize: 'var(--text-sm)',
                  borderColor: sourceUrlError ? '#EF4444' : '#D8D8D8',
                  ['--tw-ring-color' as string]: '#2B2EB8',
                }}
              />
              {sourceUrlError ? (
                <p style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: 'var(--text-xs)', color: '#EF4444' }}>{sourceUrlError}</p>
              ) : (
                <p style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: 'var(--text-xs)', color: '#8A8A8A', fontStyle: 'italic' }}>
                  Si ce document est disponible en ligne, l&apos;URL permettra d&apos;y accéder directement depuis les sources citées.
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleUploadConfirm}
                disabled={uploading}
                className="flex items-center gap-1.5 px-4 py-2 min-h-[44px] rounded-lg text-white disabled:opacity-50 transition-all"
                style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-xs)', letterSpacing: '0.04em', background: '#00068D' }}
              >
                <IconUpload />
                {uploading ? 'Importation…' : 'IMPORTER'}
              </button>
              <button
                onClick={handleUploadCancel}
                className="px-4 py-2 min-h-[44px] rounded-lg border border-[#D8D8D8] text-[#5A5A5A] hover:bg-[#F2F2F2] transition-all"
                style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-xs)' }}
              >
                Annuler
              </button>
            </div>
          </div>
        )}

        {/* Folders grid (root only) */}
        {activeTab === 'files' && !selectedFolderId && (
          <div>
            <p style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-2xs)', color: '#8A8A8A', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
              Dossiers
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {selectedSpace.folders.map(folder => (
                <div
                  key={folder.id}
                  className="group flex items-center gap-3 p-4 bg-white rounded-xl border border-[#D8D8D8] hover:border-[#2B2EB8] hover:shadow-sm transition-all cursor-pointer"
                  onClick={() => onSetSelectedFolderId(folder.id)}
                  onMouseEnter={() => setHoveredFolderId(folder.id)}
                  onMouseLeave={() => { setHoveredFolderId(null); if (deletingFolderId === folder.id) setDeletingFolderId(null) }}
                >
                  <IconFolder size={22} fill="#E8E9F8" stroke="#2B2EB8" strokeWidth={1.5} />
                  <div className="flex-1 min-w-0">
                    <p className="truncate" style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-xs)', color: '#0D0D0D' }}>{folder.name}</p>
                    <p style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 300, fontSize: 'var(--text-2xs)', color: '#C8C8C8' }}>{folder._count.documents} fichier{folder._count.documents !== 1 ? 's' : ''}</p>
                  </div>
                  {deletingFolderId === folder.id ? (
                    <div className="flex flex-col gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
                      <button onClick={() => { onDeleteFolder(folder.id); setDeletingFolderId(null) }} className="text-[8px] px-1.5 py-0.5 rounded bg-[#EF4444] text-white" style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800 }}>Oui</button>
                      <button onClick={() => setDeletingFolderId(null)} className="text-[8px] px-1.5 py-0.5 rounded border border-[#D8D8D8] text-[#5A5A5A]" style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800 }}>Non</button>
                    </div>
                  ) : hoveredFolderId === folder.id ? (
                    <button
                      onClick={e => { e.stopPropagation(); setDeletingFolderId(folder.id) }}
                      className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded text-[#C8C8C8] hover:text-[#EF4444] hover:bg-red-50 transition-all"
                      title="Supprimer le dossier"
                    >
                      <IconTrash size={11} />
                    </button>
                  ) : null}
                </div>
              ))}

              {creatingFolder ? (
                <div className="flex items-center gap-2 p-3 bg-[#F8F8FF] rounded-xl border border-[#2B2EB8]">
                  <IconFolder size={20} fill="#E8E9F8" stroke="#2B2EB8" strokeWidth={1.5} />
                  <input
                    ref={newFolderRef}
                    autoFocus
                    value={newFolderName}
                    onChange={e => setNewFolderName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleCreateFolder(); if (e.key === 'Escape') { setCreatingFolder(false); setNewFolderName('') } }}
                    placeholder="Nom du dossier…"
                    className="flex-1 min-w-0 px-1.5 py-0.5 rounded border border-[#2B2EB8] focus:outline-none text-xs"
                    style={{ fontFamily: 'Source Serif Pro, Georgia, serif' }}
                  />
                  <div className="flex gap-0.5 flex-shrink-0">
                    <button aria-label="Créer le dossier" onClick={handleCreateFolder} className="w-5 h-5 flex items-center justify-center text-[#00068D] hover:bg-[#E8E9F8] rounded" style={{ fontSize: '0.65rem' }}>✓</button>
                    <button aria-label="Annuler" onClick={() => { setCreatingFolder(false); setNewFolderName('') }} className="w-5 h-5 flex items-center justify-center text-[#8A8A8A] hover:bg-[#F2F2F2] rounded" style={{ fontSize: '0.65rem' }}>✕</button>
                  </div>
                </div>
              ) : null}
            </div>

            {selectedSpace.folders.length === 0 && !creatingFolder && (
              <div className="flex items-center gap-4 p-6 bg-white rounded-xl border border-dashed border-[#D8D8D8] text-center" style={{ justifyContent: 'center' }}>
                <div>
                  <IconFolder size={28} fill="#F2F2F2" stroke="#D8D8D8" strokeWidth={1.5} className="mx-auto mb-2" />
                  <p style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: 'var(--text-sm)', color: '#C8C8C8' }}>Aucun dossier pour l&apos;instant</p>
                  <p style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: 'var(--text-xs)', color: '#D8D8D8', marginTop: '0.25rem' }}>Créez un dossier ou importez des fichiers</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Files section */}
        {activeTab === 'files' && (docsLoading || displayDocs.length > 0) && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <p style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-2xs)', color: '#8A8A8A', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                Fichiers
              </p>
            </div>

            {isShared && displayDocs.length > 0 && (
              <BatchActions
                displayDocs={displayDocs}
                selectedDocIds={selectedDocIds}
                setSelectedDocIds={onSetSelectedDocIds}
                onBatchVisibility={onBatchVisibility}
              />
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
                        <input
                          type="checkbox"
                          checked={selectedDocIds.has(doc.id)}
                          onChange={e => onSetSelectedDocIds(prev => { const s = new Set(prev); e.target.checked ? s.add(doc.id) : s.delete(doc.id); return s })}
                          className="accent-[#00068D] mt-1 flex-shrink-0"
                        />
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
                            onKeyDown={e => { if (e.key === 'Enter') handleRenameDoc(doc.id); if (e.key === 'Escape') setRenamingDocId(null) }}
                            onBlur={() => handleRenameDoc(doc.id)}
                            className="w-full px-2 py-0.5 rounded border border-[#2B2EB8] focus:outline-none text-sm"
                            style={{ fontFamily: 'Source Serif Pro, Georgia, serif' }}
                          />
                        ) : (
                          <>
                            {isPending ? (
                              <>
                                <p className="truncate" style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: 'var(--text-sm)', color: '#0D0D0D' }}>{doc.displayName || doc.name}</p>
                                <p style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: 'var(--text-xs)', color: '#8A8A8A', fontStyle: 'italic' }}>
                                  {doc.progress != null ? `Indexation ${doc.progress}%…` : 'Indexation en cours…'}
                                </p>
                              </>
                            ) : (
                              <p className="truncate" style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: 'var(--text-sm)', color: '#0D0D0D' }}>{doc.displayName || doc.name}</p>
                            )}
                            {doc.description && !isPending && (
                              <p className="truncate" style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: 'var(--text-xs)', color: '#8A8A8A', fontStyle: 'italic' }}>{doc.description}</p>
                            )}
                            <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                              {doc.indexingStatus === 'indexed' && !isJustIndexed && (
                                <span title="Document indexé et interrogeable" style={{ color: '#2e7d32', fontSize: 'var(--text-xs)' }}>✓</span>
                              )}
                              {isFailed && (
                                <span title="Non indexé — le document peut être téléchargé mais pas interrogé" style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: 'var(--text-xs)', color: '#C8C8C8', fontStyle: 'italic' }}>non indexé</span>
                              )}
                              {isShared && !isPending && (
                                <>
                                  <button
                                    onClick={() => onToggleDocVisibility(doc.id, doc.isVisible)}
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
                                        onSaveDocDates(doc.id, f, u)
                                        setEditVisibilityDocId(null)
                                      }} className="px-1.5 py-0.5 rounded bg-[#00068D] text-white" style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-2xs)' }}>OK</button>
                                      <button aria-label="Fermer" onClick={() => setEditVisibilityDocId(null)} className="px-1.5 py-0.5 rounded border border-[#D8D8D8] text-[#5A5A5A]" style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-2xs)' }}>✕</button>
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
                          <span style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 300, fontSize: 'var(--text-2xs)', color: '#C8C8C8' }}>{formatDate(doc.uploadedAt)}</span>
                        )}
                        {deletingDocId === doc.id ? (
                          <div className="flex items-center gap-1">
                            <button onClick={() => { onDeleteDoc(doc.id); setDeletingDocId(null) }} className="px-2 py-0.5 rounded bg-[#EF4444] text-white" style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-2xs)' }}>Oui</button>
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
                              <IconDownload />
                            </a>
                            <button
                              onClick={() => { setRenamingDocId(doc.id); setRenameDocVal(doc.displayName || doc.name) }}
                              className="flex items-center gap-1 px-2 py-1 rounded text-[#8A8A8A] hover:bg-[#E8E9F8] hover:text-[#00068D] transition-all"
                              title="Renommer"
                            >
                              <IconPencil />
                            </button>
                            <button
                              onClick={() => setDeletingDocId(doc.id)}
                              className="flex items-center gap-1 px-2 py-1 rounded text-[#8A8A8A] hover:bg-red-50 hover:text-[#EF4444] transition-all"
                              title="Supprimer"
                            >
                              <IconTrash />
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
        )}

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

        {/* Journal tab */}
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

      {/* Settings drawer */}
      {settingsOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/20" onClick={onCloseSettings} />
          <div className="fixed right-0 top-0 bottom-0 z-50 bg-white border-l border-[#D8D8D8] flex flex-col overflow-y-auto nl-scroll" style={{ width: '320px' }}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#D8D8D8]">
              <h2 style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-md)', color: '#0D0D0D' }}>Paramètres de l&apos;espace</h2>
              <button aria-label="Fermer les paramètres" onClick={onCloseSettings} className="w-7 h-7 flex items-center justify-center rounded text-[#8A8A8A] hover:bg-[#F2F2F2]" style={{ fontSize: '1rem' }}>✕</button>
            </div>
            <div className="flex-1 px-5 py-5 space-y-5">
              <div className="space-y-1.5">
                <label style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-2xs)', color: '#5A5A5A', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                  Nom de l&apos;espace de travail
                </label>
                <input
                  value={settingsName}
                  onChange={e => onSettingsNameChange(e.target.value)}
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
                  onChange={e => onSettingsDescChange(e.target.value)}
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
                    onChange={e => onSettingsAudienceChange(e.target.value)}
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
                      <input type="radio" name="enrichment" defaultChecked={opt === 'Moi uniquement'} className="accent-[#00068D]" />
                      <span style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: 'var(--text-sm)', color: '#3A3A3A' }}>{opt}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="px-5 py-4 border-t border-[#F2F2F2] space-y-2">
              <button
                onClick={onSaveSettings}
                disabled={settingsSaving || !settingsName.trim()}
                className="w-full py-2.5 rounded-xl disabled:opacity-40 hover:opacity-90 transition-all"
                style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-xs)', background: '#00068D', color: '#fff', letterSpacing: '0.04em' }}
              >
                {settingsSaving ? 'Enregistrement…' : 'ENREGISTRER'}
              </button>
              <button
                onClick={onInitiateDeleteFromSettings}
                className="w-full py-2 rounded-xl border border-red-200 text-[#EF4444] hover:bg-red-50 transition-all"
                style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-xs)' }}
              >
                Supprimer cet espace
              </button>
            </div>
          </div>
        </>
      )}
    </>
  )
})

export default FileList
