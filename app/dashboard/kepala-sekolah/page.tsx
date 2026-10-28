import type { Metadata } from 'next'
import { DashboardKepalaSekolah } from '@/components/dashboard-kepala-sekolah'

export const metadata: Metadata = {
  title: 'Dashboard Kepala Sekolah | Portal Guru',
  description: 'Laporan kehadiran, setoran, ujian jilid, dan kepatuhan guru SD Islam Terpadu Al Madinah.',
}

export default function HalamanKepalaSekolah() {
  return <DashboardKepalaSekolah />
}
