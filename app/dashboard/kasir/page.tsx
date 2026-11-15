import type { Metadata } from 'next'
import { DashboardKasir } from '@/components/dashboard-kasir'

export const metadata: Metadata = {
  title: 'Dashboard Kasir | Portal Guru',
  description: 'Pencatatan transaksi harian penerimaan dan pengeluaran kas SD Islam Terpadu Al Madinah.',
}

export default function HalamanKasir() {
  return <DashboardKasir />
}
