'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { ambilBarisSiswa, fetchSiswaBinaan, isKelasAlumni, kunciUserGuru } from '@/lib/siswa'
import { formatZiyadahRecord, parseBagianAyat } from '@/lib/tahfidz'
import { cariSurah, daftarSurahBawaan } from '@/lib/surah'
import { jumlahHafalanDariPosisi } from '@/lib/halaman-mushaf-tahfidz'
import { teacherDisplayName } from '@/lib/qiroah'
import { SelTugasRumah } from '@/components/tahfidz-tugas-rumah'
import { ArrowLeft, Download, Printer, Search, Target, Users, ChevronDown, ChevronUp } from 'lucide-react'

const KATALOG_SURAH = daftarSurahBawaan()
const NAMA_BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']

function daftarBulanAjaran(tanggal = new Date()) {
  const bulanIni = tanggal.getMonth() + 1
  const tahun = tanggal.getFullYear()
  const awal = bulanIni >= 7 ? tahun : tahun - 1
  return Array.from({ length: 12 }, (_, indeks) => {
    const bulan = ((6 + indeks) % 12) + 1
    const tahunBulan = bulan >= 7 ? awal : awal + 1
    return {
      nilai: `${tahunBulan}-${String(bulan).padStart(2, '0')}`,
      label: `${NAMA_BULAN[bulan - 1]} ${tahunBulan}`,
    }
  })
}

function batasBulan(nilai: string) {
  const [tahun, bulan] = nilai.split('-').map(Number)
  const akhir = new Date(tahun, bulan, 0).getDate()
  const pad = (angka: number) => String(angka).padStart(2, '0')
  return {
    awal: `${tahun}-${pad(bulan)}-01`,
    akhir: `${tahun}-${pad(bulan)}-${pad(akhir)}`,
  }
}

function teksCapaian(record: any) {
  if (!record) return '-'
  const label = formatZiyadahRecord(record)
  return !label || label === '-' ? '-' : label
}

function jumlahDariSetoran(record: any) {
  const bagian = parseBagianAyat(teksCapaian(record))
  if (!bagian?.surah) return '-'
  const surah = cariSurah(KATALOG_SURAH, bagian.surah)
  const ayat = Number(bagian.selesai || bagian.mulai)
  if (!surah || !Number.isFinite(ayat) || ayat < 1) return '-'
  return jumlahHafalanDariPosisi(surah.nomor_surat, ayat)
}

function selCsv(nilai: string) {
  return `"${String(nilai ?? '').replace(/"/g, '""')}"`
}

export function TahfidzRekap({ onBack, currentUser }: { onBack: () => void; currentUser?: any }) {
  const [students, setStudents] = useState<any[]>([])
  const [selectedClass, setSelectedClass] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [bulanDipilih, setBulanDipilih] = useState('')
  const daftarBulan = useMemo(() => daftarBulanAjaran(), [])
  
  const [reportType, setReportType] = useState<'kelas' | 'siswa' | null>(null)
  const [reportData, setReportData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [showTarget, setShowTarget] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState<any>(null)

  const searchRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!currentUser) {
      setStudents([])
      return
    }
    fetchSiswaBinaan(currentUser).then(setStudents)
  }, [kunciUserGuru(currentUser)])

  // Memoize filtered students to avoid recalculating on every render
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const name = String(s.nama_siswa || '').toLowerCase()
      const query = searchQuery.trim().toLowerCase()
      if (!query) return true
      return name.includes(query)
    })
  }, [students, searchQuery])

  // Memoize unique classes
  const uniqueClasses = useMemo(() => {
    const classes = Array.from(new Set(students.map((s) => s.kelas))).filter((kelas) => kelas && !isKelasAlumni(kelas)).sort()
    return classes
  }, [students])

  // Tutup dropdown fast search saat klik di luar area input
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const parseCustomDate = (dateStr: string) => {
    if (!dateStr) return null
    try {
      if (dateStr.includes('/')) {
        const [datePart] = dateStr.split(' ')
        const [day, month, year] = datePart.split('/')
        return new Date(`${year}-${month}-${day}`)
      }
      return new Date(dateStr)
    } catch {
      return null
    }
  }

  const pilihBulan = (nilai: string) => {
    setBulanDipilih(nilai)
    if (!nilai) return
    const batas = batasBulan(nilai)
    setStartDate(batas.awal)
    setEndDate(batas.akhir)
  }

  const formatDateString = (dateStr: string) => {
    if (!dateStr) return '-'
    if (dateStr.includes('/')) {
      return dateStr.split(' ')[0]
    }
    try {
      const d = new Date(dateStr)
      if (isNaN(d.getTime())) return dateStr
      return d.toLocaleDateString('id-ID')
    } catch {
      return dateStr
    }
  }

  const unduhRekap = () => {
    const judul = ['No', 'Nama', 'Pengampu', 'Capaian Awal', 'Capaian Akhir', 'Jumlah Hafalan']
    const isi = [
      judul.map(selCsv).join(','),
      ...reportData.map((item, indeks) =>
        [String(indeks + 1), item.student.nama_siswa, item.pengampu, item.capaianAwal, item.capaianAkhir, item.jumlahHafalan]
          .map(selCsv)
          .join(','),
      ),
    ].join('\n')
    const blob = new Blob([`\uFEFF${isi}`], { type: 'text/csv;charset=utf-8' })
    const tautan = document.createElement('a')
    tautan.href = URL.createObjectURL(blob)
    tautan.download = `rekap-tahfidz-${selectedClass || 'kelas'}-${startDate || 'awal'}-${endDate || 'akhir'}.csv`
    tautan.click()
    URL.revokeObjectURL(tautan.href)
  }

  // Laporan Per Kelas
  const handleLoadClassReport = async () => {
    if (!selectedClass) {
      alert('Silakan pilih kelas terlebih dahulu!')
      return
    }
    if (!startDate || !endDate) {
      alert('Pilih bulan atau isi rentang tanggal terlebih dahulu.')
      return
    }
    setLoading(true)
    setReportType('kelas')

    const classStudents = students
      .filter((s) => String(s.kelas).trim() === selectedClass.trim())
      .sort((a, b) => String(a.nama_siswa || '').localeCompare(String(b.nama_siswa || ''), 'id'))
    const startObj = new Date(`${startDate}T00:00:00`)
    const endObj = new Date(`${endDate}T23:59:59`)
    const kolomKandidat = [
      'id_setoran, tanggal, id_siswa, hafalan_baru, ayat_mulai, ayat_selesai, surah_ziyadah, nama_ustadz, status',
      'id_setoran, tanggal, id_siswa, hafalan_baru, ayat_mulai, ayat_selesai, surah_ziyadah, status',
      'id_setoran, tanggal, id_siswa, hafalan_baru, ayat_mulai, ayat_selesai, nama_ustadz, status',
      'id_setoran, tanggal, id_siswa, hafalan_baru, ayat_mulai, ayat_selesai, status',
    ]
    let kolomDipakai = kolomKandidat[kolomKandidat.length - 1]
    const contoh = classStudents[0]
    if (contoh) {
      for (const kolom of kolomKandidat) {
        const cek = await supabase.from('setoran_tahfidz').select(kolom).eq('id_siswa', String(contoh.id_siswa)).limit(1)
        if (!cek.error || !/column|schema cache/i.test(cek.error.message || '')) {
          kolomDipakai = kolom
          break
        }
      }
    }
    const barisKelas = await ambilBarisSiswa(classStudents.map((student) => String(student.id_siswa)), (bagian, from, to) =>
      supabase.from('setoran_tahfidz').select(kolomDipakai).in('id_siswa', bagian).range(from, to),
    )
    const setoranPerSiswa = new Map<string, any[]>()
    for (const row of barisKelas) {
      const id = String(row.id_siswa || '')
      const daftar = setoranPerSiswa.get(id) || []
      daftar.push(row)
      setoranPerSiswa.set(id, daftar)
    }

    const results = classStudents.map((student) => {
        let setoranList = setoranPerSiswa.get(String(student.id_siswa)) || []

        setoranList.sort((a, b) => {
          const dateA = parseCustomDate(a.tanggal) || new Date(0)
          const dateB = parseCustomDate(b.tanggal) || new Date(0)
          return dateA.getTime() - dateB.getTime()
        })

        const dalamRentang = setoranList.filter((row) => {
          const itemDate = parseCustomDate(row.tanggal)
          if (!itemDate || Number.isNaN(itemDate.getTime())) return false
          return itemDate >= startObj && itemDate <= endObj && teksCapaian(row) !== '-'
        })
        const firstSetoran = dalamRentang[0] || null
        const lastSetoran = dalamRentang.length > 0 ? dalamRentang[dalamRentang.length - 1] : null
        const pengampu = String(lastSetoran?.nama_ustadz || firstSetoran?.nama_ustadz || teacherDisplayName(currentUser) || '').trim() || '-'

        return {
          student,
          pengampu,
          capaianAwal: teksCapaian(firstSetoran),
          capaianAkhir: teksCapaian(lastSetoran),
          jumlahHafalan: jumlahDariSetoran(lastSetoran),
        }
    })

    setReportData(results)
    setLoading(false)
  }

  // Fast Search Pilih Siswa Langsung Buka Laporan
  const handleSelectStudentFast = async (student: any) => {
    setSelectedStudent(student)
    setSearchQuery(student.nama_siswa)
    setIsSearchOpen(false)
    setLoading(true)
    setReportType('siswa')

    // Query efisien: hanya ambil field yang diperlukan
    const { data } = await supabase
      .from('setoran_tahfidz')
      .select('id_setoran, tanggal, id_siswa, hafalan_baru, ayat_mulai, ayat_selesai, status, keterangan, keterangan_pesan_hafalan, tugas_rumah, surah_tugas, ayat_mulai_tugas, ayat_selesai_tugas, konfirmasi_ortu, tipe_tugas, murojaah')
      .eq('id_siswa', String(student.id_siswa))

    let setoranList = data || []
    const startObj = startDate ? new Date(`${startDate}T00:00:00`) : null
    const endObj = endDate ? new Date(`${endDate}T23:59:59`) : null

    if (startObj || endObj) {
      setoranList = setoranList.filter((s) => {
        const itemDate = parseCustomDate(s.tanggal)
        if (!itemDate || isNaN(itemDate.getTime())) return false
        if (startObj && itemDate < startObj) return false
        if (endObj && itemDate > endObj) return false
        return true
      })
    }

    setoranList.sort((a, b) => {
      const dateA = parseCustomDate(a.tanggal) || new Date(0)
      const dateB = parseCustomDate(b.tanggal) || new Date(0)
      return dateB.getTime() - dateA.getTime()
    })

    setReportData(setoranList)
    setLoading(false)
  }

  // Pencarian seluruh siswa A–Z, tidak dibatasi kelas (kelas hanya untuk rekap)
  // Gunakan filteredStudents yang sudah di-memoize, limit 80 untuk performa
  const searchFilteredStudents = filteredStudents.slice(0, 80)

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * {
            visibility: hidden;
          }
          #printArea, #printArea * {
            visibility: visible;
          }
          #printArea {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: white !important;
            padding: 0 !important;
            margin: 0 !important;
            box-shadow: none !important;
            border: none !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}} />

      {/* Navigasi Atas */}
      <div className="no-print flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-white shadow transition hover:bg-amber-600"
        >
          <ArrowLeft className="size-4" /> Kembali ke Menu Tahfidz
        </button>

        {reportType && (
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow hover:bg-slate-800"
          >
            <Printer className="size-4" /> Cetak Laporan
          </button>
        )}
      </div>

      {/* Kartu Filter & Fast Search */}
      <div className="no-print rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <h2 className="text-lg font-extrabold text-slate-900 border-b border-slate-100 pb-3">
          Beranda Evaluasi & Rekap Tahfidz
        </h2>

        <div className="grid gap-3 grid-cols-1 sm:grid-cols-12 items-end">
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-bold text-slate-600">Pilih Bulan</label>
            <select
              value={bulanDipilih}
              onChange={(event) => pilihBulan(event.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-slate-50 p-2 text-xs font-medium focus:bg-white"
            >
              <option value="">Pilih Bulan</option>
              {daftarBulan.map((bulan) => (
                <option key={bulan.nilai} value={bulan.nilai}>
                  {bulan.label}
                </option>
              ))}
            </select>
          </div>

          {/* Rentang Tanggal */}
          <div className="sm:col-span-4">
            <label className="mb-1 block text-xs font-bold text-slate-600">Rentang Tanggal</label>
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-lg border border-slate-300 p-2 text-xs bg-slate-50 focus:bg-white"
              />
              <span className="text-xs font-bold text-slate-400">s/d</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-lg border border-slate-300 p-2 text-xs bg-slate-50 focus:bg-white"
              />
            </div>
          </div>

          {/* Pilih Kelas */}
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-bold text-slate-600">Pilih Kelas</label>
            <select
              value={selectedClass}
              onChange={(e) => {
                setSelectedClass(e.target.value)
                setSearchQuery('')
              }}
              className="w-full rounded-lg border border-slate-300 p-2 text-xs bg-slate-50 focus:bg-white font-medium"
            >
              <option value="">{uniqueClasses.length === 0 ? 'Tidak ada siswa binaan' : '-- Pilih Kelas --'}</option>
              {uniqueClasses.map((k) => (
                <option key={k} value={k}>Kelas {k}</option>
              ))}
            </select>
          </div>

          {/* Fast Search Santri Binaan (Pencarian Depan, Tengah, & Belakang) */}
          <div className="sm:col-span-4 relative" ref={searchRef}>
            <label className="mb-1 block text-xs font-bold text-slate-600">
              Cari Santri / Laporan Per Siswa (Fast Search)
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 size-4 text-blue-500" />
              <input
                type="text"
                placeholder="Ketik nama depan/tengah/belakang..."
                value={searchQuery}
                onFocus={() => setIsSearchOpen(true)}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setIsSearchOpen(true)
                }}
                className="w-full rounded-lg border border-blue-300 bg-blue-50/50 p-2 pl-9 pr-3 text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Dropdown Hasil Pencarian Cepat */}
            {isSearchOpen && (
              <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl">
                {filteredStudents.length > 0 ? (
                  searchFilteredStudents.map((student) => (
                    <button
                      key={student.id_siswa}
                      type="button"
                      onClick={() => handleSelectStudentFast(student)}
                      className="flex w-full items-center justify-between border-b border-slate-50 px-3 py-2 text-left text-xs transition hover:bg-blue-50"
                    >
                      <span className="font-bold text-slate-800">{student.nama_siswa}</span>
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                        Kelas {student.kelas}
                      </span>
                    </button>
                  ))
                ) : (
                  <div className="p-3 text-center text-xs text-slate-400">
                    {students.length === 0
                      ? 'Tidak ada siswa binaan.'
                      : `Santri dengan kata "${searchQuery}" tidak ditemukan`}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Tombol Tampilkan Laporan Kelas */}
        <div className="pt-1">
          <button
            type="button"
            onClick={handleLoadClassReport}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow transition hover:bg-blue-700"
          >
            <Users className="size-4" /> Tampilkan Rekap Kelas
          </button>
        </div>

        {/* Acuan Target Tahfidz */}
        <div>
          <button
            type="button"
            onClick={() => setShowTarget(!showTarget)}
            className="flex w-full items-center justify-between rounded-xl bg-emerald-50 px-4 py-2 text-xs font-bold text-emerald-800 border border-emerald-200 hover:bg-emerald-100"
          >
            <span className="flex items-center gap-2">
              <Target className="size-4 text-emerald-600" /> Standar Target Hafalan Tahfidz (Kelas 1 - 6)
            </span>
            {showTarget ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
          </button>

          {showTarget && (
            <div className="mt-2 rounded-xl border border-emerald-200 bg-white p-4 text-xs space-y-2 shadow-inner">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-700">
                <p><strong>Kelas 1:</strong> Surah An Naas s/d Al Insyiqaq</p>
                <p><strong>Kelas 2:</strong> Juz 30 & Juz 29 (Al Mulk & Al Qolam)</p>
                <p><strong>Kelas 3:</strong> Juz 29 (Al Haqqoh s/d Al Mursalat)</p>
                <p><strong>Kelas 4:</strong> Juz 28 (Al Mujadillah s/d Al Munafiqun)</p>
                <p><strong>Kelas 5:</strong> Juz 28 & Juz 27 (At Taghobun s/d An Najm)</p>
                <p><strong>Kelas 6:</strong> Al Qomar s/d Al Hadid</p>
              </div>
              <p className="pt-2 text-center font-bold text-emerald-700 border-t border-emerald-100">
                🎯 Target Standar Kelulusan SD: 4 Juz
              </p>
            </div>
          )}
        </div>
      </div>

      {/* HASIL LAPORAN */}
      <div id="printArea">
        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500 font-semibold text-xs">
            Sedang menarik data dari Supabase...
          </div>
        ) : (
          <>
            {reportType === 'kelas' && (
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
                <div className="border-b border-slate-200 pb-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-base font-extrabold text-blue-700">Laporan Capaian Kelas {selectedClass}</h3>
                    <p className="text-xs text-slate-500">
                      SD Al Madinah · Periode: {startDate ? new Date(startDate).toLocaleDateString('id-ID') : '-'} s/d {endDate ? new Date(endDate).toLocaleDateString('id-ID') : '-'}
                    </p>
                  </div>
                  <div className="no-print flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold bg-slate-100 px-3 py-1 rounded-full text-slate-600">
                      Total Santri: {reportData.length}
                    </span>
                    <button
                      type="button"
                      onClick={unduhRekap}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-800 hover:bg-slate-50"
                    >
                      <Download className="size-3.5" /> Export Excel / CSV
                    </button>
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-800"
                    >
                      <Printer className="size-3.5" /> Cetak Rekap
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-800 text-white font-bold text-center">
                        <th className="p-3 border border-slate-700 w-12">No</th>
                        <th className="p-3 border border-slate-700 text-left">Nama</th>
                        <th className="p-3 border border-slate-700 text-left">Pengampu</th>
                        <th className="p-3 border border-slate-700 text-blue-300">Capaian Awal</th>
                        <th className="p-3 border border-slate-700 text-emerald-300">Capaian Akhir</th>
                        <th className="p-3 border border-slate-700">Jumlah Hafalan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {reportData.map((item, idx) => (
                        <tr key={item.student.id_siswa} className="hover:bg-slate-50">
                          <td className="p-2.5 border text-center font-semibold text-slate-500">{idx + 1}</td>
                          <td className="p-2.5 border font-bold text-slate-800">{item.student.nama_siswa}</td>
                          <td className="p-2.5 border text-slate-700">{item.pengampu}</td>
                          <td className="p-2.5 border text-center font-bold text-blue-700">{item.capaianAwal}</td>
                          <td className="p-2.5 border text-center font-bold text-emerald-700">{item.capaianAkhir}</td>
                          <td className="p-2.5 border text-center font-bold text-slate-800">{item.jumlahHafalan}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {reportType === 'siswa' && selectedStudent && (
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
                <div className="border-b border-slate-200 pb-3 flex justify-between items-center">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900">{selectedStudent.nama_siswa}</h3>
                    <p className="text-xs text-slate-500">Kelas {selectedStudent.kelas} · ID: {selectedStudent.id_siswa}</p>
                  </div>
                  <span className="no-print text-xs bg-emerald-100 text-emerald-800 font-bold px-3 py-1 rounded-lg">
                    {reportData.length} Total Setoran
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-900 text-white uppercase tracking-wider font-bold">
                        <th className="p-2.5 border border-slate-800">Tanggal</th>
                        <th className="p-2.5 border border-slate-800">Ayat</th>
                        <th className="p-2.5 border border-slate-800 text-center">Status</th>
                        <th className="p-2.5 border border-slate-800">Tugas di Rumah</th>
                        <th className="p-2.5 border border-slate-800">Catatan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {reportData.map((row, index) => (
                        <tr key={row.id_setoran} className="hover:bg-slate-50">
                          <td className="p-2.5 border font-semibold whitespace-nowrap">
                            {formatDateString(row.tanggal)}
                          </td>
                          <td className="p-2.5 border font-bold text-slate-800">
                            {formatZiyadahRecord(row)}
                          </td>
                          <td className="p-2.5 border text-center font-bold text-emerald-700">
                            {row.status}
                          </td>
                          <td className="p-2.5 border text-slate-700">
                            <SelTugasRumah
                              record={row}
                              setoranBerikutnya={index > 0 ? reportData[index - 1] : null}
                            />
                          </td>
                          <td className="p-2.5 border text-slate-600">
                            {row.keterangan_pesan_hafalan || row.keterangan || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}