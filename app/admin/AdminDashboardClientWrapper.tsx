'use client'

import dynamic from 'next/dynamic'
import AdminLoading from './loading'
import type { AdminDashboardProps } from './AdminDashboardClient'

const AdminDashboardClient = dynamic(() => import('./AdminDashboardClient'), {
  ssr: false,
  loading: () => <AdminLoading />,
})

export default function AdminDashboardClientWrapper(props: AdminDashboardProps) {
  return <AdminDashboardClient {...props} />
}
