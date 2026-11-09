'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Printer } from 'lucide-react'
import { GAYA_CETAK_RAPOR_KURMER, LembarRaporKurmer } from '@/components/rapor-kurmer-cetak'
import { fetchDataCetakKurmer, periodeKurmer, type DataCetakKurmer, type JenisAsesmenKurmer } from '@/lib/rapor-kurmer'

export function RaporKurmerHalamanCetak({
  idSiswa,
  kelas,
  asesmen,
  tahun,
  semester,
}: {
  idSiswa: string
  kelas?: string
  asesmen?: string
  tahun?: string
  semester?: string
}) {
  const [data, setData] = useState<DataCetakKurmer | null>(null)
  const [status, setStatus] = useState<'memuat' | 'siap' | 'kosong'>('memuat')
  const [siapKlien, setSiapKlien] = useState(false)
  const [user, setUser] = useState<any>(null)

  const filter = useMemo(() => {
    const periode = periodeKurmer()
    return {
      kelas: kelas || '',
      kodeMapel: 'bind',
      jenisAsesmen: (asesmen === 'ASAS' ? 'ASAS' : 'ASTS') as JenisAsesmenKurmer,
      tahunAjaran: tahun || periode.tahunAjaran,
      semester: semester || periode.semester,
    }
  }, [kelas, asesmen, tahun, semester])

  useEffect(() => {
    setSiapKlien(true)
    document.body.classList.add('cetak-rapor-kurmer-saja')
    try {
      const raw = localStorage.getItem('user_session')
      setUser(raw ? JSON.parse(raw) : null)
    } catch {
      setUser(null)
    }
    return () => {
      document.body.classList.remove('cetak-rapor-kurmer-saja')
    }
  }, [])

  useEffect(() => {
    if (!siapKlien || !idSiswa) return
    let batal = false
    setStatus('memuat')
    fetchDataCetakKurmer(idSiswa, filter, user).then((hasil) => {
      if (batal) return
      setData(hasil)
      setStatus(hasil ? 'siap' : 'kosong')
    })
    return () => {
      batal = true
    }
  }, [siapKlien, idSiswa, filter, user])

  return (
    <div className="min-h-screen bg-slate-200 print:m-0 print:bg-white print:p-0">
      <style>{GAYA_CETAK_RAPOR_KURMER}</style>
      <div className="no-print sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-slate-300 bg-[#4f46e5] px-4 py-3 text-white">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-indigo-100">Pratinjau rapor kurmer</p>
          <p className="text-sm font-extrabold">
            {filter.jenisAsesmen} · kertas F4
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/rapor-kurmer" className="inline-flex items-center gap-1 rounded-lg bg-white/15 px-3 py-2 text-xs font-bold">
            <ArrowLeft className="size-3.5" /> Kembali
          </Link>
          <button
            type="button"
            onClick={() => window.print()}
            disabled={status !== 'siap'}
            className="inline-flex items-center gap-1 rounded-lg bg-white px-3 py-2 text-xs font-bold text-slate-900 disabled:opacity-50"
          >
            <Printer className="size-3.5" /> Cetak Rapor
          </button>
        </div>
      </div>

      {status === 'memuat' && <p className="print:hidden py-16 text-center text-sm text-slate-600">Memuat rapor Kurikulum Merdeka…</p>}
      {status === 'kosong' && (
        <div className="print:hidden mx-auto max-w-lg px-4 py-16 text-center">
          <p className="text-base font-extrabold text-slate-800">Rapor belum dapat ditampilkan</p>
          <p className="mt-2 text-sm text-slate-500">
            Pastikan kelas dan data siswa sudah dipilih. Buka kembali dari modul Rapor Kurmer.
          </p>
          <Link href="/rapor-kurmer" className="mt-4 inline-flex rounded-lg bg-[#4f46e5] px-4 py-2 text-xs font-bold text-white">
            Kembali ke Rapor Kurmer
          </Link>
        </div>
      )}
      {status === 'siap' && data ? (
        <div className="print:m-0 print:p-0">
          <LembarRaporKurmer data={data} />
        </div>
      ) : null}
    </div>
  )
}
