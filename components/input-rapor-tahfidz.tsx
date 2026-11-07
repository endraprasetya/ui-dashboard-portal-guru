'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, BookOpen, ChevronDown, ClipboardCheck, Download, Printer, Save, Search, X } from 'lucide-react'
import { NilaiUjianTahfidz, type TargetNilaiUjian } from '@/components/nilai-ujian-tahfidz'
import { fetchAllSiswa, type Siswa } from '@/lib/siswa'
import { fetchAllSurah, type Surah } from '@/lib/surah'
import { teacherDisplayName } from '@/lib/qiroah'
import { fetchRiwayatSetoranTahfidz, ringkasRiwayatTahfidz, type RiwayatSetoranTahfidz } from '@/lib/tahfidz-riwayat'
import { formatDateString } from '@/lib/qiroah'
import {
  ASESMEN_TAHFIDZ,
  CONTOH_KETERANGAN_UJIAN,
  fetchMateriUjianTahfidz,
  fetchTeksJadwalUjianTahfidz,
  formatLabelMateri,
  gabungMateriSiswa,
  JUDUL_JADWAL_UJIAN_TAHFIDZ,
  simpanMateriUjianTahfidz,
  validasiMateriUjian,
  type AsesmenTahfidz,
  type BarisMateriUjian,
  type MateriSurah,
} from '@/lib/materi-ujian-tahfidz'

export function InputRaporTahfidz({
  onBack,
  currentUser,
}: {
  onBack: () => void
  currentUser?: any
}) {
  const [siswa, setSiswa] = useState<Siswa[]>([])
  const [surahs, setSurahs] = useState<Surah[]>([])
  const [daftar, setDaftar] = useState<BarisMateriUjian[]>([])
  const [idSiswa, setIdSiswa] = useState('')
  const [asesmen, setAsesmen] = useState<AsesmenTahfidz | ''>('')
  const [materi, setMateri] = useState<MateriSurah[]>([])
  const [keterangan, setKeterangan] = useState('')
  const [cariSurah, setCariSurah] = useState('')
  const [panelSurah, setPanelSurah] = useState(false)
  const [memuat, setMemuat] = useState(true)
  const [menyimpan, setMenyimpan] = useState(false)
  const [status, setStatus] = useState('')
  const [galat, setGalat] = useState(false)
  const [nilaiTarget, setNilaiTarget] = useState<TargetNilaiUjian | null>(null)
  const [teksJadwalUjian, setTeksJadwalUjian] = useState('')
  const [riwayatTahfidz, setRiwayatTahfidz] = useState<RiwayatSetoranTahfidz[]>([])
  const [memuatRiwayat, setMemuatRiwayat] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  const terpilih = siswa.find((item) => item.id_siswa === idSiswa)

  useEffect(() => {
    let batal = false
    Promise.all([fetchAllSiswa(currentUser), fetchAllSurah()]).then(([daftarSiswa, daftarSurah]) => {
      if (batal) return
      setSiswa(daftarSiswa)
      setSurahs(daftarSurah)
      setMemuat(false)
    })
    return () => {
      batal = true
    }
  }, [currentUser])

  useEffect(() => {
    let batal = false
    fetchTeksJadwalUjianTahfidz().then((teks) => {
      if (!batal) setTeksJadwalUjian(teks)
    })
    return () => {
      batal = true
    }
  }, [])

  useEffect(() => {
    if (siswa.length === 0) {
      setDaftar([])
      return
    }
    let batal = false
    fetchMateriUjianTahfidz(siswa.map((item) => item.id_siswa)).then((baris) => {
      if (!batal) setDaftar(baris as BarisMateriUjian[])
    })
    return () => {
      batal = true
    }
  }, [siswa])

  useEffect(() => {
    if (!idSiswa) {
      setRiwayatTahfidz([])
      return
    }
    let batal = false
    setMemuatRiwayat(true)
    fetchRiwayatSetoranTahfidz(idSiswa, 5).then((baris) => {
      if (!batal) setRiwayatTahfidz(baris)
      setMemuatRiwayat(false)
    })
    return () => {
      batal = true
    }
  }, [idSiswa])

  useEffect(() => {
    if (!idSiswa || !asesmen) return
    const milik = daftar.filter((row) => row.id_siswa === idSiswa && row.asesmen === asesmen)
    if (milik.length === 0) {
      setMateri([])
      setKeterangan('')
      return
    }
    setKeterangan(milik[0]?.keterangan || '')
    setMateri(
      milik.map((row) => {
        const surah = surahs.find((item) => item.nama_surat.toLowerCase() === String(row.surah || '').toLowerCase())
        const [mulai, selesai] = String(row.ayat || '')
          .split(/[-–]/)
          .map((item) => item.trim())
        return {
          nomor: surah?.nomor_surat || 0,
          nama: row.surah,
          ayatMulai: mulai || '1',
          ayatSelesai: selesai || mulai || String(surah?.jumlah_ayat || ''),
          jumlahAyat: surah?.jumlah_ayat || 999,
        }
      }),
    )
  }, [idSiswa, asesmen, daftar, surahs])

  useEffect(() => {
    function tutup(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setPanelSurah(false)
      }
    }
    document.addEventListener('mousedown', tutup)
    return () => document.removeEventListener('mousedown', tutup)
  }, [])

  const surahTampil = useMemo(() => {
    const kata = cariSurah.trim().toLowerCase()
    const sumber = [...surahs].sort((a, b) => b.nomor_surat - a.nomor_surat)
    if (!kata) return sumber
    return sumber.filter(
      (item) =>
        item.nama_surat.toLowerCase().includes(kata) ||
        String(item.nomor_surat).includes(kata) ||
        String(item.juz) === kata,
    )
  }, [surahs, cariSurah])

  const rekap = useMemo(() => {
    const nama = new Map(siswa.map((item) => [item.id_siswa, item]))
    return gabungMateriSiswa(daftar)
      .map((row) => ({ ...row, nama: nama.get(row.idSiswa)?.nama_siswa || row.idSiswa }))
      .sort((a, b) => a.nama.localeCompare(b.nama, 'id') || a.asesmen.localeCompare(b.asesmen, 'id'))
  }, [daftar, siswa])

  const pilihSurah = (surah: Surah, aktif: boolean) => {
    setMateri((current) => {
      if (!aktif) return current.filter((item) => item.nomor !== surah.nomor_surat)
      if (current.some((item) => item.nomor === surah.nomor_surat)) return current
      return [
        ...current,
        {
          nomor: surah.nomor_surat,
          nama: surah.nama_surat,
          ayatMulai: '1',
          ayatSelesai: String(surah.jumlah_ayat),
          jumlahAyat: surah.jumlah_ayat,
        },
      ]
    })
  }

  const ubahAyat = (nomor: number, field: 'ayatMulai' | 'ayatSelesai', nilai: string) => {
    setMateri((current) => current.map((item) => (item.nomor === nomor ? { ...item, [field]: nilai } : item)))
  }

  const handleSimpan = async () => {
    if (!terpilih) {
      setStatus('Pilih siswa binaan terlebih dahulu.')
      setGalat(true)
      return
    }
    if (!asesmen) {
      setStatus('Pilih jenis asesmen.')
      setGalat(true)
      return
    }
    const galatMateri = validasiMateriUjian(surahs, materi)
    if (galatMateri) {
      setStatus(galatMateri)
      setGalat(true)
      return
    }

    setMenyimpan(true)
    setStatus('')
    const hasil = await simpanMateriUjianTahfidz({
      idSiswa: terpilih.id_siswa,
      kelas: terpilih.kelas,
      asesmen,
      materi,
      keterangan,
      guru: teacherDisplayName(currentUser),
    })
    setMenyimpan(false)
    if (hasil.error) {
      setStatus(`Gagal menyimpan: ${hasil.error}`)
      setGalat(true)
      return
    }

    const segar = await fetchMateriUjianTahfidz(siswa.map((item) => item.id_siswa))
    setDaftar(segar as BarisMateriUjian[])
    setStatus(`Materi ujian ${terpilih.nama_siswa} (${asesmen}) tersimpan.`)
    setGalat(false)
    setMateri([])
    setKeterangan('')
    setPanelSurah(false)
  }

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="flex items-center justify-between rounded-2xl bg-[#2563eb] px-6 py-4 text-white shadow-md">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 rounded-xl bg-white/20 px-4 py-2 text-xs font-bold hover:bg-white/30"
        >
          <ArrowLeft className="size-4" /> Kembali
        </button>
        <h2 className="text-base font-black tracking-wide">Input Rapor Tahfidz</h2>
        <BookOpen className="size-5" />
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block text-xs font-bold text-slate-600">
            Pilihan siswa
            <select
              value={idSiswa}
              onChange={(event) => setIdSiswa(event.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold"
            >
              <option value="">Pilih siswa binaan</option>
              {siswa.map((item) => (
                <option key={item.id_siswa} value={item.id_siswa}>
                  {item.nama_siswa} · {item.kelas}
                </option>
              ))}
            </select>
            <span className="mt-1 block font-medium text-slate-400">
              {memuat ? 'Memuat siswa binaan…' : `${siswa.length} siswa binaan`}
            </span>
          </label>

          <label className="block text-xs font-bold text-slate-600">
            Pilihan asesmen
            <select
              value={asesmen}
              onChange={(event) => setAsesmen(event.target.value as AsesmenTahfidz)}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold"
            >
              <option value="">Pilih asesmen</option>
              {ASESMEN_TAHFIDZ.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
        </div>

        {terpilih && (
          <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50/60 p-4">
            <p className="text-xs font-bold text-emerald-900">5 riwayat setoran tahfidz terakhir · {terpilih.nama_siswa}</p>
            {memuatRiwayat ? (
              <p className="mt-2 text-xs text-slate-500">Memuat riwayat…</p>
            ) : riwayatTahfidz.length === 0 ? (
              <p className="mt-2 text-xs text-slate-500">Belum ada setoran tahfidz tercatat.</p>
            ) : (
              <ol className="mt-2 space-y-1.5 text-xs text-slate-700">
                {riwayatTahfidz.map((row, idx) => (
                  <li key={row.id_setoran || idx} className="rounded-lg bg-white/80 px-2.5 py-1.5">
                    <span className="font-semibold text-slate-500">{formatDateString(String(row.tanggal || ''))}</span>
                    {' — '}
                    {ringkasRiwayatTahfidz(row)}
                  </li>
                ))}
              </ol>
            )}
            <p className="mt-2 text-[10px] text-slate-500">Acuan memilih materi ujian rapor sesuai progres hafalan santri.</p>
          </div>
        )}

        <div ref={panelRef} className="relative mt-4">
          <p className="text-xs font-bold text-slate-600">Materi ujian</p>
          <button
            type="button"
            onClick={() => setPanelSurah((open) => !open)}
            className="mt-1 flex w-full items-center justify-between rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-left text-sm"
          >
            <span className={materi.length ? 'font-semibold text-slate-800' : 'text-slate-400'}>
              {materi.length ? materi.map(formatLabelMateri).join('; ') : 'Pilih surah (bisa lebih dari satu)'}
            </span>
            <ChevronDown className={`size-4 text-slate-500 ${panelSurah ? 'rotate-180' : ''}`} />
          </button>

          {panelSurah && (
            <div className="absolute z-20 mt-1 w-full rounded-2xl border border-slate-200 bg-white p-3 shadow-xl">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={cariSurah}
                  onChange={(event) => setCariSurah(event.target.value)}
                  placeholder="Cari nama surah / nomor / juz"
                  className="w-full rounded-xl border border-slate-300 py-2 pl-9 pr-3 text-sm"
                />
              </div>
              <div className="mt-2 max-h-56 overflow-auto">
                {surahTampil.map((item) => {
                  const aktif = materi.some((row) => row.nomor === item.nomor_surat)
                  return (
                    <label key={item.nomor_surat} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-sky-50">
                      <input type="checkbox" checked={aktif} onChange={(event) => pilihSurah(item, event.target.checked)} />
                      <span className="font-semibold">{item.nama_surat}</span>
                      <span className="text-xs text-slate-400">
                        Juz {item.juz} · {item.jumlah_ayat} ayat
                      </span>
                    </label>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {materi.length > 0 && (
          <div className="mt-3 space-y-2">
            {materi.map((item) => (
              <div key={item.nomor} className="flex flex-wrap items-end gap-2 rounded-xl border border-sky-100 bg-sky-50/60 p-3">
                <p className="min-w-[9rem] flex-1 text-sm font-bold text-slate-800">{item.nama}</p>
                <label className="text-[11px] font-bold text-slate-500">
                  Ayat mulai
                  <input
                    type="number"
                    min={1}
                    max={item.jumlahAyat}
                    value={item.ayatMulai}
                    onChange={(event) => ubahAyat(item.nomor, 'ayatMulai', event.target.value)}
                    className="mt-1 w-24 rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                  />
                </label>
                <label className="text-[11px] font-bold text-slate-500">
                  Ayat selesai
                  <input
                    type="number"
                    min={1}
                    max={item.jumlahAyat}
                    value={item.ayatSelesai}
                    onChange={(event) => ubahAyat(item.nomor, 'ayatSelesai', event.target.value)}
                    className="mt-1 w-24 rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => setMateri((current) => current.filter((row) => row.nomor !== item.nomor))}
                  className="rounded-lg p-2 text-slate-400 hover:bg-white hover:text-slate-700"
                  aria-label={`Hapus ${item.nama}`}
                >
                  <X className="size-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        <label className="mt-4 block text-xs font-bold text-slate-600">
          Keterangan
          <textarea
            value={keterangan}
            onChange={(event) => setKeterangan(event.target.value)}
            placeholder={CONTOH_KETERANGAN_UJIAN}
            rows={3}
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
          />
        </label>

        {status && <p className={`mt-3 text-sm font-semibold ${galat ? 'text-red-600' : 'text-emerald-700'}`}>{status}</p>}

        <button
          type="button"
          onClick={handleSimpan}
          disabled={menyimpan}
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-sky-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-sky-800 disabled:opacity-50"
        >
          <Save className="size-4" /> {menyimpan ? 'Menyimpan…' : 'Simpan'}
        </button>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h3 className="text-sm font-extrabold text-slate-800">Daftar materi ujian tahfidz</h3>
          <Link
            href={asesmen ? `/raport/massal?asesmen=${encodeURIComponent(asesmen)}` : '/raport/massal'}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-3 py-2 text-[11px] font-bold text-white hover:bg-emerald-800"
          >
            <Download className="size-3.5" /> Kirim / Unduh Semua PDF Rapor
          </Link>
        </div>
        <p className="mt-1 text-xs text-slate-500">
          Satu klik mengunduh file PDF terpisah untuk setiap siswa binaan (nama file mengikuti nama siswa).
        </p>
        <div className="mt-3 rounded-xl border border-sky-100 bg-sky-50/80 px-4 py-3">
          <p className="text-xs font-extrabold uppercase tracking-wide text-sky-900">{JUDUL_JADWAL_UJIAN_TAHFIDZ}</p>
          <p className="mt-1 text-sm leading-relaxed text-slate-700">{teksJadwalUjian || 'Memuat informasi jadwal…'}</p>
        </div>
        {rekap.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">Belum ada materi ujian untuk siswa binaan ini.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2">Siswa</th>
                  <th className="px-3 py-2">Asesmen</th>
                  <th className="px-3 py-2">Materi ujian</th>
                  <th className="px-3 py-2">Keterangan</th>
                  <th className="px-3 py-2">Guru</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {rekap.map((row) => (
                  <tr key={`${row.idSiswa}-${row.asesmen}`} className="border-t border-slate-100">
                    <td className="px-3 py-2 font-semibold text-slate-800">{row.nama}</td>
                    <td className="px-3 py-2">{row.asesmen}</td>
                    <td className="px-3 py-2">{row.materi}</td>
                    <td className="px-3 py-2 text-slate-600">{row.keterangan || '-'}</td>
                    <td className="px-3 py-2 text-slate-700">{row.guru || '-'}</td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex flex-wrap justify-end gap-1">
                        <button
                          type="button"
                          onClick={() =>
                            setNilaiTarget({
                              idSiswa: row.idSiswa,
                              nama: row.nama,
                              kelas: row.kelas,
                              asesmen: row.asesmen,
                              surahs: daftar
                                .filter((item) => item.id_siswa === row.idSiswa && item.asesmen === row.asesmen)
                                .map((item) => ({ nama: item.surah, ayat: item.ayat })),
                            })
                          }
                          className="inline-flex items-center gap-1 rounded-lg bg-emerald-700 px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-emerald-800"
                        >
                          <ClipboardCheck className="size-3" /> Nilai Ujian
                        </button>
                        <Link
                          href={`/raport/${encodeURIComponent(row.idSiswa)}?asesmen=${encodeURIComponent(row.asesmen)}`}
                          className="inline-flex items-center gap-1 rounded-lg bg-slate-800 px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-slate-900"
                        >
                          <Printer className="size-3" /> Cetak Rapor
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {nilaiTarget && <NilaiUjianTahfidz target={nilaiTarget} onClose={() => setNilaiTarget(null)} />}
    </div>
  )
}
