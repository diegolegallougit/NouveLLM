'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { Users, ChevronRight, Activity } from 'lucide-react'

interface Group {
  id: string
  slug: string
  label: string
  _count: { users: number }
}

interface AuditEntry {
  id: string
  action: string
  entityName: string
  entityType: string
  createdAt: string
  user: { name: string | null; email: string }
}

export default function ResponsablePage() {
  const { data: session } = useSession()
  const [groups, setGroups] = useState<Group[]>([])
  const [audit, setAudit] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/responsable/groups').then((r) => r.json()),
      fetch('/api/responsable/audit').then((r) => r.json()),
    ]).then(([gData, aData]) => {
      setGroups(gData.groups ?? [])
      setAudit(aData.entries ?? [])
      setLoading(false)
    })
  }, [])

  const user = session?.user as { name?: string; email?: string } | undefined

  return (
    <div className="min-h-screen bg-[#F7F7FA] p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <p className="text-xs font-semibold tracking-widest text-[#00068D] uppercase mb-1">Panel responsable</p>
          <h1 className="text-2xl font-extrabold text-[#1A1A2E]">
            Bonjour{user?.name ? `, ${user.name.split(' ')[0]}` : ''}
          </h1>
          <p className="text-sm text-gray-500 mt-1">Gérez les groupes dont vous avez la responsabilité.</p>
        </div>

        {loading ? (
          <div className="text-sm text-gray-400">Chargement…</div>
        ) : (
          <>
            <section className="mb-8">
              <h2 className="text-xs font-semibold tracking-widest text-gray-400 uppercase mb-3 flex items-center gap-2">
                <Users size={14} /> Mes groupes
              </h2>
              {groups.length === 0 ? (
                <p className="text-sm text-gray-400">Aucun groupe assigné.</p>
              ) : (
                <div className="grid gap-3">
                  {groups.map((g) => (
                    <Link
                      key={g.id}
                      href={`/responsable/${g.id}/members`}
                      className="flex items-center justify-between bg-white rounded-xl px-5 py-4 shadow-sm hover:shadow-md transition-shadow border border-gray-100"
                    >
                      <div>
                        <p className="font-semibold text-[#1A1A2E]">{g.label}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{g._count.users} membre{g._count.users !== 1 ? 's' : ''}</p>
                      </div>
                      <ChevronRight size={18} className="text-gray-300" />
                    </Link>
                  ))}
                </div>
              )}
            </section>

            <section>
              <h2 className="text-xs font-semibold tracking-widest text-gray-400 uppercase mb-3 flex items-center gap-2">
                <Activity size={14} /> Activité récente
              </h2>
              {audit.length === 0 ? (
                <p className="text-sm text-gray-400">Aucune activité enregistrée.</p>
              ) : (
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm divide-y divide-gray-50">
                  {audit.map((e) => (
                    <div key={e.id} className="px-5 py-3 flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-[#1A1A2E] truncate">
                          <span className="font-medium">{e.user.name ?? e.user.email}</span>
                          {' — '}{formatAction(e.action)}{' '}
                          <span className="text-gray-500">{e.entityName}</span>
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">{new Date(e.createdAt).toLocaleString('fr-FR')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  )
}

function formatAction(action: string): string {
  const map: Record<string, string> = {
    DOCUMENT_UPLOAD: 'a déposé',
    DOCUMENT_DELETE: 'a supprimé',
    DOCUMENT_RENAME: 'a renommé',
    DOCUMENT_DOWNLOAD: 'a téléchargé',
    USER_INVITED: 'a invité',
    USER_REMOVED: 'a retiré',
    USER_GROUP_ADDED: 'a ajouté au groupe',
    USER_GROUP_REMOVED: 'a retiré du groupe',
    GROUP_CREATED: 'a créé le groupe',
    SPACE_CREATED: 'a créé l\'espace',
    SPACE_DELETED: 'a supprimé l\'espace',
  }
  return map[action] ?? action
}
