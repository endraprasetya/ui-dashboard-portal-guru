'use client'

import { useEffect, useMemo, useState } from 'react'
import { BookCheck, CalendarCheck2, ClipboardCheck, FileText, LogOut, Printer, ShieldAlert, X } from 'lucide-react'
import { AbsensiMatriks } from '@/components/absensi-matriks'
import { CetakUjianQiroah, type HasilUjianCetak } from '@/components/cetak-ujian-qiroah'
import {
  KEPALA_SEKOLAH,
  UNIT_KEPALA_SEKOLAH,
  adalahKepalaSekolah,
  muatLaporanKepsek,
  type LaporanKepsek,
  type RekapLulus,
} from '@/lib/kepala-sekolah'
import { normalKelas } from '@/lib/qiroah'
import { todayInputValue } from '@/lib/jurnal'

type Panel = 'absensi' | 'qiroah' | 'skl' | null

function batang(nilai: number | null, tertinggi: number) {
  if (nilai == null || tertinggi <= 0) return '0%'
  return `${Math.max(4, Math.round((nilai / tertinggi) * 100))}%`
}

function labelAbsen(kode: 'S' | 'I' | 'A') {
  if (kode === 'S') return 'Sakit'
  if (kode === 'I') return 'Izin'
  return 'Alpa'
}

function StatusGuru({ nilai }: { nilai: string }) {
  const warna =
    nilai === 'Sudah' ? 'bg-emerald-100 text-emerald-800' : nilai === 'Belum' ? 'bg-amber-100 text-amber-900' : 'bg-slate-100 text-slate-500'
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${warna}`}>{nilai}</span>
}

function keHasil(row: RekapLulus): HasilUjianCetak {
  const jilid = `${row.jilid_asal} ${row.jilid_tujuan}`.toLowerCase()
  const tanpaTajwid = jilid.includes('jilid 1') || jilid.includes('jilid 2')
  return {
    nomor: row.id_ujian,
    nama: row.nama,
    kelas: row.kelas,
    unit: row.unit,
    tanggal: row.tanggal_ujian,
    penguji: row.penguji,
    guruPengampu: row.guru_pengampu,
    jilidAsal: row.jilid_asal,
    jilidTujuan: row.jilid_tujuan,
    kelancaran: row.kelancaran,
    makhraj: row.makhraj,
    harakat: row.harakat,
    tajwid: tanpaTajwid ? null : row.tajwid,
    adab: row.adab,
    nilaiAkhir: row.nilai_akhir,
    predikat: row.predikat,
    keputusan: row.keputusan,
    catatan: row.kelebihan_siswa && row.kelebihan_siswa !== '-' ? row.kelebihan_siswa : '',
  }
}

export function DashboardKepalaSekolah() {
  const [siap, setSiap] = useState<'memuat' | 'siap' | 'tolak'>('memuat')
  const [laporan, setLaporan] = useState<LaporanKepsek | null>(null)
  const [galat, setGalat] = useState('')
  const [panel, setPanel] = useState<Panel>(null)
  const [kelasCetak, setKelasCetak] = useState('')
  const [bulanCetak, setBulanCetak] = useState(todayInputValue().slice(0, 7))
  const [skl, setSkl] = useState<HasilUjianCetak | null>(null)
  const [rincianAbsen, setRincianAbsen] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem('user_session')
      const user = raw ? JSON.parse(raw) : null
      if (!adalahKepalaSekolah(user)) {
        setSiap('tolak')
        return
      }
      setSiap('siap')
    } catch {
      setSiap('tolak')
    }
  }, [])

  useEffect(() => {
    if (siap === 'tolak') window.location.replace('/')
  }, [siap])

  useEffect(() => {
    if (siap !== 'siap') return
    let batal = false
    muatLaporanKepsek()
      .then((hasil) => {
        if (batal) return
        setLaporan(hasil)
        setKelasCetak((current) => current || hasil.kelas[0] || '')
      })
      .catch((error: Error) => {
        if (!batal) setGalat(error.message || 'Laporan belum dapat dimuat.')
      })
    return () => {
      batal = true
    }
  }, [siap])

  const siswaKelas = useMemo(() => {
    if (!laporan || !kelasCetak) return []
    return laporan.siswa.filter((row) => normalKelas(row.kelas) === kelasCetak)
  }, [laporan, kelasCetak])

  const jurnalKelas = useMemo(() => {
    if (!laporan || !kelasCetak) return []
    return laporan.jurnalBulan.filter((row) => {
      const tanggal = String(row.tanggal || '').slice(0, 10)
      return normalKelas(row.kelas) === kelasCetak && tanggal.startsWith(bulanCetak)
    })
  }, [laporan, kelasCetak, bulanCetak])

  const keluar = () => {
    localStorage.removeItem('user_session')
    window.location.assign('/')
  }

  if (siap !== 'siap') {
    return <main className="grid min-h-screen place-items-center text-sm text-slate-500">Memeriksa sesi Kepala Sekolah...</main>
  }

  const angka = laporan?.kehadiran
  const puncakMinggu = Math.max(100, ...(laporan?.trenMingguan.map((item) => item.persen || 0) || [0]))
  const puncakPredikat = Math.max(1, ...(laporan?.predikat.map((item) => item.jumlah) || [0]))

  return (
    <div className="min-h-screen bg-[#f4f7f5] text-slate-800">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: #fff !important; }
        }
      `}</style>
      <header className="no-print border-b border-emerald-900/10 bg-[#143d32] text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-100">Executive Dashboard</p>
            <h1 className="text-lg font-black">Dashboard Kepala Sekolah</h1>
            <p className="text-xs text-emerald-50/80">{KEPALA_SEKOLAH.nama} · NIY {KEPALA_SEKOLAH.niy} · Unit {UNIT_KEPALA_SEKOLAH}</p>
          </div>
          <div className="flex items-center gap-2">
            <a href="/data-siswa" className="inline-flex items-center gap-1 rounded-xl bg-white/10 px-3 py-2 text-xs font-bold">
              Data Siswa
            </a>
            <button type="button" onClick={keluar} className="inline-flex items-center gap-1 rounded-xl bg-white/10 px-3 py-2 text-xs font-bold">
              <LogOut className="size-3.5" /> Keluar
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6">
        {galat && <p className="no-print rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{galat}</p>}
        {!laporan && !galat && <p className="no-print text-sm text-slate-500">Menyusun laporan dari data sekolah...</p>}
        {laporan && (
          <>
            <section className="no-print grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center gap-2 text-emerald-800"><CalendarCheck2 className="size-4" /><p className="text-xs font-extrabold uppercase">Kehadiran hari ini</p></div>
                <p className="mt-3 text-2xl font-black text-slate-900">{angka?.hadir ?? 0} <span className="text-sm font-bold text-slate-500">hadir</span></p>
                <p className="mt-1 text-xs text-slate-500">Sakit {angka?.sakit ?? 0} · Izin {angka?.izin ?? 0} · Alpa {angka?.alpa ?? 0}</p>
                <button type="button" onClick={() => setRincianAbsen(true)} className="mt-2 text-left text-xs font-bold text-emerald-800 underline decoration-emerald-300 underline-offset-2">
                  {(angka?.sakit || 0) + (angka?.izin || 0) + (angka?.alpa || 0) > 0
                    ? `Lihat ${(angka?.sakit || 0) + (angka?.izin || 0) + (angka?.alpa || 0)} siswa tidak hadir`
                    : 'Lihat rincian ketidakhadiran'}
                </button>
                <p className="mt-1 text-[11px] text-slate-400">{angka?.kelas ?? 0} kelas Unit {UNIT_KEPALA_SEKOLAH} sudah memiliki jurnal hari ini.</p>
              </article>
              <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center gap-2 text-sky-800"><BookCheck className="size-4" /><p className="text-xs font-extrabold uppercase">Setoran hari ini</p></div>
                <p className="mt-3 text-sm font-bold text-slate-700">Tahfidz <span className="text-2xl font-black text-slate-900">{laporan.setoranTahfidz}</span></p>
                <p className="text-sm font-bold text-slate-700">Qiroah <span className="text-2xl font-black text-slate-900">{laporan.setoranQiroah}</span></p>
              </article>
              <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center gap-2 text-amber-800"><ClipboardCheck className="size-4" /><p className="text-xs font-extrabold uppercase">Ujian jilid aktif</p></div>
                <p className="mt-3 text-2xl font-black text-slate-900">{laporan.ujianAktif}</p>
                <p className="mt-1 text-xs text-slate-500">Pengajuan yang menunggu jadwal atau sudah terjadwal.</p>
              </article>
              <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center gap-2 text-red-700"><ShieldAlert className="size-4" /><p className="text-xs font-extrabold uppercase">Tertib point hari ini</p></div>
                <p className="mt-3 text-2xl font-black text-slate-900">{laporan.tertibHariIni}</p>
                <p className="mt-1 text-xs text-slate-500">Catatan poin yang masuk sejak pagi ini.</p>
              </article>
            </section>

            <section className="no-print rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="text-sm font-extrabold text-slate-900">Pantauan jurnal hari ini</h2>
              <p className="mt-1 text-xs text-slate-500">Unit {UNIT_KEPALA_SEKOLAH}. Buka baris kelas untuk melihat jam, mata pelajaran, materi pokok, dan kegiatan pembelajaran. Yang tampil adalah jurnal kelas yang siswanya berada di unit ini.</p>
              <div className="mt-3 divide-y divide-slate-100">
                {laporan.jurnalHariIni.length === 0 ? (
                  <p className="py-3 text-sm text-slate-400">Belum ada jurnal Unit {UNIT_KEPALA_SEKOLAH} hari ini.</p>
                ) : laporan.jurnalHariIni.map((row, index) => (
                  <details key={`${row.kunci}-${index}`} className="group py-2">
                    <summary className="cursor-pointer list-none text-sm font-bold text-slate-800 marker:content-none [&::-webkit-details-marker]:hidden">
                      <span className="mr-2 text-emerald-700 group-open:hidden">+</span>
                      <span className="mr-2 hidden text-emerald-700 group-open:inline">−</span>
                      Kelas {row.kelas} · Jam ke-{row.jam || '-'} · {row.mapel}
                    </summary>
                    <div className="mt-2 space-y-2 rounded-xl bg-slate-50 p-3 text-sm">
                      <p><span className="font-bold text-slate-600">Mata pelajaran. </span>{row.mapel}</p>
                      <p className="whitespace-pre-wrap"><span className="font-bold text-slate-600">Materi pokok. </span>{row.materi || 'Belum diisi'}</p>
                      <p className="whitespace-pre-wrap"><span className="font-bold text-slate-600">Kegiatan pembelajaran. </span>{row.kegiatan || 'Belum diisi'}</p>
                    </div>
                  </details>
                ))}
              </div>
            </section>

            {laporan.catatan.length > 0 && (
              <ul className="no-print space-y-1 text-xs text-amber-800">
                {laporan.catatan.map((item) => <li key={item}>{item}</li>)}
              </ul>
            )}

            <section className="no-print grid gap-4 lg:grid-cols-2">
              <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <h2 className="text-sm font-extrabold text-slate-900">Tren kehadiran 7 hari</h2>
                <div className="mt-4 space-y-2">
                  {laporan.trenMingguan.map((item) => (
                    <div key={item.label} className="grid grid-cols-[5.5rem_1fr_3rem] items-center gap-2 text-xs">
                      <span className="text-slate-500">{item.label}</span>
                      <span className="h-2 overflow-hidden rounded-full bg-slate-100">
                        <span className="block h-full rounded-full bg-emerald-600" style={{ width: batang(item.persen, puncakMinggu) }} />
                      </span>
                      <span className="text-right font-bold">{item.persen == null ? '—' : `${item.persen}%`}</span>
                    </div>
                  ))}
                </div>
                <h3 className="mt-5 text-xs font-extrabold uppercase text-slate-500">Bulan berjalan</h3>
                <div className="mt-2 space-y-2">
                  {laporan.trenBulanan.map((item) => (
                    <div key={item.label} className="grid grid-cols-[5.5rem_1fr_3rem] items-center gap-2 text-xs">
                      <span className="text-slate-500">{item.label}</span>
                      <span className="h-2 overflow-hidden rounded-full bg-slate-100">
                        <span className="block h-full rounded-full bg-sky-700" style={{ width: batang(item.persen, 100) }} />
                      </span>
                      <span className="text-right font-bold">{item.persen == null ? '—' : `${item.persen}%`}</span>
                    </div>
                  ))}
                </div>
              </article>
              <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <h2 className="text-sm font-extrabold text-slate-900">Distribusi predikat qiroah</h2>
                <div className="mt-4 space-y-3">
                  {laporan.predikat.map((item) => (
                    <div key={item.nama}>
                      <div className="mb-1 flex justify-between text-xs font-bold">
                        <span>{item.nama}</span>
                        <span>{item.jumlah}</span>
                      </div>
                      <span className="block h-3 overflow-hidden rounded-full bg-slate-100">
                        <span className="block h-full rounded-full bg-[#1b4332]" style={{ width: batang(item.jumlah, puncakPredikat) }} />
                      </span>
                    </div>
                  ))}
                </div>
              </article>
            </section>

            <section className="no-print rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="text-sm font-extrabold text-slate-900">Monitoring kepatuhan guru</h2>
              <p className="mt-1 text-xs text-slate-500">Hanya guru Unit {UNIT_KEPALA_SEKOLAH}. Jurnal mengikuti kelas binaan di unit ini. Setoran qiroah mengikuti nama guru yang mencatat hari ini.</p>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[720px] border-collapse text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600">
                      <th className="border-b p-2">Guru</th>
                      <th className="border-b p-2">Unit</th>
                      <th className="border-b p-2">Jurnal hari ini</th>
                      <th className="border-b p-2">Setoran qiroah</th>
                      <th className="border-b p-2">Setoran tahfidz</th>
                    </tr>
                  </thead>
                  <tbody>
                    {laporan.guru.length === 0 ? (
                      <tr><td colSpan={5} className="p-4 text-center text-slate-400">Daftar guru belum tersedia.</td></tr>
                    ) : laporan.guru.map((row) => (
                      <tr key={`${row.nama}-${row.unit}`}>
                        <td className="border-b p-2 font-bold">{row.nama}</td>
                        <td className="border-b p-2">{row.unit}</td>
                        <td className="border-b p-2"><StatusGuru nilai={row.jurnal} /></td>
                        <td className="border-b p-2"><StatusGuru nilai={row.qiroah} /></td>
                        <td className="border-b p-2"><StatusGuru nilai={row.tahfidz} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="no-print rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="text-sm font-extrabold text-slate-900">Ujian kenaikan jilid · Unit {UNIT_KEPALA_SEKOLAH}</h2>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[860px] border-collapse text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600">
                      <th className="border-b p-2">Siswa</th>
                      <th className="border-b p-2">Kelas</th>
                      <th className="border-b p-2">Jilid</th>
                      <th className="border-b p-2">Pengampu</th>
                      <th className="border-b p-2">Penguji</th>
                      <th className="border-b p-2">Status</th>
                      <th className="border-b p-2">Jadwal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {laporan.ujian.length === 0 ? (
                      <tr><td colSpan={7} className="p-4 text-center text-slate-400">Tidak ada pengajuan yang sedang berjalan.</td></tr>
                    ) : laporan.ujian.map((row) => (
                      <tr key={row.id}>
                        <td className="border-b p-2 font-bold">{row.nama}</td>
                        <td className="border-b p-2">{row.kelas} · {row.unit}</td>
                        <td className="border-b p-2">{row.jilid}</td>
                        <td className="border-b p-2">{row.pengampu}</td>
                        <td className="border-b p-2">{row.penguji}</td>
                        <td className="border-b p-2">{row.status}</td>
                        <td className="border-b p-2">{row.tanggal || '-'}{row.waktu ? ` · ${row.waktu}` : ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="no-print rounded-2xl border border-emerald-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2 text-emerald-900"><FileText className="size-4" /><h2 className="text-sm font-extrabold">Cetak laporan resmi</h2></div>
              <p className="mt-1 text-xs text-slate-500">Tanda tangan Kepala Sekolah otomatis memakai {KEPALA_SEKOLAH.nama}, NIY {KEPALA_SEKOLAH.niy}.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" onClick={() => setPanel('absensi')} className="rounded-xl bg-[#143d32] px-3 py-2 text-xs font-bold text-white">Rekap Absensi Bulanan (F4)</button>
                <button type="button" onClick={() => setPanel('qiroah')} className="rounded-xl bg-sky-800 px-3 py-2 text-xs font-bold text-white">Laporan Rekap Qiroah</button>
                <button type="button" onClick={() => setPanel('skl')} className="rounded-xl bg-amber-600 px-3 py-2 text-xs font-bold text-white">Pengesahan SKL</button>
              </div>
            </section>

            {panel === 'absensi' && (
              <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="no-print mb-3 flex flex-wrap items-end gap-2">
                  <label className="text-xs font-bold">Kelas
                    <select value={kelasCetak} onChange={(event) => setKelasCetak(event.target.value)} className="mt-1 block rounded-lg border px-2 py-1.5">
                      {laporan.kelas.map((item) => <option key={item} value={item}>{item}</option>)}
                    </select>
                  </label>
                  <label className="text-xs font-bold">Bulan
                    <input type="month" value={bulanCetak} onChange={(event) => setBulanCetak(event.target.value)} className="mt-1 block rounded-lg border px-2 py-1.5" />
                  </label>
                  <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white">
                    <Printer className="size-3.5" /> Cetak F4
                  </button>
                </div>
                <AbsensiMatriks
                  bulan={bulanCetak}
                  kelas={kelasCetak}
                  unit={siswaKelas[0]?.unit || ''}
                  siswa={siswaKelas}
                  rows={jurnalKelas}
                  loading={false}
                  guruNama=""
                  guruNip=""
                  kepsekTetap={KEPALA_SEKOLAH}
                />
              </section>
            )}

            {panel === 'qiroah' && (
              <section className="laporan-qiroah rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="no-print mb-3">
                  <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white">
                    <Printer className="size-3.5" /> Cetak laporan
                  </button>
                </div>
                <header className="border-b-4 border-double border-black pb-2 text-center">
                  <p className="text-sm font-black">SD ISLAM TERPADU AL MADINAH</p>
                  <h2 className="mt-2 text-base font-black underline">LAPORAN REKAP QIROATUL QUR&apos;AN</h2>
                  <p className="text-xs">{new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                </header>
                <table className="mt-4 w-full border-collapse text-sm">
                  <thead><tr className="bg-slate-50"><th className="border p-2 text-left">Predikat</th><th className="border p-2">Jumlah</th></tr></thead>
                  <tbody>
                    {laporan.predikat.map((item) => (
                      <tr key={item.nama}><td className="border p-2">{item.nama}</td><td className="border p-2 text-center">{item.jumlah}</td></tr>
                    ))}
                  </tbody>
                </table>
                <p className="mt-3 text-sm">Pengajuan ujian yang masih berjalan: <strong>{laporan.ujianAktif}</strong>. Setoran qiroah hari ini: <strong>{laporan.setoranQiroah}</strong>.</p>
                <div className="mt-10 text-center text-sm">
                  <p>Kepala Sekolah</p>
                  <div className="h-16" />
                  <p className="font-bold underline">{KEPALA_SEKOLAH.nama}</p>
                  <p>NIY. {KEPALA_SEKOLAH.niy}</p>
                </div>
              </section>
            )}

            {panel === 'skl' && (
              <section className="no-print rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <h2 className="text-sm font-extrabold">Surat Keterangan Lulus</h2>
                <p className="mt-1 text-xs text-slate-500">Pengesahan memakai nama dan NIY Kepala Sekolah.</p>
                <ul className="mt-3 divide-y">
                  {laporan.lulus.length === 0 ? (
                    <li className="py-4 text-sm text-slate-400">Belum ada hasil ujian berstatus lulus.</li>
                  ) : laporan.lulus.map((row) => (
                    <li key={row.id_ujian || `${row.id_siswa}-${row.tanggal_ujian}`} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                      <span><strong>{row.nama}</strong> · {row.kelas} · {row.predikat}</span>
                      <button type="button" onClick={() => setSkl(keHasil(row))} className="rounded-lg bg-[#143d32] px-3 py-1.5 text-xs font-bold text-white">Cetak SKL</button>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}
      </main>
      {rincianAbsen && laporan && (
        <div className="no-print fixed inset-0 z-50 grid place-items-center bg-slate-900/40 p-4" onClick={() => setRincianAbsen(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="judul-absen"
            className="max-h-[80vh] w-full max-w-lg overflow-auto rounded-2xl bg-white p-4 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id="judul-absen" className="text-sm font-extrabold text-slate-900">Siswa tidak hadir hari ini</h2>
                <p className="mt-1 text-xs text-slate-500">Unit {UNIT_KEPALA_SEKOLAH}. S = Sakit, I = Izin, A = Alpa.</p>
              </div>
              <button type="button" onClick={() => setRincianAbsen(false)} className="rounded-lg p-1 text-slate-500" aria-label="Tutup rincian">
                <X className="size-4" />
              </button>
            </div>
            {laporan.tidakHadir.length === 0 ? (
              <p className="py-6 text-sm text-slate-500">Tidak ada siswa Unit {UNIT_KEPALA_SEKOLAH} yang sakit, izin, atau alpa hari ini.</p>
            ) : (
              <table className="mt-3 w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="text-xs text-slate-500">
                    <th className="border-b p-2">Nama</th>
                    <th className="border-b p-2">Kelas</th>
                    <th className="border-b p-2">Keterangan</th>
                  </tr>
                </thead>
                <tbody>
                  {laporan.tidakHadir.map((row) => (
                    <tr key={`${row.kelas}-${row.nama}-${row.keterangan}`}>
                      <td className="border-b p-2 font-bold">{row.nama}</td>
                      <td className="border-b p-2">{row.kelas}</td>
                      <td className="border-b p-2">{row.keterangan} · {labelAbsen(row.keterangan)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
      {skl && (
        <CetakUjianQiroah jenis="skl" data={skl} onClose={() => setSkl(null)} kepsekTetap={KEPALA_SEKOLAH} />
      )}
    </div>
  )
}
