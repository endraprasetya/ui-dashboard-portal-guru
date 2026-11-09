import type { Metadata } from 'next'
import { RaporKurmerHalamanCetak } from '@/components/rapor-kurmer-halaman-cetak'

type Props = {
  params: Promise<{ id_siswa: string }>
  searchParams: Promise<{ kelas?: string; asesmen?: string; tahun?: string; semester?: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id_siswa } = await params
  return {
    title: `Rapor Kurmer ${id_siswa} | Portal Guru`,
    description: 'Pratinjau dan cetak rapor Kurikulum Merdeka SD Islam Terpadu Al Madinah.',
  }
}

export default async function HalamanCetakRaporKurmer({ params, searchParams }: Props) {
  const [{ id_siswa }, query] = await Promise.all([params, searchParams])
  return (
    <RaporKurmerHalamanCetak
      idSiswa={decodeURIComponent(id_siswa)}
      kelas={query.kelas}
      asesmen={query.asesmen}
      tahun={query.tahun}
      semester={query.semester}
    />
  )
}
