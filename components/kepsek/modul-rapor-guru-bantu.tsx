'use client'

import { useEffect, useMemo, useState } from 'react'
import { ModalKerangka } from '@/components/kepsek/modal-kerangka'
import type { LaporanKepsek } from '@/lib/kepala-sekolah'
import { RekapMatriksGuruBantu } from '@/components/guru-bantu/RekapMatriksGuruBantu'
import {
  muatAbsensiGuruBantuKepsek,
  muatRekapBulananGuruBantuKepsek,
  type RekapAbsensiGuruBantuKepsek,
  type RekapBulananGuruBantuKepsek,
} from '@/lib/kepsek-guru-bantu'
import { todayInputValue } from '@/lib/jurnal'
import { formatTanggalID } from '@/lib/guru-bantu/utils'
import {
  PILIHAN_ASESMEN_RAPOR_HQ,
  hitungPemantauanRaporHq,
  type KodeAsesmenRaporHq,
} from '@/lib/kepsek-rapor-hq'
import { muatKirimRaporHq, simpanCatatanRevisiRaporHq, type KirimRaporHq } from '@/lib/rapor-hq-kirim'

function BadgeStatus({ teks }: { teks: string }) {
  const sudah = teks === 'Sudah Menyetorkan'
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${sudah ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'}`}
    >
      {teks}
    </span>
  )
}

function BadgeAbsen({ status }: { status: string }) {
  const teks = String(status || '').trim()
  const lower = teks.toLowerCase()
  let kelas = 'bg-slate-100 text-slate-600'
  if (teks === 'Hadir') kelas = 'bg-emerald-100 text-emerald-800'
  else if (teks === 'Terlambat') kelas = 'bg-amber-100 text-amber-900'
  else if (lower.includes('sakit') || lower.includes('kesehatan')) kelas = 'bg-orange-100 text-orange-900'
  else if (lower.includes('izin') || lower.includes('cuti') || lower.includes('tugas')) kelas = 'bg-sky-100 text-sky-800'
  else if (lower.includes('alpa')) kelas = 'bg-rose-100 text-rose-800'
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${kelas}`}>{teks || '—'}</span>
}

function ThumbnailFoto({ url, label }: { url: string | null; label: string }) {
  if (!url) return <span className="text-xs text-slate-400">—</span>
  return (
    <a href={url} target="_blank" rel="noreferrer" className="inline-flex flex-col items-center gap-1">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt={label} className="size-12 rounded-lg border border-slate-200 object-cover" />
      <span className="text-[10px] font-bold text-emerald-800 underline">{label}</span>
    </a>
  )
}

export function ModalRaporHq({ laporan, onTutup }: { laporan: LaporanKepsek; onTutup: () => void }) {
  const [asesmen, setAsesmen] = useState<KodeAsesmenRaporHq>(laporan.raporHqRingkas.asesmen)
  const baris = useMemo(
    () => hitungPemantauanRaporHq(laporan.raporHqMentah, asesmen),
    [laporan.raporHqMentah, asesmen],
  )
  const { tahunAjaran, semester } = laporan.raporHqMentah
  const [masuk, setMasuk] = useState<KirimRaporHq[]>([])
  const [catatan, setCatatan] = useState<Record<string, string>>({})
  const [menyimpan, setMenyimpan] = useState('')
  const [pesan, setPesan] = useState('')

  const muatMasuk = () => {
    muatKirimRaporHq().then((hasil) => {
      const daftar = hasil.data
        .filter((row) => row.tahunAjaran === tahunAjaran && row.semester === semester && row.asesmen === asesmen)
        .sort((a, b) => a.kelas.localeCompare(b.kelas, 'id', { numeric: true }) || a.namaSiswa.localeCompare(b.namaSiswa, 'id'))
      setMasuk(daftar)
      setCatatan(Object.fromEntries(daftar.map((row) => [`${row.idSiswa}|${row.asesmen}`, row.catatanRevisi])))
      if (hasil.error) setPesan('Daftar rapor masuk belum dapat dimuat.')
    })
  }

  useEffect(() => {
    muatMasuk()
  }, [asesmen, tahunAjaran, semester])

  return (
    <ModalKerangka
      judul="Pemantauan Rapor HQ"
      keterangan={`Unit ${laporan.unit} · ${semester} ${tahunAjaran}. Status menyetorkan nilai ujian tahfidz per kelas binaan.`}
      onTutup={onTutup}
      lebar="max-w-4xl"
    >
      <div className="mb-3 flex flex-wrap gap-2">
        {PILIHAN_ASESMEN_RAPOR_HQ.map((item) => (
          <button
            key={item.kode}
            type="button"
            onClick={() => setAsesmen(item.kode)}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold ${
              asesmen === item.kode ? 'bg-[#143d32] text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
      {baris.length === 0 ? (
        <p className="py-6 text-sm text-slate-500">Belum ada kombinasi guru–kelas binaan di unit ini.</p>
      ) : (
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="text-xs text-slate-500">
              <th className="border-b p-2">Nama guru</th>
              <th className="border-b p-2">Kelas</th>
              <th className="border-b p-2">Status asesmen</th>
            </tr>
          </thead>
          <tbody>
            {baris.map((row, indeks) => (
              <tr key={`${row.namaGuru}-${row.kelas}-${indeks}`}>
                <td className="border-b p-2 font-bold">{row.namaGuru}</td>
                <td className="border-b p-2">{row.kelas}</td>
                <td className="border-b p-2">
                  <BadgeStatus teks={row.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="mt-6 border-t border-slate-200 pt-4">
        <h3 className="text-sm font-extrabold text-slate-800">Rapor masuk dari guru</h3>
        <p className="mt-1 text-xs text-slate-500">
          Rapor yang dikirim guru pengampu pada {semester} {tahunAjaran}. Catatan revisi sampai ke lonceng notifikasi guru tersebut.
        </p>
        {pesan ? <p className="mt-2 text-sm font-semibold text-emerald-700">{pesan}</p> : null}
        {masuk.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">Belum ada rapor yang dikirim untuk asesmen ini.</p>
        ) : (
          <div className="mt-3 space-y-3">
            {masuk.map((row) => {
              const kunci = `${row.idSiswa}|${row.asesmen}`
              return (
                <article key={kunci} className="rounded-xl border border-slate-200 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-bold text-slate-800">
                      {row.namaSiswa} <span className="font-semibold text-slate-500">· {row.kelas || '-'} · {row.namaGuru || 'Guru'}</span>
                    </p>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                        row.status === 'Revisi' ? 'bg-amber-100 text-amber-900' : 'bg-sky-100 text-sky-800'
                      }`}
                    >
                      {row.status === 'Revisi' ? 'Perlu revisi' : 'Terkirim'}
                    </span>
                  </div>
                  <label className="mt-2 block text-xs font-bold text-slate-600">
                    Catatan revisi
                    <textarea
                      value={catatan[kunci] ?? ''}
                      onChange={(event) => setCatatan((semua) => ({ ...semua, [kunci]: event.target.value }))}
                      rows={2}
                      placeholder="Catatan kompetensi perlu perbaikan"
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal"
                    />
                  </label>
                  <button
                    type="button"
                    disabled={menyimpan === kunci}
                    onClick={async () => {
                      setMenyimpan(kunci)
                      setPesan('')
                      const hasil = await simpanCatatanRevisiRaporHq(row, catatan[kunci] || '')
                      setMenyimpan('')
                      if (hasil.error) {
                        setPesan(hasil.error)
                        return
                      }
                      setPesan(catatan[kunci]?.trim() ? 'Catatan revisi terkirim ke guru pengampu.' : 'Catatan revisi dihapus.')
                      muatMasuk()
                    }}
                    className="mt-2 rounded-lg bg-[#143d32] px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
                  >
                    {menyimpan === kunci ? 'Menyimpan…' : 'Simpan catatan'}
                  </button>
                </article>
              )
            })}
          </div>
        )}
      </div>
    </ModalKerangka>
  )
}

export function ModalGuruBantu({
  rekap,
  unit,
  onTutup,
}: {
  rekap: RekapAbsensiGuruBantuKepsek
  unit: string
  onTutup: () => void
}) {
  const hariIni = todayInputValue()
  const [tanggal, setTanggal] = useState(rekap.tanggal || hariIni)
  const [bulan, setBulan] = useState((rekap.tanggal || hariIni).slice(0, 7))
  const [harian, setHarian] = useState(rekap)
  const [bulanan, setBulanan] = useState<RekapBulananGuruBantuKepsek | null>(null)
  const [memuatHarian, setMemuatHarian] = useState(false)
  const [memuatBulanan, setMemuatBulanan] = useState(false)
  const [galatHarian, setGalatHarian] = useState('')
  const [galatBulanan, setGalatBulanan] = useState('')
  const [tab, setTab] = useState<'harian' | 'bulanan'>('harian')

  useEffect(() => {
    let batal = false
    if (tanggal === rekap.tanggal) {
      setHarian(rekap)
      setMemuatHarian(false)
      return
    }
    setMemuatHarian(true)
    muatAbsensiGuruBantuKepsek(tanggal)
      .then((hasil) => {
        if (!batal) {
          setHarian(hasil)
          setGalatHarian('')
        }
      })
      .catch((error: Error) => {
        if (!batal) setGalatHarian(error.message || 'Absensi harian belum dapat dimuat.')
      })
      .finally(() => {
        if (!batal) setMemuatHarian(false)
      })
    return () => {
      batal = true
    }
  }, [tanggal, rekap])

  useEffect(() => {
    if (tab !== 'bulanan') return
    let batal = false
    setMemuatBulanan(true)
    muatRekapBulananGuruBantuKepsek(bulan)
      .then((hasil) => {
        if (!batal) {
          setBulanan(hasil)
          setGalatBulanan('')
        }
      })
      .catch((error: Error) => {
        if (!batal) setGalatBulanan(error.message || 'Rekap bulanan belum dapat dimuat.')
      })
      .finally(() => {
        if (!batal) setMemuatBulanan(false)
      })
    return () => {
      batal = true
    }
  }, [bulan, tab])

  const pilihTanggal = (nilai: string) => {
    setTanggal(nilai)
    const bulanTanggal = nilai.slice(0, 7)
    if (bulanTanggal && bulanTanggal !== bulan) setBulan(bulanTanggal)
  }

  return (
    <ModalKerangka
      judul="Absensi guru bantu"
      keterangan={`Unit ${unit} · ${formatTanggalID(harian.tanggal)}`}
      onTutup={onTutup}
      lebar="max-w-[96rem]"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-lg bg-slate-100 p-1" role="tablist" aria-label="Jenis rekap absensi">
          {(
            [
              ['harian', 'Absensi Harian'],
              ['bulanan', 'Rekap Bulanan'],
            ] as const
          ).map(([kunci, label]) => (
            <button
              key={kunci}
              type="button"
              role="tab"
              aria-selected={tab === kunci}
              onClick={() => setTab(kunci)}
              className={`rounded-md px-3 py-1.5 text-xs font-extrabold uppercase tracking-wide ${
                tab === kunci ? 'bg-white text-[#143d32] shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        {tab === 'harian' ? (
          <label className="text-xs font-bold text-slate-600">
            Tanggal absensi
            <input
              type="date"
              value={tanggal}
              max={hariIni}
              onChange={(e) => pilihTanggal(e.target.value)}
              className="mt-1 block rounded-lg border border-slate-200 px-2 py-1.5 text-sm font-normal"
            />
          </label>
        ) : (
          <label className="text-xs font-bold text-slate-600">
            Bulan rekap
            <input
              type="month"
              value={bulan}
              max={hariIni.slice(0, 7)}
              onChange={(e) => setBulan(e.target.value)}
              className="mt-1 block rounded-lg border border-slate-200 px-2 py-1.5 text-sm font-normal"
            />
          </label>
        )}
      </div>

      {tab === 'harian' && galatHarian ? (
        <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{galatHarian}</p>
      ) : null}
      {tab === 'bulanan' && galatBulanan ? (
        <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{galatBulanan}</p>
      ) : null}

      {tab === 'harian' ? (
      <>
      <p className="mb-3 text-sm text-slate-700">
        {memuatHarian ? (
          'Memuat absensi tanggal terpilih…'
        ) : (
          <>
            {harian.sudahAbsen} dari {harian.total} guru sudah absen:{' '}
            <strong className="text-emerald-800">{harian.hadir} Hadir</strong>,{' '}
            <strong className="text-amber-800">{harian.terlambat} Terlambat</strong>,{' '}
            <strong className="text-sky-800">{harian.izin ?? 0} Izin</strong>,{' '}
            <strong className="text-orange-800">{harian.sakit ?? 0} Sakit</strong>,{' '}
            <strong className="text-rose-800">{harian.alpa ?? 0} Alpa</strong>
          </>
        )}
      </p>
      {harian.baris.length === 0 ? (
        <p className="py-6 text-sm text-slate-500">Belum ada akun guru bantu di unit ini.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-left text-sm">
            <thead>
              <tr className="text-xs text-slate-500">
                <th className="border-b p-2">Nama guru</th>
                <th className="border-b p-2">Jam hadir</th>
                <th className="border-b p-2">Status</th>
                <th className="border-b p-2">Keterlambatan</th>
                <th className="border-b p-2">Jam pulang</th>
                <th className="border-b p-2">Foto</th>
              </tr>
            </thead>
            <tbody>
              {harian.baris.map((row) => (
                <tr key={row.id_induk}>
                  <td className="border-b p-2 font-bold">{row.nama}</td>
                  <td className="border-b p-2 tabular-nums">{row.jam_masuk || '—'}</td>
                  <td className="border-b p-2">
                    <BadgeAbsen status={row.status === 'Belum absen' ? 'Tidak Hadir' : row.status} />
                  </td>
                  <td className="border-b p-2 text-xs font-semibold text-amber-800">
                    {row.catatan_terlambat || '—'}
                  </td>
                  <td className="border-b p-2 tabular-nums">{row.jam_pulang || '—'}</td>
                  <td className="border-b p-2">
                    <div className="flex flex-wrap gap-3">
                      <ThumbnailFoto url={row.foto_masuk} label="Masuk" />
                      <ThumbnailFoto url={row.foto_pulang} label="Pulang" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      </>
      ) : (
      <>
      <p className="mb-3 text-xs text-slate-500">
        Matriks tanggal 1–31. Setiap sel menampilkan jam masuk atau status: Hadir, Terlambat + menit keterlambatan,
        Izin, Sakit, atau Tanpa Keterangan (TK).
      </p>
      <RekapMatriksGuruBantu rekap={bulanan} loading={memuatBulanan || (!bulanan && !galatBulanan)} unit={unit} />
      </>
      )}
    </ModalKerangka>
  )
}
