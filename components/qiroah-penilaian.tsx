'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, Search } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { fetchAllSiswa } from '@/lib/siswa'
import { formatDateString } from '@/lib/qiroah'

export function QiroahPenilaian({ onBack, currentUser }: { onBack: () => void; currentUser?: any }) {
  const [students, setStudents] = useState<any[]>([])
  const [idSiswa, setIdSiswa] = useState('')
  const [studentSearchQuery, setStudentSearchQuery] = useState('')
  const [isStudentSearchOpen, setIsStudentSearchOpen] = useState(false)
  const [tugasList, setTugasList] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedTugas, setSelectedTugas] = useState<any>(null)
  const [nilai, setNilai] = useState('')
  const [catatanNilai, setCatatanNilai] = useState('')
  const [saving, setSaving] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchAllSiswa(currentUser).then(setStudents)
  }, [currentUser])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsStudentSearchOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filteredStudents = students
    .filter((s) => {
      const query = studentSearchQuery.trim().toLowerCase()
      if (!query) return true
      return String(s.nama_siswa || '')
        .toLowerCase()
        .includes(query)
    })
    .slice(0, 50)

  const loadTugas = async (selectedId: string) => {
    setLoading(true)
    const { data, error } = await supabase
      .from('setoran_qiroah')
      .select('id_qiroah, tanggal, tugas_rumah, catatan, status_setoran, nilai, catatan_audio')
      .eq('id_siswa', selectedId)
      .order('tanggal', { ascending: false })

    if (error) {
      alert('Gagal memuat tugas: ' + error.message)
      setTugasList([])
    } else {
      const filtered = (data || []).filter((row) => {
        const tugas = String(row.tugas_rumah || '').trim()
        return tugas && tugas !== '-'
      })
      setTugasList(filtered)
    }
    setLoading(false)
  }

  const handleSelectStudent = (student: any) => {
    setIdSiswa(student.id_siswa)
    setStudentSearchQuery(student.nama_siswa)
    setIsStudentSearchOpen(false)
    loadTugas(student.id_siswa)
  }

  const handleSimpanNilai = async () => {
    if (!selectedTugas?.id_qiroah) return
    if (!nilai) {
      alert('Mohon pilih nilai terlebih dahulu!')
      return
    }
    setSaving(true)
    const { error } = await supabase
      .from('setoran_qiroah')
      .update({
        nilai,
        catatan_audio: catatanNilai,
        status_setoran: 'Sudah dinilai',
      })
      .eq('id_qiroah', selectedTugas.id_qiroah)
    setSaving(false)

    if (error) {
      alert('Gagal menyimpan penilaian: ' + error.message)
      return
    }

    setModalOpen(false)
    setSelectedTugas(null)
    setNilai('')
    setCatatanNilai('')
    loadTugas(idSiswa)
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-white shadow hover:bg-amber-600"
      >
        <ArrowLeft className="size-4" /> Kembali ke Menu Qiroah
      </button>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-extrabold text-slate-900">Penilaian Tugas Rumah</h2>
        <p className="mb-4 text-xs text-slate-500">Berikan nilai dan evaluasi untuk tugas mandiri siswa</p>

        <div className="relative" ref={searchRef}>
          <label className="mb-1 block text-sm font-bold text-slate-700">Pilih Siswa</label>
          <div className="relative">
            <Search className="absolute left-3 top-3 size-4 text-sky-500" />
            <input
              type="text"
              placeholder="Ketik nama siswa..."
              value={studentSearchQuery}
              onFocus={() => setIsStudentSearchOpen(true)}
              onChange={(e) => {
                setStudentSearchQuery(e.target.value)
                setIsStudentSearchOpen(true)
              }}
              className="w-full rounded-xl border border-sky-400 p-3 pl-10 text-sm font-semibold"
            />
          </div>
          {isStudentSearchOpen && (
            <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl">
              {filteredStudents.map((student) => (
                <button
                  key={student.id_siswa}
                  type="button"
                  onClick={() => handleSelectStudent(student)}
                  className="flex w-full items-center justify-between border-b border-slate-50 px-3 py-2.5 text-left text-sm hover:bg-sky-50"
                >
                  <span className="font-bold">{student.nama_siswa}</span>
                  <span className="text-[11px] text-slate-500">Kelas {student.kelas}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        {!idSiswa && <p className="text-center text-sm text-slate-400">Silakan pilih siswa terlebih dahulu.</p>}
        {loading && <p className="text-center text-sm text-slate-500">Memuat daftar tugas...</p>}
        {!loading && idSiswa && tugasList.length === 0 && (
          <p className="text-center text-sm text-slate-400">Belum ada riwayat tugas rumah untuk siswa ini.</p>
        )}
        {!loading && tugasList.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 text-left font-bold text-slate-700">
                  <th className="border p-2.5">Tanggal</th>
                  <th className="border p-2.5">Tugas</th>
                  <th className="border p-2.5 text-center">Status</th>
                  <th className="border p-2.5">Catatan Guru</th>
                  <th className="border p-2.5 text-center">Aksi / Nilai</th>
                </tr>
              </thead>
              <tbody>
                {tugasList.map((tugas) => (
                  <tr key={tugas.id_qiroah}>
                    <td className="border p-2.5 whitespace-nowrap">{formatDateString(tugas.tanggal)}</td>
                    <td className="border p-2.5">{tugas.tugas_rumah}</td>
                    <td className="border p-2.5 text-center">
                      {String(tugas.status_setoran || '').toLowerCase().includes('sudah') ? (
                        <span className="rounded-full bg-emerald-100 px-2 py-1 font-bold text-emerald-700">Sudah dinilai</span>
                      ) : (
                        <span className="rounded-full bg-amber-100 px-2 py-1 font-bold text-amber-700">Belum dinilai</span>
                      )}
                    </td>
                    <td className="border p-2.5">{tugas.catatan && tugas.catatan !== '-' ? tugas.catatan : '-'}</td>
                    <td className="border p-2.5 text-center">
                      {tugas.nilai ? (
                        <div>
                          <p className="font-bold text-emerald-700">{tugas.nilai}</p>
                          <p className="italic text-slate-500">{tugas.catatan_audio}</p>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedTugas(tugas)
                            setNilai('')
                            setCatatanNilai('')
                            setModalOpen(true)
                          }}
                          className="rounded-lg bg-sky-600 px-3 py-1.5 font-bold text-white hover:bg-sky-700"
                        >
                          Beri Nilai
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <h3 className="mb-3 border-b pb-2 text-base font-extrabold text-sky-700">Form Penilaian</h3>
            <p className="text-xs text-slate-500">Tugas:</p>
            <p className="mb-3 text-sm font-bold">{selectedTugas?.tugas_rumah}</p>
            <label className="mb-1 block text-sm font-bold">Nilai</label>
            <select
              value={nilai}
              onChange={(e) => setNilai(e.target.value)}
              className="mb-3 w-full rounded-xl border border-slate-300 p-2.5 text-sm"
            >
              <option value="">-- Pilih Nilai --</option>
              <option value="Bagus Sekali">Bagus Sekali</option>
              <option value="Bagus">Bagus</option>
              <option value="Cukup">Cukup</option>
              <option value="Kurang">Kurang</option>
            </select>
            <label className="mb-1 block text-sm font-bold">Catatan Guru</label>
            <textarea
              value={catatanNilai}
              onChange={(e) => setCatatanNilai(e.target.value)}
              rows={3}
              className="mb-4 w-full rounded-xl border border-slate-300 p-2.5 text-sm"
              placeholder="Tulis catatan (opsional)..."
            />
            <div className="flex justify-between">
              <button type="button" onClick={() => setModalOpen(false)} className="rounded-xl bg-slate-200 px-4 py-2 text-sm font-bold">
                Batal
              </button>
              <button
                type="button"
                onClick={handleSimpanNilai}
                disabled={saving}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
              >
                {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
