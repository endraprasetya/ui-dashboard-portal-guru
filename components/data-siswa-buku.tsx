'use client'

import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Search, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { adalahKepalaSekolah } from '@/lib/kepala-sekolah'

const KELAS = ['1A', '1B', '1C', '1D', '2A', '2B', '2C', '2D', '3A', '3B', '3C', '3D', '4A', '4B', '4C', '4D', '5A', '5B', '5C', '5D', '6A', '6B', '6C', '6D']
const UKURAN = 20

const LABEL_DIRI: { kelompok: string; kolom: [string, string][] }[] = [
  {
    kelompok: 'Identitas siswa',
    kolom: [
      ['nama_lengkap', 'Nama lengkap'],
      ['kelas', 'Kelas'],
      ['nomor_induk_sekolah', 'Nomor induk'],
      ['nisn', 'NISN'],
      ['nik', 'NIK'],
      ['jenis_kelamin', 'Jenis kelamin'],
      ['tempat_tanggal_lahir', 'Tempat, tanggal lahir'],
      ['agama', 'Agama'],
      ['anak_ke', 'Anak ke-'],
      ['telepon', 'Telepon'],
      ['pendidikan_sebelumnya', 'Pendidikan sebelumnya'],
      ['diterima_di_sekolah_ini_di_kelas', 'Diterima di kelas'],
      ['diterima_di_sekolah_ini_pada_tanggal', 'Tanggal diterima'],
    ],
  },
  {
    kelompok: 'Orang tua',
    kolom: [
      ['nama_ayah', 'Nama ayah'],
      ['pekerjaan_ayah', 'Pekerjaan ayah'],
      ['nama_ibu', 'Nama ibu'],
      ['nik_ibu', 'NIK ibu'],
      ['pekerjaan_ibu', 'Pekerjaan ibu'],
    ],
  },
  {
    kelompok: 'Alamat',
    kolom: [
      ['jalan', 'Jalan'],
      ['desa_kelurahan', 'Desa / kelurahan'],
      ['kecamatan', 'Kecamatan'],
      ['kabupaten', 'Kabupaten'],
      ['propinsi', 'Provinsi'],
    ],
  },
  {
    kelompok: 'Wali',
    kolom: [
      ['nama_wali', 'Nama wali'],
      ['alamat_wali', 'Alamat wali'],
      ['pekerjaan_wali', 'Pekerjaan wali'],
    ],
  },
]

type BarisSiswa = Record<string, string>

function teks(nilai: unknown) {
  return String(nilai ?? '').trim()
}

export function DataSiswaBuku() {
  const [siap, setSiap] = useState(false)
  const [kembali, setKembali] = useState('/')
  const [baris, setBaris] = useState<BarisSiswa[]>([])
  const [galat, setGalat] = useState('')
  const [memuat, setMemuat] = useState(true)
  const [cari, setCari] = useState('')
  const [kelas, setKelas] = useState('')
  const [halaman, setHalaman] = useState(1)
  const [detail, setDetail] = useState<BarisSiswa | null>(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem('user_session')
      const user = raw ? JSON.parse(raw) : null
      if (!user) {
        window.location.replace('/')
        return
      }
      setKembali(adalahKepalaSekolah(user) ? '/dashboard/kepala-sekolah' : '/')
      setSiap(true)
    } catch {
      window.location.replace('/')
    }
  }, [])

  useEffect(() => {
    if (!detail) return
    const tutup = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setDetail(null)
    }
    window.addEventListener('keydown', tutup)
    return () => window.removeEventListener('keydown', tutup)
  }, [detail])

  useEffect(() => {
    if (!siap) return
    let batal = false
    supabase
      .from('data_diri_siswa')
      .select('*')
      .limit(1000)
      .then(({ data, error }) => {
        if (batal) return
        if (error) {
          setGalat('Data siswa belum dapat dimuat.')
          setMemuat(false)
          return
        }
        const daftar = ((data || []) as Record<string, unknown>[]).map((row) => {
          const bersih: BarisSiswa = {}
          for (const [kunci, nilai] of Object.entries(row)) bersih[kunci] = teks(nilai)
          if (!bersih.nama_lengkap) bersih.nama_lengkap = 'Siswa'
          return bersih
        })
        daftar.sort((a, b) => a.kelas.localeCompare(b.kelas, 'id', { numeric: true }) || a.nama_lengkap.localeCompare(b.nama_lengkap, 'id'))
        setBaris(daftar)
        setMemuat(false)
      })
    return () => {
      batal = true
    }
  }, [siap])

  const hasil = useMemo(() => {
    const kata = cari.trim().toLowerCase()
    return baris.filter((row) => {
      if (kelas && row.kelas.toUpperCase() !== kelas) return false
      if (!kata) return true
      return [row.nama_lengkap, row.nomor_induk_sekolah, row.nisn].some((nilai) => nilai.toLowerCase().includes(kata))
    })
  }, [baris, cari, kelas])

  const jumlahHalaman = Math.max(1, Math.ceil(hasil.length / UKURAN))
  const halamanAman = Math.min(halaman, jumlahHalaman)
  const awal = (halamanAman - 1) * UKURAN
  const tampil = hasil.slice(awal, awal + UKURAN)

  if (!siap) {
    return <main className="grid min-h-screen place-items-center text-sm text-slate-500">Memeriksa sesi...</main>
  }

  return (
    <div className="min-h-screen bg-[#f4f7f5] text-slate-800">
      <header className="border-b border-emerald-900/10 bg-[#143d32] text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-100">Buku Induk</p>
            <h1 className="text-lg font-black">Data Siswa</h1>
          </div>
          <a href={kembali} className="inline-flex items-center gap-1 rounded-xl bg-white/10 px-3 py-2 text-xs font-bold">
            <ArrowLeft className="size-3.5" /> Kembali ke dashboard
          </a>
        </div>
      </header>
      <main className="mx-auto max-w-7xl space-y-4 px-4 py-6">
        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-end">
          <label className="min-w-0 flex-1 text-xs font-bold text-slate-600">
            Cari siswa
            <span className="relative mt-1 block">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                value={cari}
                onChange={(event) => {
                  setCari(event.target.value)
                  setHalaman(1)
                }}
                placeholder="Nama, nomor induk, atau NISN"
                className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-sm font-medium outline-none focus:border-emerald-600"
              />
            </span>
          </label>
          <label className="text-xs font-bold text-slate-600">
            Kelas
            <select
              value={kelas}
              onChange={(event) => {
                setKelas(event.target.value)
                setHalaman(1)
              }}
              className="mt-1 block w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium sm:w-40"
            >
              <option value="">Semua kelas</option>
              {KELAS.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </label>
        </div>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 text-xs text-slate-500">
            <p>{memuat ? 'Memuat buku induk...' : `${hasil.length} siswa`}</p>
            <p>Halaman {halamanAman} dari {jumlahHalaman}</p>
          </div>
          {galat ? (
            <p className="px-4 py-8 text-center text-sm text-red-700">{galat}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] border-collapse text-left text-sm">
                <thead className="bg-slate-50 text-xs text-slate-500">
                  <tr>
                    <th className="px-3 py-2 font-bold">No</th>
                    <th className="px-3 py-2 font-bold">Nama Lengkap</th>
                    <th className="px-3 py-2 font-bold">Kelas</th>
                    <th className="px-3 py-2 font-bold">Nomor Induk</th>
                    <th className="px-3 py-2 font-bold">NISN</th>
                    <th className="px-3 py-2 font-bold">NIK</th>
                    <th className="px-3 py-2 font-bold">Jenis Kelamin</th>
                    <th className="px-3 py-2 font-bold">TTL</th>
                    <th className="px-3 py-2 font-bold">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {!memuat && tampil.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-3 py-8 text-center text-slate-400">Tidak ada siswa yang cocok dengan pencarian.</td>
                    </tr>
                  ) : tampil.map((row, index) => (
                    <tr key={`${row.nomor_induk_sekolah}-${row.nama_lengkap}-${row.kelas}`} className="border-t border-slate-100">
                      <td className="px-3 py-2 text-slate-400">{awal + index + 1}</td>
                      <td className="px-3 py-2 font-bold text-slate-900">{row.nama_lengkap}</td>
                      <td className="px-3 py-2">{row.kelas || '-'}</td>
                      <td className="px-3 py-2">{row.nomor_induk_sekolah || '-'}</td>
                      <td className="px-3 py-2">{row.nisn || '-'}</td>
                      <td className="px-3 py-2">{row.nik || '-'}</td>
                      <td className="px-3 py-2">{row.jenis_kelamin || '-'}</td>
                      <td className="px-3 py-2">{row.tempat_tanggal_lahir || '-'}</td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          onClick={() => setDetail(row)}
                          className="rounded-lg bg-[#143d32] px-2.5 py-1.5 text-xs font-bold text-white hover:bg-[#0f2e26]"
                        >
                          Lihat Selengkapnya
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
            <button
              type="button"
              disabled={halamanAman <= 1}
              onClick={() => setHalaman((nilai) => Math.max(1, nilai - 1))}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold disabled:opacity-40"
            >
              Sebelumnya
            </button>
            <button
              type="button"
              disabled={halamanAman >= jumlahHalaman}
              onClick={() => setHalaman((nilai) => nilai + 1)}
              className="rounded-lg bg-[#143d32] px-3 py-1.5 text-xs font-bold text-white disabled:opacity-40"
            >
              Berikutnya
            </button>
          </div>
        </section>
      </main>
      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setDetail(null)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="judul-detail-siswa"
            className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setDetail(null)}
              aria-label="Tutup"
              className="absolute top-4 right-4 rounded-lg p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            >
              <X className="size-5" />
            </button>
            <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-700">Buku induk</p>
            <h2 id="judul-detail-siswa" className="mt-1 pr-8 text-xl font-black text-slate-900">{detail.nama_lengkap}</h2>
            <p className="mt-1 text-sm text-slate-500">{detail.kelas ? `Kelas ${detail.kelas}` : 'Kelas belum diisi'}</p>
            <div className="mt-5 space-y-5">
              {LABEL_DIRI.map((bagian) => (
                <section key={bagian.kelompok}>
                  <h3 className="mb-2 text-sm font-extrabold text-slate-800">{bagian.kelompok}</h3>
                  <dl className="grid gap-3 sm:grid-cols-2">
                    {bagian.kolom.map(([kunci, label]) => (
                      <div key={kunci} className="rounded-xl bg-slate-50 px-3 py-2">
                        <dt className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{label}</dt>
                        <dd className="mt-1 text-sm font-semibold text-slate-800">{detail[kunci] || '-'}</dd>
                      </div>
                    ))}
                  </dl>
                </section>
              ))}
              {Object.keys(detail)
                .filter((kunci) => !LABEL_DIRI.some((bagian) => bagian.kolom.some(([nama]) => nama === kunci)))
                .map((kunci) => (
                  <div key={kunci} className="rounded-xl bg-slate-50 px-3 py-2">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{kunci.replace(/_/g, ' ')}</p>
                    <p className="mt-1 text-sm font-semibold text-slate-800">{detail[kunci] || '-'}</p>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
