'use client'

import { useEffect, useMemo, useState } from 'react'
import { RefreshCw, ScrollText } from 'lucide-react'
import { SuratRekomendasiKeringanan } from '@/components/kepsek/surat-rekomendasi-keringanan'
import {
  formatWaktuKeringanan,
  muatPengajuanUnit,
  putuskanPengajuan,
  rupiahKeringanan,
  teksPelunasanPengajuan,
  type PengajuanKeringanan,
  type StatusPengajuanKeringanan,
} from '@/lib/pengajuan-keringanan'

function bandingKelas(a: string, b: string) {
  return a.localeCompare(b, 'id', { numeric: true, sensitivity: 'base' })
}

function kelasStatus(status: StatusPengajuanKeringanan) {
  if (status === 'Disetujui') return 'bg-emerald-100 text-emerald-800'
  if (status === 'Ditolak') return 'bg-rose-100 text-rose-800'
  return 'bg-amber-100 text-amber-900'
}

export function MonitoringPengajuanKeringanan({ unit }: { unit: string }) {
  const [data, setData] = useState<PengajuanKeringanan[]>([])
  const [memuat, setMemuat] = useState(true)
  const [galat, setGalat] = useState('')
  const [saring, setSaring] = useState<'semua' | StatusPengajuanKeringanan>('semua')
  const [kelas, setKelas] = useState('semua')
  const [pengajuanLengkap, setPengajuanLengkap] = useState(false)
  const [aksi, setAksi] = useState<{ id: string; jenis: 'setuju' | 'tolak' } | null>(null)
  const [catatan, setCatatan] = useState('')
  const [menyimpan, setMenyimpan] = useState(false)
  const [surat, setSurat] = useState<PengajuanKeringanan | null>(null)

  const muat = (diam = false) => {
    if (!unit) {
      setData([])
      setMemuat(false)
      return
    }
    if (!diam) setMemuat(true)
    setGalat('')
    muatPengajuanUnit(unit)
      .then(setData)
      .catch((error: Error) => {
        setData([])
        setGalat(error.message || 'Daftar pengajuan belum dapat dimuat.')
      })
      .finally(() => setMemuat(false))
  }

  useEffect(() => {
    setKelas('semua')
    muat()
    const pengulangan = window.setInterval(() => muat(true), 20000)
    return () => window.clearInterval(pengulangan)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unit])

  const daftarKelas = useMemo(() => {
    return [...new Set(data.map((item) => item.kelas.trim()).filter(Boolean))].sort(bandingKelas)
  }, [data])

  const menurutKelas = useMemo(() => {
    if (kelas === 'semua') return data
    return data.filter((item) => item.kelas.trim() === kelas)
  }, [data, kelas])

  const tampil = useMemo(() => {
    return menurutKelas
      .filter((item) => saring === 'semua' || item.statusPersetujuan === saring)
      .slice()
      .sort((a, b) => b.dibuatPada.localeCompare(a.dibuatPada))
  }, [menurutKelas, saring])
  const BATAS_PENGAJUAN = 10
  const daftarTabel = pengajuanLengkap ? tampil : tampil.slice(0, BATAS_PENGAJUAN)

  const ringkas = useMemo(() => {
    const hitung = (status: StatusPengajuanKeringanan) =>
      menurutKelas.filter((item) => item.statusPersetujuan === status).length
    return {
      total: menurutKelas.length,
      pending: hitung('Pending'),
      disetujui: hitung('Disetujui'),
      ditolak: hitung('Ditolak'),
    }
  }, [menurutKelas])

  const putuskan = async (item: PengajuanKeringanan, status: 'Disetujui' | 'Ditolak') => {
    setMenyimpan(true)
    setGalat('')
    try {
      const hasil = await putuskanPengajuan(item.id, status, status === 'Ditolak' ? catatan : '')
      setAksi(null)
      setCatatan('')
      if (hasil.statusPersetujuan === 'Disetujui') setSurat(hasil)
      muat(true)
    } catch (error) {
      setGalat(error instanceof Error ? error.message : 'Keputusan belum dapat disimpan.')
    } finally {
      setMenyimpan(false)
    }
  }

  return (
    <>
      <section id="pengajuan-keringanan" className="no-print scroll-mt-28 space-y-3 rounded-2xl border border-sky-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-sky-950">
              <ScrollText className="size-4" />
              <h2 className="text-sm font-extrabold">Pengajuan Mengikuti Kegiatan Sekolah</h2>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Total {ringkas.total} pengajuan{kelas === 'semua' ? '' : ` kelas ${kelas}`} ({ringkas.pending} pending,{' '}
              {ringkas.disetujui} disetujui, {ringkas.ditolak} ditolak)
            </p>
          </div>
          <button
            type="button"
            onClick={() => muat()}
            disabled={memuat}
            className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-sky-950 hover:bg-slate-50 disabled:opacity-60"
          >
            <RefreshCw className={`size-3.5 ${memuat ? 'animate-spin' : ''}`} /> Muat ulang
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-[11px] font-bold text-slate-600">
            Kelas
            <select
              value={kelas}
              onChange={(event) => setKelas(event.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold text-sky-950"
            >
              <option value="semua">Semua Kelas</option>
              {daftarKelas.map((nama) => (
                <option key={nama} value={nama}>
                  {nama}
                </option>
              ))}
            </select>
          </label>
          <div className="flex flex-wrap gap-1.5">
          {(['semua', 'Pending', 'Disetujui', 'Ditolak'] as const).map((nilai) => (
            <button
              key={nilai}
              type="button"
              onClick={() => setSaring(nilai)}
              className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${saring === nilai ? 'bg-sky-900 text-white' : 'bg-slate-100 text-slate-600'}`}
            >
              {nilai === 'semua' ? 'Semua' : nilai}
            </button>
          ))}
          </div>
        </div>

        {galat ? <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">{galat}</p> : null}
        {memuat && data.length === 0 ? <p className="text-sm text-slate-500">Memuat pengajuan mengikuti kegiatan sekolah...</p> : null}
        {!memuat && tampil.length === 0 ? (
          <p className="text-sm text-slate-500">Belum ada pengajuan mengikuti kegiatan sekolah pada saringan ini.</p>
        ) : null}

        {tampil.length > 0 ? (
          <>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-[760px] w-full text-left text-xs">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2 font-bold">Siswa</th>
                  <th className="px-3 py-2 font-bold">Tunggakan</th>
                  <th className="px-3 py-2 font-bold">Kesanggupan &amp; target</th>
                  <th className="px-3 py-2 font-bold">Status</th>
                  <th className="px-3 py-2 font-bold">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {daftarTabel.map((item) => (
                  <tr key={item.id} className="border-t border-slate-100 align-top">
                    <td className="px-3 py-2">
                      <p className="font-extrabold text-slate-900">{item.namaSiswa}</p>
                      <p className="text-[11px] text-slate-500">
                        NIS {item.nis}
                        {item.kelas ? ` · Kelas ${item.kelas}` : ''}
                      </p>
                      <p className="mt-1 text-[11px] text-slate-500">Surat {item.nomorSurat}</p>
                      <p className="text-[11px] text-slate-400">{formatWaktuKeringanan(item.dibuatPada)}</p>
                    </td>
                    <td className="px-3 py-2 font-bold text-slate-800">{rupiahKeringanan(item.nominalTunggakan)}</td>
                    <td className="max-w-xs px-3 py-2 text-[11px] leading-relaxed text-slate-700">
                      {item.jenisKegiatan ? (
                        <p className="font-semibold text-slate-800">Mengikuti {item.jenisKegiatan}</p>
                      ) : null}
                      <p>{teksPelunasanPengajuan(item)}</p>
                      {item.alasanPengajuan ? <p className="mt-1 text-slate-600">Alasan: {item.alasanPengajuan}</p> : null}
                      <p className="mt-1 font-semibold text-slate-500">Target {formatWaktuKeringanan(item.tanggalRencanaLunas)}</p>
                      {item.catatanKeputusan ? <p className="mt-1 text-rose-800">Catatan: {item.catatanKeputusan}</p> : null}
                    </td>
                    <td className="px-3 py-2">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${kelasStatus(item.statusPersetujuan)}`}>
                        {item.statusPersetujuan}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-col items-start gap-1">
                        {item.statusPersetujuan === 'Pending' ? (
                          aksi?.id === item.id ? (
                            <div className="space-y-2">
                              {aksi.jenis === 'tolak' ? (
                                <textarea
                                  value={catatan}
                                  onChange={(event) => setCatatan(event.target.value)}
                                  rows={2}
                                  placeholder="Catatan penolakan (opsional)"
                                  className="w-44 rounded-lg border border-slate-300 px-2 py-1 text-[11px]"
                                />
                              ) : (
                                <p className="w-44 text-[11px] text-slate-600">Setujui dan terbitkan surat rekomendasi?</p>
                              )}
                              <div className="flex gap-1">
                                <button
                                  type="button"
                                  disabled={menyimpan}
                                  onClick={() => void putuskan(item, aksi.jenis === 'setuju' ? 'Disetujui' : 'Ditolak')}
                                  className={`rounded-lg px-2 py-1 text-[11px] font-extrabold text-white disabled:opacity-60 ${aksi.jenis === 'setuju' ? 'bg-emerald-700' : 'bg-rose-700'}`}
                                >
                                  {menyimpan ? 'Menyimpan...' : aksi.jenis === 'setuju' ? 'Setujui' : 'Tolak'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setAksi(null)
                                    setCatatan('')
                                  }}
                                  className="rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-bold text-slate-600"
                                >
                                  Batal
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setAksi({ id: item.id, jenis: 'setuju' })
                                  setCatatan('')
                                }}
                                className="rounded-lg bg-emerald-700 px-2 py-1 text-[11px] font-extrabold text-white"
                              >
                                Setujui
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setAksi({ id: item.id, jenis: 'tolak' })
                                  setCatatan('')
                                }}
                                className="rounded-lg bg-rose-700 px-2 py-1 text-[11px] font-extrabold text-white"
                              >
                                Tolak
                              </button>
                            </div>
                          )
                        ) : item.statusPersetujuan === 'Disetujui' ? (
                          <button
                            type="button"
                            onClick={() => setSurat(item)}
                            className="rounded-lg border border-emerald-300 px-2 py-1 text-[11px] font-extrabold text-emerald-900"
                          >
                            Lihat surat
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400">Selesai</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {tampil.length > BATAS_PENGAJUAN ? (
            <button
              type="button"
              onClick={() => setPengajuanLengkap((nilai) => !nilai)}
              className="w-full rounded-xl border border-slate-200 py-2 text-xs font-bold text-sky-950 hover:bg-slate-50"
            >
              {pengajuanLengkap ? 'Tampilkan lebih sedikit' : 'Lihat selengkapnya'}
            </button>
          ) : null}
          </>
        ) : null}
      </section>
      {surat ? <SuratRekomendasiKeringanan pengajuan={surat} onTutup={() => setSurat(null)} /> : null}
    </>
  )
}
