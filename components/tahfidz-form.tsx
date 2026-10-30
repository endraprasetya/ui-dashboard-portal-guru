'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { fetchAllSiswa } from '@/lib/siswa'
import { fetchAllSurah } from '@/lib/surah'
import { ArrowLeft, Save, Edit3, XCircle, Search } from 'lucide-react'
import { BidangSuaraMandiri } from '@/components/input-suara'

function parseSetoranDate(dateStr: unknown): Date | null {
  if (!dateStr) return null
  const raw = String(dateStr).trim()
  if (!raw) return null

  const slashMatch = raw.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/,
  )
  if (slashMatch) {
    const [, dd, mm, yyyy, hh = '0', min = '0', ss = '0'] = slashMatch
    const parsed = new Date(
      Number(yyyy),
      Number(mm) - 1,
      Number(dd),
      Number(hh),
      Number(min),
      Number(ss),
    )
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }

  const iso = new Date(raw)
  return Number.isNaN(iso.getTime()) ? null : iso
}

function getSetoranTimestamp(record: any): number {
  const parsed = parseSetoranDate(record?.tanggal)
  if (parsed) return parsed.getTime()

  const idDigits = Number(String(record?.id_setoran || '').replace(/\D/g, ''))
  return Number.isFinite(idDigits) ? idDigits : 0
}

function pickLatestSetoran(records: any[], limit = 5) {
  return [...records]
    .sort((a, b) => getSetoranTimestamp(b) - getSetoranTimestamp(a))
    .slice(0, limit)
}

async function fetchSetoranSiswa(idSiswa: string) {
  const pageSize = 1000
  const all: any[] = []
  let from = 0

  while (true) {
    const { data, error } = await supabase
      .from('setoran_tahfidz')
      .select('*')
      .eq('id_siswa', idSiswa)
      .range(from, from + pageSize - 1)

    if (error) return { data: all, error }
    const rows = data || []
    all.push(...rows)
    if (rows.length < pageSize) break
    from += pageSize
  }

  return { data: all, error: null }
}

export function TahfidzForm({ onBack, currentUser }: { onBack: () => void; currentUser?: any }) {
  const [students, setStudents] = useState<any[]>([])
  const [surahs, setSurahs] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  // State Riwayat Terakhir & Mode Edit
  const [latestRecords, setLatestRecords] = useState<any[]>([])
  const [editIdSetoran, setEditIdSetoran] = useState('')
  const latestRecord = latestRecords[0] || null

  // State Form Utama
  const [idSiswa, setIdSiswa] = useState('')
  const [studentSearchQuery, setStudentSearchQuery] = useState('')
  const [isStudentSearchOpen, setIsStudentSearchOpen] = useState(false)
  const studentSearchRef = useRef<HTMLDivElement>(null)
  
  // Ziyadah State
  const [hSurah, setHSurah] = useState('')
  const [hMulai, setHMulai] = useState('')
  const [hSelesai, setHSelesai] = useState('')
  const [hNilai, setHNilai] = useState('')
  const [hPesan, setHPesan] = useState('')

  // Murojaah State (currently not used - kept for future use if needed)
  const [mSurahMulai, setMSurahMulai] = useState('')
  const [mSurahSelesai, setMSurahSelesai] = useState('')
  const [mMulaiA, setMMulaiA] = useState('')
  const [mSelesaiA, setMSelesaiA] = useState('')
  const [mMulaiE, setMMulaiE] = useState('')
  const [mSelesaiE, setMSelesaiE] = useState('')
  const [mPesan, setMPesan] = useState('')

  // Tugas di Rumah State
  const [tugasH, setTugasH] = useState(false)
  const [tugasZSurah, setTugasZSurah] = useState('')
  const [tugasZAyatMulai, setTugasZAyatMulai] = useState('')
  const [tugasZAyatSelesai, setTugasZAyatSelesai] = useState('')
  const [tugasZPesan, setTugasZPesan] = useState('')

  const [tugasM, setTugasM] = useState(false)
  const [tugasMSurah, setTugasMSurah] = useState('')
  const [tugasMSurahSelesai, setTugasMSurahSelesai] = useState('')
  const [tugasMAyatMulai, setTugasMAyatMulai] = useState('')
  const [tugasMAyatSelesai, setTugasMAyatSelesai] = useState('')
  const [tugasMAyatMulaiE, setTugasMAyatMulaiE] = useState('')
  const [tugasMAyatSelesaiE, setTugasMAyatSelesaiE] = useState('')
  const [tugasMPesan, setTugasMPesan] = useState('')

  // Tutup dropdown pencarian siswa saat klik di luar
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (studentSearchRef.current && !studentSearchRef.current.contains(event.target as Node)) {
        setIsStudentSearchOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Ambil daftar siswa dan daftar surah dari Supabase saat pertama buka
  useEffect(() => {
    async function fetchData() {
      const dataSiswa = await fetchAllSiswa(currentUser)
      setStudents(dataSiswa)

      // 2. Ambil data surah dari tabel Supabase dengan caching (urutan terbalik: An-Naas di atas)
      const dataSurah = await fetchAllSurah()
      setSurahs(dataSurah)
    }
    fetchData()
  }, [currentUser])

  // Fungsi saat Siswa Dipilih (Menampilkan Riwayat Terakhir)
  // Menggunakan useCallback untuk mencegah re-creation function pada setiap render
  const handleStudentChange = useCallback(async (selectedId: string, studentName?: string) => {
    setIdSiswa(selectedId)
    if (studentName) setStudentSearchQuery(studentName)
    setLatestRecords([])
    setEditIdSetoran('')
    setIsStudentSearchOpen(false)

    if (!selectedId) return

    // Jangan order by kolom tanggal di Supabase: nilainya teks DD/MM/YYYY,
    // sehingga 31/08 terurut di atas 10/10. Ambil semua setoran siswa, lalu
    // urutkan di klien berdasarkan tanggal yang sudah di-parse.
    const { data, error } = await fetchSetoranSiswa(selectedId)

    if (error) {
      console.error('Gagal mengambil riwayat setoran:', error.message)
      return
    }

    if (data.length > 0) {
      setLatestRecords(pickLatestSetoran(data, 5))
    }
  }, [])

  // Filter siswa berdasarkan pencarian
  const filteredStudents = students.filter((s) => {
    const query = studentSearchQuery.trim().toLowerCase()
    if (!query) return true
    const name = String(s.nama_siswa || '').toLowerCase()
    const tokens = query.split(/\s+/).filter(Boolean)
    return tokens.every((token) => name.includes(token))
  }).slice(0, 50)

  // Format tanggal untuk display
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

  const pickField = (record: any, ...keys: string[]) => {
    for (const key of keys) {
      const value = record?.[key]
      if (value != null && String(value).trim() !== '') return String(value).trim()
    }
    return ''
  }

  const formatZiyadah = (record: any) => {
    const hafalan = pickField(record, 'hafalan_baru')
    if (hafalan) return hafalan
    const surah = pickField(record, 'surah_ziyadah', 'surah')
    const mulai = pickField(record, 'ayat_mulai', 'ayat_ziyadah')
    const selesai = pickField(record, 'ayat_selesai')
    if (!surah && !mulai && !selesai) return '-'
    const range = mulai && selesai ? `${mulai}-${selesai}` : mulai || selesai
    return [surah, range].filter(Boolean).join(' ')
  }

  const formatMurojaah = (record: any) => {
    const murojaah = pickField(record, "muroja'ah", 'murojaah')
    if (murojaah) return murojaah
    const surah = pickField(record, "surah_muroja'ah", 'surah_murojaah')
    const ayat = pickField(record, "ayat_muroja'ah", 'ayat_murojaah')
    if (!surah && !ayat) return '-'
    return [surah, ayat].filter(Boolean).join(' ')
  }

  const formatTugasRumah = (record: any) => {
    const tugas = pickField(record, 'tugas_rumah')
    if (tugas) return tugas
    const surah = pickField(record, 'surah_tugas')
    const mulai = pickField(record, 'ayat_mulai_tugas')
    const selesai = pickField(record, 'ayat_selesai_tugas')
    if (!surah && !mulai && !selesai) return '-'
    const range = mulai && selesai ? `${mulai}-${selesai}` : mulai || selesai
    return [surah, range].filter(Boolean).join(' ')
  }

  // Mode Edit
  const handleLoadEdit = () => {
    if (!latestRecord) return
    setEditIdSetoran(latestRecord.id_setoran)
    setHSurah(latestRecord.hafalan_baru || '')
    setHMulai(latestRecord.ayat_mulai || '')
    setHSelesai(latestRecord.ayat_selesai || '')
    setHNilai(latestRecord.status || 'Lancar')
    setHPesan(latestRecord.keterangan_pesan_hafalan || latestRecord.keterangan || '')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleCancelEdit = () => {
    setEditIdSetoran('')
    setHSurah('')
    setHMulai('')
    setHSelesai('')
    setHNilai('')
    setHPesan('')
    setMPesan('')
  }

  // Simpan / Update ke Supabase
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!idSiswa) {
      alert('Silakan pilih siswa terlebih dahulu!')
      return
    }

    setLoading(true)
    setSuccessMessage('')
    const tanggalSekarang = new Date().toISOString()

    if (editIdSetoran) {
      const { error } = await supabase
        .from('setoran_tahfidz')
        .update({
          hafalan_baru: hSurah,
          ayat_mulai: hMulai,
          ayat_selesai: hSelesai,
          status: hNilai || 'Lancar',
          keterangan_pesan_hafalan: hPesan,
          tugas_rumah: `${tugasH ? '[Ziyadah Aktif] ' : ''}${tugasM ? '[Murojaah Aktif]' : ''}`,
        })
        .eq('id_setoran', editIdSetoran)

      setLoading(false)
      if (error) {
        alert('Gagal memperbarui data: ' + error.message)
      } else {
        setSuccessMessage('Alhamdulillah setoran siswa berhasil di simpan.')
        handleCancelEdit()
        handleStudentChange(idSiswa)
      }
    } else {
      const idSetoran = 'STR-' + Date.now()
      const { error } = await supabase.from('setoran_tahfidz').insert([
        {
          id_setoran: idSetoran,
          tanggal: tanggalSekarang,
          id_siswa: idSiswa,
          hafalan_baru: hSurah,
          ayat_mulai: hMulai,
          ayat_selesai: hSelesai,
          status: hNilai || 'Lancar',
          keterangan_pesan_hafalan: hPesan,
          tugas_rumah: `${tugasH ? '[Ziyadah Aktif] ' : ''}${tugasM ? '[Murojaah Aktif]' : ''}`,
        },
      ])

      setLoading(false)
      if (error) {
        alert('Gagal menyimpan setoran: ' + error.message)
      } else {
        setSuccessMessage('Alhamdulillah setoran siswa berhasil di simpan.')
        handleCancelEdit()
        handleStudentChange(idSiswa)
      }
    }
  }

  return (
    <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      {/* Datalist Global untuk Pencarian Surah Canggih dari Supabase */}
      <datalist id="listSurah">
        {surahs.map((s) => (
          <option key={s.nomor_surat} value={s.nama_surat}>
            {s.nama_surat} ({s.jumlah_ayat} Ayat - Juz {s.juz})
          </option>
        ))}
      </datalist>

      {/* Tombol Kembali */}
      <button
        type="button"
        onClick={onBack}
        className="mb-5 inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-bold text-white transition hover:bg-amber-600"
      >
        <ArrowLeft className="size-4" /> Kembali ke Menu Tahfidz
      </button>

      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-extrabold text-slate-900">
          {editIdSetoran ? 'Edit Setoran Tahfidz' : 'Form Setoran Tahfidz'}
        </h2>
        {editIdSetoran && (
          <button
            type="button"
            onClick={handleCancelEdit}
            className="flex items-center gap-1 rounded-lg bg-slate-200 px-3 py-1 text-xs font-bold text-slate-700 hover:bg-slate-300"
          >
            <XCircle className="size-4" /> Batal Edit
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Pilih Siswa - Searchable Select */}
        <div className="mb-3 relative" ref={studentSearchRef}>
          <label className="mb-1 block text-sm font-bold text-slate-700">Pilih Siswa</label>
          <div className="relative">
            <Search className="absolute left-3 top-3 size-4 text-blue-500" />
            <input
              type="text"
              placeholder="Ketik nama siswa untuk mencari..."
              value={studentSearchQuery}
              onFocus={() => setIsStudentSearchOpen(true)}
              onChange={(e) => {
                setStudentSearchQuery(e.target.value)
                setIsStudentSearchOpen(true)
              }}
              className="w-full rounded-xl border border-blue-400 p-3 pl-10 text-sm focus:border-emerald-600 focus:outline-none bg-blue-50/20 font-semibold text-slate-800"
              required
            />
          </div>

          {/* Dropdown Hasil Pencarian Siswa */}
          {isStudentSearchOpen && (
            <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl">
              {filteredStudents.length > 0 ? (
                filteredStudents.map((student) => (
                  <button
                    key={student.id_siswa}
                    type="button"
                    onClick={() => handleStudentChange(student.id_siswa, student.nama_siswa)}
                    className="flex w-full items-center justify-between border-b border-slate-50 px-3 py-2.5 text-left text-sm transition hover:bg-blue-50"
                  >
                    <span className="font-bold text-slate-800">{student.nama_siswa}</span>
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                      Kelas {student.kelas}
                    </span>
                  </button>
                ))
              ) : (
                <div className="p-3 text-center text-xs text-slate-400">
                  Siswa dengan nama "{studentSearchQuery}" tidak ditemukan
                </div>
              )}
            </div>
          )}
        </div>

        {/* Tabel Riwayat Terakhir */}
        {latestRecords.length > 0 && (
          <div className="rounded-xl border border-amber-300 bg-amber-50/60 p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-900">
                Riwayat Setoran Terakhir Santri:
              </span>
              <button
                type="button"
                onClick={handleLoadEdit}
                className="inline-flex items-center gap-1 rounded bg-amber-600 px-2.5 py-1 text-[11px] font-bold text-white shadow hover:bg-amber-700"
              >
                <Edit3 className="size-3" /> Edit Teratas
              </button>
            </div>

            <div className="overflow-x-auto rounded-lg border border-amber-200 bg-white">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="bg-amber-100/70 font-bold text-amber-900">
                    <th className="border-b border-amber-200 p-2.5">Tgl</th>
                    <th className="border-b border-amber-200 p-2.5">Ziyadah</th>
                    <th className="border-b border-amber-200 p-2.5 text-center">Status</th>
                    <th className="border-b border-amber-200 p-2.5">Murojaah</th>
                    <th className="border-b border-amber-200 p-2.5">Tugas Di Rumah</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-amber-100">
                  {latestRecords.map((rec, index) => (
                    <tr key={rec.id_setoran || index} className="hover:bg-amber-50/40">
                      <td className="whitespace-nowrap p-2.5 font-semibold text-slate-700">
                        {formatDateString(rec.tanggal)}
                      </td>
                      <td className="p-2.5 font-bold text-slate-900">
                        {formatZiyadah(rec)}
                      </td>
                      <td className="p-2.5 text-center font-bold text-emerald-700">
                        {rec.status || '-'}
                      </td>
                      <td className="p-2.5 text-slate-700">
                        {formatMurojaah(rec)}
                      </td>
                      <td className="p-2.5 text-slate-600">
                        {formatTugasRumah(rec)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* KODE ZIYADAH */}
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/30 p-3 mb-3">
          <div className="flex justify-between items-center mb-2">
            <label className="font-bold text-blue-600 text-xs tracking-wider">ZIYADAH</label>
          </div>
          <div>
            <input
              type="text"
              list="listSurah"
              autoComplete="off"
              placeholder="Ketik/Pilih Surah (Cari cepat)..."
              value={hSurah}
              onChange={(e) => setHSurah(e.target.value)}
              className="w-full rounded-lg border border-slate-300 p-2 text-sm mb-2 bg-white"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                placeholder="Mulai"
                value={hMulai}
                onChange={(e) => setHMulai(e.target.value)}
                className="rounded-lg border border-slate-300 p-2 text-sm bg-white"
              />
              <input
                type="number"
                placeholder="Sampai"
                value={hSelesai}
                onChange={(e) => setHSelesai(e.target.value)}
                className="rounded-lg border border-slate-300 p-2 text-sm bg-white"
              />
            </div>
            
            <select
              value={hNilai}
              onChange={(e) => setHNilai(e.target.value)}
              className="w-full rounded-lg border border-slate-300 p-2 text-sm mt-2 text-slate-600 bg-white"
            >
              <option value="" disabled>-- Pilih Penilaian --</option>
              <option value="Lancar">Lancar</option>
              <option value="Belum Lancar">Belum Lancar</option>
            </select>

            <div className="mt-2">
              <BidangSuaraMandiri
                value={hPesan}
                onChange={setHPesan}
                placeholder="Pesan Hafalan"
                rows={2}
                className="w-full rounded-lg border border-slate-300 bg-white p-2 text-sm"
              />
            </div>
          </div>
        </div>

        {/* KODE MUROJAAH */}
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/30 p-3 mb-3">
          <div className="flex justify-between items-center mb-2">
            <label className="font-bold text-emerald-700 text-xs tracking-wider">MUROJAAH</label>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <input
                type="text"
                list="listSurah"
                autoComplete="off"
                placeholder="Surah A"
                value={mSurahMulai}
                onChange={(e) => setMSurahMulai(e.target.value)}
                className="w-full rounded-lg border border-slate-300 p-1.5 text-sm bg-white"
              />
              <span className="text-xs font-bold text-slate-500">sd</span>
              <input
                type="text"
                list="listSurah"
                autoComplete="off"
                placeholder="Surah E"
                value={mSurahSelesai}
                onChange={(e) => setMSurahSelesai(e.target.value)}
                className="w-full rounded-lg border border-slate-300 p-1.5 text-sm bg-white"
              />
            </div>
            
            <div className="grid grid-cols-12 gap-1 items-center mb-2">
              <div className="col-span-3">
                <input type="number" placeholder="Ayat A" value={mMulaiA} onChange={(e) => setMMulaiA(e.target.value)} className="w-full rounded border border-slate-300 p-1.5 text-xs bg-white" />
              </div>
              <div className="col-span-3">
                <input type="number" placeholder="Selesai A" value={mSelesaiA} onChange={(e) => setMSelesaiA(e.target.value)} className="w-full rounded border border-slate-300 p-1.5 text-xs bg-white" />
              </div>
              <div className="col-span-1 text-center font-bold text-xs text-slate-500">sd</div>
              <div className="col-span-2">
                <input type="number" placeholder="Mulai E" value={mMulaiE} onChange={(e) => setMMulaiE(e.target.value)} className="w-full rounded border border-slate-300 p-1.5 text-xs bg-white" />
              </div>
              <div className="col-span-3">
                <input type="number" placeholder="Selesai E" value={mSelesaiE} onChange={(e) => setMSelesaiE(e.target.value)} className="w-full rounded border border-slate-300 p-1.5 text-xs bg-white" />
              </div>
            </div>

            <textarea
              placeholder="Pesan Murojaah"
              value={mPesan}
              onChange={(e) => setMPesan(e.target.value)}
              className="w-full rounded-lg border border-slate-300 p-2 text-sm mt-2 bg-white"
            ></textarea>
          </div>
        </div>

        {/* TUGAS DI RUMAH */}
        <div className="rounded-xl border border-sky-200 bg-sky-50/30 p-3 mb-4">
          <label className="block font-bold text-sky-800 text-xs tracking-wider mb-2">TUGAS DI RUMAH</label>
          
          <div className="p-2 mb-2 border rounded border-sky-100 bg-white">
            <label className="flex items-center gap-2 text-sm font-bold text-blue-600 cursor-pointer">
              <input
                type="checkbox"
                checked={tugasH}
                onChange={(e) => setTugasH(e.target.checked)}
                className="size-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              Tugas Ziyadah
            </label>
            {tugasH && (
              <div className="mt-2 space-y-2">
                <input type="text" list="listSurah" autoComplete="off" placeholder="Cari Surah..." value={tugasZSurah} onChange={(e) => setTugasZSurah(e.target.value)} className="w-full rounded border border-slate-300 p-1.5 text-sm" />
                <div className="grid grid-cols-2 gap-2">
                  <input type="number" placeholder="Mulai" value={tugasZAyatMulai} onChange={(e) => setTugasZAyatMulai(e.target.value)} className="rounded border border-slate-300 p-1.5 text-sm" />
                  <input type="number" placeholder="Sampai" value={tugasZAyatSelesai} onChange={(e) => setTugasZAyatSelesai(e.target.value)} className="rounded border border-slate-300 p-1.5 text-sm" />
                </div>
                <input type="text" placeholder="Keterangan tugas..." value={tugasZPesan} onChange={(e) => setTugasZPesan(e.target.value)} className="w-full rounded border border-slate-300 p-1.5 text-sm" />
              </div>
            )}
          </div>

          <div className="p-2 border rounded border-emerald-100 bg-white">
            <label className="flex items-center gap-2 text-sm font-bold text-emerald-700 cursor-pointer">
              <input
                type="checkbox"
                checked={tugasM}
                onChange={(e) => setTugasM(e.target.checked)}
                className="size-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              Tugas Murojaah
            </label>
            {tugasM && (
              <div className="mt-2 space-y-2">
                <div className="flex items-center gap-2">
                  <input type="text" list="listSurah" autoComplete="off" placeholder="Surah A" value={tugasMSurah} onChange={(e) => setTugasMSurah(e.target.value)} className="w-full rounded border border-slate-300 p-1.5 text-sm" />
                  <span className="text-xs font-bold text-slate-500">sd</span>
                  <input type="text" list="listSurah" autoComplete="off" placeholder="Surah E" value={tugasMSurahSelesai} onChange={(e) => setTugasMSurahSelesai(e.target.value)} className="w-full rounded border border-slate-300 p-1.5 text-sm" />
                </div>
                <div className="grid grid-cols-12 gap-1 items-center">
                  <div className="col-span-3"><input type="number" placeholder="Mulai A" value={tugasMAyatMulai} onChange={(e) => setTugasMAyatMulai(e.target.value)} className="w-full rounded border border-slate-300 p-1 text-xs" /></div>
                  <div className="col-span-3"><input type="number" placeholder="Selesai A" value={tugasMAyatSelesai} onChange={(e) => setTugasMAyatSelesai(e.target.value)} className="w-full rounded border border-slate-300 p-1 text-xs" /></div>
                  <div className="col-span-1 text-center font-bold text-xs text-slate-500">sd</div>
                  <div className="col-span-2"><input type="number" placeholder="Mulai E" value={tugasMAyatMulaiE} onChange={(e) => setTugasMAyatMulaiE(e.target.value)} className="w-full rounded border border-slate-300 p-1 text-xs" /></div>
                  <div className="col-span-3"><input type="number" placeholder="Selesai E" value={tugasMAyatSelesaiE} onChange={(e) => setTugasMAyatSelesaiE(e.target.value)} className="w-full rounded border border-slate-300 p-1 text-xs" /></div>
                </div>
                <input type="text" placeholder="Keterangan tugas..." value={tugasMPesan} onChange={(e) => setTugasMPesan(e.target.value)} className="w-full rounded border border-slate-300 p-1.5 text-sm" />
              </div>
            )}
          </div>
        </div>

        {/* Tombol Simpan / Update */}
        <button
          type="submit"
          disabled={loading}
          className={`w-full flex items-center justify-center gap-2 rounded-xl py-3.5 text-base font-bold text-white shadow-lg transition disabled:opacity-50 ${
            editIdSetoran ? 'bg-amber-600 hover:bg-amber-700' : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          <Save className="size-5" />
          {loading ? 'Menyimpan...' : editIdSetoran ? 'PERBARUI SETORAN' : 'SIMPAN SETORAN'}
        </button>
        {successMessage && (
          <p role="status" className="text-center text-sm font-bold text-emerald-700">
            {successMessage}
          </p>
        )}
      </form>
    </div>
  )
}