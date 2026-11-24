'use client'

import { useEffect, useState } from 'react'
import { BannerPeriodeJurnal } from '@/components/banner-periode-jurnal'
import { fetchJurnalRingkasKelas, normalizeSiswaTidakHadir } from '@/lib/jurnal'
import { muatAnandaUntukWali } from '@/lib/portal-wali-siswa'
import { tanggalLokal } from '@/lib/periode-sekolah'
import type { SantriWali } from '@/lib/portal-wali'

type BarisJurnal = {
  tanggal: string
  jam: number
  mapel: string
  materi: string
  kegiatan: string
  tugas: string
  siswaTidakHadir: unknown
}

function geserHari(iso: string, hari: number) {
  const [tahun, bulan, tanggal] = iso.split('-').map(Number)
  const tanggalBaru = new Date(tahun, (bulan || 1) - 1, tanggal || 1)
  tanggalBaru.setDate(tanggalBaru.getDate() + hari)
  return tanggalLokal(tanggalBaru)
}

function kehadiranAnak(
  absen: unknown,
  anak: SantriWali,
) {
  const daftar = normalizeSiswaTidakHadir(absen)
  const nama = anak.name.trim().toLowerCase()
  const kena = daftar.find((item) => {
    if (anak.id && item.id_siswa && item.id_siswa === anak.id) return true
    return item.nama.trim().toLowerCase() === nama
  })
  if (!kena) return 'Hadir'
  return kena.keterangan || 'Tidak hadir'
}

export function JurnalWali({ currentUser }: { currentUser?: Record<string, unknown> | null }) {
  const [ananda, setAnanda] = useState<SantriWali[]>([])
  const [riwayat, setRiwayat] = useState<Record<string, BarisJurnal[]>>({})
  const [memuat, setMemuat] = useState(true)
  const [galat, setGalat] = useState('')

  useEffect(() => {
    let batal = false
    async function muat() {
      setMemuat(true)
      setGalat('')
      const daftar = await muatAnandaUntukWali(currentUser)
      if (batal) return
      setAnanda(daftar)

      const akhir = tanggalLokal()
      const awal = geserHari(akhir, -21)
      const kelasUnik = Array.from(new Set(daftar.map((item) => item.kelas.trim()).filter(Boolean))).slice(0, 3)
      const berikutnya: Record<string, BarisJurnal[]> = {}

      for (const kelas of kelasUnik) {
        const unit = daftar.find((item) => item.kelas.trim() === kelas)?.unit
        const { rows, error } = await fetchJurnalRingkasKelas({ kelas, start: awal, end: akhir, unit })
        if (batal) return
        if (error) {
          setGalat('Riwayat jurnal belum dapat dimuat. Banner periode tetap mengikuti tanggal hari ini.')
          continue
        }
        berikutnya[kelas] = rows
          .map((row) => ({
            tanggal: String(row.tanggal || '').slice(0, 10),
            jam: Number(row.jam) || 0,
            mapel: String(row.mapel || '').trim(),
            materi: String(row.materi || '').trim(),
            kegiatan: String(row.kegiatan || '').trim(),
            tugas: String(row.tugas || '').trim(),
            siswaTidakHadir: row.siswa_tidak_hadir,
          }))
          .filter((row) => row.tanggal)
          .sort((a, b) => b.tanggal.localeCompare(a.tanggal) || a.jam - b.jam)
      }

      if (!batal) {
        setRiwayat(berikutnya)
        setMemuat(false)
      }
    }
    void muat()
    return () => {
      batal = true
    }
  }, [currentUser])

  return (
    <div className="space-y-4">
      <BannerPeriodeJurnal />
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-700">Jurnal pembelajaran</p>
        <h2 className="mt-1 text-lg font-black text-slate-900">Jurnal ananda</h2>
        <p className="mt-1 text-sm text-slate-500">
          Riwayat jurnal yang sudah disimpan guru ditampilkan di bawah. Pemberitahuan ujian dan libur mengikuti tanggal perangkat ini.
        </p>
      </section>

      {galat && <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">{galat}</p>}
      {memuat && <p className="text-xs text-slate-500">Memuat riwayat jurnal...</p>}

      {!memuat && ananda.length === 0 && (
        <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
          Data ananda belum tertaut ke akun ini.
        </p>
      )}

      {ananda.map((anak) => {
        const baris = riwayat[anak.kelas.trim()] || []
        return (
          <section key={anak.id || anak.name} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-extrabold text-slate-900">
              {anak.name} <span className="font-semibold text-slate-500">· Kelas {anak.kelas || '-'}</span>
            </h3>
            {baris.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">Belum ada jurnal tersimpan pada 21 hari terakhir.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {baris.map((item) => (
                  <li key={`${anak.id}-${item.tanggal}-${item.jam}`} className="rounded-xl bg-slate-50 px-3 py-2 text-xs">
                    <p className="font-bold text-slate-800">
                      {item.tanggal} · Jam {item.jam || '-'} · {item.mapel || 'Pembelajaran'}
                    </p>
                    {item.materi && <p className="mt-1 text-slate-600">Materi: {item.materi}</p>}
                    {item.kegiatan && <p className="text-slate-600">Kegiatan: {item.kegiatan}</p>}
                    {item.tugas && <p className="text-slate-600">Tugas: {item.tugas}</p>}
                    <p className="mt-1 font-semibold text-emerald-800">
                      Kehadiran: {kehadiranAnak(item.siswaTidakHadir, anak)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )
      })}
    </div>
  )
}
