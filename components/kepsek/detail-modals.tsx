'use client'

import { useMemo, useState } from 'react'
import { ModalKerangka } from '@/components/kepsek/modal-kerangka'
import { FilterGuru, FilterTanggalKelas } from '@/components/kepsek/filter-kepsek'
import type { LaporanKepsek } from '@/lib/kepala-sekolah'
import { buatKonteksSiswa, hitungRingkasJurnal, rekapKehadiranDariJurnal, trenKehadiran7Hari } from '@/lib/kepsek-rekap'
import { normalKelas } from '@/lib/qiroah'

function batang(nilai: number | null, tertinggi: number) {
  if (nilai == null || tertinggi <= 0) return '0%'
  return `${Math.max(4, Math.round((nilai / tertinggi) * 100))}%`
}

function labelAbsen(kode: 'S' | 'I' | 'A') {
  if (kode === 'S') return 'Sakit'
  if (kode === 'I') return 'Izin'
  return 'Alpa'
}

function tanggalBarisSetoran(teks: string, hari: string) {
  const potong = String(teks || '').slice(0, 10)
  if (/^\d{4}-\d{2}-\d{2}$/.test(potong)) return potong === hari
  const waktu = Date.parse(teks)
  if (!Number.isFinite(waktu)) return false
  return new Date(waktu).toISOString().slice(0, 10) === hari
}

export function ModalPresensiLengkap({ laporan, onTutup }: { laporan: LaporanKepsek; onTutup: () => void }) {
  const [tanggal, setTanggal] = useState(laporan.tanggalLaporan)
  const [kelas, setKelas] = useState('')
  const ctx = useMemo(() => buatKonteksSiswa(laporan.siswa), [laporan.siswa])
  const rekap = useMemo(
    () => rekapKehadiranDariJurnal(laporan.jurnalBulan, tanggal, ctx, kelas || undefined),
    [laporan.jurnalBulan, tanggal, ctx, kelas],
  )
  const tren = useMemo(
    () => trenKehadiran7Hari(laporan.jurnalBulan, tanggal, ctx, kelas || undefined),
    [laporan.jurnalBulan, tanggal, ctx, kelas],
  )
  const puncak = Math.max(100, ...tren.map((item) => item.persen || 0))
  const tidak = rekap.sakit + rekap.izin + rekap.alpa

  return (
    <ModalKerangka
      judul="Presensi lengkap"
      keterangan={`Unit ${laporan.unit}. Persentase dihitung dari jurnal kehadiran per kelas.`}
      onTutup={onTutup}
      lebar="max-w-4xl"
    >
      <FilterTanggalKelas tanggal={tanggal} kelas={kelas} daftarKelas={laporan.kelas} onTanggal={setTanggal} onKelas={setKelas} />
      <div className="grid gap-3 sm:grid-cols-3">
        <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-900">
          {rekap.hadir} <span className="font-normal text-emerald-800">hadir</span>
        </p>
        <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm font-bold text-amber-900">
          {tidak} <span className="font-normal">tidak hadir</span>
        </p>
        <p className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600">
          Sakit {rekap.sakit} · Izin {rekap.izin} · Alpa {rekap.alpa}
        </p>
      </div>
      <h3 className="mt-4 text-xs font-extrabold uppercase text-slate-500">Tren kehadiran 7 hari</h3>
      <div className="mt-2 space-y-2">
        {tren.map((item) => (
          <div key={item.label} className="grid grid-cols-[5.5rem_1fr_3rem] items-center gap-2 text-xs">
            <span className="text-slate-500">{item.label}</span>
            <span className="h-2 overflow-hidden rounded-full bg-slate-100">
              <span className="block h-full rounded-full bg-emerald-600" style={{ width: batang(item.persen, puncak) }} />
            </span>
            <span className="text-right font-bold">{item.persen == null ? '—' : `${item.persen}%`}</span>
          </div>
        ))}
      </div>
      <h3 className="mt-4 text-xs font-extrabold uppercase text-slate-500">Siswa tidak hadir</h3>
      {rekap.tidakHadir.length === 0 ? (
        <p className="py-4 text-sm text-slate-500">Tidak ada ketidakhadiran pada tanggal ini.</p>
      ) : (
        <table className="mt-2 w-full border-collapse text-left text-sm">
          <thead>
            <tr className="text-xs text-slate-500">
              <th className="border-b p-2">Nama</th>
              <th className="border-b p-2">Kelas</th>
              <th className="border-b p-2">Keterangan</th>
            </tr>
          </thead>
          <tbody>
            {rekap.tidakHadir.map((row) => (
              <tr key={`${row.kelas}-${row.nama}-${row.keterangan}`}>
                <td className="border-b p-2 font-bold">{row.nama}</td>
                <td className="border-b p-2">{row.kelas}</td>
                <td className="border-b p-2">
                  {row.keterangan} · {labelAbsen(row.keterangan)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </ModalKerangka>
  )
}

export function ModalTidakHadir({
  laporan,
  onTutup,
  baris,
}: {
  laporan: LaporanKepsek
  onTutup: () => void
  baris?: LaporanKepsek['tidakHadir']
}) {
  const daftar = baris ?? laporan.tidakHadir
  return (
    <ModalKerangka judul="Siswa tidak hadir" keterangan={`Unit ${laporan.unit}`} onTutup={onTutup}>
      {daftar.length === 0 ? (
        <p className="py-4 text-sm text-slate-500">Tidak ada siswa yang sakit, izin, atau alpa.</p>
      ) : (
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="text-xs text-slate-500">
              <th className="border-b p-2">Nama</th>
              <th className="border-b p-2">Kelas</th>
              <th className="border-b p-2">Keterangan</th>
            </tr>
          </thead>
          <tbody>
            {daftar.map((row) => (
              <tr key={`${row.kelas}-${row.nama}-${row.keterangan}`}>
                <td className="border-b p-2 font-bold">{row.nama}</td>
                <td className="border-b p-2">{row.kelas}</td>
                <td className="border-b p-2">
                  {row.keterangan} · {labelAbsen(row.keterangan)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </ModalKerangka>
  )
}

export function ModalSetoran({ laporan, onTutup }: { laporan: LaporanKepsek; onTutup: () => void }) {
  const [tanggal, setTanggal] = useState(laporan.tanggalLaporan)
  const [kelas, setKelas] = useState('')
  const [tab, setTab] = useState<'sudah' | 'belum'>('sudah')
  const siswaKelas = useMemo(() => {
    let daftar = laporan.siswa
    if (kelas) daftar = daftar.filter((row) => normalKelas(row.kelas) === kelas)
    return daftar
  }, [laporan.siswa, kelas])

  const { sudah, belum } = useMemo(() => {
    const tahfidz = new Set(
      laporan.setoranBulan.tahfidz.filter((row) => tanggalBarisSetoran(row.tanggal, tanggal)).map((row) => row.id_siswa),
    )
    const qiroah = new Set(
      laporan.setoranBulan.qiroah.filter((row) => tanggalBarisSetoran(row.tanggal, tanggal)).map((row) => row.id_siswa),
    )
    const sudahList: { nama: string; kelas: string; tahfidz: boolean; qiroah: boolean }[] = []
    const belumList: typeof sudahList = []
    for (const row of siswaKelas) {
      const t = tahfidz.has(row.id_siswa)
      const q = qiroah.has(row.id_siswa)
      const item = { nama: row.nama_siswa, kelas: row.kelas, tahfidz: t, qiroah: q }
      if (t || q) sudahList.push(item)
      else belumList.push(item)
    }
    sudahList.sort((a, b) => a.kelas.localeCompare(b.kelas, 'id', { numeric: true }) || a.nama.localeCompare(b.nama, 'id'))
    belumList.sort((a, b) => a.kelas.localeCompare(b.kelas, 'id', { numeric: true }) || a.nama.localeCompare(b.nama, 'id'))
    return { sudah: sudahList, belum: belumList }
  }, [laporan.setoranBulan, siswaKelas, tanggal])

  const tampil = tab === 'sudah' ? sudah : belum

  return (
    <ModalKerangka judul="Rincian setoran" keterangan={`Unit ${laporan.unit}`} onTutup={onTutup} lebar="max-w-4xl">
      <FilterTanggalKelas tanggal={tanggal} kelas={kelas} daftarKelas={laporan.kelas} onTanggal={setTanggal} onKelas={setKelas} />
      <div className="mb-3 flex gap-2">
        <button
          type="button"
          onClick={() => setTab('sudah')}
          className={`rounded-lg px-3 py-1.5 text-xs font-bold ${tab === 'sudah' ? 'bg-sky-800 text-white' : 'bg-slate-100 text-slate-700'}`}
        >
          Sudah setor ({sudah.length})
        </button>
        <button
          type="button"
          onClick={() => setTab('belum')}
          className={`rounded-lg px-3 py-1.5 text-xs font-bold ${tab === 'belum' ? 'bg-amber-700 text-white' : 'bg-slate-100 text-slate-700'}`}
        >
          Belum setor ({belum.length})
        </button>
      </div>
      <p className="mb-2 text-xs text-slate-500">
        Tahfidz hari ini: {laporan.setoranBulan.tahfidz.filter((r) => tanggalBarisSetoran(r.tanggal, tanggal)).length} · Qiroah:{' '}
        {laporan.setoranBulan.qiroah.filter((r) => tanggalBarisSetoran(r.tanggal, tanggal)).length}
      </p>
      {tampil.length === 0 ? (
        <p className="py-4 text-sm text-slate-500">{tab === 'sudah' ? 'Belum ada setoran tercatat.' : 'Semua siswa sudah setor.'}</p>
      ) : (
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="text-xs text-slate-500">
              <th className="border-b p-2">Nama</th>
              <th className="border-b p-2">Kelas</th>
              <th className="border-b p-2">Tahfidz</th>
              <th className="border-b p-2">Qiroah</th>
            </tr>
          </thead>
          <tbody>
            {tampil.map((row) => (
              <tr key={`${row.kelas}-${row.nama}`}>
                <td className="border-b p-2 font-bold">{row.nama}</td>
                <td className="border-b p-2">{row.kelas}</td>
                <td className="border-b p-2">{row.tahfidz ? '✓' : '—'}</td>
                <td className="border-b p-2">{row.qiroah ? '✓' : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </ModalKerangka>
  )
}

export function ModalTertib({ laporan, onTutup }: { laporan: LaporanKepsek; onTutup: () => void }) {
  const [tanggal, setTanggal] = useState(laporan.tanggalLaporan)
  const [kelas, setKelas] = useState('')
  const baris = useMemo(() => {
    return laporan.tertibBulan.filter((row) => {
      if (row.waktu !== tanggal) return false
      if (kelas && normalKelas(row.kelas) !== kelas) return false
      return true
    })
  }, [laporan.tertibBulan, tanggal, kelas])

  return (
    <ModalKerangka judul="Riwayat tertib poin" keterangan={`Unit ${laporan.unit}. Poin kebaikan (+) dan pelanggaran (−).`} onTutup={onTutup} lebar="max-w-4xl">
      <FilterTanggalKelas tanggal={tanggal} kelas={kelas} daftarKelas={laporan.kelas} onTanggal={setTanggal} onKelas={setKelas} />
      {baris.length === 0 ? (
        <p className="py-4 text-sm text-slate-500">Tidak ada catatan tertib pada filter ini.</p>
      ) : (
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="text-xs text-slate-500">
              <th className="border-b p-2">Siswa</th>
              <th className="border-b p-2">Kelas</th>
              <th className="border-b p-2">Label</th>
              <th className="border-b p-2">Poin</th>
              <th className="border-b p-2">Guru</th>
            </tr>
          </thead>
          <tbody>
            {baris.map((row, index) => (
              <tr key={`${row.id_siswa}-${row.waktu}-${index}`}>
                <td className="border-b p-2 font-bold">{row.nama}</td>
                <td className="border-b p-2">{row.kelas}</td>
                <td className="border-b p-2">{row.label}</td>
                <td className={`border-b p-2 font-bold ${row.pts >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                  {row.pts > 0 ? `+${row.pts}` : row.pts}
                </td>
                <td className="border-b p-2 text-xs">{row.guru}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </ModalKerangka>
  )
}

export function ModalJurnal({ laporan, onTutup }: { laporan: LaporanKepsek; onTutup: () => void }) {
  const [tanggal, setTanggal] = useState(laporan.tanggalLaporan)
  const [kelas, setKelas] = useState('')
  const [guru, setGuru] = useState('')
  const daftarGuru = useMemo(() => {
    const nama = new Set<string>()
    for (const row of laporan.jurnalBulan) {
      const g = String(row.guru || '').trim()
      if (g) nama.add(g)
    }
    return [...nama].sort((a, b) => a.localeCompare(b, 'id'))
  }, [laporan.jurnalBulan])

  const ringkas = useMemo(() => hitungRingkasJurnal(laporan.jurnalBulan, tanggal, laporan.kelas.length), [laporan, tanggal])

  const baris = useMemo(() => {
    return laporan.jurnalBulan
      .filter((row) => String(row.tanggal || '').slice(0, 10) === tanggal)
      .filter((row) => !kelas || normalKelas(row.kelas) === kelas)
      .filter((row) => !guru || String(row.guru || '').trim() === guru)
      .map((row) => ({
        kelas: normalKelas(row.kelas),
        jam: Number(row.jam) || 0,
        mapel: String(row.mapel || '').trim() || 'Belum diisi',
        materi: String(row.materi || '').trim() || 'Belum diisi',
        kegiatan: String(row.kegiatan || '').trim() || 'Belum diisi',
        guru: String(row.guru || '').trim() || '—',
      }))
      .sort((a, b) => a.kelas.localeCompare(b.kelas, 'id', { numeric: true }) || a.jam - b.jam)
  }, [laporan.jurnalBulan, tanggal, kelas, guru])

  return (
    <ModalKerangka judul="Jurnal pembelajaran lengkap" keterangan={`Unit ${laporan.unit}`} onTutup={onTutup} lebar="max-w-5xl">
      <div className="mb-3 flex flex-wrap items-end gap-3">
        <FilterTanggalKelas tanggal={tanggal} kelas={kelas} daftarKelas={laporan.kelas} onTanggal={setTanggal} onKelas={setKelas} />
        <FilterGuru guru={guru} daftarGuru={daftarGuru} onGuru={setGuru} />
      </div>
      <p className="mb-3 text-sm text-slate-700">
        {tanggal} · <strong>{ringkas.terisi}</strong> sesi terisi · <strong>{ringkas.belum}</strong> sesi belum · target{' '}
        {ringkas.expected}
      </p>
      {guru && (
        <p className="mb-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
          Menampilkan semua isian jurnal yang diinput oleh <strong>{guru}</strong>.
        </p>
      )}
      {baris.length === 0 ? (
        <p className="py-4 text-sm text-slate-500">Belum ada jurnal untuk filter ini.</p>
      ) : (
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="text-xs text-slate-500">
              <th className="border-b p-2">Kelas</th>
              <th className="border-b p-2">Jam</th>
              <th className="border-b p-2">Mapel</th>
              <th className="border-b p-2">Guru</th>
              <th className="border-b p-2">Materi / kegiatan</th>
            </tr>
          </thead>
          <tbody>
            {baris.map((row, index) => (
              <tr key={`${row.kelas}-${row.jam}-${index}`}>
                <td className="border-b p-2 font-bold">{row.kelas}</td>
                <td className="border-b p-2">{row.jam || '—'}</td>
                <td className="border-b p-2">{row.mapel}</td>
                <td className="border-b p-2">
                  <button
                    type="button"
                    className="text-left text-xs font-bold text-emerald-800 underline decoration-emerald-300 underline-offset-2"
                    onClick={() => setGuru(row.guru === '—' ? '' : row.guru)}
                  >
                    {row.guru}
                  </button>
                </td>
                <td className="border-b p-2 text-xs">
                  <span className="font-semibold text-slate-600">Materi:</span> {row.materi}
                  <br />
                  <span className="font-semibold text-slate-600">Kegiatan:</span> {row.kegiatan}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </ModalKerangka>
  )
}
