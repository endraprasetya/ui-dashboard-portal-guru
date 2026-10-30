'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowLeft, Edit3, Save, Search, Send, Trash2, XCircle } from 'lucide-react'
import { BidangSuaraMandiri } from '@/components/input-suara'
import { supabase } from '@/lib/supabase'
import { fetchAllSiswa } from '@/lib/siswa'
import {
  JILID_OPTIONS,
  JILID_UJIAN_OPTIONS,
  formatCapaianQiroah,
  formatDateString,
  generateQiroahId,
  generateUjianId,
  isYa,
  namaPengujiCocok,
  pengujiUntukKelas,
  teacherDisplayName,
} from '@/lib/qiroah'

const SETORAN_FIELDS =
  'id_qiroah, tanggal, unit, id_siswa, nama_siswa, ustadz, jilid, halaman, status, catatan, tugas_rumah, status_setoran, nilai, catatan_audio, murojaah_di_rumah, membaca_di_sekolah, murojaah_bersama_teman'

export function QiroahForm({ onBack, currentUser }: { onBack: () => void; currentUser?: any }) {
  const [students, setStudents] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  const [latestRecords, setLatestRecords] = useState<any[]>([])
  const [editIdQiroah, setEditIdQiroah] = useState('')

  const [idSiswa, setIdSiswa] = useState('')
  const [studentSearchQuery, setStudentSearchQuery] = useState('')
  const [isStudentSearchOpen, setIsStudentSearchOpen] = useState(false)
  const studentSearchRef = useRef<HTMLDivElement>(null)

  const [murojaahRumah, setMurojaahRumah] = useState(false)
  const [membacaSekolah, setMembacaSekolah] = useState(false)
  const [murojaahTeman, setMurojaahTeman] = useState(false)
  const [jilid, setJilid] = useState('At-Tartil Jilid 1')
  const [halaman, setHalaman] = useState('')
  const [status, setStatus] = useState('Lancar')
  const [catatan, setCatatan] = useState('')
  const [tugasRumah, setTugasRumah] = useState('')

  const [showPengajuan, setShowPengajuan] = useState(false)
  const [jilidDiuji, setJilidDiuji] = useState('')
  const [sendingPengajuan, setSendingPengajuan] = useState(false)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (studentSearchRef.current && !studentSearchRef.current.contains(event.target as Node)) {
        setIsStudentSearchOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    fetchAllSiswa(currentUser).then(setStudents)
  }, [currentUser])

  const selectedStudent = students.find((s) => s.id_siswa === idSiswa)

  const resetFormFields = () => {
    setEditIdQiroah('')
    setMurojaahRumah(false)
    setMembacaSekolah(false)
    setMurojaahTeman(false)
    setHalaman('')
    setCatatan('')
    setTugasRumah('')
    setStatus('Lancar')
  }

  const handleStudentChange = useCallback(async (selectedId: string, studentName?: string) => {
    setIdSiswa(selectedId)
    if (studentName) setStudentSearchQuery(studentName)
    setLatestRecords([])
    resetFormFields()
    setIsStudentSearchOpen(false)
    if (!selectedId) return

    const { data, error } = await supabase
      .from('setoran_qiroah')
      .select(SETORAN_FIELDS)
      .eq('id_siswa', selectedId)
      .order('tanggal', { ascending: false, nullsFirst: false })
      .limit(5)

    if (!error && data && data.length > 0) {
      setLatestRecords(data)
      if (data[0].jilid) setJilid(data[0].jilid)
    } else if (error) {
      console.error('Gagal mengambil riwayat setoran qiroah:', error.message)
    }
  }, [])

  const filteredStudents = students
    .filter((s) => {
      const query = studentSearchQuery.trim().toLowerCase()
      if (!query) return true
      const name = String(s.nama_siswa || '').toLowerCase()
      const tokens = query.split(/\s+/).filter(Boolean)
      return tokens.every((token) => name.includes(token))
    })
    .slice(0, 50)

  const handleLoadEdit = (record: any) => {
    if (!record) return
    setEditIdQiroah(record.id_qiroah)
    setJilid(record.jilid || 'At-Tartil Jilid 1')
    setHalaman(record.halaman || '')
    setCatatan(record.catatan === '-' ? '' : record.catatan || '')
    setTugasRumah(record.tugas_rumah === '-' ? '' : record.tugas_rumah || '')
    setStatus(String(record.status || '').toLowerCase().includes('ulang') ? 'Diulang' : 'Lancar')
    setMurojaahRumah(isYa(record.murojaah_di_rumah))
    setMembacaSekolah(isYa(record.membaca_di_sekolah))
    setMurojaahTeman(isYa(record.murojaah_bersama_teman))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleCancelEdit = () => {
    resetFormFields()
  }

  const milikSetoran = (record: { ustadz?: string } | null | undefined) => {
    const pencatat = String(record?.ustadz || '').trim()
    if (!pencatat || pencatat === '-') return true
    return namaPengujiCocok(teacherDisplayName(currentUser), pencatat)
  }

  const handleDelete = async (record: { id_qiroah?: string; ustadz?: string }) => {
    if (!record?.id_qiroah) return
    if (!milikSetoran(record)) {
      alert('Hanya guru yang mencatat setoran ini yang dapat menghapusnya.')
      return
    }
    if (!confirm('Yakin ingin menghapus setoran qiroah ini?')) return

    let query = supabase.from('setoran_qiroah').delete().eq('id_qiroah', record.id_qiroah)
    const pencatat = String(record.ustadz || '').trim()
    if (pencatat && pencatat !== '-') query = query.eq('ustadz', pencatat)
    const { data, error } = await query.select('id_qiroah')
    if (error || !data?.length) {
      alert(error ? 'Gagal menghapus data: ' + error.message : 'Hanya guru yang mencatat setoran ini yang dapat menghapusnya.')
      return
    }
    setSuccessMessage('Riwayat setoran berjaya dihapus.')
    handleStudentChange(idSiswa, studentSearchQuery)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!idSiswa) {
      alert('Sila pilih siswa terlebih dahulu!')
      return
    }
    if (!halaman.trim() || halaman.trim() === '-') {
      alert('Sila isi Halaman / Surah & Ayat terlebih dahulu!')
      return
    }

    setLoading(true)
    setSuccessMessage('')

    const payload = {
      unit: currentUser?.unit || '-',
      id_siswa: idSiswa,
      nama_siswa: selectedStudent?.nama_siswa || studentSearchQuery,
      ustadz: teacherDisplayName(currentUser),
      jilid,
      halaman: halaman.trim(),
      status,
      catatan: catatan.trim() || '-',
      tugas_rumah: tugasRumah.trim() || '-',
      murojaah_di_rumah: murojaahRumah ? 'Ya' : 'Belum',
      membaca_di_sekolah: membacaSekolah ? 'Ya' : 'Belum',
      murojaah_bersama_teman: murojaahTeman ? 'Ya' : 'Belum',
    }

    if (editIdQiroah) {
      const sumber = latestRecords.find((item) => item.id_qiroah === editIdQiroah)
      if (sumber && !milikSetoran(sumber)) {
        setLoading(false)
        alert('Hanya guru yang mencatat setoran ini yang dapat mengubahnya.')
        return
      }
      let query = supabase.from('setoran_qiroah').update(payload).eq('id_qiroah', editIdQiroah)
      const pencatat = String(sumber?.ustadz || '').trim()
      if (pencatat && pencatat !== '-') query = query.eq('ustadz', pencatat)
      const { data, error } = await query.select('id_qiroah')
      if (!error && !data?.length) {
        setLoading(false)
        alert('Hanya guru yang mencatat setoran ini yang dapat mengubahnya.')
        return
      }
      setLoading(false)
      if (error) {
        alert('Gagal memperbarui data: ' + error.message)
      } else {
        setSuccessMessage('Alhamdulillah setoran siswa berhasil di simpan.')
        handleCancelEdit()
        handleStudentChange(idSiswa, studentSearchQuery)
      }
      return
    }

    const { error } = await supabase.from('setoran_qiroah').insert([
      {
        id_qiroah: generateQiroahId(),
        tanggal: new Date().toISOString(),
        id_audio: '',
        status_setoran: '',
        nilai: '',
        catatan_audio: '',
        nilai_audio: '',
        ...payload,
      },
    ])

    setLoading(false)
    if (error) {
      alert('Gagal menyimpan setoran: ' + error.message)
    } else {
      setSuccessMessage('Alhamdulillah setoran siswa berhasil di simpan.')
      handleCancelEdit()
      handleStudentChange(idSiswa, studentSearchQuery)
    }
  }

  const handleKirimPengajuan = async () => {
    if (!idSiswa || !selectedStudent) {
      alert('Pilih siswa terlebih dahulu!')
      return
    }
    if (!jilidDiuji) {
      alert('Pilih jilid yang akan diujikan!')
      return
    }

    const unitSiswa = selectedStudent.unit || currentUser?.unit || '-'
    const penguji = pengujiUntukKelas(selectedStudent.kelas, unitSiswa)
    setSendingPengajuan(true)
    const { error } = await supabase.from('pengajuan').insert([
      {
        id_pengajuan: generateUjianId(),
        tanggal_diajukan: new Date().toISOString(),
        diajukan_oleh: teacherDisplayName(currentUser),
        nama_siswa: selectedStudent.nama_siswa,
        kelas: selectedStudent.kelas || '-',
        unit: unitSiswa,
        jilid_diujikan: jilidDiuji,
        nama_penguji: penguji,
        status: 'menunggu_jadwal',
        id_siswa: idSiswa,
      },
    ])
    setSendingPengajuan(false)

    if (error) {
      alert('Gagal menghantar pengajuan: ' + error.message)
      return
    }

    alert(
      penguji
        ? `Pengajuan tersimpan dengan status menunggu jadwal. Guru penguji: ${penguji}.`
        : 'Pengajuan tersimpan dengan status menunggu jadwal. Kelas ini belum memiliki guru penguji pada pemetaan Unit Nogosari.',
    )
    setShowPengajuan(false)
    setJilidDiuji('')
  }

  return (
    <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <button
        type="button"
        onClick={onBack}
        className="mb-5 inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-bold text-white transition hover:bg-amber-600"
      >
        <ArrowLeft className="size-4" /> Kembali ke Menu Qiroah
      </button>

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900">
            {editIdQiroah ? 'Edit Setoran Qiroah' : 'Form Setoran Qiroah'}
          </h2>
          <p className="text-xs text-slate-500">Input bacaan harian, persiapan, dan tugas rumah santri</p>
        </div>
        {editIdQiroah && (
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
        <div className="relative mb-3" ref={studentSearchRef}>
          <label className="mb-1 block text-sm font-bold text-slate-700">Nama Siswa Binaan</label>
          <div className="relative">
            <Search className="absolute left-3 top-3 size-4 text-sky-500" />
            <input
              type="text"
              placeholder="Ketik nama siswa untuk mencari..."
              value={studentSearchQuery}
              onFocus={() => setIsStudentSearchOpen(true)}
              onChange={(e) => {
                setStudentSearchQuery(e.target.value)
                setIsStudentSearchOpen(true)
              }}
              className="w-full rounded-xl border border-sky-400 bg-sky-50/20 p-3 pl-10 text-sm font-semibold text-slate-800 focus:border-emerald-600 focus:outline-none"
              required
            />
          </div>
          {isStudentSearchOpen && (
            <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl">
              {filteredStudents.length > 0 ? (
                filteredStudents.map((student) => (
                  <button
                    key={student.id_siswa}
                    type="button"
                    onClick={() => handleStudentChange(student.id_siswa, student.nama_siswa)}
                    className="flex w-full items-center justify-between border-b border-slate-50 px-3 py-2.5 text-left text-sm transition hover:bg-sky-50"
                  >
                    <span className="font-bold text-slate-800">{student.nama_siswa}</span>
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                      Kelas {student.kelas}
                    </span>
                  </button>
                ))
              ) : (
                <div className="p-3 text-center text-xs text-slate-400">
                  Siswa dengan nama &quot;{studentSearchQuery}&quot; tidak ditemui
                </div>
              )}
            </div>
          )}
        </div>

        {/* 5 RIWAYAT SETORAN TERAKHIR DALAM BENTUK JADUAL */}
        {latestRecords.length > 0 && (
          <div className="rounded-xl border border-amber-300 bg-amber-50/60 p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-900">
                5 Riwayat Setoran Terakhir Santri:
              </span>
              {milikSetoran(latestRecords[0]) && (
                <button
                  type="button"
                  onClick={() => {
                    if (latestRecords[0]) handleLoadEdit(latestRecords[0])
                  }}
                  className="inline-flex items-center gap-1 rounded bg-amber-600 px-2.5 py-1 text-[11px] font-bold text-white shadow hover:bg-amber-700"
                >
                  <Edit3 className="size-3" /> Edit Teratas
                </button>
              )}
            </div>

            <div className="overflow-x-auto rounded-lg border border-amber-200 bg-white">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="bg-amber-100/70 font-bold text-amber-900">
                    <th className="border-b border-amber-200 p-2.5">Tgl</th>
                    <th className="border-b border-amber-200 p-2.5">Capaian</th>
                    <th className="border-b border-amber-200 p-2.5 text-center">Status</th>
                    <th className="border-b border-amber-200 p-2.5">Tugas Di Rumah</th>
                    <th className="border-b border-amber-200 p-2.5 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-amber-100">
                  {latestRecords.map((rec, index) => (
                    <tr key={rec.id_qiroah || index} className="hover:bg-amber-50/40">
                      <td className="whitespace-nowrap p-2.5 font-semibold text-slate-700">
                        {formatDateString(rec.tanggal)}
                      </td>
                      <td className="p-2.5 font-bold text-slate-900">
                        {formatCapaianQiroah(rec)}
                      </td>
                      <td className="p-2.5 text-center font-bold text-emerald-700">
                        {rec.status || '-'}
                      </td>
                      <td className="p-2.5 text-slate-600">
                        {rec.tugas_rumah && rec.tugas_rumah !== '-' ? rec.tugas_rumah : '-'}
                      </td>
                      <td className="p-2.5 text-center">
                        {milikSetoran(rec) ? (
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleLoadEdit(rec)}
                              title="Edit baris ini"
                              className="rounded bg-amber-500 p-1 text-white hover:bg-amber-600"
                            >
                              <Edit3 className="size-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(rec)}
                              title="Hapus baris ini"
                              className="rounded bg-red-500 p-1 text-white hover:bg-red-600"
                            >
                              <Trash2 className="size-3" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] font-semibold text-slate-400">{rec.ustadz || 'Guru lain'}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={() => {
            if (!idSiswa) {
              alert('Pilih siswa terlebih dahulu!')
              return
            }
            setShowPengajuan(true)
          }}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 py-3 text-sm font-extrabold text-white shadow hover:bg-amber-600"
        >
          <Send className="size-4" /> Ajukan Kenaikan Jilid
        </button>

        <div>
          <label className="mb-2 block text-sm font-bold text-slate-700">Persiapan Qiroah</label>
          <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
            {[
              { id: 'murojaah', label: 'Murojaah di rumah', checked: murojaahRumah, setter: setMurojaahRumah },
              { id: 'sekolah', label: 'Membaca di sekolah', checked: membacaSekolah, setter: setMembacaSekolah },
              { id: 'teman', label: 'Murojaah bersama teman', checked: murojaahTeman, setter: setMurojaahTeman },
            ].map((item) => (
              <label key={item.id} className="flex cursor-pointer items-center justify-between border-b border-slate-200 py-2 last:border-0">
                <span className="text-sm font-medium text-slate-700">{item.label}</span>
                <input
                  type="checkbox"
                  checked={item.checked}
                  onChange={(e) => item.setter(e.target.checked)}
                  className="size-4 accent-emerald-600"
                />
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-bold text-slate-700">Jilid / Tingkatan Kitab</label>
          <select
            value={jilid}
            onChange={(e) => setJilid(e.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white p-3 text-sm"
          >
            {JILID_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
          {jilid.toLowerCase().includes('qur') && (
            <p className="mt-1 text-xs italic text-sky-600">Pastikan mengisi detail Surah & Ayat dengan lengkap.</p>
          )}
        </div>

        <div>
          <label className="mb-1 block text-sm font-bold text-slate-700">Halaman / Surah & Ayat</label>
          <input
            type="text"
            value={halaman}
            onChange={(e) => setHalaman(e.target.value)}
            placeholder="Contoh: Hal 15 atau Al-Baqarah: 1-10"
            className="w-full rounded-xl border border-slate-300 p-3 text-sm"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-bold text-slate-700">Status Kelancaran</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white p-3 text-sm"
          >
            <option value="Lancar">Lancar (Lanjut)</option>
            <option value="Diulang">Belum Lancar (Diulang)</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-bold text-slate-700">Catatan / Perbaikan Guru</label>
          <BidangSuaraMandiri
            value={catatan}
            onChange={setCatatan}
            rows={2}
            placeholder="Contoh: Dengung pada ikhfa' kurang ditahan."
            className="w-full rounded-xl border border-slate-300 p-3 text-sm"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-bold text-slate-700">Tugas Rumah / Target Mandiri</label>
          <BidangSuaraMandiri
            value={tugasRumah}
            onChange={setTugasRumah}
            satuBaris
            placeholder="Contoh: Lancarkan hal 15 di rumah"
            className="w-full rounded-xl border border-slate-300 p-3 text-sm"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className={`flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-base font-bold text-white shadow-lg transition disabled:opacity-50 ${
            editIdQiroah ? 'bg-amber-600 hover:bg-amber-700' : 'bg-sky-600 hover:bg-sky-700'
          }`}
        >
          <Save className="size-5" />
          {loading ? 'Menyimpan...' : editIdQiroah ? 'Perbarui Setoran' : 'Simpan Setoran Siswa'}
        </button>
        {successMessage && (
          <p role="status" className="text-center text-sm font-bold text-emerald-700">
            {successMessage}
          </p>
        )}
      </form>

      {showPengajuan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl">
            <div className="bg-emerald-600 px-5 py-3 text-white">
              <h3 className="font-extrabold">Ajukan Kenaikan Jilid</h3>
            </div>
            <div className="space-y-3 p-5">
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-600">Nama Siswa</label>
                <input
                  readOnly
                  value={selectedStudent?.nama_siswa || studentSearchQuery}
                  className="w-full rounded-xl border border-slate-200 bg-slate-100 p-2.5 text-sm font-semibold"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-600">Jilid yang Akan Diujikan</label>
                <select
                  value={jilidDiuji}
                  onChange={(e) => setJilidDiuji(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-sm"
                >
                  <option value="">-- Pilih Jilid --</option>
                  {JILID_UJIAN_OPTIONS.filter((opt) => !opt.includes('Jilid 1')).map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-600">Diajukan Oleh</label>
                <input
                  readOnly
                  value={teacherDisplayName(currentUser)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-100 p-2.5 text-sm font-semibold text-sky-700"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-600">Guru Penguji</label>
                <input
                  readOnly
                  value={
                    pengujiUntukKelas(selectedStudent?.kelas, selectedStudent?.unit || currentUser?.unit) ||
                    'Belum ada pemetaan untuk kelas ini'
                  }
                  className="w-full rounded-xl border border-slate-200 bg-slate-100 p-2.5 text-sm font-semibold text-emerald-800"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPengajuan(false)}
                  className="flex-1 rounded-xl bg-[#800000] py-2.5 text-sm font-bold text-white"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleKirimPengajuan}
                  disabled={sendingPengajuan}
                  className="flex-1 rounded-xl bg-emerald-600 py-2.5 text-sm font-bold text-white disabled:opacity-50"
                >
                  {sendingPengajuan ? 'Mengirim...' : 'Kirim'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}