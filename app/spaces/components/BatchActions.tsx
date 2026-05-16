'use client'

import { useState, memo } from 'react'
import { DocWithDate } from '../utils'

interface BatchActionsProps {
  displayDocs: DocWithDate[]
  selectedDocIds: Set<string>
  setSelectedDocIds: React.Dispatch<React.SetStateAction<Set<string>>>
  onBatchVisibility: (action: string, from?: string, until?: string) => Promise<void>
}

const BatchActions = memo(function BatchActions({ displayDocs, selectedDocIds, setSelectedDocIds, onBatchVisibility }: BatchActionsProps) {
  const [batchDatesOpen, setBatchDatesOpen] = useState(false)
  const [batchFrom, setBatchFrom] = useState('')
  const [batchUntil, setBatchUntil] = useState('')

  const allSelected = displayDocs.length > 0 && displayDocs.every(d => selectedDocIds.has(d.id))

  return (
    <div className="flex items-center gap-2 mb-2 flex-wrap">
      <label className="flex items-center gap-1.5 cursor-pointer">
        <input
          type="checkbox"
          checked={allSelected}
          onChange={e => setSelectedDocIds(e.target.checked ? new Set(displayDocs.map(d => d.id)) : new Set())}
          className="accent-[#00068D]"
        />
        <span style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-2xs)', color: '#8A8A8A' }}>
          {selectedDocIds.size > 0 ? `${selectedDocIds.size} sélectionné(s)` : 'Tout sélectionner'}
        </span>
      </label>
      {selectedDocIds.size > 0 && (
        <>
          <button onClick={() => onBatchVisibility('activate')} className="px-2 py-0.5 rounded border border-green-200 text-green-700 hover:bg-green-50 transition-all" style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-2xs)' }}>Activer</button>
          <button onClick={() => onBatchVisibility('hide')} className="px-2 py-0.5 rounded border border-[#D8D8D8] text-[#5A5A5A] hover:bg-[#F2F2F2] transition-all" style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-2xs)' }}>Masquer</button>
          <button onClick={() => onBatchVisibility('archive')} className="px-2 py-0.5 rounded border border-orange-200 text-orange-600 hover:bg-orange-50 transition-all" style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-2xs)' }}>Archiver</button>
          <button onClick={() => setBatchDatesOpen(v => !v)} className="px-2 py-0.5 rounded border border-[#2B2EB8] text-[#00068D] hover:bg-[#E8E9F8] transition-all" style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-2xs)' }}>Définir dates…</button>
          {batchDatesOpen && (
            <div className="flex items-center gap-2 ml-1 flex-wrap">
              <input type="date" value={batchFrom} onChange={e => setBatchFrom(e.target.value)} className="px-2 py-0.5 rounded border border-[#D8D8D8] text-xs focus:outline-none focus:ring-1 focus:ring-[#2B2EB8]" style={{ fontFamily: 'Source Serif Pro, Georgia, serif' }} />
              <span style={{ fontSize: 'var(--text-2xs)', color: '#8A8A8A' }}>→</span>
              <input type="date" value={batchUntil} onChange={e => setBatchUntil(e.target.value)} className="px-2 py-0.5 rounded border border-[#D8D8D8] text-xs focus:outline-none focus:ring-1 focus:ring-[#2B2EB8]" style={{ fontFamily: 'Source Serif Pro, Georgia, serif' }} />
              <button onClick={() => onBatchVisibility('set-dates', batchFrom, batchUntil)} className="px-2 py-0.5 rounded bg-[#00068D] text-white" style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-2xs)' }}>OK</button>
            </div>
          )}
        </>
      )}
    </div>
  )
})

export default BatchActions
