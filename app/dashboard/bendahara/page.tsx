import type { Metadata } from 'next'
import { DashboardBendahara } from '@/components/dashboard-bendahara'

export const metadata: Metadata = {
  title: 'Dashboard Bendahara | Portal Guru',
  description: 'Validasi transaksi kasir, rekap keuangan, dan sinkronisasi AMPSS untuk Bendahara SD Islam Terpadu Al Madinah.',
}

export default function HalamanBendahara() {
  return <DashboardBendahara />
}
