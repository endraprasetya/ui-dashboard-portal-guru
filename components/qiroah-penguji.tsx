'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ClipboardCheck, RefreshCw } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { JILID_UJIAN_OPTIONS, formatDateString, nextJilid, teacherDisplayName } from '@/lib/qiroah'

type UjianItem = {
  id_pengajuan: string
  tanggal_diajukan: string
  unit: string
  id_siswa: string
  nama_siswa: string
  kelas: string
  jilid_asal?: string
  jilid_diujian: string
  diajukan_oleh?: string
  status?: string
}

function predikatDariNilai(total: number) {
  if (total >= 90) return { predikat: 'Mumtaz', keputusan: 'Lulus' }
  if (total >= 80) return { predikat: 'Jayyid Jiddan', keputusan: 'Lulus' }
  if (total >= 70) return { predikat: 'Jayyid', keputusan: 'Lulus' }
  return { predikat: 'Maqbul', keputusan: 'Tidak Lulus' }
}

export function QiroahPenguji({ onBack, currentUser }: { onBack: () => void; currentUser?: any }) {
  const [antrean, setAntrean] = useState<UjianItem[]>([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<UjianItem | null>(null)
  const [jilidAsal, setJilidAsal] = useState('')
  const [jilidTujuan, setJilidTujuan] = useState('')
  const [kelancaran, setKelancaran] = useState(100)
  const [makhraj, setMakhraj] = useState(100)
  const [harakat, setHarakat] = useState(100)
  const [tajwid, setTajwid] = useState(100)
  const [adab, setAdab] = useState(100)
  const [catatan, setCatatan] = useState('')
  const [saving, setSaving] = useState(false)

  const loadAntrean = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('pengajuan')
      .select('*')
      .order('tanggal_diajukan', { ascending: false })

    if (error) {
      alert('Gagal memuat antrean: ' + error.message)
      setAntrean([])
    } else {
      const waiting = (data || []).filter((row) => {
        const st = String(row.status || '').toLowerCase()
        return st === 'menunggu ujian' || st === '' || st === '-'
      })
      setAntrean(waiting)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    loadAntrean()
  }, [loadAntrean])

  const isJilid12 = useMemo(() => {
    const j = (selected?.jilid_diujian || selected?.jilid_asal || '').toLowerCase()
    return j.includes('jilid 1') || j.includes('jilid 2')
  }, [selected])

  const aspekCount = isJilid12 ? 4 : 5
  const totalNilai = useMemo(() => {
    const values = isJilid12 ? [kelancaran, makhraj, harakat, adab] : [kelancaran, makhraj, harakat, tajwid, adab]
    const sum = values.reduce((a, b) => a + Number(b || 0), 0)
    return Math.round(sum / aspekCount)
  }, [kelancaran, makhraj, harakat, tajwid, adab, isJilid12, aspekCount])

  const ringkasan = predikatDariNilai(totalNilai)

  const bukaForm = (item: UjianItem) => {
    setSelected(item)
    setJilidAsal(item.jilid_asal || item.jilid_diujian || '')
    setJilidTujuan(item.jilid_diujian || nextJilid(item.jilid_diujian || ''))
    setKelancaran(100)
    setMakhraj(100)
    setHarakat(100)
    setTajwid(100)
    setAdab(100)
    setCatatan('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleSimpanUjian = async () => {
    if (!selected) return
    setSaving(true)

    // 1. Simpan data hasil ujian ke tabel 'rekapan' sesuai kolom Supabase (Gambar 1028)
    const { error: errorRekapan } = await supabase.from('rekapan').insert([
      {
        id_ujian: selected.id_pengajuan,
        tanggal_ujian: new Date().toISOString().split('T')[0], // Format tanggal YYYY-MM-DD
        id_siswa: selected.id_siswa,
        nama: selected.nama_siswa,
        kelas: selected.kelas || '-',
        unit: selected.unit || '-',
        guru_pengampu: selected.diajukan_oleh || '-',
        jilid_asal: jilidAsal,
        jilid_tujuan: jilidTujuan,
        penguji: teacherDisplayName(currentUser),
        kelancaran,
        makhraj,
        harakat,
        tajwid: isJilid12 ? 0 : tajwid,
        adab,
        predikat: ringkasan.predikat,
        keputusan: ringkasan.keputusan,
        nilai_akhir: totalNilai,
      },
    ])

    if (errorRekapan) {
      setSaving(false)
      alert('Gagal menyimpan ke tabel rekapan: ' + errorRekapan.message)
      return
    }

    // 2. Hapus data dari antrean 'pengajuan' agar bersih dari daftar tunggu
    const { error: errorHapus } = await supabase
      .from('pengajuan')
      .delete()
      .eq('id_pengajuan', selected.id_pengajuan)

    setSaving(false)

    if (errorHapus) {
      alert('Hasil ujian tersimpan di rekapan, tetapi gagal menghapus antrean: ' + errorHapus.message)
    } else {
      alert('Alhamdulillah, hasil ujian berhasil disimpan ke rekapan!')
    }

    setSelected(null)
    loadAntrean()
  }

  if (selected) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="bg-emerald-700 px-5 py-3 text-white">
            <h2 className="flex items-center gap-2 font-extrabold">
              <ClipboardCheck className="size-5" /> Form Penilaian Ujian Siswa
            </h2>
          </div>
          <div className="space-y-4 p-5">
            <div className="grid grid-cols-2 gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
              <p>
                <strong>Siswa:</strong>
                <br />
                {selected.nama_siswa}
              </p>
              <p>
                <strong>Kelas / Unit:</strong>
                <br />
                {selected.kelas} / {selected.unit}
              </p>
              <p>
                <strong>Tgl Diajukan:</strong>
                <br />
                {formatDateString(selected.tanggal_diajukan)}
              </p>
              <p>
                <strong>Penguji:</strong>
                <br />
                {teacherDisplayName(currentUser)}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-bold">Jilid Asal</label>
                <select
                  value={jilidAsal}
                  onChange={(e) => setJilidAsal(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2 text-sm"
                >
                  <option value="">-- Pilih Jilid --</option>
                  {JILID_UJIAN_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-emerald-700">Jilid Tujuan</label>
                <select
                  value={jilidTujuan}
                  onChange={(e) => setJilidTujuan(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2 text-sm"
                >
                  <option value="">-- Pilih Jilid --</option>
                  {JILID_UJIAN_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Aspek Penilaian (0-100)</p>
              {[
                { label: '1. Kelancaran Membaca', value: kelancaran, setter: setKelancaran },
                { label: '2. Ketepatan Makhraj', value: makhraj, setter: setMakhraj },
                { label: '3. Ketepatan Harakat', value: harakat, setter: setHarakat },
                ...(!isJilid12 ? [{ label: '4. Penerapan Tajwid', value: tajwid, setter: setTajwid }] : []),
                { label: isJilid12 ? '4. Adab & Sikap Membaca' : '5. Adab & Sikap Membaca', value: adab, setter: setAdab },
              ].map((aspek) => (
                <div key={aspek.label}>
                  <label className="mb-1 block text-xs font-bold">{aspek.label}</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={aspek.value}
                    onChange={(e) => aspek.setter(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-300 p-2 text-sm"
                  />
                </div>
              ))}
            </div>

            <div className="rounded-xl border bg-slate-50 p-3 text-center">
              <p className="text-xs font-bold">
                Jumlah Nilai Akhir: <span className="text-lg text-sky-700">{totalNilai}</span>
              </p>
              <p className="text-xs">
                Predikat: <strong>{ringkasan.predikat}</strong> | Status:{' '}
                <strong className={ringkasan.keputusan === 'Lulus' ? 'text-emerald-700' : 'text-red-600'}>
                  {ringkasan.keputusan}
                </strong>
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="rounded-xl bg-[#800000] py-2.5 text-sm font-bold text-white"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSimpanUjian}
                disabled={saving}
                className="rounded-xl bg-emerald-600 py-2.5 text-sm font-bold text-white disabled:opacity-50"
              >
                {saving ? 'Menyimpan...' : 'Simpan Hasil Ujian'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-white shadow hover:bg-amber-600"
      >
        <ArrowLeft className="size-4" /> Kembali ke Menu Qiroah
      </button>

      <div className="rounded-2xl bg-[#1b4332] p-6 text-center text-white shadow">
        <h2 className="flex items-center justify-center gap-2 text-lg font-black">
          <ClipboardCheck className="size-5" /> Menu Khusus Penguji
        </h2>
        <p className="mt-1 text-sm text-white/80">Daftar antrean dan penilaian ujian kenaikan jilid</p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-extrabold text-slate-800">Antrean Ujian</h3>
          <button
            type="button"
            onClick={loadAntrean}
            className="inline-flex items-center gap-1 rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-bold text-white"
          >
            <RefreshCw className="size-3.5" /> Refresh
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-center text-xs">
            <thead>
              <tr className="bg-slate-100 font-bold text-slate-700">
                <th className="border p-2">No</th>
                <th className="border p-2">Tgl Diajukan</th>
                <th className="border p-2">Diajukan Oleh</th>
                <th className="border p-2">Nama Siswa</th>
                <th className="border p-2">Jilid</th>
                <th className="border p-2">Kelas</th>
                <th className="border p-2">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="border p-4 text-slate-400">
                    Memuat data antrean...
                  </td>
                </tr>
              ) : antrean.length === 0 ? (
                <tr>
                  <td colSpan={7} className="border p-4 text-slate-400">
                    Belum ada antrean ujian.
                  </td>
                </tr>
              ) : (
                antrean.map((item, idx) => (
                  <tr key={item.id_pengajuan}>
                    <td className="border p-2">{idx + 1}</td>
                    <td className="border p-2 whitespace-nowrap">{formatDateString(item.tanggal_diajukan)}</td>
                    <td className="border p-2">{item.diajukan_oleh || '-'}</td>
                    <td className="border p-2 font-bold">{item.nama_siswa}</td>
                    <td className="border p-2">{item.jilid_diujian}</td>
                    <td className="border p-2">{item.kelas}</td>
                    <td className="border p-2">
                      <button
                        type="button"
                        onClick={() => bukaForm(item)}
                        className="rounded-lg bg-emerald-600 px-3 py-1.5 font-bold text-white hover:bg-emerald-700"
                      >
                        Nilai Ujian
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}