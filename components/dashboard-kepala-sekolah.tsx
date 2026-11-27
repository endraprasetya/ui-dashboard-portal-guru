'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  BookCheck,
  BookOpen,
  CalendarCheck2,
  ChevronRight,
  ClipboardCheck,
  FileText,
  GraduationCap,
  LogOut,
  Printer,
  RefreshCw,
  ShieldAlert,
  Users,
  UserCheck,
} from 'lucide-react'
import { ModalHasilUjianKepsek } from '@/components/kepsek/modal-hasil-ujian'
import { ModalGuruBantu, ModalRaporHq } from '@/components/kepsek/modul-rapor-guru-bantu'
import { ModalRaporKurmer } from '@/components/kepsek/modal-rapor-kurmer'
import {
  ModalJurnal,
  ModalPresensiLengkap,
  ModalSetoran,
  ModalTertib,
  ModalTidakHadir,
} from '@/components/kepsek/detail-modals'
import { AbsensiMatriks } from '@/components/absensi-matriks'
import { RekapMatriksGuruBantu } from '@/components/guru-bantu/RekapMatriksGuruBantu'
import { muatRekapBulananGuruBantuKepsek, type RekapBulananGuruBantuKepsek } from '@/lib/kepsek-guru-bantu'
import { CetakUjianQiroah, type HasilUjianCetak } from '@/components/cetak-ujian-qiroah'
import {
  KEPALA_SEKOLAH,
  muatLaporanKepsek,
  type LaporanKepsek,
  type RekapLulus,
} from '@/lib/kepala-sekolah'
import { normalKelas, pemetaanKenaikanJilid, ujianTanpaTajwid } from '@/lib/qiroah'
import { todayInputValue } from '@/lib/jurnal'
import { PILIHAN_ASESMEN_RAPOR_HQ } from '@/lib/kepsek-rapor-hq'
import { MonitoringPiketHariIni } from '@/components/kepsek/monitoring-piket'
import { muatKepatuhanGuru, type HasilKepatuhanGuru } from '@/lib/kepatuhan-guru-kepsek'
import { MonitoringSidiaAbsensiReguler } from '@/components/kepsek/monitoring-sidia-absensi'
import { RekapBulananPresensiKaryawan } from '@/components/kepsek/rekap-bulanan-presensi-karyawan'
import { ModulKeuangan } from '@/components/kepsek/modul-keuangan'
import { MonitoringPengajuanKeringanan } from '@/components/kepsek/monitoring-keringanan'
import { LaporanKeuangan } from '@/components/laporan-keuangan'
import { tujuanSetelahLogin, validasiSesiKepalaSekolah, type AkunSesi } from '@/lib/bendahara'
import { kanonNamaUnit } from '@/lib/siswa'
import { supabase } from '@/lib/supabase'
import { KANAL_REVISI_RAPOR_HQ, NAMA_SETTING_KIRIM_RAPOR } from '@/lib/rapor-hq-kirim'

type Panel = 'absensi' | 'absensi_guru_bantu' | 'qiroah' | 'skl' | null
type ModalKpi = 'presensi' | 'setoran' | 'tertib' | 'jurnal' | 'rapor_hq' | 'rapor_kurmer' | 'guru_bantu' | 'hasil_ujian' | null

const BATAS_TABEL = 6

const kelasKartu =
  'cursor-pointer rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-emerald-300 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700'

const ID_PINTASAN = {
  raporHq: 'pintasan-rapor-hq',
  raporKurmer: 'pintasan-rapor-kurmer',
  sidia: 'pintasan-absensi-sidia',
  guruBantu: 'pintasan-guru-bantu',
  jurnal: 'pintasan-jurnal',
  piket: 'pintasan-monitoring-piket',
} as const

function teksKelasRapor(kelas: string[]) {
  if (kelas.length === 0) return 'belum ada'
  const tampil = kelas.slice(0, 8)
  const sisa = kelas.length - tampil.length
  return sisa > 0 ? `${tampil.join(', ')}, dan ${sisa} kelas lain` : tampil.join(', ')
}

function lompatKePintasan(id: string) {
  const el = document.getElementById(id)
  if (!el) return
  el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  window.setTimeout(() => {
    el.classList.add('ring-2', 'ring-emerald-400/80', 'ring-offset-2')
    window.setTimeout(() => el.classList.remove('ring-2', 'ring-emerald-400/80', 'ring-offset-2'), 1600)
  }, 400)
}

const kelasTombolNav =
  'inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-xl bg-white/10 px-2.5 py-2 text-[11px] font-bold transition hover:bg-white/20 sm:px-3 sm:text-xs'

function batang(nilai: number | null, tertinggi: number) {
  if (nilai == null || tertinggi <= 0) return '0%'
  return `${Math.max(4, Math.round((nilai / tertinggi) * 100))}%`
}

function StatusGuru({ nilai }: { nilai: string }) {
  const warna =
    nilai === 'Sudah' ? 'bg-emerald-100 text-emerald-800' : nilai === 'Belum' ? 'bg-amber-100 text-amber-900' : 'bg-slate-100 text-slate-500'
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${warna}`}>{nilai}</span>
}

function keHasil(row: RekapLulus): HasilUjianCetak {
  const peta = pemetaanKenaikanJilid('', row.jilid_asal, row.jilid_tujuan)
  const tanpaTajwid = ujianTanpaTajwid('', peta.tujuan, peta.asal)
  return {
    nomor: row.id_ujian,
    nama: row.nama,
    kelas: row.kelas,
    unit: row.unit,
    idSiswa: row.id_siswa,
    tanggal: row.tanggal_ujian,
    penguji: row.penguji,
    guruPengampu: row.guru_pengampu,
    jilidAsal: peta.asal,
    jilidTujuan: peta.tujuan,
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
  const [user, setUser] = useState<AkunSesi | null>(null)
  const [tujuan, setTujuan] = useState('/')
  const [laporan, setLaporan] = useState<LaporanKepsek | null>(null)
  const [galat, setGalat] = useState('')
  const [panel, setPanel] = useState<Panel>(null)
  const [kelasCetak, setKelasCetak] = useState('')
  const [bulanCetak, setBulanCetak] = useState(todayInputValue().slice(0, 7))
  const [rekapGuruBantu, setRekapGuruBantu] = useState<RekapBulananGuruBantuKepsek | null>(null)
  const [memuatRekapGuruBantu, setMemuatRekapGuruBantu] = useState(false)
  const [skl, setSkl] = useState<HasilUjianCetak | null>(null)
  const [modalKpi, setModalKpi] = useState<ModalKpi>(null)
  const [rincianAbsen, setRincianAbsen] = useState(false)
  const [guruLengkap, setGuruLengkap] = useState(false)
  const [kepatuhan, setKepatuhan] = useState<HasilKepatuhanGuru | null>(null)
  const [memuatKepatuhan, setMemuatKepatuhan] = useState(false)
  const [ujianLengkap, setUjianLengkap] = useState(false)
  const [penyegarHq, setPenyegarHq] = useState(0)
  const [pesanPemeriksaHq, setPesanPemeriksaHq] = useState('')

  useEffect(() => {
    let batal = false
    ;(async () => {
      try {
        const raw = localStorage.getItem('user_session')
        const sesi = raw ? (JSON.parse(raw) as AkunSesi) : null
        const hasil = await validasiSesiKepalaSekolah(sesi)
        if (batal) return
        if (hasil.status !== 'ok') {
          setTujuan(hasil.status === 'bukan' ? tujuanSetelahLogin(hasil.user) : '/')
          setSiap('tolak')
          return
        }
        const unitAkun = kanonNamaUnit(String(hasil.user.unit || '')) || String(hasil.user.unit || '').trim()
        setUser(hasil.user)
        if (!unitAkun) {
          setGalat('Unit akun belum terbaca dari tabel users. Data tidak dialihkan ke unit Nogosari.')
        }
        setSiap('siap')
      } catch (error) {
        if (batal) return
        setGalat(error instanceof Error ? error.message : 'Tidak dapat memvalidasi sesi Kepala Sekolah.')
        setSiap('siap')
      }
    })()
    return () => {
      batal = true
    }
  }, [])

  useEffect(() => {
    if (siap === 'tolak') window.location.replace(tujuan)
  }, [siap, tujuan])

  useEffect(() => {
    if (siap !== 'siap' || !user) return
    const unitAkun = kanonNamaUnit(String(user.unit || '')) || String(user.unit || '').trim()
    if (!unitAkun) return
    let batal = false
    muatLaporanKepsek(new Date(), unitAkun)
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
  }, [siap, user, penyegarHq])

  useEffect(() => {
    if (siap !== 'siap' || !user) return
    const unitAkun = kanonNamaUnit(String(user.unit || '')) || String(user.unit || '').trim()
    if (!unitAkun) return
    let batal = false
    setMemuatKepatuhan(true)
    muatKepatuhanGuru(unitAkun)
      .then((hasil) => {
        if (!batal) setKepatuhan(hasil)
      })
      .finally(() => {
        if (!batal) setMemuatKepatuhan(false)
      })
    return () => {
      batal = true
    }
  }, [siap, user])

  const muatUlangKepatuhan = () => {
    const unitAkun = kanonNamaUnit(String(user?.unit || '')) || String(user?.unit || '').trim()
    if (!unitAkun) return
    setMemuatKepatuhan(true)
    muatKepatuhanGuru(unitAkun, { segar: true })
      .then((hasil) => setKepatuhan(hasil))
      .finally(() => setMemuatKepatuhan(false))
  }

  useEffect(() => {
    if (siap !== 'siap') return
    const kanalSetting = supabase
      .channel(`kepsek-hq-setting-${Math.random().toString(36).slice(2)}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'setting', filter: `nama_variabel=eq.${NAMA_SETTING_KIRIM_RAPOR}` },
        () => setPenyegarHq((nilai) => nilai + 1),
      )
    const kanalSiaran = supabase
      .channel(KANAL_REVISI_RAPOR_HQ)
      .on('broadcast', { event: 'pemeriksa' }, (pesan) => {
        const muatan = (pesan?.payload || {}) as {
          namaSiswa?: string
          kelas?: string
          asesmen?: string
          pemeriksaNama?: string
          jenisCatatan?: string
        }
        const nama = String(muatan.namaSiswa || 'Siswa').trim()
        const kelas = String(muatan.kelas || '').trim()
        const asesmen = String(muatan.asesmen || '').trim()
        const pemeriksa = String(muatan.pemeriksaNama || 'Pemeriksa HQ').trim()
        const siap = muatan.jenisCatatan === 'konfirmasi'
        const revisi = muatan.jenisCatatan === 'revisi'
        setPesanPemeriksaHq(
          revisi
            ? `${pemeriksa} mengirim catatan revisi untuk ${nama}${kelas ? ` (${kelas})` : ''}${asesmen ? ` · ${asesmen}` : ''}. Status: perlu perbaikan.`
            : siap
              ? `${pemeriksa} mengonfirmasi ${nama}${kelas ? ` (${kelas})` : ''}${asesmen ? ` · ${asesmen}` : ''} siap cetak.`
              : `${pemeriksa} menandai penilaian ${nama}${kelas ? ` (${kelas})` : ''}${asesmen ? ` · ${asesmen}` : ''} sudah diperiksa.`,
        )
        setPenyegarHq((nilai) => nilai + 1)
      })
      .on('broadcast', { event: 'pengajuan' }, () => {
        setPenyegarHq((nilai) => nilai + 1)
      })
    kanalSetting.subscribe()
    kanalSiaran.subscribe()
    return () => {
      void supabase.removeChannel(kanalSetting)
      void supabase.removeChannel(kanalSiaran)
    }
  }, [siap])

  useEffect(() => {
    if (siap !== 'siap' || panel !== 'absensi_guru_bantu' || !user) return
    const unitAkun = kanonNamaUnit(String(user.unit || '')) || String(user.unit || '').trim()
    if (!unitAkun) return
    let batal = false
    setMemuatRekapGuruBantu(true)
    muatRekapBulananGuruBantuKepsek(bulanCetak, unitAkun)
      .then((hasil) => {
        if (!batal) setRekapGuruBantu(hasil)
      })
      .catch(() => {
        if (!batal) setRekapGuruBantu(null)
      })
      .finally(() => {
        if (!batal) setMemuatRekapGuruBantu(false)
      })
    return () => {
      batal = true
    }
  }, [siap, panel, bulanCetak, user])

  const siswaKelas = useMemo(() => {
    if (!laporan || !kelasCetak) return []
    return laporan.siswa.filter((row) => normalKelas(row.kelas) === kelasCetak)
  }, [laporan, kelasCetak])

  const jurnalKelas = useMemo(() => {
    if (!laporan || !kelasCetak) return []
    const map = new Map<string, (typeof laporan.jurnalBulan)[number]>()
    for (const row of laporan.jurnalBulan) {
      const tanggal = String(row.tanggal || '').slice(0, 10)
      if (normalKelas(row.kelas) !== kelasCetak || !tanggal.startsWith(bulanCetak)) continue
      const kunci = `${tanggal}|${Number(row.jam) || 0}`
      if (!map.has(kunci)) map.set(kunci, row)
    }
    return [...map.values()]
  }, [laporan, kelasCetak, bulanCetak])

  const keluar = () => {
    localStorage.removeItem('user_session')
    window.location.assign('/')
  }

  if (galat && !user) {
    return (
      <main className="grid min-h-screen place-items-center px-4">
        <div className="max-w-md space-y-3 text-center">
          <p className="text-sm font-semibold text-red-700">{galat}</p>
          <button type="button" onClick={keluar} className="text-xs font-bold text-emerald-800 underline">
            Kembali ke halaman masuk
          </button>
        </div>
      </main>
    )
  }

  if (siap !== 'siap' || !user) {
    return <main className="grid min-h-screen place-items-center text-sm text-slate-500">Memeriksa sesi Kepala Sekolah...</main>
  }

  const unitTampil = kanonNamaUnit(String(user.unit || '')) || String(user.unit || '').trim()
  const namaKepsek = String(user.nama_lengkap || user.nama || user.username || 'Kepala Sekolah')
  const niyKepsek = String(user.niy || user.nip || (unitTampil === 'Nogosari' ? KEPALA_SEKOLAH.niy : ''))
  const kepsekTetap = { nama: namaKepsek, niy: niyKepsek }

  const angka = laporan?.kehadiran
  const tidakHadirTotal = (angka?.sakit || 0) + (angka?.izin || 0) + (angka?.alpa || 0)
  const puncakPredikat = Math.max(1, ...(laporan?.predikat.map((item) => item.jumlah) || [0]))
  const dariKepatuhan =
    kepatuhan && (kepatuhan.baris.length > 0 || kepatuhan.catatan.length === 0) ? kepatuhan.baris : null
  const daftarGuru = dariKepatuhan ?? laporan?.guru ?? []
  const guruTabel = guruLengkap ? daftarGuru : daftarGuru.slice(0, BATAS_TABEL)
  const ujianTabel = ujianLengkap ? laporan?.ujian || [] : (laporan?.ujian || []).slice(0, BATAS_TABEL)
  const labelAsesmenRapor =
    PILIHAN_ASESMEN_RAPOR_HQ.find((item) => item.kode === laporan?.raporHqRingkas.asesmen)?.label || 'ASTS 1'

  return (
    <div className="min-h-screen bg-[#f4f7f5] text-slate-800">
      <style>{`
        html { scroll-behavior: smooth; }
        @media print {
          .no-print { display: none !important; }
          body { background: #fff !important; }
        }
      `}</style>
      <header className="no-print border-b border-emerald-900/10 bg-[#143d32] text-white">
        <div className="mx-auto max-w-7xl space-y-3 px-4 py-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-100">Executive Dashboard</p>
              <h1 className="text-lg font-black">Dashboard Kepala Sekolah</h1>
              <p className="text-xs text-emerald-50/80">
                {namaKepsek}
                {niyKepsek ? ` · NIY ${niyKepsek}` : ''} · Unit {unitTampil || 'belum diatur'}
              </p>
            </div>
            <button
              type="button"
              onClick={keluar}
              className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-white/10 px-3 py-2 text-xs font-bold hover:bg-white/20"
            >
              <LogOut className="size-3.5" /> Keluar
            </button>
          </div>
          <nav
            className="flex gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            aria-label="Pintasan dashboard"
          >
            <a href="#laporan-keuangan" className={kelasTombolNav}>
              Laporan kas
            </a>
            <a href="#keuangan-tunggakan" className={kelasTombolNav}>
              Tunggakan
            </a>
            <a href="#pengajuan-keringanan" className={kelasTombolNav}>
              Kegiatan sekolah
            </a>
            <a href="/data-siswa" className={kelasTombolNav}>
              Data Siswa
            </a>
            {laporan ? (
              <>
                <span className="mx-0.5 hidden h-8 w-px shrink-0 bg-white/20 sm:inline" aria-hidden />
                <button type="button" onClick={() => lompatKePintasan(ID_PINTASAN.raporHq)} className={kelasTombolNav}>
                  <GraduationCap className="size-3.5 shrink-0 opacity-90" />
                  Rapor HQ
                </button>
                <button type="button" onClick={() => lompatKePintasan(ID_PINTASAN.raporKurmer)} className={kelasTombolNav}>
                  <BookOpen className="size-3.5 shrink-0 opacity-90" />
                  Rapor Kurmer
                </button>
                <button type="button" onClick={() => lompatKePintasan(ID_PINTASAN.sidia)} className={kelasTombolNav}>
                  <UserCheck className="size-3.5 shrink-0 opacity-90" />
                  Absensi SIDIA
                </button>
                <button type="button" onClick={() => lompatKePintasan(ID_PINTASAN.guruBantu)} className={kelasTombolNav}>
                  <Users className="size-3.5 shrink-0 opacity-90" />
                  Guru Bantu
                </button>
                <button type="button" onClick={() => lompatKePintasan(ID_PINTASAN.jurnal)} className={kelasTombolNav}>
                  <FileText className="size-3.5 shrink-0 opacity-90" />
                  Jurnal
                </button>
                <button type="button" onClick={() => lompatKePintasan(ID_PINTASAN.piket)} className={kelasTombolNav}>
                  <ClipboardCheck className="size-3.5 shrink-0 opacity-90" />
                  Piket
                </button>
              </>
            ) : null}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6">
        {galat && <p className="no-print rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{galat}</p>}
        {unitTampil ? (
          <LaporanKeuangan unit={unitTampil} judul={`Laporan keuangan unit ${unitTampil}`} />
        ) : null}
        {unitTampil ? <ModulKeuangan unit={unitTampil} /> : null}
        {unitTampil ? <MonitoringPengajuanKeringanan unit={unitTampil} /> : null}
        {!laporan && !galat && <p className="no-print text-sm text-slate-500">Menyusun laporan dari data sekolah...</p>}
        {laporan && (
          <>
            {pesanPemeriksaHq ||
            laporan.raporHqRingkas.siswaDiperiksaHq > 0 ||
            laporan.raporHqRingkas.hqMenungguPeriksa > 0 ? (
              <div className="no-print rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-950">
                <p className="font-extrabold">Notifikasi Pemeriksa Penilaian HQ</p>
                {pesanPemeriksaHq ? <p className="mt-1 text-xs font-semibold leading-relaxed">{pesanPemeriksaHq}</p> : null}
                {laporan.raporHqRingkas.putriMenungguPeriksa > 0 ? (
                  <p className="mt-1 text-xs leading-relaxed">
                    <strong>{laporan.raporHqRingkas.putriMenungguPeriksa}</strong> penilaian siswa putri (kelas C dan D){' '}
                    menunggu pemeriksaan Ustadzah Ambar.
                  </p>
                ) : null}
                {laporan.raporHqRingkas.siswaDiperiksaHq > 0 ? (
                  <p className="mt-1 text-xs leading-relaxed">
                    Sudah diperiksa:{' '}
                    <strong className="text-emerald-800">{laporan.raporHqRingkas.hqSiapCetak}</strong> siap cetak ·{' '}
                    <strong className="text-amber-900">{laporan.raporHqRingkas.hqRevisi}</strong> revisi / perlu perbaikan.
                    Buka kartu Rapor HQ untuk rincian per siswa.
                  </p>
                ) : null}
              </div>
            ) : null}
            <section className="no-print grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <article
                role="button"
                tabIndex={0}
                className={kelasKartu}
                onClick={() => setModalKpi('presensi')}
                onKeyDown={(e) => e.key === 'Enter' && setModalKpi('presensi')}
              >
                <div className="flex items-center justify-between gap-2 text-emerald-800">
                  <div className="flex items-center gap-2">
                    <CalendarCheck2 className="size-4" />
                    <p className="text-xs font-extrabold uppercase">Kehadiran hari ini</p>
                  </div>
                  <ChevronRight className="size-4 text-slate-400" />
                </div>
                <p className="mt-3 text-2xl font-black text-slate-900">
                  {angka?.hadir ?? 0} <span className="text-sm font-bold text-slate-500">hadir</span>
                </p>
                <p className="mt-1 text-sm font-bold text-slate-700">{tidakHadirTotal} siswa tidak hadir</p>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setRincianAbsen(true)
                  }}
                  className="mt-2 text-left text-xs font-bold text-emerald-800 underline decoration-emerald-300 underline-offset-2"
                >
                  {tidakHadirTotal > 0 ? `Lihat ${tidakHadirTotal} siswa tidak hadir` : 'Lihat rincian ketidakhadiran'}
                </button>
                <p className="mt-2 text-[11px] text-slate-400">Ketuk kartu untuk presensi lengkap & tren 7 hari.</p>
              </article>
              <article
                role="button"
                tabIndex={0}
                className={kelasKartu}
                onClick={() => setModalKpi('setoran')}
                onKeyDown={(e) => e.key === 'Enter' && setModalKpi('setoran')}
              >
                <div className="flex items-center justify-between gap-2 text-sky-800">
                  <div className="flex items-center gap-2">
                    <BookCheck className="size-4" />
                    <p className="text-xs font-extrabold uppercase">Setoran hari ini</p>
                  </div>
                  <ChevronRight className="size-4 text-slate-400" />
                </div>
                <p className="mt-3 text-sm font-bold text-slate-700">
                  Tahfidz <span className="text-2xl font-black text-slate-900">{laporan.setoranTahfidz}</span>
                </p>
                <p className="text-sm font-bold text-slate-700">
                  Qiroah <span className="text-2xl font-black text-slate-900">{laporan.setoranQiroah}</span>
                </p>
                <p className="mt-2 text-[11px] text-slate-400">Ketuk untuk daftar sudah / belum setor.</p>
              </article>
              <article
                role="button"
                tabIndex={0}
                className={kelasKartu}
                onClick={() => setModalKpi('hasil_ujian')}
                onKeyDown={(e) => e.key === 'Enter' && setModalKpi('hasil_ujian')}
              >
                <div className="flex items-center justify-between gap-2 text-amber-800">
                  <div className="flex items-center gap-2">
                    <ClipboardCheck className="size-4" />
                    <p className="text-xs font-extrabold uppercase">Ujian jilid aktif</p>
                  </div>
                  <ChevronRight className="size-4 text-slate-400" />
                </div>
                <p className="mt-2 text-xs font-bold text-amber-900">{laporan.ujianBulan.label}</p>
                <p className="mt-2 text-lg font-black text-slate-900">
                  {laporan.ujianAktif} <span className="text-xs font-bold text-slate-500">pengajuan berjalan</span>
                </p>
                <ul className="mt-2 space-y-1 text-xs text-slate-600">
                  <li>{laporan.ujianBulan.totalPengajuan} pengajuan bulan ini</li>
                  <li>{laporan.ujianBulan.sudahUjian} sudah ujian · {laporan.hasilUjian.length} terekap di unit</li>
                  <li>
                    {laporan.ujianBulan.lulus} lulus · {laporan.ujianBulan.mengulang} mengulang
                  </li>
                </ul>
                <p className="mt-2 text-[11px] text-slate-400">Ketuk untuk rekapitulasi lengkap &amp; filter hasil.</p>
              </article>
              <article
                role="button"
                tabIndex={0}
                className={kelasKartu}
                onClick={() => setModalKpi('tertib')}
                onKeyDown={(e) => e.key === 'Enter' && setModalKpi('tertib')}
              >
                <div className="flex items-center justify-between gap-2 text-red-700">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="size-4" />
                    <p className="text-xs font-extrabold uppercase">Tertib point hari ini</p>
                  </div>
                  <ChevronRight className="size-4 text-slate-400" />
                </div>
                <p className="mt-3 text-2xl font-black text-slate-900">{laporan.tertibHariIni}</p>
                <p className="mt-1 text-xs text-slate-500">Catatan poin masuk hari ini.</p>
                <p className="mt-2 text-[11px] text-slate-400">Ketuk untuk riwayat kebaikan & pelanggaran.</p>
              </article>
            </section>

            <div id={ID_PINTASAN.sidia} className="scroll-mt-28 space-y-4 rounded-2xl transition-shadow">
              <MonitoringSidiaAbsensiReguler tanggal={laporan.tanggalLaporan} />
              <RekapBulananPresensiKaryawan />
            </div>

            <section className="no-print grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <article
                id={ID_PINTASAN.raporHq}
                role="button"
                tabIndex={0}
                className={`${kelasKartu} scroll-mt-28 transition-shadow`}
                onClick={() => setModalKpi('rapor_hq')}
                onKeyDown={(e) => e.key === 'Enter' && setModalKpi('rapor_hq')}
              >
                <div className="flex items-center justify-between gap-2 text-violet-900">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="size-4" />
                    <p className="text-xs font-extrabold uppercase">Rapor HQ</p>
                  </div>
                  <ChevronRight className="size-4 text-slate-400" />
                </div>
                <p className="mt-2 text-xs font-bold text-violet-800">
                  Asesmen {labelAsesmenRapor} · {laporan.raporHqMentah.semester} {laporan.raporHqMentah.tahunAjaran}
                </p>
                <p className="mt-2 text-sm text-slate-800">
                  <strong className="text-2xl font-black text-emerald-800">{laporan.raporHqRingkas.siswaSudah}</strong>{' '}
                  siswa sudah menyetorkan
                </p>
                <p className="mt-1 text-xs leading-relaxed text-slate-700">
                  Kelas masuk: {teksKelasRapor(laporan.raporHqRingkas.kelasSudah)}
                </p>
                <p className="mt-1 text-xs text-slate-600">
                  <strong className="text-amber-800">{laporan.raporHqRingkas.belum}</strong> kelas belum lengkap ·{' '}
                  {laporan.raporHqRingkas.total} kelas binaan
                </p>
                {laporan.raporHqRingkas.hqMenungguPeriksa > 0 ||
                laporan.raporHqRingkas.hqSiapCetak > 0 ||
                laporan.raporHqRingkas.hqRevisi > 0 ? (
                  <div className="mt-2 space-y-1 text-xs">
                    {laporan.raporHqRingkas.putriMenungguPeriksa > 0 ? (
                      <p className="rounded-lg bg-amber-100 px-2.5 py-1.5 font-bold text-amber-950">
                        {laporan.raporHqRingkas.putriMenungguPeriksa} putri kelas C/D menunggu pemeriksaan
                      </p>
                    ) : null}
                    {laporan.raporHqRingkas.hqSiapCetak > 0 ? (
                      <p className="rounded-lg bg-emerald-100 px-2.5 py-1.5 font-bold text-emerald-900">
                        {laporan.raporHqRingkas.hqSiapCetak} penilaian siap cetak
                      </p>
                    ) : null}
                    {laporan.raporHqRingkas.hqRevisi > 0 ? (
                      <p className="rounded-lg bg-amber-50 px-2.5 py-1.5 font-bold text-amber-900">
                        {laporan.raporHqRingkas.hqRevisi} penilaian perlu revisi
                      </p>
                    ) : null}
                  </div>
                ) : (
                  <p className="mt-2 text-[11px] text-slate-400">
                    Ketuk untuk rincian per siswa, status pemeriksaan, dan kelas yang belum menyetorkan.
                  </p>
                )}
              </article>
              <article
                id={ID_PINTASAN.raporKurmer}
                role="button"
                tabIndex={0}
                className={`${kelasKartu} scroll-mt-28 transition-shadow`}
                onClick={() => setModalKpi('rapor_kurmer')}
                onKeyDown={(e) => e.key === 'Enter' && setModalKpi('rapor_kurmer')}
              >
                <div className="flex items-center justify-between gap-2 text-indigo-900">
                  <div className="flex items-center gap-2">
                    <BookOpen className="size-4" />
                    <p className="text-xs font-extrabold uppercase">Rapor Kurmer</p>
                  </div>
                  <ChevronRight className="size-4 text-slate-400" />
                </div>
                <p className="mt-2 text-xs font-bold text-indigo-800">
                  Asesmen {laporan.raporKurmerRingkas.asesmen} · Semester {laporan.raporKurmerMentah.labelSemester}{' '}
                  {laporan.raporKurmerMentah.tahunAjaran}
                </p>
                <p className="mt-2 text-sm text-slate-800">
                  <strong className="text-2xl font-black text-emerald-800">{laporan.raporKurmerRingkas.siswaSudah}</strong>{' '}
                  siswa sudah menyetorkan
                </p>
                <p className="mt-1 text-xs leading-relaxed text-slate-700">
                  Kelas masuk: {teksKelasRapor(laporan.raporKurmerRingkas.kelasSudah)}
                </p>
                <p className="mt-1 text-xs text-slate-600">
                  <strong className="text-amber-800">{laporan.raporKurmerRingkas.belum}</strong> kelas belum lengkap ·{' '}
                  {laporan.raporKurmerRingkas.total} kelas
                </p>
                <p className="mt-2 text-[11px] text-slate-400">
                  {laporan.raporKurmerRingkas.siswaSudah > 0
                    ? 'Ketuk untuk status per wali kelas dan pratinjau rapor.'
                    : 'Belum ada kiriman. Ketuk untuk daftar kelas yang siap menerima nilai.'}
                </p>
              </article>
              <article
                id={ID_PINTASAN.guruBantu}
                role="button"
                tabIndex={0}
                className={`${kelasKartu} scroll-mt-28 transition-shadow`}
                onClick={() => setModalKpi('guru_bantu')}
                onKeyDown={(e) => e.key === 'Enter' && setModalKpi('guru_bantu')}
              >
                <div className="flex items-center justify-between gap-2 text-teal-900">
                  <div className="flex items-center gap-2">
                    <Users className="size-4" />
                    <p className="text-xs font-extrabold uppercase">Guru bantu</p>
                  </div>
                  <ChevronRight className="size-4 text-slate-400" />
                </div>
                <p className="mt-3 text-sm leading-relaxed text-slate-800">
                  <strong>{laporan.guruBantu.sudahAbsen}</strong> dari <strong>{laporan.guruBantu.total}</strong> guru sudah absen:{' '}
                  <span className="text-emerald-800">{laporan.guruBantu.hadir} Hadir</span>,{' '}
                  <span className="text-amber-800">{laporan.guruBantu.terlambat} Terlambat</span>,{' '}
                  <span>{laporan.guruBantu.tidakHadir} Tidak Hadir</span>
                </p>
                <p className="mt-2 text-[11px] text-slate-400">Ketuk untuk filter tanggal, detail jam & foto, serta rekap bulanan.</p>
              </article>
            </section>

            <article
              id={ID_PINTASAN.jurnal}
              role="button"
              tabIndex={0}
              className={`${kelasKartu} scroll-mt-28 transition-shadow no-print`}
              onClick={() => setModalKpi('jurnal')}
              onKeyDown={(e) => e.key === 'Enter' && setModalKpi('jurnal')}
            >
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-extrabold text-slate-900">Pantauan jurnal hari ini</h2>
                <ChevronRight className="size-4 text-slate-400" />
              </div>
              <p className="mt-1 text-xs text-slate-500">Unit {unitTampil}</p>
              <p className="mt-3 text-sm text-slate-800">
                <span className="font-bold">{laporan.jurnalRingkas.tanggal}</span> ·{' '}
                <strong className="text-emerald-800">{laporan.jurnalRingkas.terisi}</strong> sesi terisi ·{' '}
                <strong className="text-amber-800">{laporan.jurnalRingkas.belum}</strong> sesi belum
              </p>
              <p className="mt-2 text-[11px] text-slate-400">Ketuk untuk jurnal lengkap (filter tanggal, kelas, guru).</p>
            </article>

            <div id={ID_PINTASAN.piket} className="scroll-mt-28 rounded-2xl transition-shadow">
              <MonitoringPiketHariIni unit={unitTampil} />
            </div>

            {laporan.catatan.length > 0 && (
              <ul className="no-print space-y-1 text-xs text-amber-800">
                {laporan.catatan.map((item) => <li key={item}>{item}</li>)}
              </ul>
            )}

            <section className="no-print rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="text-sm font-extrabold text-slate-900">Distribusi predikat qiroah</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
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
            </section>

            <section className="no-print rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="text-sm font-extrabold text-slate-900">Monitoring kepatuhan guru</h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Unit {unitTampil}
                    {kepatuhan?.hari ? ` · ${kepatuhan.hari} (WIB)` : ''}. Sudah bila nama guru, ID guru, atau siswa/kelas
                    binaannya tercatat hari ini.
                    {kepatuhan?.dimuatPada
                      ? ` Dimuat ${new Date(kepatuhan.dimuatPada).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' })}.`
                      : ''}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={muatUlangKepatuhan}
                  disabled={memuatKepatuhan}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-bold text-emerald-900 hover:bg-slate-50 disabled:opacity-60"
                >
                  <RefreshCw className={`size-3.5 ${memuatKepatuhan ? 'animate-spin' : ''}`} />
                  {memuatKepatuhan ? 'Memuat…' : 'Muat ulang'}
                </button>
              </div>
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
                    {daftarGuru.length === 0 ? (
                      <tr><td colSpan={5} className="p-4 text-center text-slate-400">{memuatKepatuhan ? 'Memuat kepatuhan hari ini…' : 'Daftar guru belum tersedia.'}</td></tr>
                    ) : guruTabel.map((row) => (
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
              {kepatuhan && kepatuhan.catatan.length > 0 && (
                <ul className="mt-2 space-y-1 text-[11px] text-amber-800">
                  {kepatuhan.catatan.map((item) => <li key={item}>{item}</li>)}
                </ul>
              )}
              {daftarGuru.length > BATAS_TABEL && (
                <button
                  type="button"
                  onClick={() => setGuruLengkap((v) => !v)}
                  className="mt-3 w-full rounded-xl border border-slate-200 py-2 text-xs font-bold text-emerald-900 hover:bg-slate-50"
                >
                  {guruLengkap ? 'Tampilkan lebih ringkas' : `Lihat selengkapnya (${daftarGuru.length} guru)`}
                </button>
              )}
            </section>

            <section className="no-print rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="text-sm font-extrabold text-slate-900">Ujian kenaikan jilid · Unit {unitTampil}</h2>
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
                    ) : ujianTabel.map((row) => (
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
              {laporan.ujian.length > BATAS_TABEL && (
                <button
                  type="button"
                  onClick={() => setUjianLengkap((v) => !v)}
                  className="mt-3 w-full rounded-xl border border-slate-200 py-2 text-xs font-bold text-emerald-900 hover:bg-slate-50"
                >
                  {ujianLengkap ? 'Tampilkan lebih ringkas' : `Lihat selengkapnya (${laporan.ujian.length} pengajuan)`}
                </button>
              )}
            </section>

            <section className="no-print rounded-2xl border border-emerald-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2 text-emerald-900"><FileText className="size-4" /><h2 className="text-sm font-extrabold">Cetak laporan resmi</h2></div>
              <p className="mt-1 text-xs text-slate-500">
                Tanda tangan Kepala Sekolah memakai {namaKepsek}
                {niyKepsek ? `, NIY ${niyKepsek}` : ''}.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" onClick={() => setPanel('absensi')} className="rounded-xl bg-[#143d32] px-3 py-2 text-xs font-bold text-white">Rekap Absensi Bulanan (F4)</button>
                <button type="button" onClick={() => setPanel('absensi_guru_bantu')} className="rounded-xl bg-teal-800 px-3 py-2 text-xs font-bold text-white">Rekap Absensi Guru Bantu</button>
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
                  kepsekTetap={kepsekTetap}
                />
              </section>
            )}

            {panel === 'absensi_guru_bantu' && (
              <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="no-print mb-3 flex flex-wrap items-end gap-2">
                  <label className="text-xs font-bold">Bulan
                    <input type="month" value={bulanCetak} onChange={(event) => setBulanCetak(event.target.value)} className="mt-1 block rounded-lg border px-2 py-1.5" />
                  </label>
                </div>
                <RekapMatriksGuruBantu
                  rekap={rekapGuruBantu}
                  loading={memuatRekapGuruBantu}
                  unit={laporan.unit}
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
                  <p className="font-bold underline">{namaKepsek}</p>
                  {niyKepsek ? <p>NIY. {niyKepsek}</p> : null}
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
      {rincianAbsen && laporan && <ModalTidakHadir laporan={laporan} onTutup={() => setRincianAbsen(false)} />}
      {laporan && modalKpi === 'presensi' && <ModalPresensiLengkap laporan={laporan} onTutup={() => setModalKpi(null)} />}
      {laporan && modalKpi === 'setoran' && <ModalSetoran laporan={laporan} onTutup={() => setModalKpi(null)} />}
      {laporan && modalKpi === 'tertib' && <ModalTertib laporan={laporan} onTutup={() => setModalKpi(null)} />}
      {laporan && modalKpi === 'jurnal' && <ModalJurnal laporan={laporan} onTutup={() => setModalKpi(null)} />}
      {laporan && modalKpi === 'rapor_hq' && (
        <ModalRaporHq
          laporan={laporan}
          penulis={{ id: String(user.target_id || user.username || ''), nama: namaKepsek }}
          onTutup={() => setModalKpi(null)}
        />
      )}
      {laporan && modalKpi === 'rapor_kurmer' && <ModalRaporKurmer laporan={laporan} onTutup={() => setModalKpi(null)} />}
      {laporan && modalKpi === 'guru_bantu' && (
        <ModalGuruBantu rekap={laporan.guruBantu} unit={laporan.unit} onTutup={() => setModalKpi(null)} />
      )}
      {laporan && modalKpi === 'hasil_ujian' && (
        <ModalHasilUjianKepsek baris={laporan.hasilUjian} unit={laporan.unit} onTutup={() => setModalKpi(null)} />
      )}
      {skl && (
        <CetakUjianQiroah jenis="skl" data={skl} onClose={() => setSkl(null)} kepsekTetap={kepsekTetap} />
      )}
    </div>
  )
}
