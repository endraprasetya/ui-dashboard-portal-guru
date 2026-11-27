'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, ClipboardCheck, Search } from 'lucide-react'
import { BadgeJenisCatatanHq, BadgeLolosPemeriksaan } from '@/components/badge-pemeriksaan-hq'
import { CatatanPemeriksaHq } from '@/components/catatan-pemeriksa-hq'
import { PratinjauRaporHqKepsek } from '@/components/kepsek/pratinjau-rapor-hq'
import { RiwayatWaktuPemeriksaanHq } from '@/components/riwayat-waktu-hq'
import {
  NAMA_SETTING_KIRIM_RAPOR,
  formatWaktuPemeriksaanHq,
  idGuruAktif,
  lengkapiTampilanKirim,
  simpanCatatanRevisiRaporHq,
  type ModeCatatanPemeriksaHq,
  teksRiwayatRingkasCatatanHq,
  type KirimRaporHq,
} from '@/lib/rapor-hq-kirim'
import { PILIHAN_ASESMEN_RAPOR_HQ, type KodeAsesmenRaporHq } from '@/lib/kepsek-rapor-hq'
import {
  adalahPemeriksaHq,
  daftarKelasHq,
  kelasTampilHq,
  muatHakPemeriksaHq,
  muatPenilaianPutriHq,
  sudahDiperiksaHq,
} from '@/lib/pemeriksa-hq'
import { teacherDisplayName } from '@/lib/qiroah'
import { supabase } from '@/lib/supabase'
import { periodeAjaranSekarang } from '@/lib/rapor-tahfidz-nilai'

function teksCapaian(nilai: number | null, predikat: string) {
  if (nilai == null || !Number.isFinite(nilai)) return 'Belum dinilai'
  const angka = Number.isInteger(nilai) ? String(nilai) : String(Math.round(nilai * 10) / 10)
  return predikat ? `${angka} · ${predikat}` : angka
}

export function PemeriksaPenilaianHq({
  onBack,
  currentUser,
}: {
  onBack: () => void
  currentUser?: any
}) {
  const [asesmen, setAsesmen] = useState<KodeAsesmenRaporHq>('ASAS')
  const [daftar, setDaftar] = useState<KirimRaporHq[]>([])
  const [memuat, setMemuat] = useState(true)
  const [galat, setGalat] = useState('')
  const [status, setStatus] = useState('')
  const [cari, setCari] = useState('')
  const [kelasSaring, setKelasSaring] = useState('semua')
  const [statusSaring, setStatusSaring] = useState<StatusSaringHq>('semua')
  const [izin, setIzin] = useState(() => adalahPemeriksaHq(currentUser))
  const [menyimpanCatatan, setMenyimpanCatatan] = useState('')
  const [catatan, setCatatan] = useState<Record<string, string>>({})
  const [pratinjau, setPratinjau] = useState<KirimRaporHq | null>(null)
  const lewatiMuat = useRef(false)
  const { tahunAjaran, semester } = periodeAjaranSekarang()

  useEffect(() => {
    let batal = false
    muatHakPemeriksaHq(currentUser).then((hasil) => {
      if (!batal) setIzin(hasil.hak)
    })
    return () => {
      batal = true
    }
  }, [currentUser])

  const muat = async () => {
    setMemuat(true)
    setGalat('')
    const hasil = await muatPenilaianPutriHq(asesmen)
    if (hasil.error) {
      setGalat(hasil.error)
      setDaftar([])
      setMemuat(false)
      return
    }
    const lengkap = await lengkapiTampilanKirim(hasil.data)
    setDaftar(lengkap)
    setCatatan(Object.fromEntries(lengkap.map((row) => [kunciBaris(row), row.catatanRevisi])))
    setMemuat(false)
  }

  useEffect(() => {
    void muat()
  }, [asesmen])

  useEffect(() => {
    const kanal = supabase
      .channel(`pemeriksa-hq-${Math.random().toString(36).slice(2)}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'setting', filter: `nama_variabel=eq.${NAMA_SETTING_KIRIM_RAPOR}` },
        () => {
          if (lewatiMuat.current) {
            lewatiMuat.current = false
            return
          }
          void muat()
        },
      )
    kanal.subscribe()
    return () => {
      void supabase.removeChannel(kanal)
    }
  }, [asesmen])

  const kelasOpsi = useMemo(() => daftarKelasHq(daftar.map((row) => row.kelas)), [daftar])
  const kelasAktif = kelasOpsi.includes(kelasSaring) ? kelasSaring : 'semua'
  const menurutKelas = useMemo(
    () => daftar.filter((row) => kelasAktif === 'semua' || kelasTampilHq(row.kelas) === kelasAktif),
    [daftar, kelasAktif],
  )
  const tampil = useMemo(() => {
    const kata = cari.trim().toLowerCase()
    return menurutKelas.filter((row) => {
      if (statusSaring === 'lolos' && !sudahDiperiksaHq(row)) return false
      if (statusSaring === 'belum' && sudahDiperiksaHq(row)) return false
      if (!kata) return true
      return (
        row.namaSiswa.toLowerCase().includes(kata) ||
        row.kelas.toLowerCase().includes(kata) ||
        row.namaGuru.toLowerCase().includes(kata) ||
        row.materi.toLowerCase().includes(kata)
      )
    })
  }, [menurutKelas, cari, statusSaring])

  const jumlahDiperiksa = menurutKelas.filter(sudahDiperiksaHq).length
  const jumlahBelum = menurutKelas.length - jumlahDiperiksa

  const simpanCatatan = async (row: KirimRaporHq, mode: ModeCatatanPemeriksaHq) => {
    const kunci = kunciBaris(row)
    setMenyimpanCatatan(kunci)
    setStatus('')
    setGalat('')
    lewatiMuat.current = true
    const hasil = await simpanCatatanRevisiRaporHq(
      row,
      catatan[kunci] || '',
      {
        id: idGuruAktif(currentUser),
        nama: teacherDisplayName(currentUser),
      },
      mode,
    )
    setMenyimpanCatatan('')
    if (hasil.error || !hasil.data) {
      lewatiMuat.current = false
      setGalat(hasil.error || 'Catatan belum tersimpan.')
      return
    }
    const tersimpan = hasil.data
    setDaftar((semua) => semua.map((item) => (kunciBaris(item) === kunci ? { ...item, ...tersimpan } : item)))
    setCatatan((semua) => ({ ...semua, [kunci]: tersimpan.catatanRevisi }))
    setStatus(
      tersimpan.jenisCatatan === 'konfirmasi'
        ? `Rapor HQ ${row.namaSiswa} tersimpan sebagai siap cetak, terkirim ke guru pengampu, dan ditandai sudah diperiksa.`
        : `Catatan revisi ${row.namaSiswa} tersimpan, terkirim ke guru pengampu, dengan status perlu perbaikan.`,
    )
  }

  if (!izin) {
    return (
      <div className="mx-auto max-w-3xl rounded-2xl border border-amber-200 bg-amber-50 p-5">
        <button
          type="button"
          onClick={onBack}
          className="mb-3 inline-flex items-center gap-1.5 rounded-xl bg-white px-4 py-2 text-xs font-bold text-slate-700"
        >
          <ArrowLeft className="size-4" /> Kembali
        </button>
        <p className="text-sm font-semibold text-amber-950">
          Menu Pemeriksa Penilaian HQ hanya untuk akun yang tercatat sebagai pemeriksa HQ pada tabel users.
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div className="flex items-center justify-between rounded-2xl bg-[#6d28d9] px-6 py-4 text-white shadow-md">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 rounded-xl bg-white/20 px-4 py-2 text-xs font-bold hover:bg-white/30"
        >
          <ArrowLeft className="size-4" /> Kembali
        </button>
        <h2 className="text-base font-black tracking-wide">Pemeriksa Penilaian HQ</h2>
        <ClipboardCheck className="size-5" />
      </div>

      <section className="rounded-2xl border border-violet-200 bg-violet-50/70 p-4 text-sm text-violet-950">
        <p className="font-extrabold">Siswa putri unit Nogosari (kelas berakhiran C dan D)</p>
        <p className="mt-1 text-xs leading-relaxed">
          Periksa hasil penilaian rapor HQ yang dikirim guru pengampu. Catatan dapat berisi kekeliruan yang perlu
          diperbaiki, atau konfirmasi bahwa rapor HQ sudah sesuai dan siap cetak. Tandai sudah diperiksa agar Kepala
          Sekolah menerima tanda pada pemantauan Rapor HQ. {semester} {tahunAjaran}.
        </p>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {PILIHAN_ASESMEN_RAPOR_HQ.map((item) => (
              <button
                key={item.kode}
                type="button"
                onClick={() => setAsesmen(item.kode)}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold ${
                  asesmen === item.kode ? 'bg-[#6d28d9] text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <p className="text-xs font-semibold text-slate-600">
            {kelasAktif === 'semua' ? 'Semua kelas' : `Kelas ${kelasAktif}`}: {jumlahBelum} menunggu · {jumlahDiperiksa} sudah diperiksa
          </p>
        </div>

        <div className="mt-3 flex flex-wrap items-end gap-3">
          <label className="text-xs font-bold text-slate-600">
            Filter Kelas
            <select
              value={kelasAktif}
              onChange={(event) => setKelasSaring(event.target.value)}
              className="mt-1 block rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-800"
            >
              <option value="semua">Semua Kelas</option>
              {kelasOpsi.map((kelas) => (
                <option key={kelas} value={kelas}>
                  {kelas}
                </option>
              ))}
            </select>
          </label>
          <div>
            <p className="text-xs font-bold text-slate-600">Filter Status</p>
            <div className="mt-1 flex flex-wrap gap-1">
              {(
                [
                  ['semua', 'Semua Status'],
                  ['lolos', 'Sudah diperiksa'],
                  ['belum', 'Belum diperiksa'],
                ] as const
              ).map(([kode, label]) => (
                <button
                  key={kode}
                  type="button"
                  onClick={() => setStatusSaring(kode)}
                  className={`rounded-lg px-2.5 py-1.5 text-[11px] font-bold ${
                    statusSaring === kode ? 'bg-[#6d28d9] text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="relative mt-3">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            value={cari}
            onChange={(event) => setCari(event.target.value)}
            placeholder="Cari nama siswa, kelas, atau guru"
            className="w-full rounded-xl border border-slate-300 py-2 pl-9 pr-3 text-sm"
          />
        </div>

        {galat ? <p className="mt-3 text-sm font-semibold text-red-600">{galat}</p> : null}
        {status ? <p className="mt-3 text-sm font-semibold text-emerald-700">{status}</p> : null}

        {memuat ? (
          <p className="mt-4 text-sm text-slate-500">Memuat penilaian siswa putri…</p>
        ) : tampil.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">
            {daftar.length === 0
              ? `Belum ada hasil penilaian siswa putri Nogosari yang dikirim untuk ${asesmen}.`
              : 'Tidak ada penilaian yang cocok dengan filter kelas, status, atau pencarian ini.'}
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2">Siswa</th>
                  <th className="px-3 py-2">Materi / surah</th>
                  <th className="px-3 py-2">Nilai</th>
                  <th className="px-3 py-2">Guru pengampu</th>
                  <th className="px-3 py-2">Catatan / Koreksi</th>
                  <th className="px-3 py-2">Status periksa</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {tampil.map((row) => {
                  const kunci = kunciBaris(row)
                  const diperiksa = sudahDiperiksaHq(row)
                  const waktu = formatWaktuPemeriksaanHq(row.dikirimPada)
                  return (
                    <tr key={kunci} className="border-t border-slate-100 align-top">
                      <td className="px-3 py-2">
                        <p className="font-semibold text-slate-800">{row.namaSiswa}</p>
                        <BadgeJenisCatatanHq jenis={row.jenisCatatan} />
                        <p className="text-xs text-slate-500">
                          {row.kelas} · {row.asesmen}
                        </p>
                        <p className="mt-1 text-[10px] font-semibold text-sky-800">Terkirim{waktu ? ` · ${waktu}` : ''}</p>
                        <RiwayatWaktuPemeriksaanHq baris={row} />
                      </td>
                      <td className="px-3 py-2 text-slate-700">{row.materi || 'Belum ada materi'}</td>
                      <td className="px-3 py-2 font-semibold">{teksCapaian(row.nilaiAkhir, row.predikat)}</td>
                      <td className="px-3 py-2">{row.namaGuru || '-'}</td>
                      <td className="px-3 py-2">
                        <CatatanPemeriksaHq
                          nilai={catatan[kunci] ?? ''}
                          onUbah={(teks) => setCatatan((semua) => ({ ...semua, [kunci]: teks }))}
                          menyimpan={menyimpanCatatan === kunci}
                          onSimpanRevisi={() => void simpanCatatan(row, 'revisi')}
                          onKonfirmasiSiapCetak={() => void simpanCatatan(row, 'konfirmasi')}
                          labelAria={`Catatan pemeriksa untuk ${row.namaSiswa}`}
                          ringkas={teksRiwayatRingkasCatatanHq(row)}
                          jenisTersimpan={row.jenisCatatan}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <BadgeLolosPemeriksaan lolos={diperiksa} jenis={row.jenisCatatan} />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => setPratinjau(row)}
                          className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-[11px] font-bold text-slate-800 hover:bg-slate-50"
                        >
                          Detail
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {pratinjau ? <PratinjauRaporHqKepsek baris={pratinjau} onTutup={() => setPratinjau(null)} /> : null}
    </div>
  )
}

function kunciBaris(row: Pick<KirimRaporHq, 'idSiswa' | 'asesmen'>) {
  return `${row.idSiswa}|${row.asesmen}`
}

type StatusSaringHq = 'semua' | 'lolos' | 'belum'
