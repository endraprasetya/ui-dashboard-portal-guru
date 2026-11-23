'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Save, Search, Trash2, X } from 'lucide-react'
import {
  barisKosong,
  fetchNilaiUjianTahfidz,
  formatAngkaRapor,
  clampNilaiAdab,
  clampNilaiKelancaran,
  clampNilaiTajwid,
  MAKS_NILAI_ADAB,
  MAKS_NILAI_KELANCAN,
  MAKS_NILAI_AKHIR,
  MAKS_NILAI_TAJWID,
  MIN_NILAI_KELANCAN,
  MIN_NILAI_TAJWID,
  PEMBAGI_NILAI_AKHIR,
  nilaiKelancaranDariKesalahan,
  nilaiRaporTahfidz,
  nilaiSurah,
  nilaiTajwidOtomatis,
  ringkasanBobotKelancaran,
  ringkasanBobotTajwid,
  uraianKelancaran,
  uraianTajwid,
  uraianNilaiSurah,
  predikatNilai,
  bacaCadanganNilaiTarget,
  pulihkanNilaiTarget,
  simpanNilaiTargetUjian,
  simpanNilaiUjianTahfidz,
  tulisCadanganNilaiTarget,
  type MateriNilaiUjian,
  type NilaiSurahUjian,
} from '@/lib/rapor-tahfidz-nilai'
import {
  formatRentangAyat,
  sidikMateriUjian,
  simpanMateriUjianTahfidz,
  validasiMateriUjian,
  type MateriSurah,
} from '@/lib/materi-ujian-tahfidz'
import { cariSurah, infoAyatMelebihi, type InfoBatasAyat, type Surah } from '@/lib/surah'
import { PeringatanBatasAyatDialog } from '@/components/peringatan-batas-ayat-dialog'
import { ModalHitungTargetRapor } from '@/components/hitung-target-rapor-hq'
import { hitungSaranTargetTahfidz } from '@/lib/saran-target-rapor-tahfidz'
import { kriteriaTargetKelas } from '@/lib/kriteria-target-rapor-hq'
import { angkaKelas } from '@/lib/target-tahfidz'
import { DialogKonfirmasi } from '@/components/dialog-konfirmasi'

export type TargetNilaiUjian = {
  idSiswa: string
  nama: string
  kelas: string
  asesmen: string
  surahs: MateriNilaiUjian[]
  keterangan?: string
}

function namaSama(a: string, b: string) {
  return a.trim().toLowerCase() === b.trim().toLowerCase()
}

function pecahRentang(rentang: string) {
  const [mulai, selesai] = String(rentang || '')
    .split(/[-–]/)
    .map((item) => item.trim())
  return { mulai: mulai || '', selesai: selesai || mulai || '' }
}

function sidikBaris(baris: NilaiSurahUjian[]) {
  return sidikMateriUjian(baris.map((row) => ({ nama: row.namaSurat, ayat: row.rentangAyat })))
}

function materiSurahDariBaris(baris: NilaiSurahUjian[], katalog: Surah[]): MateriSurah[] {
  return baris.map((row) => {
    const surah = cariSurah(katalog, row.namaSurat)
    const { mulai, selesai } = pecahRentang(row.rentangAyat)
    return {
      nomor: surah?.nomor_surat || 0,
      nama: row.namaSurat,
      ayatMulai: mulai,
      ayatSelesai: selesai || mulai,
      jumlahAyat: surah?.jumlah_ayat || 999,
    }
  })
}

function gabungBaris(materi: MateriNilaiUjian[], tersimpan: NilaiSurahUjian[]) {
  return materi.map((item) => {
    const lama = tersimpan.find((row) => row.namaSurat.toLowerCase() === item.nama.toLowerCase())
    if (!lama) return barisKosong(item)
    return { ...lama, namaSurat: item.nama, rentangAyat: item.ayat || lama.rentangAyat }
  })
}

export function NilaiUjianTahfidz({
  target,
  onClose,
  targetTahfidzAktif = true,
  surahs = [],
  guru = '',
  bolehTerapkanSemua = false,
  onTerapkanSurah,
  onSelesai,
}: {
  target: TargetNilaiUjian
  onClose: () => void
  targetTahfidzAktif?: boolean
  surahs?: Surah[]
  guru?: string
  bolehTerapkanSemua?: boolean
  onTerapkanSurah?: (materi: MateriSurah[], keterangan: string) => Promise<{ error: string | null; jumlah: number }>
  onSelesai?: () => void
}) {
  const [baris, setBaris] = useState<NilaiSurahUjian[]>(target.surahs.map(barisKosong))
  const [capaianKompetensi, setCapaianKompetensi] = useState('')
  const [capaianTarget, setCapaianTarget] = useState('')
  const [motivasi, setMotivasi] = useState('')
  const [nilaiTarget, setNilaiTarget] = useState<number | ''>('')
  const [memuat, setMemuat] = useState(true)
  const [menyimpan, setMenyimpan] = useState(false)
  const [pesan, setPesan] = useState('')
  const [galat, setGalat] = useState(false)
  const [modalTarget, setModalTarget] = useState(false)
  const [panelSurah, setPanelSurah] = useState(false)
  const [cariSurah, setCariSurah] = useState('')
  const [dasarSurah, setDasarSurah] = useState('')
  const [konfirmasiSurah, setKonfirmasiSurah] = useState(false)
  const [konfirmasiSimpan, setKonfirmasiSimpan] = useState(false)
  const [hapusSurah, setHapusSurah] = useState<{ index: number; nama: string } | null>(null)
  const [peringatanAyat, setPeringatanAyat] = useState<InfoBatasAyat | { pesan: string } | null>(null)
  const detailAwal = useRef<NilaiSurahUjian[]>([])
  const panelRef = useRef<HTMLDivElement>(null)
  const targetDiubah = useRef(false)

  useEffect(() => {
    let batal = false
    targetDiubah.current = false
    setMemuat(true)
    fetchNilaiUjianTahfidz(target.idSiswa, target.asesmen).then((hasil) => {
      if (batal) return
      if (hasil.error && !targetDiubah.current) {
        setPesan(`Gagal memuat nilai tersimpan: ${hasil.error}`)
        setGalat(true)
      }
      const gabungan = gabungBaris(target.surahs, hasil.detail)
      detailAwal.current = hasil.detail
      setBaris(gabungan)
      setDasarSurah(sidikBaris(gabungan))
      setCapaianKompetensi(hasil.header?.capaianKompetensi || '')
      setMotivasi(hasil.header?.motivasi || '')
      const pulih = pulihkanNilaiTarget({
        dariBasis: hasil.header?.nilaiTarget,
        capaianBasis: hasil.header?.capaianTarget || '',
        cadangan: bacaCadanganNilaiTarget(target.idSiswa, target.asesmen),
      })
      if (!targetDiubah.current) {
        setCapaianTarget(pulih.capaianTarget)
        setNilaiTarget(pulih.nilaiTarget)
      }
      setMemuat(false)
      const sudahAdaNarasi = Boolean(
        hasil.header?.capaianTarget ||
          hasil.header?.capaianKompetensi ||
          hasil.header?.motivasi ||
          pulih.capaianTarget,
      )
      if (
        targetTahfidzAktif &&
        !sudahAdaNarasi &&
        pulih.nilaiTarget === '' &&
        target.surahs.length > 0
      ) {
        hitungSaranTargetTahfidz(target.idSiswa, target.kelas, target.asesmen, target.surahs).then((saran) => {
          if (!saran || batal || targetDiubah.current) return
          setNilaiTarget((sekarang) => (sekarang === '' ? saran.nilaiTarget : sekarang))
          setCapaianTarget((sekarang) => (sekarang.trim() ? sekarang : saran.capaianTarget))
          setMotivasi((sekarang) => (sekarang.trim() ? sekarang : saran.motivasi))
        })
      }
    })
    return () => {
      batal = true
    }
  }, [target, targetTahfidzAktif])

  useEffect(() => {
    function tutup(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) setPanelSurah(false)
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

  const pilihSurah = (surah: Surah, aktif: boolean) => {
    setBaris((current) => {
      if (!aktif) return current.filter((row) => !namaSama(row.namaSurat, surah.nama_surat))
      if (current.some((row) => namaSama(row.namaSurat, surah.nama_surat))) return current
      const lama = detailAwal.current.find((row) => namaSama(row.namaSurat, surah.nama_surat))
      if (lama) {
        return [
          ...current,
          {
            ...lama,
            namaSurat: surah.nama_surat,
            rentangAyat: lama.rentangAyat || `1-${surah.jumlah_ayat}`,
          },
        ]
      }
      return [...current, barisKosong({ nama: surah.nama_surat, ayat: `1-${surah.jumlah_ayat}` })]
    })
  }

  const ubahAyatBaris = (index: number, field: 'mulai' | 'selesai', nilai: string) => {
    setBaris((current) =>
      current.map((row, i) => {
        if (i !== index) return row
        const pecah = pecahRentang(row.rentangAyat)
        const mulai = field === 'mulai' ? nilai : pecah.mulai
        const selesai = field === 'selesai' ? nilai : pecah.selesai
        const konteks = field === 'mulai' ? `${row.namaSurat} (ayat mulai)` : `${row.namaSurat} (ayat selesai)`
        const info = infoAyatMelebihi(surahs, row.namaSurat, nilai, konteks)
        if (info) setPeringatanAyat(info)
        return { ...row, rentangAyat: formatRentangAyat(mulai, selesai) }
      }),
    )
  }

  const pakaiPoinTarget = (poin: number, capaian: string, kelas: number) => {
    const kriteria = kriteriaTargetKelas(kelas)
    const teksCapaian = `${kriteria.judul}. Capaian yang dipakai: ${capaian}. Nilai target ${poin} poin.`
    targetDiubah.current = true
    setNilaiTarget(poin)
    setCapaianTarget(teksCapaian)
    setModalTarget(false)
    setGalat(false)
    tulisCadanganNilaiTarget(target.idSiswa, target.asesmen, poin, teksCapaian)
    setPesan(`Nilai target ${poin} poin disimpan.`)
    void simpanNilaiTargetUjian({
      idSiswa: target.idSiswa,
      jenisAsesmen: target.asesmen,
      nilaiTarget: poin,
      capaianTarget: teksCapaian,
    }).then((hasil) => {
      if (hasil.error) {
        setPesan(`Nilai target ${poin} poin tersimpan di perangkat ini, tetapi gagal ditulis ke server: ${hasil.error}`)
        setGalat(true)
        return
      }
      setGalat(false)
      setPesan(`Nilai target ${poin} poin tersimpan untuk ${target.nama}.`)
    })
  }

  const ringkasan = useMemo(() => {
    const nilai = baris.map(nilaiSurah)
    if (nilai.some((item) => item == null)) return null
    const akhir = Math.round(((nilai as number[]).reduce((a, b) => a + b, 0) / nilai.length) * 100) / 100
    const target = nilaiTarget === '' ? null : Number(nilaiTarget)
    return {
      akhir,
      predikat: predikatNilai(akhir),
      rapor: nilaiRaporTahfidz(akhir, target),
    }
  }, [baris, nilaiTarget])

  const ubah = (index: number, patch: Partial<NilaiSurahUjian>) => {
    setBaris((current) => current.map((row, i) => (i === index ? { ...row, ...patch } : row)))
  }

  const galatMateri = () => {
    if (baris.length === 0) return 'Pilih minimal satu surah untuk materi ujian.'
    return validasiMateriUjian(surahs, materiSurahDariBaris(baris, surahs))
  }

  const simpanDengan = async (terapkanSemua: boolean) => {
    const galatDaftar = galatMateri()
    if (galatDaftar) {
      setPeringatanAyat({ pesan: galatDaftar })
      setPesan(galatDaftar)
      setGalat(true)
      setKonfirmasiSurah(false)
      return
    }

    setMenyimpan(true)
    setPesan('')
    setKonfirmasiSurah(false)
    if (targetTahfidzAktif) tulisCadanganNilaiTarget(target.idSiswa, target.asesmen, nilaiTarget, capaianTarget)
    const hasil = await simpanNilaiUjianTahfidz({
      idSiswa: target.idSiswa,
      jenisAsesmen: target.asesmen,
      baris,
      narasi: {
        capaianKompetensi,
        capaianTarget,
        motivasi,
        nilaiTarget: targetTahfidzAktif ? nilaiTarget : '',
      },
    })
    if (hasil.error) {
      setMenyimpan(false)
      setPesan(hasil.error)
      setGalat(true)
      return
    }

    const materi = materiSurahDariBaris(baris, surahs)
    const keterangan = target.keterangan || ''
    if (terapkanSemua && onTerapkanSurah) {
      const terapan = await onTerapkanSurah(materi, keterangan)
      setMenyimpan(false)
      if (terapan.error) {
        setPesan(`Nilai ${target.nama} tersimpan, tetapi daftar surah gagal diterapkan ke siswa lain: ${terapan.error}`)
        setGalat(true)
        return
      }
      setDasarSurah(sidikBaris(baris))
      setGalat(false)
      setPesan(
        `Nilai ujian ${target.nama} tersimpan. Daftar surah diterapkan ke ${terapan.jumlah} siswa binaan. Nilai pada surah yang sama tetap dipertahankan.`,
      )
      onSelesai?.()
      return
    }

    if (sidikBaris(baris) !== dasarSurah) {
      const materiHasil = await simpanMateriUjianTahfidz({
        idSiswa: target.idSiswa,
        kelas: target.kelas,
        asesmen: target.asesmen,
        materi,
        keterangan,
        guru,
      })
      if (materiHasil.error) {
        setMenyimpan(false)
        setPesan(`Nilai tersimpan, tetapi daftar surah gagal diperbarui: ${materiHasil.error}`)
        setGalat(true)
        return
      }
      onSelesai?.()
    }
    setMenyimpan(false)
    setDasarSurah(sidikBaris(baris))
    setGalat(false)
    setPesan(`Nilai ujian ${target.nama} tersimpan. Nilai akhir ${hasil.nilaiAkhir} (${hasil.predikat}).`)
  }

  const handleSimpan = () => {
    const galatDaftar = galatMateri()
    if (galatDaftar) {
      setPeringatanAyat({ pesan: galatDaftar })
      setPesan(galatDaftar)
      setGalat(true)
      return
    }
    setKonfirmasiSimpan(true)
  }

  const lanjutkanSimpanSetelahKonfirmasi = () => {
    setKonfirmasiSimpan(false)
    const surahBerubah = sidikBaris(baris) !== dasarSurah
    if (surahBerubah && bolehTerapkanSemua && onTerapkanSurah) {
      setKonfirmasiSurah(true)
      return
    }
    void simpanDengan(false)
  }

  return (
    <div className="fixed inset-0 z-[70] overflow-auto bg-slate-900/50 p-4">
      <div className="mx-auto max-w-4xl rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-3 rounded-t-2xl bg-[#2563eb] px-5 py-4 text-white">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-sky-100">Nilai ujian tahfidz</p>
            <h2 className="text-base font-black">{target.nama}</h2>
            <p className="text-xs text-sky-100">
              {target.kelas} · {target.asesmen} · ID {target.idSiswa}
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg bg-white/20 p-2 hover:bg-white/30">
            <X className="size-4" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <p className="text-xs text-slate-500">
            NA = (Kelancaran + Tajwid + Adab) ÷ {PEMBAGI_NILAI_AKHIR}. Kelancaran {MIN_NILAI_KELANCAN}–{MAKS_NILAI_KELANCAN}
            (contoh At-Tiin −13, An-Naba −4). Tajwid {MIN_NILAI_TAJWID}–{MAKS_NILAI_TAJWID} = 100 − (Mad+Dengung+Makhraj) ×
            bobot surat. Adab 0–10 diisi manual. Daftar surah bisa ditambah atau dikurangi, termasuk setelah siswa pernah dinilai.
          </p>

          <div ref={panelRef}>
            <p className="text-xs font-bold text-slate-600">Materi ujian</p>
            <button
              type="button"
              disabled={memuat}
              onClick={() => setPanelSurah((open) => !open)}
              className="mt-1 flex w-full items-center justify-between rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-left text-sm disabled:opacity-60"
            >
              <span className={baris.length ? 'font-semibold text-slate-800' : 'text-slate-400'}>
                {baris.length
                  ? baris.map((row) => (row.rentangAyat ? `${row.namaSurat} (Ayat ${row.rentangAyat})` : row.namaSurat)).join('; ')
                  : 'Pilih surah (bisa lebih dari satu)'}
              </span>
              <ChevronDown className={`size-4 shrink-0 text-slate-500 ${panelSurah ? 'rotate-180' : ''}`} />
            </button>
            {panelSurah && (
              <div className="mt-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
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
                    const aktif = baris.some((row) => namaSama(row.namaSurat, item.nama_surat))
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

          {memuat && <p className="text-sm text-slate-500">Memuat nilai tersimpan…</p>}

          {baris.map((row, index) => {
            const nilai = nilaiSurah(row)
            return (
              <section key={`${row.namaSurat}-${index}`} className="rounded-2xl border border-slate-200 p-4">
                <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-extrabold text-slate-800">{row.namaSurat}</h3>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <label className="text-[11px] font-bold text-slate-500">
                        Ayat mulai
                        <input
                          type="number"
                          min={1}
                          value={pecahRentang(row.rentangAyat).mulai}
                          disabled={memuat}
                          onChange={(event) => ubahAyatBaris(index, 'mulai', event.target.value)}
                          className="mt-1 w-24 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm disabled:bg-slate-100"
                        />
                      </label>
                      <label className="text-[11px] font-bold text-slate-500">
                        Ayat selesai
                        <input
                          type="number"
                          min={1}
                          value={pecahRentang(row.rentangAyat).selesai}
                          disabled={memuat}
                          onChange={(event) => ubahAyatBaris(index, 'selesai', event.target.value)}
                          className="mt-1 w-24 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm disabled:bg-slate-100"
                        />
                      </label>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-right text-xs font-bold text-sky-800">
                      <span className="block">NA: {nilai ?? '—'}</span>
                      {nilai != null ? <span className="block font-medium text-sky-700">{uraianNilaiSurah(row)}</span> : null}
                    </span>
                    <button
                      type="button"
                      disabled={memuat}
                      onClick={() => setHapusSurah({ index, nama: row.namaSurat })}
                      className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-red-700 disabled:opacity-50"
                    >
                      <Trash2 className="size-3" /> Hapus surah
                    </button>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <fieldset className="rounded-xl bg-emerald-50/70 p-3">
                    <legend className="px-1 text-xs font-black uppercase tracking-wide text-emerald-800">Kelancaran</legend>
                    <p className="mt-1 text-[10px] font-medium leading-snug text-emerald-950/80">
                      {ringkasanBobotKelancaran(row.namaSurat)}
                    </p>
                    <label className="mt-1 block text-[11px] font-bold text-slate-600">
                      Jumlah kesalahan
                      <input
                        type="number"
                        min={0}
                        value={row.kesalahanKelancaran}
                        onChange={(event) => {
                          const salah = event.target.value === '' ? '' : Number(event.target.value)
                          ubah(index, {
                            kesalahanKelancaran: salah,
                            nilaiKelancaran: nilaiKelancaranDariKesalahan(row.namaSurat, salah),
                          })
                        }}
                        className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                      />
                    </label>
                    {uraianKelancaran(row.namaSurat, row.kesalahanKelancaran, row.nilaiKelancaran) ? (
                      <p className="mt-1 text-[10px] font-semibold text-emerald-800">
                        {uraianKelancaran(row.namaSurat, row.kesalahanKelancaran, row.nilaiKelancaran)}
                      </p>
                    ) : null}
                    <label className="mt-2 block text-[11px] font-bold text-slate-600">
                      Nilai kelancaran
                      <input
                        type="number"
                        min={MIN_NILAI_KELANCAN}
                        max={MAKS_NILAI_KELANCAN}
                        value={row.nilaiKelancaran}
                        onChange={(event) =>
                          ubah(index, {
                            nilaiKelancaran:
                              event.target.value === '' ? '' : clampNilaiKelancaran(Number(event.target.value)),
                          })
                        }
                        className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                      />
                    </label>
                  </fieldset>

                  <fieldset className="rounded-xl bg-amber-50/70 p-3">
                    <legend className="px-1 text-xs font-black uppercase tracking-wide text-amber-900">Tajwid</legend>
                    <p className="mt-1 text-[10px] font-medium leading-snug text-amber-950/80">
                      {ringkasanBobotTajwid(row.namaSurat)}
                    </p>
                    <div className="mt-1 grid grid-cols-3 gap-2">
                      {(
                        [
                          ['Mad', 'kesalahanMad'],
                          ['Dengung', 'kesalahanDengung'],
                          ['Makhraj', 'kesalahanMakhraj'],
                        ] as const
                      ).map(([label, field]) => (
                        <label key={field} className="block text-[11px] font-bold text-slate-600">
                          {label}
                          <input
                            type="number"
                            min={0}
                            value={row[field]}
                            onChange={(event) => {
                              const salah = event.target.value === '' ? '' : Number(event.target.value)
                              const berikutnya = { ...row, [field]: salah }
                              ubah(index, {
                                [field]: salah,
                                nilaiTajwid: nilaiTajwidOtomatis(
                                  row.namaSurat,
                                  berikutnya.kesalahanMad,
                                  berikutnya.kesalahanDengung,
                                  berikutnya.kesalahanMakhraj,
                                ),
                              })
                            }}
                            className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                          />
                        </label>
                      ))}
                    </div>
                    <label className="mt-2 block text-[11px] font-bold text-slate-600">
                      Nilai tajwid
                      <input
                        type="number"
                        min={MIN_NILAI_TAJWID}
                        max={MAKS_NILAI_TAJWID}
                        value={row.nilaiTajwid}
                        onChange={(event) =>
                          ubah(index, {
                            nilaiTajwid: event.target.value === '' ? '' : clampNilaiTajwid(Number(event.target.value)),
                          })
                        }
                        className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                      />
                    </label>
                    {uraianTajwid(
                      row.namaSurat,
                      row.kesalahanMad,
                      row.kesalahanDengung,
                      row.kesalahanMakhraj,
                      row.nilaiTajwid,
                    ) ? (
                      <p className="mt-1 text-[10px] font-semibold text-amber-900">
                        {uraianTajwid(
                          row.namaSurat,
                          row.kesalahanMad,
                          row.kesalahanDengung,
                          row.kesalahanMakhraj,
                          row.nilaiTajwid,
                        )}
                      </p>
                    ) : null}
                  </fieldset>

                  <fieldset className="rounded-xl bg-sky-50/70 p-3">
                    <legend className="px-1 text-xs font-black uppercase tracking-wide text-sky-900">Adab</legend>
                    <label className="mt-1 block text-[11px] font-bold text-slate-600">
                      Nilai adab
                      <input
                        type="number"
                        min={0}
                        max={MAKS_NILAI_ADAB}
                        value={row.nilaiAdab}
                        onChange={(event) =>
                          ubah(index, {
                            nilaiAdab: event.target.value === '' ? '' : clampNilaiAdab(Number(event.target.value)),
                          })
                        }
                        className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                      />
                    </label>
                  </fieldset>
                </div>
              </section>
            )
          })}

          <section className="space-y-3 rounded-2xl border border-slate-200 p-4">
            <h3 className="text-sm font-extrabold text-slate-800">Catatan capaian rapor</h3>
            {targetTahfidzAktif ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-emerald-50 px-3 py-2">
                  <p className="text-[11px] font-bold text-emerald-900">Target tahfidz aktif</p>
                  <button
                    type="button"
                    onClick={() => setModalTarget(true)}
                    className="rounded-lg bg-emerald-700 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-emerald-800"
                  >
                    Hitung Target
                  </button>
                </div>
                <label className="block text-[11px] font-bold text-slate-600">
                  Nilai target
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={nilaiTarget}
                    onChange={(event) => {
                      const angka = event.target.value === '' ? '' : Number(event.target.value)
                      targetDiubah.current = true
                      setNilaiTarget(angka)
                      tulisCadanganNilaiTarget(target.idSiswa, target.asesmen, angka, capaianTarget)
                    }}
                    placeholder="0–100"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                  <span className="mt-1 block font-medium text-slate-500">
                    Dipakai rumus rapor: ((2 × nilai rata-rata) + nilai target) / 3
                  </span>
                </label>
                <label className="block text-[11px] font-bold text-slate-600">
                  Capaian target
                  <textarea
                    value={capaianTarget}
                    onChange={(event) => {
                      targetDiubah.current = true
                      const teks = event.target.value
                      setCapaianTarget(teks)
                      tulisCadanganNilaiTarget(target.idSiswa, target.asesmen, nilaiTarget, teks)
                    }}
                    rows={3}
                    placeholder="Deskripsi capaian terhadap target hafalan..."
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </label>
              </>
            ) : (
              <p className="text-xs text-slate-500">
                Target tahfidz nonaktif. Aktifkan sakelar &quot;Target Tahfidz&quot; di halaman Input Rapor untuk mengisi nilai target
                dan narasi capaian.
              </p>
            )}
            <label className="block text-[11px] font-bold text-slate-600">
              Capaian kompetensi
              <textarea
                value={capaianKompetensi}
                onChange={(event) => {
                  targetDiubah.current = true
                  setCapaianKompetensi(event.target.value)
                }}
                rows={2}
                placeholder="Deskripsi capaian kompetensi siswa..."
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-[11px] font-bold text-slate-600">
              Motivasi / catatan ustadz
              <textarea
                value={motivasi}
                onChange={(event) => {
                  targetDiubah.current = true
                  setMotivasi(event.target.value)
                }}
                rows={2}
                placeholder="Motivasi atau catatan pembimbing..."
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
          </section>

          <div className="rounded-xl bg-slate-50 px-4 py-3 text-center text-sm">
            {ringkasan ? (
              <p>
                Nilai rata-rata: <strong className="text-sky-800">{ringkasan.akhir}</strong> · Predikat:{' '}
                <strong>{ringkasan.predikat}</strong>
                {ringkasan.rapor != null ? (
                  <>
                    {' '}
                    · Nilai rapor: <strong className="text-emerald-700">{formatAngkaRapor(ringkasan.rapor)}</strong>
                  </>
                ) : null}
              </p>
            ) : (
              <p className="text-slate-500">Lengkapi nilai setiap surah untuk melihat nilai akhir.</p>
            )}
            <p className="mt-1 text-[11px] text-slate-500">
              Predikat: Mumtaz (90–100), Jayyid Jiddan (80–89), Jayyid (70–79), Mengulang (di bawah 70).
            </p>
          </div>

          {pesan && (
            <p className={`rounded-xl px-3 py-2 text-sm font-semibold ${galat ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-800'}`}>
              {pesan}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700">
              Tutup
            </button>
            <button
              type="button"
              onClick={handleSimpan}
              disabled={menyimpan || memuat}
              className="inline-flex items-center gap-2 rounded-xl bg-sky-700 px-4 py-2 text-sm font-bold text-white hover:bg-sky-800 disabled:opacity-50"
            >
              <Save className="size-4" /> {menyimpan ? 'Menyimpan…' : 'Simpan Nilai'}
            </button>
          </div>
        </div>
      </div>
      {modalTarget ? (
        <ModalHitungTargetRapor
          kelasSiswa={angkaKelas(target.kelas)}
          onTutup={() => setModalTarget(false)}
          onPakai={pakaiPoinTarget}
        />
      ) : null}
      {konfirmasiSurah
        ? createPortal(
            <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-900/55 p-4" role="dialog" aria-modal="true" aria-labelledby="judul-terapkan-surah-nilai">
              <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
                <h2 id="judul-terapkan-surah-nilai" className="text-base font-extrabold text-slate-900">
                  Terapkan ke semua murid binaan?
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-700">
                  Apa pilihan surah yang diujikan akan berlaku untuk semua murid binaan?
                </p>
                <div className="mt-4 flex flex-col gap-2">
                  <button
                    type="button"
                    disabled={menyimpan}
                    onClick={() => void simpanDengan(true)}
                    className="rounded-xl bg-sky-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-sky-800 disabled:opacity-50"
                  >
                    {menyimpan ? 'Menyimpan…' : 'Ya, Terapkan ke Semua'}
                  </button>
                  <button
                    type="button"
                    disabled={menyimpan}
                    onClick={() => void simpanDengan(false)}
                    className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-800 hover:bg-slate-50 disabled:opacity-50"
                  >
                    Tidak, Hanya Siswa Ini
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
      <DialogKonfirmasi
        terbuka={Boolean(hapusSurah)}
        pertanyaan="Apa Anda yakin akan menghapus ini?"
        keterangan={hapusSurah ? `Surah ${hapusSurah.nama} akan dihapus dari daftar penilaian.` : undefined}
        labelYa="Ya, Hapus"
        labelTidak="Tidak / Batal"
        berbahaya
        onYa={() => {
          if (hapusSurah == null) return
          setBaris((current) => current.filter((_, i) => i !== hapusSurah.index))
          setHapusSurah(null)
        }}
        onTidak={() => setHapusSurah(null)}
      />
      <DialogKonfirmasi
        terbuka={konfirmasiSimpan}
        pertanyaan="Apa Anda yakin akan menyimpan data nilai siswa ini?"
        keterangan={`Nilai ujian ${target.nama} (${target.asesmen}) akan disimpan.`}
        labelYa="OK"
        labelTidak="Tidak"
        sedang={menyimpan}
        onYa={lanjutkanSimpanSetelahKonfirmasi}
        onTidak={() => {
          if (!menyimpan) setKonfirmasiSimpan(false)
        }}
      />
      {peringatanAyat ? (
        <PeringatanBatasAyatDialog
          info={'namaSurah' in peringatanAyat ? peringatanAyat : null}
          pesan={'pesan' in peringatanAyat ? peringatanAyat.pesan : null}
          onTutup={() => setPeringatanAyat(null)}
        />
      ) : null}
    </div>
  )
}
