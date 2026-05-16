'use client'

import { useState, useRef, useEffect, memo, useCallback } from 'react'
import { SpaceData } from '@/components/spaces/SpaceTree'
import { IconFolder, IconTrash, IconPlus, IconPencil } from './icons'

export interface SharedSpace {
  id: string
  name: string
  icon: string
  description: string | null
  audience: string
}

interface FolderTreeProps {
  spaces: SpaceData[]
  selectedSpaceId: string | null
  expandedIds: Set<string>
  sharedSpaces: SharedSpace[]
  onSelectSpace: (id: string) => void
  onCreateSpace: (name: string) => Promise<void>
  onRenameSpace: (id: string, name: string) => Promise<void>
  onDeleteSpace: (id: string) => Promise<void>
  onDeleteFolder: (folderId: string) => Promise<void>
}

const FolderTree = memo(function FolderTree({
  spaces, selectedSpaceId, expandedIds, sharedSpaces,
  onSelectSpace, onCreateSpace, onRenameSpace, onDeleteSpace, onDeleteFolder,
}: FolderTreeProps) {
  const [renamingSpaceId, setRenamingSpaceId] = useState<string | null>(null)
  const [renameSpaceVal, setRenameSpaceVal] = useState('')
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [deleteDocCount, setDeleteDocCount] = useState(0)
  const [ctxSpaceId, setCtxSpaceId] = useState<string | null>(null)
  const [ctxPos, setCtxPos] = useState({ x: 0, y: 0 })
  const [creatingSpace, setCreatingSpace] = useState(false)
  const [newSpaceName, setNewSpaceName] = useState('')
  const [hoveredFolderId, setHoveredFolderId] = useState<string | null>(null)
  const [deletingFolderId, setDeletingFolderId] = useState<string | null>(null)
  const ctxRef = useRef<HTMLDivElement>(null)
  const newSpaceRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    function h(e: MouseEvent) {
      if (ctxRef.current && !ctxRef.current.contains(e.target as Node)) setCtxSpaceId(null)
    }
    if (ctxSpaceId) document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [ctxSpaceId])

  const initiateDelete = useCallback(async (id: string) => {
    const r = await fetch(`/api/spaces/${id}/members/count`)
    const d = await r.json()
    setDeleteDocCount(d.documentCount ?? 0)
    setDeleteConfirmId(id)
    setCtxSpaceId(null)
  }, [])

  const openContextMenu = useCallback((e: React.MouseEvent, spaceId: string) => {
    e.stopPropagation()
    setCtxPos({ x: e.clientX, y: e.clientY })
    setCtxSpaceId(spaceId)
  }, [])

  const handleCreateSpace = useCallback(async () => {
    if (!newSpaceName.trim()) return
    await onCreateSpace(newSpaceName.trim())
    setNewSpaceName('')
    setCreatingSpace(false)
  }, [newSpaceName, onCreateSpace])

  return (
    <>
      <div className="px-3 pt-4 pb-2">
        <p style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-2xs)', color: '#8A8A8A', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Mes espaces</p>
      </div>

      {spaces.map(space => (
        <div key={space.id}>
          {renamingSpaceId === space.id ? (
            <div className="flex items-center gap-1.5 px-3 py-2 bg-[#F8F8FF]">
              <span className="text-sm">{space.icon}</span>
              <input
                autoFocus
                value={renameSpaceVal}
                onChange={e => setRenameSpaceVal(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') { onRenameSpace(space.id, renameSpaceVal); setRenamingSpaceId(null) }
                  if (e.key === 'Escape') setRenamingSpaceId(null)
                }}
                className="flex-1 min-w-0 px-1.5 py-0.5 rounded border border-[#2B2EB8] focus:outline-none text-sm"
                style={{ fontFamily: 'Source Serif Pro, Georgia, serif' }}
              />
              <button aria-label="Valider le renommage" onClick={() => { onRenameSpace(space.id, renameSpaceVal); setRenamingSpaceId(null) }} className="text-[#00068D] hover:text-[#2B2EB8]" style={{ fontSize: '0.7rem' }}>✓</button>
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
                <button onClick={() => { onDeleteSpace(space.id); setDeleteConfirmId(null) }} className="px-2 py-0.5 rounded bg-[#EF4444] text-white" style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-2xs)' }}>Oui</button>
                <button onClick={() => setDeleteConfirmId(null)} className="px-2 py-0.5 rounded border border-[#D8D8D8] text-[#5A5A5A] hover:bg-[#F2F2F2]" style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-2xs)' }}>Non</button>
              </div>
            </div>
          ) : (
            <div
              className={`group flex items-center gap-2 px-3 py-2 cursor-pointer transition-all border-l-2 ${selectedSpaceId === space.id ? 'bg-[#E8E9F8] border-l-[#00068D]' : 'border-l-transparent hover:bg-[#F2F2F2] hover:border-l-[#D8D8D8]'}`}
              onClick={() => onSelectSpace(space.id)}
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
                    <IconFolder size={10} stroke="#8A8A8A" strokeWidth={2} />
                    <span className="truncate" style={{ fontFamily: 'Source Serif Pro, Georgia, serif', fontSize: 'var(--text-xs)', color: '#3A3A3A' }}>{folder.name}</span>
                    <span style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 300, fontSize: 'var(--text-2xs)', color: '#C8C8C8' }}>{folder._count.documents}</span>
                  </div>
                  {hoveredFolderId === folder.id && deletingFolderId !== folder.id && (
                    <button
                      onClick={e => { e.stopPropagation(); setDeletingFolderId(folder.id) }}
                      className="flex-shrink-0 w-4 h-4 flex items-center justify-center rounded text-[#C8C8C8] hover:text-[#EF4444] hover:bg-red-50"
                      title="Supprimer le dossier"
                    >
                      <IconTrash size={9} />
                    </button>
                  )}
                  {deletingFolderId === folder.id && (
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button onClick={() => { onDeleteFolder(folder.id); setDeletingFolderId(null) }} className="text-[8px] px-1.5 py-0.5 rounded bg-[#EF4444] text-white" style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800 }}>Oui</button>
                      <button onClick={() => setDeletingFolderId(null)} className="text-[8px] px-1.5 py-0.5 rounded border border-[#D8D8D8] text-[#5A5A5A]" style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800 }}>Non</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      {creatingSpace && (
        <div className="flex items-center gap-1.5 px-3 py-2 bg-[#F8F8FF] border-l-2 border-l-[#2B2EB8]">
          <span className="text-sm">📁</span>
          <input
            ref={newSpaceRef}
            autoFocus
            value={newSpaceName}
            onChange={e => setNewSpaceName(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') handleCreateSpace()
              if (e.key === 'Escape') { setCreatingSpace(false); setNewSpaceName('') }
            }}
            placeholder="Nom de l'espace…"
            className="flex-1 min-w-0 px-1.5 py-0.5 rounded border border-[#2B2EB8] focus:outline-none text-sm"
            style={{ fontFamily: 'Source Serif Pro, Georgia, serif' }}
          />
          <button aria-label="Créer l'espace" onClick={handleCreateSpace} className="text-[#00068D] hover:text-[#2B2EB8] flex-shrink-0" style={{ fontSize: '0.7rem' }}>✓</button>
          <button aria-label="Annuler la création" onClick={() => { setCreatingSpace(false); setNewSpaceName('') }} className="text-[#8A8A8A] hover:text-red-500 flex-shrink-0" style={{ fontSize: '0.7rem' }}>✕</button>
        </div>
      )}

      <div className="px-3 py-2">
        <button
          onClick={() => { setCreatingSpace(true); setTimeout(() => newSpaceRef.current?.focus(), 50) }}
          className="flex items-center gap-2 text-[#8A8A8A] hover:text-[#00068D] transition-colors w-full py-1"
          style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-xs)' }}
        >
          <IconPlus />
          Nouvel espace
        </button>
      </div>

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

      {ctxSpaceId && (
        <div
          ref={ctxRef}
          className="fixed z-50 bg-white rounded-xl border border-[#D8D8D8] shadow-lg py-1 min-w-[160px]"
          style={{ top: ctxPos.y, left: ctxPos.x }}
        >
          {([
            {
              label: 'Renommer',
              icon: <IconPencil size={12} />,
              action: () => {
                const s = spaces.find(x => x.id === ctxSpaceId)
                if (s) { setRenameSpaceVal(s.name); setRenamingSpaceId(s.id) }
                setCtxSpaceId(null)
              },
              danger: false,
            },
            {
              label: 'Supprimer',
              icon: <IconTrash size={12} />,
              action: () => { if (ctxSpaceId) initiateDelete(ctxSpaceId) },
              danger: true,
            },
          ] as const).map(item => (
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
    </>
  )
})

export default FolderTree
