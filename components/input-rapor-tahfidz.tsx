'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, BookOpen, CheckCircle2, ChevronDown, ClipboardCheck, Printer, Save, Search, Send, Trash2, Users, X } from 'lucide-react'
import { NilaiUjianTahfidz, type TargetNilaiUjian } from '@/components/nilai-ujian-tahfidz'
import { fetchSiswaBinaan, kunciUserGuru, type Siswa } from '@/lib/siswa'
import { fetchAllSurah, infoAyatMelebihi, type InfoBatasAyat, type Surah } from '@/lib/surah'
import { teacherDisplayName } from '@/lib/qiroah'
import { supabase } from '@/lib/supabase'
import {
  guruPenerimaRevisi,
  idGuruAktif,
  cabutKirimRaporHq,
  kirimRaporKeKepsek,
  muatKirimRaporHq,
  NAMA_SETTING_KIRIM_RAPOR,
  type KirimRaporHq,
} from '@/lib/rapor-hq-kirim'
import { fetchRiwayatSetoranTahfidz, ringkasRiwayatTahfidz, type RiwayatSetoranTahfidz } from '@/lib/tahfidz-riwayat'
import { periodeAjaranSekarang } from '@/lib/rapor-tahfidz-nilai'
import { formatDateString } from '@/lib/qiroah'
import { PanelStandarTargetTahfidz, ToggleTargetTahfidz } from '@/components/target-tahfidz-standar'
import { PeringatanBatasAyatDialog } from '@/components/peringatan-batas-ayat-dialog'
import { hitungSaranTargetTahfidz } from '@/lib/saran-target-rapor-tahfidz'
import {
  ASESMEN_TAHFIDZ,
  CONTOH_KETERANGAN_UJIAN,
  fetchMateriUjianTahfidz,
  fetchTeksJadwalUjianTahfidz,
  formatLabelMateri,
  formatRentangAyat,
  gabungMateriSiswa,
  hapusMateriUjianTahfidz,
  JUDUL_JADWAL_UJIAN_TAHFIDZ,
  sidikMateriUjian,
  simpanMateriUjianTahfidz,
  terapkanMateriUjianKeSiswa,
  validasiMateriUjian,
  type AsesmenTahfidz,
  type BarisMateriUjian,
  type MateriSurah,
} from '@/lib/materi-ujian-tahfidz'
import { hapusNilaiUjianTahfidz, selaraskanNilaiDenganMateri } from '@/lib/rapor-tahfidz-nilai'
import { DialogKonfirmasi } from '@/components/dialog-konfirmasi'

function kunciBarisUjian(row: { idSiswa: string; asesmen: string }) {
  return `${row.idSiswa}|${row.asesmen}`
}

function waktuKirim(iso: string) {
  const tanggal = new Date(iso)
  if (Number.isNaN(tanggal.getTime())) return ''
  return tanggal.toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export function InputRaporTahfidz({
  onBack,
  currentUser,
  fokus,
}: {
  onBack: () => void
  currentUser?: any
  fokus?: { idSiswa: string; asesmen: string } | null
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
  const [mengirim, setMengirim] = useState(false)
  const [centang, setCentang] = useState<string[]>([])
  const [peringatanKirim, setPeringatanKirim] = useState('')
  const [konfirmasiKirim, setKonfirmasiKirim] = useState<{ jumlah: number; nama: string[] } | null>(null)
  const [kiriman, setKiriman] = useState<KirimRaporHq[]>([])
  const [status, setStatus] = useState('')
  const [galat, setGalat] = useState(false)
  const [peringatanAyat, setPeringatanAyat] = useState<InfoBatasAyat | { pesan: string } | null>(null)
  const [nilaiTarget, setNilaiTarget] = useState<TargetNilaiUjian | null>(null)
  const [teksJadwalUjian, setTeksJadwalUjian] = useState('')
  const [riwayatTahfidz, setRiwayatTahfidz] = useState<RiwayatSetoranTahfidz[]>([])
  const [memuatRiwayat, setMemuatRiwayat] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const [targetTahfidzAktif, setTargetTahfidzAktif] = useState(true)
  const [ringkasTarget, setRingkasTarget] = useState('')
  const [menerapkan, setMenerapkan] = useState(false)
  const [menghapus, setMenghapus] = useState(false)
  const [tanyaTerapkan, setTanyaTerapkan] = useState(false)
  const [konfirmasiHapus, setKonfirmasiHapus] = useState<{ idSiswa: string; nama: string; asesmen: string } | null>(null)

  const terpilih = siswa.find((item) => item.id_siswa === idSiswa)

  useEffect(() => {
    let batal = false
    if (!currentUser) {
      setSiswa([])
      setMemuat(false)
      return () => {
        batal = true
      }
    }
    Promise.all([fetchSiswaBinaan(currentUser), fetchAllSurah()]).then(([daftarSiswa, daftarSurah]) => {
      if (batal) return
      setSiswa(daftarSiswa)
      setSurahs(daftarSurah)
      setMemuat(false)
    })
    return () => {
      batal = true
    }
  }, [kunciUserGuru(currentUser)])

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
    let batal = false
    const muat = () => {
      muatKirimRaporHq().then((hasil) => {
        if (!batal) setKiriman(hasil.data.filter((row) => guruPenerimaRevisi(row, currentUser)))
      })
    }
    muat()
    const kanal = supabase
      .channel(`rapor-hq-guru-${Math.random().toString(36).slice(2)}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'setting', filter: `nama_variabel=eq.${NAMA_SETTING_KIRIM_RAPOR}` },
        () => {
          if (!batal) muat()
        },
      )
    kanal.subscribe()
    return () => {
      batal = true
      void supabase.removeChannel(kanal)
    }
  }, [kunciUserGuru(currentUser), fokus?.idSiswa, fokus?.asesmen])

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
    if (!targetTahfidzAktif || !idSiswa || !asesmen) {
      setRingkasTarget('')
      return
    }
    let batal = false
    const materiRingkas = daftar
      .filter((row) => row.id_siswa === idSiswa && row.asesmen === asesmen)
      .map((row) => ({ nama: row.surah, ayat: row.ayat }))
    const kelas = siswa.find((s) => s.id_siswa === idSiswa)?.kelas || ''
    hitungSaranTargetTahfidz(idSiswa, kelas, asesmen, materiRingkas).then((saran) => {
      if (!batal) setRingkasTarget(saran?.ringkas || '')
    })
    return () => {
      batal = true
    }
  }, [targetTahfidzAktif, idSiswa, asesmen, daftar, siswa])

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

  const kunciFokus = fokus?.idSiswa ? kunciBarisUjian(fokus) : ''
  const semuaKunci = rekap.map(kunciBarisUjian)
  const jumlahCentang = semuaKunci.filter((kunci) => centang.includes(kunci)).length
  const semuaCentang = semuaKunci.length > 0 && jumlahCentang === semuaKunci.length

  const petaKirim = useMemo(() => {
    const { tahunAjaran, semester } = periodeAjaranSekarang()
    const peta = new Map<string, KirimRaporHq>()
    for (const row of kiriman) {
      if (row.tahunAjaran && row.tahunAjaran !== tahunAjaran) continue
      if (row.semester && row.semester !== semester) continue
      peta.set(kunciBarisUjian(row), row)
    }
    return peta
  }, [kiriman])

  useEffect(() => {
    if (!kunciFokus) return
    document.getElementById(`baris-ujian-${kunciFokus}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    const row = rekap.find((item) => kunciBarisUjian(item) === kunciFokus)
    if (!row) return
    setNilaiTarget((current) => {
      if (current?.idSiswa === row.idSiswa && current.asesmen === row.asesmen) return current
      return {
        idSiswa: row.idSiswa,
        nama: row.nama,
        kelas: row.kelas,
        asesmen: row.asesmen,
        keterangan: row.keterangan,
        surahs: daftar
          .filter((item) => item.id_siswa === row.idSiswa && item.asesmen === row.asesmen)
          .map((item) => ({ nama: item.surah, ayat: item.ayat })),
      }
    })
  }, [kunciFokus, rekap, daftar])

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
    setMateri((current) =>
      current.map((item) => {
        if (item.nomor !== nomor) return item
        const berikutnya = { ...item, [field]: nilai }
        const konteks = field === 'ayatMulai' ? `${item.nama} (ayat mulai)` : `${item.nama} (ayat selesai)`
        const info = infoAyatMelebihi(surahs, item.nama, nilai, konteks)
        if (info) setPeringatanAyat(info)
        return berikutnya
      }),
    )
  }

  const cekBatasAyat = (item: MateriSurah, field: 'ayatMulai' | 'ayatSelesai') => {
    const konteks = field === 'ayatMulai' ? `${item.nama} (ayat mulai)` : `${item.nama} (ayat selesai)`
    const info = infoAyatMelebihi(surahs, item.nama, item[field], konteks)
    if (info) setPeringatanAyat(info)
  }

  const bukaNilai = (idSiswaNilai: string, asesmenNilai: string) => {
    const row = rekap.find((item) => item.idSiswa === idSiswaNilai && item.asesmen === asesmenNilai)
    if (!row) return
    setIdSiswa(row.idSiswa)
    setAsesmen(row.asesmen as AsesmenTahfidz)
    setNilaiTarget({
      idSiswa: row.idSiswa,
      nama: row.nama,
      kelas: row.kelas,
      asesmen: row.asesmen,
      keterangan: row.keterangan,
      surahs: daftar
        .filter((item) => item.id_siswa === row.idSiswa && item.asesmen === row.asesmen)
        .map((item) => ({ nama: item.surah, ayat: item.ayat })),
    })
  }

  const ubahCentang = (kunci: string, aktif: boolean) => {
    setPeringatanKirim('')
    setCentang((current) => {
      if (aktif) return current.includes(kunci) ? current : [...current, kunci]
      return current.filter((item) => item !== kunci)
    })
  }

  const kirimTercentang = async () => {
    const sasaran = rekap.filter((row) => centang.includes(kunciBarisUjian(row)) && row.idSiswa)
    if (sasaran.length === 0) {
      setPeringatanKirim('Belum ada siswa yang dicentang. Centang siswa yang hasil penilaiannya akan dikirim ke Kepala Sekolah.')
      return
    }
    setMengirim(true)
    setPeringatanKirim('')
    const hasil = await kirimRaporKeKepsek(
      sasaran.map((row) => ({
        idSiswa: row.idSiswa,
        namaSiswa: row.nama,
        kelas: row.kelas,
        asesmen: row.asesmen,
        materi: row.materi,
        idGuru: idGuruAktif(currentUser),
        namaGuru: teacherDisplayName(currentUser),
      })),
    )
    setMengirim(false)
    if (hasil.error) {
      setPeringatanKirim(hasil.error)
      return
    }
    const segar = await muatKirimRaporHq()
    if (segar.error) {
      setPeringatanKirim('Pengiriman dilaporkan berhasil, tetapi status belum dapat dimuat ulang. Muat ulang halaman untuk memastikan.')
      return
    }
    const { tahunAjaran, semester } = periodeAjaranSekarang()
    const terbaca = sasaran.every((row) =>
      segar.data.some(
        (item) =>
          item.idSiswa === row.idSiswa &&
          item.asesmen === row.asesmen &&
          item.tahunAjaran === tahunAjaran &&
          item.semester === semester,
      ),
    )
    setKiriman(segar.data.filter((row) => guruPenerimaRevisi(row, currentUser)))
    if (!terbaca) {
      setPeringatanKirim('Data belum terbaca kembali dari penyimpanan. Hasil penilaian belum dipastikan tersimpan untuk Kepala Sekolah.')
      return
    }
    setCentang((current) => current.filter((kunci) => !sasaran.some((row) => kunciBarisUjian(row) === kunci)))
    setKonfirmasiKirim({ jumlah: hasil.jumlah, nama: sasaran.map((row) => row.nama) })
  }

  const muatUlangDaftar = async () => {
    if (siswa.length === 0) return
    const segar = await fetchMateriUjianTahfidz(siswa.map((item) => item.id_siswa))
    setDaftar(segar as BarisMateriUjian[])
  }

  const sidikForm = () =>
    sidikMateriUjian(materi.map((item) => ({ nama: item.nama, ayat: formatRentangAyat(item.ayatMulai, item.ayatSelesai) })))

  const sidikTersimpan = (id: string, jenis: string) =>
    sidikMateriUjian(
      daftar.filter((row) => row.id_siswa === id && row.asesmen === jenis).map((row) => ({ nama: row.surah, ayat: row.ayat })),
    )

  const tampilkanGalatMateri = (galatMateri: string) => {
    const info = materi
      .flatMap((item) => [
        infoAyatMelebihi(surahs, item.nama, item.ayatMulai, `${item.nama} (ayat mulai)`),
        infoAyatMelebihi(surahs, item.nama, item.ayatSelesai, `${item.nama} (ayat selesai)`),
      ])
      .find(Boolean)
    setPeringatanAyat(info || { pesan: galatMateri })
    setStatus(galatMateri)
    setGalat(true)
  }

  const terapkanDaftarSurah = async (opsi: { asesmen: string; materi: MateriSurah[]; keterangan: string }) => {
    const hasil = await terapkanMateriUjianKeSiswa({
      siswa: siswa.map((item) => ({ idSiswa: item.id_siswa, kelas: item.kelas })),
      asesmen: opsi.asesmen,
      materi: opsi.materi,
      keterangan: opsi.keterangan,
      guru: teacherDisplayName(currentUser),
    })
    if (hasil.error) return hasil
    const selaras = await selaraskanNilaiDenganMateri(
      siswa.map((item) => item.id_siswa),
      opsi.asesmen,
      opsi.materi.map((item) => ({ nama: item.nama, ayat: formatRentangAyat(item.ayatMulai, item.ayatSelesai) })),
    )
    if (selaras.error) return { error: selaras.error, jumlah: 0 }
    await muatUlangDaftar()
    return hasil
  }

  const eksekusiSimpan = async (semua: boolean) => {
    if (!terpilih || !asesmen) return
    setMenyimpan(true)
    setStatus('')
    if (semua) {
      const hasil = await terapkanDaftarSurah({ asesmen, materi, keterangan })
      setMenyimpan(false)
      if (hasil.error) {
        setStatus(`Gagal menerapkan: ${hasil.error}`)
        setGalat(true)
        return
      }
      setStatus(`Daftar surah diterapkan ke ${hasil.jumlah} siswa binaan. Nilai pada surah yang sama tetap dipertahankan.`)
      setGalat(false)
      setPanelSurah(false)
      return
    }

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

    await muatUlangDaftar()
    setStatus(`Materi ujian ${terpilih.nama_siswa} (${asesmen}) tersimpan.`)
    setGalat(false)
    setPanelSurah(false)
  }

  const handleSimpan = () => {
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
      tampilkanGalatMateri(galatMateri)
      return
    }
    const daftarBaru = sidikForm() !== sidikTersimpan(terpilih.id_siswa, asesmen)
    if (daftarBaru && siswa.length > 1) {
      setTanyaTerapkan(true)
      return
    }
    void eksekusiSimpan(false)
  }

  const terapkanSemuaSekali = () => {
    if (!asesmen) {
      setStatus('Pilih jenis asesmen.')
      setGalat(true)
      return
    }
    if (siswa.length === 0) {
      setStatus('Tidak ada siswa binaan.')
      setGalat(true)
      return
    }
    const galatMateri = validasiMateriUjian(surahs, materi)
    if (galatMateri) {
      tampilkanGalatMateri(galatMateri)
      return
    }
    setMenerapkan(true)
    setStatus('')
    void terapkanDaftarSurah({ asesmen, materi, keterangan }).then((hasil) => {
      setMenerapkan(false)
      if (hasil.error) {
        setStatus(`Gagal menerapkan: ${hasil.error}`)
        setGalat(true)
        return
      }
      setStatus(`Daftar surah diterapkan ke ${hasil.jumlah} siswa binaan. Nilai pada surah yang sama tetap dipertahankan.`)
      setGalat(false)
      setPanelSurah(false)
    })
  }

  const jalankanHapus = async () => {
    if (!konfirmasiHapus) return
    setMenghapus(true)
    setStatus('')
    const nilai = await hapusNilaiUjianTahfidz(konfirmasiHapus.idSiswa, konfirmasiHapus.asesmen)
    if (nilai.error) {
      setMenghapus(false)
      setStatus(`Gagal menghapus nilai: ${nilai.error}`)
      setGalat(true)
      return
    }
    const materiHapus = await hapusMateriUjianTahfidz(konfirmasiHapus.idSiswa, konfirmasiHapus.asesmen)
    if (materiHapus.error) {
      setMenghapus(false)
      setStatus(`Gagal menghapus materi ujian: ${materiHapus.error}`)
      setGalat(true)
      return
    }
    const kirim = await cabutKirimRaporHq(konfirmasiHapus.idSiswa, konfirmasiHapus.asesmen)
    const kunci = kunciBarisUjian(konfirmasiHapus)
    setCentang((current) => current.filter((item) => item !== kunci))
    if (nilaiTarget?.idSiswa === konfirmasiHapus.idSiswa && nilaiTarget.asesmen === konfirmasiHapus.asesmen) {
      setNilaiTarget(null)
    }
    await muatUlangDaftar()
    const segarKirim = await muatKirimRaporHq()
    if (!segarKirim.error) setKiriman(segarKirim.data.filter((row) => guruPenerimaRevisi(row, currentUser)))
    setMenghapus(false)
    setKonfirmasiHapus(null)
    if (kirim.error) {
      setStatus(`Penilaian ${konfirmasiHapus.nama} terhapus, tetapi status kirim ke Kepala Sekolah gagal dicabut: ${kirim.error}`)
      setGalat(true)
      return
    }
    setStatus(`Penilaian ${konfirmasiHapus.nama} (${konfirmasiHapus.asesmen}) dihapus.`)
    setGalat(false)
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

      <ToggleTargetTahfidz aktif={targetTahfidzAktif} onUbah={setTargetTahfidzAktif} />

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        {targetTahfidzAktif && (
          <div className="mb-4">
            <PanelStandarTargetTahfidz ringkas={ringkasTarget} />
          </div>
        )}
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block text-xs font-bold text-slate-600">
            Pilihan siswa
            <select
              value={idSiswa}
              onChange={(event) => setIdSiswa(event.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold"
            >
              <option value="">{memuat ? 'Memuat siswa binaan…' : siswa.length === 0 ? 'Tidak ada siswa binaan' : 'Pilih siswa binaan'}</option>
              {siswa.map((item) => (
                <option key={item.id_siswa} value={item.id_siswa}>
                  {item.nama_siswa} · {item.kelas}
                </option>
              ))}
            </select>
            <span className="mt-1 block font-medium text-slate-400">
              {memuat ? 'Memuat siswa binaan…' : siswa.length === 0 ? 'Tidak ada siswa binaan.' : `${siswa.length} siswa binaan`}
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
                    onBlur={() => cekBatasAyat(item, 'ayatMulai')}
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
                    onBlur={() => cekBatasAyat(item, 'ayatSelesai')}
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

        <button
          type="button"
          onClick={terapkanSemuaSekali}
          disabled={menyimpan || menerapkan}
          className="mt-3 inline-flex items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-4 py-2.5 text-sm font-bold text-sky-900 hover:bg-sky-100 disabled:opacity-50"
        >
          <Users className="size-4" /> {menerapkan ? 'Menerapkan…' : 'Terapkan ke Semua Siswa Binaan'}
        </button>

        <label className="mt-4 block text-xs font-bold text-slate-600">
          Indikator Penilaian
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
          disabled={menyimpan || menerapkan}
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-sky-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-sky-800 disabled:opacity-50"
        >
          <Save className="size-4" /> {menyimpan ? 'Menyimpan…' : 'Simpan'}
        </button>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-extrabold text-slate-800">Daftar materi ujian tahfidz</h3>
            <p className="mt-1 text-xs text-slate-500">
              Centang siswa yang hasil penilaiannya akan dikirim. Status terkirim tetap tersimpan setelah halaman dimuat ulang.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={rekap.length === 0}
              onClick={() => {
                setPeringatanKirim('')
                setCentang(semuaCentang ? [] : semuaKunci)
              }}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-[11px] font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              {semuaCentang ? 'Batalkan pilihan' : 'Pilih semua'}
            </button>
            <button
              type="button"
              disabled={mengirim}
              onClick={kirimTercentang}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-3 py-2 text-[11px] font-bold text-white hover:bg-emerald-800 disabled:opacity-50"
            >
              <Send className="size-3.5" /> {mengirim ? 'Mengirim…' : `Kirim ke Kepala Sekolah${jumlahCentang ? ` (${jumlahCentang})` : ''}`}
            </button>
          </div>
        </div>
        {peringatanKirim ? <p className="mt-3 text-sm font-semibold text-red-600">{peringatanKirim}</p> : null}
        {kiriman.some((row) => row.status === 'Revisi' && row.catatanRevisi) ? (
          <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-xs font-extrabold uppercase tracking-wide text-amber-900">Catatan revisi Kepala Sekolah</p>
            <ul className="mt-2 space-y-2 text-sm text-slate-800">
              {kiriman
                .filter((row) => row.status === 'Revisi' && row.catatanRevisi)
                .map((row) => (
                  <li key={`${row.idSiswa}-${row.asesmen}`} className="flex flex-wrap items-center justify-between gap-2">
                    <span>
                      <span className="font-bold">{row.namaSiswa}</span> · {row.asesmen}: {row.catatanRevisi}
                    </span>
                    <button
                      type="button"
                      onClick={() => bukaNilai(row.idSiswa, row.asesmen)}
                      className="rounded-lg bg-amber-800 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-amber-900"
                    >
                      Perbaiki penilaian
                    </button>
                  </li>
                ))}
            </ul>
          </div>
        ) : null}
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
                  <th className="px-3 py-2">
                      <input
                      type="checkbox"
                      checked={semuaCentang}
                      ref={(el) => {
                        if (el) el.indeterminate = jumlahCentang > 0 && !semuaCentang
                      }}
                      onChange={(event) => {
                        setPeringatanKirim('')
                        setCentang(event.target.checked ? semuaKunci : [])
                      }}
                      aria-label="Pilih semua siswa"
                      className="size-4 accent-emerald-700"
                    />
                  </th>
                  <th className="px-3 py-2">Siswa</th>
                  <th className="px-3 py-2">Asesmen</th>
                  <th className="px-3 py-2">Materi ujian</th>
                  <th className="px-3 py-2">Indikator Penilaian</th>
                  <th className="px-3 py-2">Guru</th>
                  <th className="px-3 py-2">Status kirim</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {rekap.map((row) => {
                  const kunci = kunciBarisUjian(row)
                  const kirim = petaKirim.get(kunci)
                  const sorot = kunciFokus === kunci
                  return (
                    <tr
                      key={kunci}
                      id={`baris-ujian-${kunci}`}
                      className={`scroll-mt-24 border-t border-slate-100 ${sorot ? 'bg-amber-50 ring-2 ring-inset ring-amber-300' : ''}`}
                    >
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={centang.includes(kunci)}
                          onChange={(event) => ubahCentang(kunci, event.target.checked)}
                          aria-label={`Pilih ${row.nama} untuk dikirim ke Kepala Sekolah`}
                          className="size-4 accent-emerald-700"
                        />
                      </td>
                      <td className="px-3 py-2 font-semibold text-slate-800">{row.nama}</td>
                      <td className="px-3 py-2">{row.asesmen}</td>
                      <td className="px-3 py-2">{row.materi}</td>
                      <td className="px-3 py-2 text-slate-600">{row.keterangan || '-'}</td>
                      <td className="px-3 py-2 text-slate-700">{row.guru || '-'}</td>
                      <td className="px-3 py-2">
                        {!kirim ? (
                          <span className="text-xs font-semibold text-slate-400">Belum dikirim</span>
                        ) : kirim.status === 'Revisi' ? (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-900">Ada koreksi</span>
                        ) : (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800">
                            Terkirim{waktuKirim(kirim.dikirimPada) ? ` · ${waktuKirim(kirim.dikirimPada)}` : ''}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex flex-wrap justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => bukaNilai(row.idSiswa, row.asesmen)}
                            className="inline-flex items-center gap-1 rounded-lg bg-emerald-700 px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-emerald-800"
                          >
                            <ClipboardCheck className="size-3" /> Nilai Ujian
                          </button>
                          <button
                            type="button"
                            onClick={() => setKonfirmasiHapus({ idSiswa: row.idSiswa, nama: row.nama, asesmen: row.asesmen })}
                            className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-red-700"
                          >
                            <Trash2 className="size-3" /> Hapus
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
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {nilaiTarget && (
        <NilaiUjianTahfidz
          target={nilaiTarget}
          onClose={() => setNilaiTarget(null)}
          targetTahfidzAktif={targetTahfidzAktif}
          surahs={surahs}
          guru={teacherDisplayName(currentUser)}
          bolehTerapkanSemua={siswa.length > 1}
          onTerapkanSurah={(daftarSurah, catatan) =>
            terapkanDaftarSurah({ asesmen: nilaiTarget.asesmen, materi: daftarSurah, keterangan: catatan })
          }
          onSelesai={() => {
            void muatUlangDaftar()
          }}
        />
      )}
      {konfirmasiKirim ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/55 p-4" role="dialog" aria-modal="true" aria-labelledby="judul-kirim-kepsek">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 size-6 shrink-0 text-emerald-600" />
              <div>
                <h2 id="judul-kirim-kepsek" className="text-base font-extrabold text-slate-900">
                  Hasil penilaian terkirim
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-700">
                  Hasil penilaian sudah terkirim ke Kepala Sekolah.
                </p>
                <p className="mt-2 text-sm text-slate-600">
                  {konfirmasiKirim.jumlah} siswa: {konfirmasiKirim.nama.join(', ')}
                </p>
              </div>
            </div>
            <button
              type="button"
              autoFocus
              onClick={() => setKonfirmasiKirim(null)}
              className="mt-4 w-full rounded-xl bg-emerald-700 py-2.5 text-sm font-bold text-white hover:bg-emerald-800"
            >
              OK
            </button>
          </div>
        </div>
      ) : null}
      {tanyaTerapkan ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/55 p-4" role="dialog" aria-modal="true" aria-labelledby="judul-terapkan-surah">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <h2 id="judul-terapkan-surah" className="text-base font-extrabold text-slate-900">
              Terapkan ke semua murid binaan?
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-700">
              Apa pilihan surah yang diujikan akan berlaku untuk semua murid binaan?
            </p>
            <p className="mt-2 text-xs text-slate-500">
              {siswa.length} siswa binaan
              {asesmen ? ` · ${asesmen}` : ''}. Nilai yang sudah ada pada surah yang sama tetap dipertahankan.
            </p>
            <div className="mt-4 flex flex-col gap-2">
              <button
                type="button"
                disabled={menyimpan}
                onClick={() => {
                  setTanyaTerapkan(false)
                  void eksekusiSimpan(true)
                }}
                className="rounded-xl bg-sky-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-sky-800 disabled:opacity-50"
              >
                {menyimpan ? 'Menyimpan…' : 'Ya, Terapkan ke Semua'}
              </button>
              <button
                type="button"
                disabled={menyimpan}
                onClick={() => {
                  setTanyaTerapkan(false)
                  void eksekusiSimpan(false)
                }}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-800 hover:bg-slate-50 disabled:opacity-50"
              >
                Tidak, Hanya Siswa Ini
              </button>
            </div>
          </div>
        </div>
      ) : null}
      <DialogKonfirmasi
        terbuka={Boolean(konfirmasiHapus)}
        pertanyaan="Apa Anda yakin akan menghapus ini?"
        keterangan={
          konfirmasiHapus
            ? `Penilaian ${konfirmasiHapus.nama} (${konfirmasiHapus.asesmen}) beserta materi ujian dan nilai yang tersimpan akan dihapus. Tindakan ini tidak dapat dibatalkan.`
            : undefined
        }
        labelYa={menghapus ? 'Menghapus…' : 'Ya, Hapus'}
        labelTidak="Tidak / Batal"
        berbahaya
        sedang={menghapus}
        onYa={() => void jalankanHapus()}
        onTidak={() => {
          if (!menghapus) setKonfirmasiHapus(null)
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
