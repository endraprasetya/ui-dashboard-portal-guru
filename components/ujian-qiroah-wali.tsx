'use client'

import { useEffect, useMemo, useState } from 'react'
import { BookOpenCheck } from 'lucide-react'
import { TombolLihatNilaiUjian } from '@/components/qiroah-lihat-nilai'
import { muatAnandaUntukWali } from '@/lib/portal-wali-siswa'
import { muatRekapanUntukSiswa } from '@/lib/rekapan-qiroah'
import { labelPredikatUjian, labelRentangKenaikanJilid } from '@/lib/qiroah'
import { catatanPenguji } from '@/lib/ujian-relasi'
import { rekapKeTampilanNilai } from '@/lib/ujian-nilai-tampilan'
import { todayInputValue } from '@/lib/jurnal'

function limaHariLalu() {
  const d = new Date(`${todayInputValue()}T12:00:00`)
  d.setDate(d.getDate() - 5)
  return d.toISOString().slice(0, 10)
}

export function UjianQiroahWaliBeranda({ currentUser }: { currentUser?: Record<string, unknown> | null }) {
  const [baris, setBaris] = useState<Awaited<ReturnType<typeof muatRekapanUntukSiswa>>>([])
  const [memuat, setMemuat] = useState(true)

  useEffect(() => {
    let batal = false
    setMemuat(true)
    muatAnandaUntukWali(currentUser)
      .then((ananda) => muatRekapanUntukSiswa(ananda.map((a) => a.id)))
      .then((rekap) => {
        if (!batal) setBaris(rekap)
        setMemuat(false)
      })
      .catch(() => {
        if (!batal) setBaris([])
        setMemuat(false)
      })
    return () => {
      batal = true
    }
  }, [currentUser])

  const batas = limaHariLalu()
  const terbaru = useMemo(
    () => baris.filter((row) => String(row.tanggal_ujian || '').slice(0, 10) >= batas),
    [baris, batas],
  )

  if (memuat || terbaru.length === 0) return null

  return (
    <section className="rounded-2xl border border-violet-200 bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-center gap-2 text-violet-900">
        <BookOpenCheck className="size-4" />
        <h3 className="text-sm font-extrabold">Hasil ujian kenaikan jilid</h3>
      </div>
      <p className="text-[11px] text-slate-500">Ditampilkan 5 hari terakhir sejak tanggal ujian.</p>
      <DaftarUjian baris={terbaru.slice(0, 3)} />
    </section>
  )
}

export function UjianQiroahWaliMenu({ currentUser }: { currentUser?: Record<string, unknown> | null }) {
  const [baris, setBaris] = useState<Awaited<ReturnType<typeof muatRekapanUntukSiswa>>>([])
  const [memuat, setMemuat] = useState(true)

  useEffect(() => {
    let batal = false
    setMemuat(true)
    muatAnandaUntukWali(currentUser)
      .then((ananda) => muatRekapanUntukSiswa(ananda.map((a) => a.id)))
      .then((rekap) => {
        if (!batal) setBaris(rekap)
        setMemuat(false)
      })
      .catch(() => {
        if (!batal) setBaris([])
        setMemuat(false)
      })
    return () => {
      batal = true
    }
  }, [currentUser])

  if (memuat) {
    return <p className="text-sm text-slate-500">Memuat riwayat ujian qiroah ananda…</p>
  }

  if (baris.length === 0) {
    return <p className="text-sm text-slate-500">Belum ada hasil ujian kenaikan jilid yang tercatat.</p>
  }

  return (
    <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wide text-violet-700">Qiroah</p>
        <h2 className="text-lg font-black text-slate-900">Riwayat ujian kenaikan jilid</h2>
        <p className="text-xs text-slate-500">Nilai komponen, predikat, keputusan, dan catatan penguji.</p>
      </div>
      <DaftarUjian baris={baris} lengkap />
    </section>
  )
}

function DaftarUjian({
  baris,
  lengkap,
}: {
  baris: Awaited<ReturnType<typeof muatRekapanUntukSiswa>>
  lengkap?: boolean
}) {
  return (
    <ul className={`mt-3 space-y-3 ${lengkap ? '' : ''}`}>
      {baris.map((row) => {
        const tampilan = rekapKeTampilanNilai(row, {
          id_siswa: row.id_siswa,
          nama_siswa: row.nama,
          kelas: row.kelas,
          unit: row.unit,
        })
        const catatan = catatanPenguji(row)
        return (
          <li key={row.id_ujian || `${row.id_siswa}-${row.tanggal_ujian}`} className="rounded-xl border border-slate-100 bg-slate-50/80 p-3">
            <p className="text-xs font-bold text-slate-800">
              {row.nama} · {row.kelas}
            </p>
            <p className="mt-0.5 text-[11px] text-slate-600">
              {String(row.tanggal_ujian || '').slice(0, 10)} · {labelRentangKenaikanJilid('', row.jilid_asal, row.jilid_tujuan)}
            </p>
            <p className="mt-1 text-[11px]">
              <span className="font-semibold text-emerald-800">{labelPredikatUjian(row.predikat)}</span>
              {row.nilai_akhir != null ? <span className="text-slate-600"> · nilai {row.nilai_akhir}</span> : null}
              <span className="text-slate-600"> · {row.keputusan || '—'}</span>
            </p>
            {catatan ? (
              <p className="mt-1 text-[11px] leading-relaxed text-slate-600">
                <span className="font-bold text-slate-500">Catatan penguji:</span> {catatan}
              </p>
            ) : null}
            <div className="mt-2">
              <TombolLihatNilaiUjian data={tampilan} />
            </div>
          </li>
        )
      })}
    </ul>
  )
}
