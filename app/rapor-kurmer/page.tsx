import type { Metadata } from 'next'
import { RaporKurmerHalaman } from '@/components/rapor-kurmer'

export const metadata: Metadata = {
  title: 'Rapor Kurikulum Merdeka | Portal Guru',
  description: 'Daftar nilai TP, ledger kelas, dan pratinjau cetak rapor Kurikulum Merdeka SD Islam Terpadu Al Madinah.',
}

export default function HalamanRaporKurmer() {
  return <RaporKurmerHalaman />
}
