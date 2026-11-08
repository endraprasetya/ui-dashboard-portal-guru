'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft,
  BarChart3,
  CalendarDays,
  ClipboardList,
  LineChart,
  RefreshCw,
  Users,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { formatDateString, formatCapaianQiroah, hasKoordinatorQQRole, labelPredikatUjian } from '@/lib/qiroah'
import {
  muatDataKoordinatorQQ,
  persenKelulusan,
  type PengajuanKoordinator,
} from '@/lib/qiroah-koordinator'
import { bulanSekarangJakarta, normKelas } from '@/lib/qiroah-koordinator-setoran'
import { TombolLihatNilaiUjian } from '@/components/qiroah-lihat-nilai'
import { rekapKeTampilanNilai } from '@/lib/ujian-nilai-tampilan'

type TabKey = 'overview' | 'progres' | 'jadwal' | 'hasil'

const TAB: { key: TabKey; label: string; icon: typeof BarChart3 }[] = [
  { key: 'overview', label: 'Overview & QC', icon: BarChart3 },
  { key: 'progres', label: 'Setoran & Progres', icon: LineChart },
  { key: 'jadwal', label: 'Jadwal Ujian', icon: CalendarDays },
  { key: 'hasil', label: 'Hasil & Tindak Lanjut', icon: ClipboardList },
]

function BadgeTempo({ tempo }: { tempo: 'cepat' | 'normal' | 'lambat' }) {
  const cls =
    tempo === 'cepat'
      ? 'bg-sky-100 text-sky-800'
      : tempo === 'lambat'
        ? 'bg-amber-100 text-amber-900'
        : 'bg-slate-100 text-slate-700'
  const teks = tempo === 'cepat' ? 'CEPAT' : tempo === 'lambat' ? 'LAMBAT' : 'Normal'
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${cls}`}>{teks}</span>
}

function BadgeTindak({ label, tone }: { label: string; tone: 'emerald' | 'sky' | 'amber' | 'rose' | 'slate' }) {
  const cls = {
    emerald: 'bg-emerald-100 text-emerald-800',
    sky: 'bg-sky-100 text-sky-800',
    amber: 'bg-amber-100 text-amber-900',
    rose: 'bg-rose-100 text-rose-800',
    slate: 'bg-slate-100 text-slate-700',
  }[tone]
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${cls}`}>{label}</span>
}

export default function QiroahKoordinator({
  onBack,
  currentUser,
}: {
  onBack: () => void
  currentUser?: { role?: string; unit?: string; nama_lengkap?: string } | null
}) {
  const boleh = hasKoordinatorQQRole(currentUser)
  const [tab, setTab] = useState<TabKey>('overview')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filterKelas, setFilterKelas] = useState('')
  const [cariNama, setCariNama] = useState('')
  const [bulanPilih, setBulanPilih] = useState(() => bulanSekarangJakarta())
  const [payload, setPayload] = useState<Awaited<ReturnType<typeof muatDataKoordinatorQQ>> | null>(null)

  const muat = useCallback(
    async (senyap = false, bulan = bulanPilih) => {
      if (!boleh) return
      if (!senyap) setLoading(true)
      setError('')
      try {
        const data = await muatDataKoordinatorQQ(currentUser, bulan)
        setPayload(data)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Gagal memuat data.')
      } finally {
        if (!senyap) setLoading(false)
      }
    },
    [boleh, currentUser, bulanPilih],
  )

  useEffect(() => {
    void muat()
  }, [muat])

  useEffect(() => {
    if (!boleh) return
    const kanal = supabase
      .channel(`koordinator-qq-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pengajuan' }, () => void muat(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rekapan' }, () => void muat(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'setoran_qiroah' }, () => void muat(true))
      .subscribe()
    const timer = window.setInterval(() => void muat(true), 30_000)
    return () => {
      window.clearInterval(timer)
      supabase.removeChannel(kanal)
    }
  }, [boleh, muat])

  const kelasOpsi = useMemo(() => {
    if (!payload) return []
    return Array.from(new Set(payload.siswa.map((s) => s.kelas))).filter(Boolean).sort()
  }, [payload])

  const progresFilter = useMemo(() => {
    if (!payload) return []
    return payload.progresBulanan.filter((row) => {
      if (filterKelas && normKelas(row.siswa.kelas) !== normKelas(filterKelas)) return false
      if (cariNama && !String(row.siswa.nama_siswa).toLowerCase().includes(cariNama.toLowerCase())) return false
      return true
    })
  }, [payload, filterKelas, cariNama])

  const kelulusanPct = payload
    ? persenKelulusan(payload.stats.lulus, payload.stats.belumLulus)
    : { lulus: 0, maqbul: 0 }

  if (!boleh) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center text-sm text-amber-900">
        Halaman Koordinator QQ hanya untuk akun dengan role Koordinator Qiroatul Qur&apos;an.
        <button type="button" onClick={onBack} className="mt-4 block w-full rounded-xl bg-amber-700 py-2 font-bold text-white">
          Kembali
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#0f4c5c] px-4 py-3 text-white shadow-md sm:px-6">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 rounded-xl bg-white/15 px-3 py-2 text-xs font-bold hover:bg-white/25"
        >
          <ArrowLeft className="size-4" /> Kembali
        </button>
        <div className="text-center">
          <h2 className="text-sm font-black tracking-wide sm:text-base">Koordinator QQ</h2>
          <p className="text-[10px] text-white/75 sm:text-xs">Pemantauan kualitas & progres (read-only)</p>
        </div>
        <button
          type="button"
          onClick={() => void muat()}
          disabled={loading}
          className="inline-flex items-center gap-1 rounded-xl bg-white/15 px-3 py-2 text-xs font-bold hover:bg-white/25 disabled:opacity-50"
          title="Muat ulang"
        >
          <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <nav className="flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1 shadow-sm" aria-label="Tab koordinator">
        {TAB.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition sm:text-sm ${
              tab === key ? 'bg-[#0f4c5c] text-white shadow' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Icon className="size-4" />
            {label}
          </button>
        ))}
      </nav>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>
      )}

      {loading && !payload ? (
        <p className="py-12 text-center text-sm text-slate-500">Memuat data pemantauan…</p>
      ) : payload ? (
        <>
          {tab === 'overview' && (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <StatCard icon={Users} label="Santri aktif" value={payload.stats.santriAktif} tone="sky" />
                <StatCard icon={ClipboardList} label="Pengajuan berjalan" value={payload.stats.pengajuanBerjalan} tone="amber" />
                <StatCard icon={CalendarDays} label="Terjadwal" value={payload.stats.terjadwal} tone="teal" />
                <StatCard icon={CalendarDays} label="Menunggu jadwal" value={payload.stats.menungguJadwal} tone="slate" />
                <StatCard icon={BarChart3} label="Lulus (rekapan)" value={payload.stats.lulus} tone="emerald" />
                <StatCard icon={BarChart3} label="Mengulang / belum lulus" value={payload.stats.belumLulus} tone="rose" />
              </div>

              <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <h3 className="text-sm font-bold text-slate-800">Statistik kelulusan</h3>
                <div className="mt-3 flex h-3 overflow-hidden rounded-full bg-slate-100">
                  <div className="bg-emerald-500 transition-all" style={{ width: `${kelulusanPct.lulus}%` }} title="Lulus" />
                  <div className="bg-rose-400 transition-all" style={{ width: `${kelulusanPct.maqbul}%` }} title="Mengulang" />
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  Lulus {kelulusanPct.lulus}% · Mengulang / lainnya {kelulusanPct.maqbul}% (dari {payload.stats.lulus + payload.stats.belumLulus} rekapan)
                </p>
              </section>

              <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <h3 className="mb-3 text-sm font-bold text-slate-800">Ringkasan jadwal ujian terdekat</h3>
                {payload.jadwal.length === 0 ? (
                  <p className="text-xs text-slate-500">Belum ada ujian terjadwal.</p>
                ) : (
                  <ul className="divide-y divide-slate-100 text-sm">
                    {payload.jadwal.slice(0, 8).map((j) => (
                      <li key={j.id_pengajuan} className="flex flex-wrap items-center justify-between gap-2 py-2">
                        <span className="font-medium text-slate-800">{j.nama_siswa}</span>
                        <span className="text-xs text-slate-500">
                          {formatDateString(String(j.tanggal_pelaksanaan || j.tanggal_diajukan || ''))}
                          {j.waktu ? ` · ${j.waktu}` : ''} · {j.penguji}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          )}

          {tab === 'progres' && (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <label className="flex flex-col text-xs font-bold text-slate-600">
                  Pilihan bulan
                  <input
                    type="month"
                    className="mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold"
                    value={bulanPilih}
                    onChange={(e) => {
                      const v = e.target.value
                      setBulanPilih(v)
                      void muat(false, v)
                    }}
                  />
                </label>
                <select
                  className="self-end rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={filterKelas}
                  onChange={(e) => setFilterKelas(e.target.value)}
                >
                  <option value="">Semua kelas</option>
                  {kelasOpsi.map((k) => (
                    <option key={k} value={k}>{k}</option>
                  ))}
                </select>
                <input
                  className="min-w-[12rem] flex-1 self-end rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Cari nama santri…"
                  value={cariNama}
                  onChange={(e) => setCariNama(e.target.value)}
                />
              </div>
              {payload && progresFilter[0] && (
                <p className="text-xs text-slate-500">
                  Titik pemantauan bulan {payload.bulan}: tgl 1 (awal bulan), tgl {progresFilter[0].anchorHari7} (minggu pertama, disesuaikan libur), tgl {progresFilter[0].anchorAkhir} (akhir bulan efektif).
                </p>
              )}
              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
                <table className="w-full min-w-[900px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-3 py-2">Santri</th>
                      <th className="px-3 py-2">Kelas</th>
                      <th className="px-3 py-2">Capaian awal (tgl 1)</th>
                      <th className="px-3 py-2">Setoran hari ke-7</th>
                      <th className="px-3 py-2">Setoran akhir bulan</th>
                      <th className="px-3 py-2 text-center">Jumlah setoran bulan</th>
                      <th className="px-3 py-2">Tempo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {progresFilter.map((row) => (
                      <tr key={row.siswa.id_siswa} className="hover:bg-slate-50/80">
                        <td className="px-3 py-2 font-medium text-slate-800">{row.siswa.nama_siswa}</td>
                        <td className="px-3 py-2 text-slate-600">{row.siswa.kelas}</td>
                        <td className="px-3 py-2 text-slate-600">{formatCapaianQiroah(row.capaianAwal) || '—'}</td>
                        <td className="px-3 py-2 text-slate-600">{formatCapaianQiroah(row.capaianHari7) || '—'}</td>
                        <td className="px-3 py-2 text-slate-600">{formatCapaianQiroah(row.capaianAkhir) || '—'}</td>
                        <td className="px-3 py-2 text-center tabular-nums font-semibold">{row.jumlahSetoranBulan}</td>
                        <td className="px-3 py-2">
                          <BadgeTempo tempo={row.tempo} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {progresFilter.length === 0 && (
                  <p className="p-6 text-center text-xs text-slate-500">Tidak ada data untuk filter ini.</p>
                )}
              </div>
              <p className="text-xs text-slate-500">
                Data <code className="rounded bg-slate-100 px-1">setoran_qiroah</code> + relasi <code className="rounded bg-slate-100 px-1">siswa</code> (id_siswa/NIS).
                Capaian = setoran terakhir pada atau sebelum tanggal acuan (libur Jumat/Minggu & hari besar dimajukan).
                Tanpa aktivitas bulan ini: <strong>LAMBAT</strong>.
              </p>
            </div>
          )}

          {tab === 'jadwal' && (
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Santri</th>
                    <th className="px-3 py-2">Kelas</th>
                    <th className="px-3 py-2">Jilid</th>
                    <th className="px-3 py-2">Tanggal</th>
                    <th className="px-3 py-2">Waktu</th>
                    <th className="px-3 py-2">Penguji</th>
                    <th className="px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {payload.jadwal.map((j: PengajuanKoordinator & { waktu?: string; penguji?: string; labelStatus?: string }) => (
                    <tr key={j.id_pengajuan}>
                      <td className="px-3 py-2 font-medium">{j.nama_siswa}</td>
                      <td className="px-3 py-2">{j.kelas}</td>
                      <td className="px-3 py-2">{j.jilid_diujikan}</td>
                      <td className="px-3 py-2">{formatDateString(String(j.tanggal_pelaksanaan || '-'))}</td>
                      <td className="px-3 py-2">{j.waktu || '-'}</td>
                      <td className="px-3 py-2">{j.penguji || '-'}</td>
                      <td className="px-3 py-2 text-xs font-semibold text-teal-700">{j.labelStatus}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {payload.jadwal.length === 0 && (
                <p className="p-8 text-center text-sm text-slate-500">Belum ada jadwal ujian dari penguji.</p>
              )}
            </div>
          )}

          {tab === 'hasil' && (
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
              <table className="w-full min-w-[960px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Santri</th>
                    <th className="px-3 py-2">Kelas</th>
                    <th className="px-3 py-2">Jilid</th>
                    <th className="px-3 py-2">Nilai</th>
                    <th className="px-3 py-2">Predikat</th>
                    <th className="px-3 py-2">Keputusan</th>
                    <th className="px-3 py-2">Penguji</th>
                    <th className="px-3 py-2 max-w-xs">Catatan penguji</th>
                    <th className="px-3 py-2 text-center">Detail</th>
                    <th className="px-3 py-2">Tindak lanjut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {payload.hasilUjian.map((row) => (
                    <tr key={row.id_ujian || `${row.id_siswa}-${row.jilid_asal}`} className="align-top">
                      <td className="px-3 py-2 font-medium">{row.nama}</td>
                      <td className="px-3 py-2">{row.kelas}</td>
                      <td className="px-3 py-2 text-xs">
                        {row.jilid_asal}
                        {row.jilid_tujuan ? ` → ${row.jilid_tujuan}` : ''}
                      </td>
                      <td className="px-3 py-2 tabular-nums">{row.nilai_akhir ?? '—'}</td>
                      <td className="px-3 py-2">{labelPredikatUjian(row.predikat) || '—'}</td>
                      <td className="px-3 py-2 font-semibold">{row.keputusan || '—'}</td>
                      <td className="px-3 py-2 text-xs">{row.penguji || '—'}</td>
                      <td className="max-w-xs px-3 py-2 text-xs text-slate-600">{row.catatan || row.kelebihan_siswa || '—'}</td>
                      <td className="px-3 py-2 text-center">
                        <TombolLihatNilaiUjian data={rekapKeTampilanNilai(row)} />
                      </td>
                      <td className="px-3 py-2">
                        <BadgeTindak label={row.tindak.label} tone={row.tindak.tone} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {payload.hasilUjian.length === 0 && (
                <p className="p-8 text-center text-sm text-slate-500">Belum ada rekapan ujian.</p>
              )}
            </div>
          )}
        </>
      ) : null}
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Users
  label: string
  value: number
  tone: 'sky' | 'amber' | 'teal' | 'slate' | 'emerald' | 'rose'
}) {
  const bg = {
    sky: 'bg-sky-50 border-sky-100',
    amber: 'bg-amber-50 border-amber-100',
    teal: 'bg-teal-50 border-teal-100',
    slate: 'bg-slate-50 border-slate-200',
    emerald: 'bg-emerald-50 border-emerald-100',
    rose: 'bg-rose-50 border-rose-100',
  }[tone]
  return (
    <div className={`rounded-xl border p-4 shadow-sm ${bg}`}>
      <div className="flex items-center gap-2 text-slate-600">
        <Icon className="size-4 opacity-70" />
        <span className="text-xs font-semibold uppercase tracking-wide">{label}</span>
      </div>
      <p className="mt-2 text-3xl font-black tabular-nums text-slate-900">{value}</p>
    </div>
  )
}
