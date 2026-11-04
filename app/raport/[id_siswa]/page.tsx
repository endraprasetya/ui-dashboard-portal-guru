import type { Metadata } from 'next'
import { CetakRaporTahfidzHalaman } from '@/components/cetak-rapor-tahfidz'

type Props = {
  params: Promise<{ id_siswa: string }>
  searchParams: Promise<{ asesmen?: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id_siswa } = await params
  return {
    title: `Rapor Tahfidz ${id_siswa} | Portal Guru`,
    description: 'Pratinjau dan cetak rapor Tahfidzul Qur’an SD Islam Terpadu Al Madinah.',
  }
}

export default async function HalamanCetakRaporTahfidz({ params, searchParams }: Props) {
  const [{ id_siswa }, query] = await Promise.all([params, searchParams])
  return <CetakRaporTahfidzHalaman idSiswa={decodeURIComponent(id_siswa)} asesmen={query.asesmen} />
}
