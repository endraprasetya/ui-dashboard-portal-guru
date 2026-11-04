import type { Metadata } from 'next'
import { CetakRaporHalaman } from '@/components/cetak-rapor'

type Props = {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  return {
    title: `Rapor ${id} | Portal Guru`,
    description: 'Cetak rapor capaian Tahfidz dan Qiroah siswa SD Islam Terpadu Al Madinah.',
  }
}

export default async function HalamanRaporSiswa({ params }: Props) {
  const { id } = await params
  return <CetakRaporHalaman idSiswa={decodeURIComponent(id)} />
}
