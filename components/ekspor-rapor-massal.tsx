'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Download, Loader2, Printer } from 'lucide-react'
import { fetchAllSiswa, type Siswa } from '@/lib/siswa'
import { ASESMEN_TAHFIDZ } from '@/lib/materi-ujian-tahfidz'
import { fetchCetakRaporTahfidz, type DataCetakRaporTahfidz } from '@/lib/cetak-rapor-tahfidz'
import { GAYA_CETAK_RAPOR_TAHFIDZ, LembarRaporTahfidz } from '@/components/cetak-rapor-tahfidz'
import { unduhSemuaPdfRapor } from '@/lib/unduh-pdf-rapor'

async function muatRaporBergiliran(siswa: Siswa[], asesmen: string) {
  const hasil: DataCetakRaporTahfidz[] = []
  const antrian = [...siswa]
  const pekerja = Array.from({ length: Math.min(3, antrian.length) }, async () => {
    while (antrian.length) {
      const item = antrian.shift()
      if (!item) break
      const data = await fetchCetakRaporTahfidz(item.id_siswa, asesmen)
      if (data) hasil.push(data)
    }
  })
  await Promise.all(pekerja)
  return hasil.sort((a, b) => a.siswa.nama.localeCompare(b.siswa.nama, 'id'))
}

function sesiPengguna() {
  try {
    const raw = localStorage.getItem('user_session')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function EksporRaporMassal({ asesmenAwal }: { asesmenAwal?: string }) {
  const [user, setUser] = useState<any>(null)
  const [siswa, setSiswa] = useState<Siswa[]>([])
  const [asesmen, setAsesmen] = useState(asesmenAwal || 'ASAS')
  const [daftar, setDaftar] = useState<DataCetakRaporTahfidz[]>([])
  const [memuat, setMemuat] = useState(true)
  const [mengunduh, setMengunduh] = useState(false)
  const [progres, setProgres] = useState('')
  const [galat, setGalat] = useState('')

  useEffect(() => {
    const sesi = sesiPengguna()
    if (!sesi) {
      window.location.replace('/')
      return
    }
    setUser(sesi)
  }, [])

  useEffect(() => {
    if (!user) return
    let batal = false
    fetchAllSiswa(user).then((data) => {
      if (!batal) setSiswa(data)
    })
    return () => {
      batal = true
    }
  }, [user])

  useEffect(() => {
    if (siswa.length === 0) {
      setDaftar([])
      setMemuat(false)
      return
    }
    let batal = false
    setMemuat(true)
    setGalat('')
    muatRaporBergiliran(siswa, asesmen)
      .then((hasil) => {
        if (batal) return
        setDaftar(hasil)
        setMemuat(false)
      })
      .catch(() => {
        if (batal) return
        setGalat('Gagal memuat rapor siswa binaan.')
        setMemuat(false)
      })
    return () => {
      batal = true
    }
  }, [siswa, asesmen])

  const siapCetak = useMemo(
    () => daftar.filter((row) => row.detail.length > 0 || row.nilaiRapor != null),
    [daftar],
  )

  const handleUnduh = async () => {
    const sumber = siapCetak.length ? siapCetak : daftar
    if (sumber.length === 0) return
    setMengunduh(true)
    setGalat('')
    try {
      await unduhSemuaPdfRapor(sumber, (index, nama) => {
        setProgres(`Mengunduh ${index}/${sumber.length}: ${nama}`)
      })
      setProgres(`${sumber.length} file PDF berhasil diunduh.`)
    } catch (error) {
      setGalat(error instanceof Error ? error.message : 'Gagal mengunduh PDF.')
    } finally {
      setMengunduh(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-200 print:bg-white">
      <style>{`${GAYA_CETAK_RAPOR_TAHFIDZ}
        .lembar-massal { display: none; }
        @media print { .lembar-massal { display: block; } }
      `}</style>

      <div className="print:hidden sticky top-0 z-20 border-b border-slate-300 bg-[#143d32] px-4 py-3 text-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-100">Ekspor rapor massal</p>
            <p className="text-sm font-extrabold">PDF terpisah per siswa binaan · kertas F4</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/" className="inline-flex items-center gap-1 rounded-lg bg-white/15 px-3 py-2 text-xs font-bold">
              <ArrowLeft className="size-3.5" /> Kembali
            </Link>
            <button
              type="button"
              onClick={() => window.print()}
              disabled={memuat || daftar.length === 0}
              className="inline-flex items-center gap-1 rounded-lg bg-white/15 px-3 py-2 text-xs font-bold disabled:opacity-50"
            >
              <Printer className="size-3.5" /> Cetak semua
            </button>
            <button
              type="button"
              onClick={handleUnduh}
              disabled={memuat || mengunduh || daftar.length === 0}
              className="inline-flex items-center gap-1 rounded-lg bg-white px-3 py-2 text-xs font-bold text-slate-900 disabled:opacity-50"
            >
              {mengunduh ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}
              {mengunduh ? 'Mengunduh…' : `Unduh ${daftar.length} PDF terpisah`}
            </button>
          </div>
        </div>
      </div>

      <div className="print:hidden mx-auto max-w-5xl space-y-4 px-4 py-5">
        <label className="block max-w-xs text-xs font-bold text-slate-700">
          Asesmen
          <select
            value={asesmen}
            onChange={(event) => setAsesmen(event.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold"
          >
            {ASESMEN_TAHFIDZ.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        {memuat ? (
          <p className="text-sm text-slate-600">Menyiapkan rapor {siswa.length} siswa binaan…</p>
        ) : (
          <p className="text-sm text-slate-600">
            {daftar.length} rapor siap. File akan bernama sesuai nama siswa, misalnya{' '}
            <span className="font-mono text-xs">{`Rapor_Tahfidz_Aisyah_Zahra_${asesmen.replace(/\s+/g, '_')}.pdf`}</span>.
            {siapCetak.length < daftar.length ? (
              <span className="mt-1 block text-amber-800">
                {daftar.length - siapCetak.length} siswa belum memiliki nilai ujian — PDF-nya tetap dibuat.
              </span>
            ) : null}
          </p>
        )}
        {progres ? <p className="text-sm font-semibold text-emerald-800">{progres}</p> : null}
        {galat ? <p className="text-sm font-semibold text-red-700">{galat}</p> : null}

        {!memuat && (
          <ul className="divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white">
            {daftar.map((row) => (
              <li key={row.siswa.idSiswa} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                <span>
                  <span className="font-bold text-slate-800">{row.siswa.nama}</span>
                  <span className="ml-2 text-xs text-slate-500">{row.siswa.kelas}</span>
                </span>
                <span className="text-xs font-semibold text-slate-500">
                  {row.detail.length > 0 ? `${row.detail.length} surah` : 'Belum ada nilai'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="lembar-massal" aria-hidden="true">
        {daftar.map((row) => (
          <LembarRaporTahfidz key={row.siswa.idSiswa} data={row} />
        ))}
      </div>
    </div>
  )
}
