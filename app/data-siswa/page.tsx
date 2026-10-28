import type { Metadata } from 'next'
import { DataSiswaBuku } from '@/components/data-siswa-buku'

export const metadata: Metadata = {
  title: 'Data Siswa | Portal Guru',
  description: 'Buku induk siswa SD Islam Terpadu Al Madinah.',
}

export default function HalamanDataSiswa() {
  return <DataSiswaBuku />
}
