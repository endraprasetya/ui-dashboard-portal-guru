'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { fetchAllSiswa } from '@/lib/siswa'
import { fetchAllSurah } from '@/lib/surah'
import {
  formatLabelAyat,
  formatMurojaahRecord,
  formatTugasRecord,
  formatZiyadahRecord,
  kunciHariJakarta,
  parseBagianAyat,
  parseMurojaahTeks,
  parseTugasTeks,
  tanggalTermasukHariIni,
} from '@/lib/tahfidz'
import { ArrowLeft, Save, Edit3, Trash2, XCircle, Search } from 'lucide-react'
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

  const [siswaSudahSetor, setSiswaSudahSetor] = useState<Set<string>>(new Set())
  const [tugasDimuat, setTugasDimuat] = useState(false)

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
    resetInputFields()
    setLatestRecords([])
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

  const filteredStudents = students.filter((s) => {
    const sudah = siswaSudahSetor.has(String(s.id_siswa))
    const query = studentSearchQuery.trim().toLowerCase()
    if (!query) return !sudah
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

  const formatZiyadah = (record: any) => formatZiyadahRecord(record)
  const formatMurojaah = (record: any) => formatMurojaahRecord(record)
  const formatTugasRumah = (record: any) => formatTugasRecord(record)

  const resetInputFields = useCallback(() => {
    setEditIdSetoran('')
    setTugasDimuat(false)
    setHSurah('')
    setHMulai('')
    setHSelesai('')
    setHNilai('')
    setHPesan('')
    setMSurahMulai('')
    setMSurahSelesai('')
    setMMulaiA('')
    setMSelesaiA('')
    setMMulaiE('')
    setMSelesaiE('')
    setMPesan('')
    setTugasH(false)
    setTugasZSurah('')
    setTugasZAyatMulai('')
    setTugasZAyatSelesai('')
    setTugasZPesan('')
    setTugasM(false)
    setTugasMSurah('')
    setTugasMSurahSelesai('')
    setTugasMAyatMulai('')
    setTugasMAyatSelesai('')
    setTugasMAyatMulaiE('')
    setTugasMAyatSelesaiE('')
    setTugasMPesan('')
  }, [])

  const resetSetelahSimpan = () => {
    resetInputFields()
    setIdSiswa('')
    setStudentSearchQuery('')
    setLatestRecords([])
    setIsStudentSearchOpen(false)
  }

  const muatSiswaSudahSetor = useCallback(async () => {
    const hari = kunciHariJakarta()
    const mulai = new Date(`${hari}T00:00:00+07:00`)
    mulai.setDate(mulai.getDate() - 1)
    const { data, error } = await supabase
      .from('setoran_tahfidz')
      .select('id_siswa, tanggal')
      .gte('tanggal', mulai.toISOString().slice(0, 10))

    if (error) {
      console.error('Gagal memuat siswa yang sudah setor:', error.message)
      return
    }

    const ids = new Set<string>()
    for (const row of data || []) {
      if (row.id_siswa && tanggalTermasukHariIni(row.tanggal, hari)) ids.add(String(row.id_siswa))
    }
    setSiswaSudahSetor(ids)
  }, [])

  useEffect(() => {
    muatSiswaSudahSetor()
  }, [muatSiswaSudahSetor])

  const isiAngka = (nilai: unknown) => {
    const [awal, akhir] = String(nilai || '').split(/\s+s\.d\s+/i)
    const ambil = (bagian: string) => {
      const rentang = String(bagian || '').match(/(\d+)\s*[-–]\s*(\d+)/)
      if (rentang) return [rentang[1], rentang[2]]
      const satu = String(bagian || '').match(/(\d+)/)
      return satu ? [satu[1], satu[1]] : ['', '']
    }
    return { awal: ambil(awal), akhir: ambil(akhir) }
  }

  const handleLoadEdit = () => {
    if (!latestRecord) return
    resetInputFields()
    setEditIdSetoran(latestRecord.id_setoran)
    const parsedZiyadah = parseBagianAyat(String(latestRecord.surah_ziyadah || latestRecord.hafalan_baru || ''))
    const mulaiZ = latestRecord.ayat_mulai && latestRecord.ayat_mulai !== '-' ? String(latestRecord.ayat_mulai) : ''
    const selesaiZ = latestRecord.ayat_selesai && latestRecord.ayat_selesai !== '-' ? String(latestRecord.ayat_selesai) : ''
    setHSurah(parsedZiyadah?.surah || '')
    setHMulai(mulaiZ || parsedZiyadah?.mulai || '')
    setHSelesai(selesaiZ || parsedZiyadah?.selesai || '')
    setHNilai(latestRecord.status || 'Lancar')
    setHPesan(latestRecord.keterangan_pesan_hafalan || latestRecord.keterangan || '')

    const parsedMurojaah = parseMurojaahTeks(latestRecord.murojaah)
    const surahM = String(latestRecord.surah_murojaah || '').split(/\s+s\.d\s+/i)
    setMSurahMulai((surahM[0] || parsedMurojaah?.awal?.surah || '').trim())
    setMSurahSelesai((surahM[1] || parsedMurojaah?.akhir?.surah || '').trim())
    const angkaM = isiAngka(latestRecord.ayat_murojaah)
    setMMulaiA(angkaM.awal[0] || parsedMurojaah?.awal?.mulai || '')
    setMSelesaiA(angkaM.awal[1] || parsedMurojaah?.awal?.selesai || '')
    setMMulaiE(angkaM.akhir[0] || parsedMurojaah?.akhir?.mulai || '')
    setMSelesaiE(angkaM.akhir[1] || parsedMurojaah?.akhir?.selesai || '')
    const pesanM = String(latestRecord.keterangan_pesan_murojaah || '').trim()
    setMPesan(pesanM && pesanM !== '-' ? pesanM : '')

    const parsedTugas = parseTugasTeks(latestRecord.tugas_rumah)
    const surahTugas = String(latestRecord.surah_tugas || '').trim()
    const adaZiyadah = Boolean((surahTugas && surahTugas !== '-') || parsedTugas.ziyadah)
    const adaMurojaahTugas = Boolean(parsedTugas.murojaah)
    if (adaZiyadah) {
      setTugasH(true)
      setTugasZSurah(surahTugas && surahTugas !== '-' ? surahTugas : parsedTugas.ziyadah?.surah || '')
      setTugasZAyatMulai(
        latestRecord.ayat_mulai_tugas && latestRecord.ayat_mulai_tugas !== '-'
          ? String(latestRecord.ayat_mulai_tugas)
          : parsedTugas.ziyadah?.mulai || '',
      )
      setTugasZAyatSelesai(
        latestRecord.ayat_selesai_tugas && latestRecord.ayat_selesai_tugas !== '-'
          ? String(latestRecord.ayat_selesai_tugas)
          : parsedTugas.ziyadah?.selesai || '',
      )
      setTugasZPesan(parsedTugas.ziyadah?.catatan || '')
    }
    if (adaMurojaahTugas && parsedTugas.murojaah) {
      const rentang = String(latestRecord.tugas_rumah || '')
        .split('|')
        .slice(1)
        .join('|')
        .replace(/^[ZM]\s*:\s*/i, '')
        .trim()
      const lanjut = parseMurojaahTeks(rentang)
      const awal = lanjut?.awal || parsedTugas.murojaah
      const akhir = lanjut?.akhir
      setTugasM(true)
      setTugasMSurah(awal?.surah || '')
      setTugasMAyatMulai(awal?.mulai || '')
      setTugasMAyatSelesai(awal?.selesai || '')
      setTugasMSurahSelesai(akhir?.surah || '')
      setTugasMAyatMulaiE(akhir?.mulai || '')
      setTugasMAyatSelesaiE(akhir?.selesai || '')
      setTugasMPesan(akhir?.catatan || awal?.catatan || '')
    }
    setTugasDimuat(adaZiyadah || adaMurojaahTugas)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleCancelEdit = () => {
    resetInputFields()
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

    const awalMurojaah = formatLabelAyat(mSurahMulai, mMulaiA, mSelesaiA)
    const akhirMurojaah = formatLabelAyat(mSurahSelesai, mMulaiE, mSelesaiE)
    const teksMurojaah =
      awalMurojaah && akhirMurojaah && awalMurojaah !== akhirMurojaah
        ? `${awalMurojaah} s.d ${akhirMurojaah}`
        : awalMurojaah || akhirMurojaah
    const rentangAngka = (mulai: string, selesai: string) =>
      mulai && selesai ? `${mulai}-${selesai}` : mulai || selesai
    const adaMurojaah = Boolean(
      mSurahMulai.trim() || mSurahSelesai.trim() || mMulaiA || mSelesaiA || mMulaiE || mSelesaiE || mPesan.trim(),
    )
    const awalTugasM = formatLabelAyat(tugasMSurah, tugasMAyatMulai, tugasMAyatSelesai)
    const akhirTugasM = formatLabelAyat(tugasMSurahSelesai, tugasMAyatMulaiE, tugasMAyatSelesaiE)
    const teksTugasM =
      awalTugasM && akhirTugasM && awalTugasM !== akhirTugasM ? `${awalTugasM} s.d ${akhirTugasM}` : awalTugasM || akhirTugasM
    const bagianTugas = [
      tugasH ? [formatLabelAyat(tugasZSurah, tugasZAyatMulai, tugasZAyatSelesai), tugasZPesan.trim()].filter(Boolean).join(' · ') : '',
      tugasM ? [teksTugasM, tugasMPesan.trim()].filter(Boolean).join(' · ') : '',
    ].filter(Boolean)

    const payload: Record<string, string> = {
      hafalan_baru: hSurah.trim(),
      ayat_mulai: hMulai,
      ayat_selesai: hSelesai,
      status: hNilai || 'Lancar',
      keterangan_pesan_hafalan: hPesan,
      surah_ziyadah: hSurah.trim(),
      ayat_ziyadah: rentangAngka(hMulai, hSelesai),
      nama_ustadz: currentUser?.nama_lengkap || currentUser?.nama || currentUser?.username || '',
    }

    if (adaMurojaah || !editIdSetoran) {
      payload.murojaah = teksMurojaah || '-'
      payload.surah_murojaah = [mSurahMulai.trim(), mSurahSelesai.trim()].filter(Boolean).join(' s.d ')
      payload.ayat_murojaah = [rentangAngka(mMulaiA, mSelesaiA), rentangAngka(mMulaiE, mSelesaiE)].filter(Boolean).join(' s.d ')
      payload.keterangan_pesan_murojaah = mPesan.trim() || '-'
    }

    if (tugasH || tugasM || !editIdSetoran || tugasDimuat) {
      payload.tugas_rumah = bagianTugas.join(' | ') || '-'
      payload.surah_tugas = tugasH ? tugasZSurah.trim() : ''
      payload.ayat_mulai_tugas = tugasH ? tugasZAyatMulai : ''
      payload.ayat_selesai_tugas = tugasH ? tugasZAyatSelesai : ''
      payload.tipe_tugas = [tugasH ? 'Ziyadah' : '', tugasM ? 'Murojaah' : ''].filter(Boolean).join(' & ') || '-'
    }

    const siswaTersimpan = idSiswa
    if (editIdSetoran) {
      const { error } = await supabase.from('setoran_tahfidz').update(payload).eq('id_setoran', editIdSetoran)
      setLoading(false)
      if (error) {
        alert('Gagal memperbarui data: ' + error.message)
        return
      }
    } else {
      const { error } = await supabase.from('setoran_tahfidz').insert([
        {
          id_setoran: 'STR-' + Date.now(),
          tanggal: new Date().toISOString(),
          id_siswa: idSiswa,
          ...payload,
        },
      ])
      setLoading(false)
      if (error) {
        alert('Gagal menyimpan setoran: ' + error.message)
        return
      }
    }

    setSuccessMessage('Alhamdulillah setoran siswa berhasil di simpan.')
    resetSetelahSimpan()
    setSiswaSudahSetor((prev) => new Set(prev).add(String(siswaTersimpan)))
  }

  const handleDelete = async (record: { id_setoran?: string }) => {
    if (!record?.id_setoran) return
    if (!confirm('Yakin ingin menghapus riwayat setoran ini?')) return
    const { error } = await supabase.from('setoran_tahfidz').delete().eq('id_setoran', record.id_setoran)
    if (error) {
      alert('Gagal menghapus data: ' + error.message)
      return
    }
    if (editIdSetoran === record.id_setoran) resetInputFields()
    setSuccessMessage('Riwayat setoran berhasil dihapus.')
    if (idSiswa) handleStudentChange(idSiswa, studentSearchQuery)
    muatSiswaSudahSetor()
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
          <p className="mb-1 text-[11px] text-slate-500">
            Siswa yang sudah diisi hari ini disembunyikan. Ketik nama bila perlu dibuka kembali.
          </p>
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
                    <span className="flex items-center gap-1">
                      {siswaSudahSetor.has(String(student.id_siswa)) && (
                        <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                          Sudah diisi
                        </span>
                      )}
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                        Kelas {student.kelas}
                      </span>
                    </span>
                  </button>
                ))
              ) : (
                <div className="p-3 text-center text-xs text-slate-400">
                  {studentSearchQuery.trim()
                    ? `Siswa dengan nama "${studentSearchQuery}" tidak ditemukan`
                    : 'Semua siswa binaan sudah diisi hari ini.'}
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
                    <th className="border-b border-amber-200 p-2.5">Ayat</th>
                    <th className="border-b border-amber-200 p-2.5 text-center">Status</th>
                    <th className="border-b border-amber-200 p-2.5">Murojaah</th>
                    <th className="border-b border-amber-200 p-2.5">Tugas Di Rumah</th>
                    <th className="border-b border-amber-200 p-2.5 text-center">Aksi</th>
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
                        <div>{formatMurojaah(rec)}</div>
                        {rec.keterangan_pesan_murojaah && rec.keterangan_pesan_murojaah !== '-' && (
                          <div className="mt-0.5 text-[11px] leading-4 text-slate-500">{rec.keterangan_pesan_murojaah}</div>
                        )}
                      </td>
                      <td className="p-2.5 text-slate-600">
                        {formatTugasRumah(rec)}
                      </td>
                      <td className="p-2.5 text-center">
                        <button
                          type="button"
                          onClick={() => handleDelete(rec)}
                          title="Hapus riwayat ini"
                          className="rounded bg-red-500 p-1 text-white hover:bg-red-600"
                        >
                          <Trash2 className="size-3" />
                        </button>
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