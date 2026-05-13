import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'

const NAV = [
  { href: '/admin', label: 'TABLEAU DE BORD', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { href: '/admin/agents', label: 'AGENTS', icon: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H4a2 2 0 01-2-2V5a2 2 0 012-2h16a2 2 0 012 2v10a2 2 0 01-2 2h-1' },
  { href: '/admin/workflows', label: 'WORKFLOWS', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
  { href: '/admin/knowledge-bases', label: 'BASES KB', icon: 'M4 6h16M4 10h16M4 14h16M4 18h16' },
  { href: '/admin/sources', label: 'SOURCES', icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10' },
  { href: '/admin/users', label: 'UTILISATEURS', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
  { href: '/admin/groups', label: 'GROUPES', icon: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75' },
  { href: '/admin/diplomes', label: 'DIPLÔMES', icon: 'M12 14l9-5-9-5-9 5 9 5zM12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z' },
  { href: '/admin/routing', label: 'ROUTING', icon: 'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6-3V7m6 13l4.553 2.276A1 1 0 0021 21.382V10.618a1 1 0 00-.553-.894L15 7m0 13V7m0 0L9 4' },
]

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  const user = session?.user as { role?: string } | undefined
  if (user?.role !== 'ADMIN') redirect('/')

  const unreadAlerts = await prisma.systemAlert.count({ where: { read: false } })

  return (
    <div className="flex flex-col h-screen bg-[#F8F8FF] overflow-hidden">
      {/* Top bar */}
      <header
        className="flex items-center justify-between px-6 bg-white border-b border-[#D8D8D8] flex-shrink-0 z-10"
        style={{ height: '56px' }}
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#00068D]">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
              <path d="M12 3v18M3 12h18" />
              <path d="M5.6 5.6l12.8 12.8M5.6 18.4l12.8-12.8" />
            </svg>
          </div>
          <span style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-md)', color: '#00068D' }}>
            NouveLLM
          </span>
          <span className="w-px h-4 bg-[#D8D8D8]" />
          <span style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-xs)', letterSpacing: '0.1em', color: '#8A8A8A', textTransform: 'uppercase' }}>
            Administration
          </span>
        </div>
        <div className="flex items-center gap-3">
          {unreadAlerts > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 border border-red-200">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-xs)', color: '#dc2626' }}>
                {unreadAlerts} alerte{unreadAlerts > 1 ? 's' : ''}
              </span>
            </div>
          )}
          <Link
            href="/"
            className="text-[#8A8A8A] hover:text-[#00068D] transition-colors"
            style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 300, fontSize: 'var(--text-xs)', letterSpacing: '0.04em' }}
          >
            ← Retour à l&apos;interface
          </Link>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        {/* Left nav */}
        <nav
          className="flex flex-col bg-white border-r border-[#D8D8D8] flex-shrink-0 py-4"
          style={{ width: 200 }}
        >
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-2.5 px-4 py-2.5 text-[#5A5A5A] hover:bg-[#F0F1FB] hover:text-[#00068D] transition-all"
              style={{ fontFamily: 'Gilroy, sans-serif', fontWeight: 800, fontSize: 'var(--text-xs)', letterSpacing: '0.04em' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d={item.icon} />
              </svg>
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto nl-scroll p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
