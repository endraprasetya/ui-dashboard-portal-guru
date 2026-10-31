'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, CalendarClock, ClipboardCheck, Printer, RefreshCw, ScrollText, X } from 'lucide-react'
import { CetakUjianQiroah, lulusUjian, type HasilUjianCetak } from '@/components/cetak-ujian-qiroah'
import { supabase } from '@/lib/supabase'
import {
  JILID_UJIAN_OPTIONS,
  barisUntukPenguji,
  formatDateString,
  generateUjianId,
  labelStatusPengajuan,
  menungguJadwal,
  nextJilid,
  pengujiEfektif,
  pengujiUntukKelas,
  statusDenganWaktu,
  sudahTerjadwal,
  teacherDisplayName,
  waktuDariStatus,
} from '@/lib/qiroah'
import { cariRekapan, kunciJilid, selaraskanStatusPengajuan, ujianSudahSelesai, unikPerJilid } from '@/lib/ujian-relasi'

type UjianItem = {
  id_pengajuan: string
  tanggal_diajukan: string
  tanggal_pelaksanaan?: string
  unit: string
  id_siswa: string
  nama_siswa: string
  kelas: string
  jilid_asal?: string
  jilid_diujikan: string
  diajukan_oleh?: string
  nama_penguji?: string
  status?: string
}

type RekapanUjian = {
  id_ujian?: string
  tanggal_ujian?: string
  id_siswa?: string
  nama?: string
  kelas?: string
  guru_pengampu?: string
  jilid_asal?: string
  jilid_tujuan?: string
  penguji?: string
  kelancaran?: number
  makhraj?: number
  harakat?: number
  tajwid?: number
  adab?: number
  kelebihan_siswa?: string
  predikat?: string
  keputusan?: string
  nilai_akhir?: number
}

function tanpaTajwid(jilid?: string) {
  const teks = String(jilid || '').toLowerCase()
  return teks.includes('jilid 1') || teks.includes('jilid 2')
}

function TombolCetak({
  lulus,
  onNilai,
  onSkl,
  rapat = false,
  siap = true,
}: {
  lulus: boolean
  onNilai: () => void
  onSkl: () => void
  rapat?: boolean
  siap?: boolean
}) {
  const ukuran = rapat ? 'px-2 py-1 text-[10px]' : 'px-3 py-2 text-xs'
  const judulNilai = siap ? 'Cetak lembar penilaian' : 'Nilai belum tersimpan'
  const judulSkl = !siap ? 'Nilai belum tersimpan' : lulus ? 'Cetak surat keterangan lulus' : 'SKL aktif setelah siswa dinyatakan lulus'
  return (
    <div className={`flex flex-wrap gap-1 ${rapat ? 'justify-center' : ''}`}>
      <button
        type="button"
        onClick={onNilai}
        disabled={!siap}
        title={judulNilai}
        className={`inline-flex items-center gap-1 rounded-lg bg-sky-700 font-bold text-white hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-40 ${ukuran}`}
      >
        <Printer className="size-3" /> Cetak Lembar Nilai
      </button>
      <button
        type="button"
        onClick={onSkl}
        disabled={!siap || !lulus}
        title={judulSkl}
        className={`inline-flex items-center gap-1 rounded-lg bg-[#1b4332] font-bold text-white hover:bg-[#163828] disabled:cursor-not-allowed disabled:opacity-40 ${ukuran}`}
      >
        <ScrollText className="size-3" /> Cetak SKL
      </button>
    </div>
  )
}

export function useJumlahMenungguPenguji(currentUser?: any, penyegar = '') {
  const [jumlah, setJumlah] = useState(0)

  const muat = useCallback(async () => {
    if (!currentUser) {
      setJumlah(0)
      return
    }
    const { data } = await supabase
      .from('pengajuan')
      .select('id_pengajuan,id_siswa,kelas,unit,nama_penguji,status,jilid_diujikan')
    const menunggu = (data || []).filter((row) => menungguJadwal(row.status) && barisUntukPenguji(row, currentUser))
    const ids = Array.from(new Set(menunggu.map((row) => String(row.id_siswa || '')).filter(Boolean)))
    const rekap =
      ids.length === 0
        ? []
        : (await supabase.from('rekapan').select('id_siswa,jilid_asal,tanggal_ujian').in('id_siswa', ids)).data || []
    setJumlah(menunggu.filter((row) => !cariRekapan(row, rekap)).length)
  }, [currentUser, penyegar])

  useEffect(() => {
    muat()
  }, [muat])

  return jumlah
}

function predikatDariNilai(total: number) {
  if (total >= 90) return { predikat: 'Mumtaz', keputusan: 'Lulus' }
  if (total >= 80) return { predikat: 'Jayyid Jiddan', keputusan: 'Lulus' }
  if (total >= 70) return { predikat: 'Jayyid', keputusan: 'Lulus' }
  return { predikat: 'Maqbul', keputusan: 'Tidak Lulus' }
}

export function QiroahPenguji({ onBack, currentUser }: { onBack: () => void; currentUser?: any }) {
  const [antrean, setAntrean] = useState<UjianItem[]>([])
  const [menunggu, setMenunggu] = useState<UjianItem[]>([])
  const [loading, setLoading] = useState(false)
  const [popupJadwal, setPopupJadwal] = useState(false)
  const [draftJadwal, setDraftJadwal] = useState<Record<string, { tanggal: string; waktu: string }>>({})
  const [menyimpanJadwal, setMenyimpanJadwal] = useState('')
  const [selected, setSelected] = useState<UjianItem | null>(null)
  const popupOtomatis = useRef(false)
  const [jilidAsal, setJilidAsal] = useState('')
  const [jilidTujuan, setJilidTujuan] = useState('')
  const [kelancaran, setKelancaran] = useState<number | ''>('')
  const [makhraj, setMakhraj] = useState<number | ''>('')
  const [harakat, setHarakat] = useState<number | ''>('')
  const [tajwid, setTajwid] = useState<number | ''>('')
  const [adab, setAdab] = useState<number | ''>('')
  const [catatan, setCatatan] = useState('')
  const [saving, setSaving] = useState(false)
  const [selesai, setSelesai] = useState<UjianItem[]>([])
  const [rekapans, setRekapans] = useState<RekapanUjian[]>([])
  const [dokumenCetak, setDokumenCetak] = useState<{ jenis: 'nilai' | 'skl'; data: HasilUjianCetak } | null>(null)
  const [nilaiTersimpan, setNilaiTersimpan] = useState(false)
  const [idUjianTersimpan, setIdUjianTersimpan] = useState('')
  const [pesanSimpan, setPesanSimpan] = useState('')

  const loadAntrean = useCallback(async (senyap = false) => {
    if (!senyap) setLoading(true)
    const { data, error } = await supabase
      .from('pengajuan')
      .select('*')
      .order('tanggal_diajukan', { ascending: false })

    if (error) {
      if (!senyap) {
        alert('Gagal memuat antrean: ' + error.message)
        setAntrean([])
        setMenunggu([])
        setSelesai([])
        setRekapans([])
      }
      setLoading(false)
      return
    }

    const milik = ((data || []) as UjianItem[]).filter((row) => barisUntukPenguji(row, currentUser))
    const { data: rekapData, error: rekapError } = await supabase
      .from('rekapan')
      .select(
        'id_ujian,tanggal_ujian,id_siswa,nama,kelas,guru_pengampu,jilid_asal,jilid_tujuan,penguji,kelancaran,makhraj,harakat,tajwid,adab,kelebihan_siswa,predikat,keputusan,nilai_akhir',
      )
    const daftarRekap = rekapError ? [] : ((rekapData || []) as RekapanUjian[])

    const sudahDiuji = (row: UjianItem) => ujianSudahSelesai(row.status, cariRekapan(row, daftarRekap))
    const selesaiRows = unikPerJilid(milik.filter(sudahDiuji))
    const tertutup = new Set(selesaiRows.map((row) => `${row.id_siswa}|${kunciJilid(row.jilid_diujikan)}`))
    const yatim = unikPerJilid(
      daftarRekap
        .filter((rekap) => {
          const kunci = `${rekap.id_siswa}|${kunciJilid(rekap.jilid_asal)}`
          return Boolean(rekap.id_siswa) && !tertutup.has(kunci) && barisUntukPenguji({ kelas: rekap.kelas, nama_penguji: rekap.penguji }, currentUser)
        })
        .map((rekap) => ({
          id_pengajuan: String(rekap.id_ujian || `${rekap.id_siswa}-${kunciJilid(rekap.jilid_asal)}`),
          tanggal_diajukan: String(rekap.tanggal_ujian || ''),
          tanggal_pelaksanaan: String(rekap.tanggal_ujian || '').slice(0, 10),
          unit: '',
          id_siswa: String(rekap.id_siswa),
          nama_siswa: rekap.nama || 'Siswa',
          kelas: rekap.kelas || '-',
          jilid_diujikan: rekap.jilid_asal || '-',
          nama_penguji: rekap.penguji || '',
          status: 'Selesai',
        })),
    )
    const aktif = milik.filter((row) => !sudahDiuji(row))
    setRekapans(daftarRekap)
    setSelesai([...selesaiRows, ...yatim])
    setMenunggu(aktif.filter((row) => menungguJadwal(row.status)))
    setAntrean(aktif.filter((row) => sudahTerjadwal(row.status)))
    setLoading(false)
    void selaraskanStatusPengajuan(milik, daftarRekap)
  }, [currentUser])

  useEffect(() => {
    loadAntrean()
  }, [loadAntrean])

  useEffect(() => {
    const kanal = supabase
      .channel(`antrean-pengajuan-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pengajuan' }, () => {
        loadAntrean(true)
      })
      .subscribe()
    const timer = window.setInterval(() => loadAntrean(true), 15000)
    return () => {
      window.clearInterval(timer)
      supabase.removeChannel(kanal)
    }
  }, [loadAntrean])

  useEffect(() => {
    if (!popupOtomatis.current && menunggu.length > 0) {
      popupOtomatis.current = true
      setPopupJadwal(true)
    }
  }, [menunggu.length])

  const simpanJadwal = async (item: UjianItem) => {
    const draft = draftJadwal[item.id_pengajuan]
    if (!draft?.tanggal || !draft?.waktu) {
      alert('Isi tanggal dan waktu pengujian terlebih dahulu.')
      return
    }
    setMenyimpanJadwal(item.id_pengajuan)
    const penguji = pengujiUntukKelas(item.kelas, item.unit) || item.nama_penguji || teacherDisplayName(currentUser)
    const { error } = await supabase
      .from('pengajuan')
      .update({
        status: statusDenganWaktu(draft.waktu),
        tanggal_pelaksanaan: draft.tanggal,
        nama_penguji: penguji,
      })
      .eq('id_pengajuan', item.id_pengajuan)
    setMenyimpanJadwal('')
    if (error) {
      alert('Gagal menyimpan jadwal: ' + error.message)
      return
    }
    await loadAntrean()
  }

  const isJilid12 = useMemo(() => {
    const j = (jilidAsal || selected?.jilid_diujikan || '').toLowerCase()
    return j.includes('jilid 1') || j.includes('jilid 2')
  }, [jilidAsal, selected])

  const opsiJilid = useMemo(() => {
    const semua = [...JILID_UJIAN_OPTIONS, jilidAsal, jilidTujuan]
      .map((item) => String(item || '').trim())
      .filter(Boolean)
    return Array.from(new Set(semua))
  }, [jilidAsal, jilidTujuan])

  const aspekCount = isJilid12 ? 4 : 5
  const nilaiAspek = isJilid12 ? [kelancaran, makhraj, harakat, adab] : [kelancaran, makhraj, harakat, tajwid, adab]
  const nilaiLengkap = nilaiAspek.every((nilai) => nilai !== '' && Number.isFinite(Number(nilai)))
  const totalNilai = nilaiLengkap
    ? Math.round(nilaiAspek.reduce((jumlah: number, nilai) => jumlah + Number(nilai), 0) / aspekCount)
    : null

  const ringkasan = totalNilai == null ? null : predikatDariNilai(totalNilai)

  const bukaForm = (item: UjianItem) => {
    setSelected(item)
    const asal = item.jilid_diujikan || item.jilid_asal || ''
    setJilidAsal(asal)
    setJilidTujuan(nextJilid(asal))
    setKelancaran('')
    setMakhraj('')
    setHarakat('')
    setTajwid('')
    setAdab('')
    setCatatan('')
    setNilaiTersimpan(false)
    setIdUjianTersimpan('')
    setPesanSimpan('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const rekapanUntuk = (item: UjianItem) => cariRekapan(item, rekapans)

  const hasilDariRekapan = (item: UjianItem, rekap: RekapanUjian): HasilUjianCetak => {
    const asal = rekap.jilid_asal || item.jilid_diujikan || ''
    return {
      nomor: String(rekap.id_ujian || item.id_pengajuan),
      nama: rekap.nama || item.nama_siswa,
      kelas: rekap.kelas || item.kelas,
      unit: item.unit,
      tanggal: String(rekap.tanggal_ujian || item.tanggal_pelaksanaan || ''),
      penguji: rekap.penguji || item.nama_penguji || teacherDisplayName(currentUser),
      guruPengampu: rekap.guru_pengampu || item.diajukan_oleh || '',
      jilidAsal: asal,
      jilidTujuan: rekap.jilid_tujuan || '',
      kelancaran: Number(rekap.kelancaran || 0),
      makhraj: Number(rekap.makhraj || 0),
      harakat: Number(rekap.harakat || 0),
      tajwid: tanpaTajwid(asal) ? null : Number(rekap.tajwid || 0),
      adab: Number(rekap.adab || 0),
      nilaiAkhir: Number(rekap.nilai_akhir || 0),
      predikat: rekap.predikat || '-',
      keputusan: rekap.keputusan || '-',
      catatan: rekap.kelebihan_siswa && rekap.kelebihan_siswa !== '-' ? rekap.kelebihan_siswa : '',
    }
  }

  const hasilDariForm = (): HasilUjianCetak | null => {
    if (!selected) return null
    return {
      nomor: idUjianTersimpan || selected.id_pengajuan,
      nama: selected.nama_siswa,
      kelas: selected.kelas,
      unit: selected.unit,
      tanggal: selected.tanggal_pelaksanaan || new Date().toISOString().slice(0, 10),
      penguji: teacherDisplayName(currentUser),
      guruPengampu: selected.diajukan_oleh || '',
      jilidAsal,
      jilidTujuan,
      kelancaran: Number(kelancaran),
      makhraj: Number(makhraj),
      harakat: Number(harakat),
      tajwid: isJilid12 ? null : Number(tajwid),
      adab: Number(adab),
      nilaiAkhir: totalNilai ?? 0,
      predikat: ringkasan?.predikat || '-',
      keputusan: ringkasan?.keputusan || '-',
      catatan,
    }
  }

  const bukaCetak = (jenis: 'nilai' | 'skl', data?: HasilUjianCetak | null) => {
    const sumber = data === undefined ? hasilDariForm() : data
    if (!sumber) return
    if (jenis === 'skl' && !lulusUjian(sumber.keputusan)) return
    setDokumenCetak({ jenis, data: sumber })
  }

  const cetakRekapan = (item: UjianItem, jenis: 'nilai' | 'skl') => {
    const rekap = rekapanUntuk(item)
    if (!rekap) return
    bukaCetak(jenis, hasilDariRekapan(item, rekap))
  }

  const handleSimpanUjian = async () => {
    if (!selected) return
    if (!jilidAsal || !jilidTujuan) {
      alert('Pilih jilid asal dan jilid tujuan terlebih dahulu.')
      return
    }
    if (totalNilai == null || !ringkasan) {
      alert('Isi seluruh aspek penilaian terlebih dahulu.')
      return
    }
    setSaving(true)

    const tanggalUjian = selected.tanggal_pelaksanaan || new Date().toISOString().split('T')[0]
    const { count } = await supabase
      .from('rekapan')
      .select('id_ujian', { count: 'exact', head: true })
      .eq('id_siswa', selected.id_siswa)

    const idUjian = generateUjianId()
    const { error: errorRekapan } = await supabase.from('rekapan').insert([
      {
        id_ujian: idUjian,
        tanggal_ujian: tanggalUjian,
        id_siswa: selected.id_siswa,
        nama: selected.nama_siswa,
        kelas: selected.kelas || '-',
        guru_pengampu: selected.diajukan_oleh || '-',
        jilid_asal: jilidAsal,
        jilid_tujuan: jilidTujuan,
        ujian_ke: (count || 0) + 1,
        penguji: teacherDisplayName(currentUser),
        kelancaran: Number(kelancaran),
        makhraj: Number(makhraj),
        harakat: Number(harakat),
        tajwid: isJilid12 ? 0 : Number(tajwid),
        adab: Number(adab),
        kelebihan_siswa: catatan || '-',
        rekomendasi_tindak_lanjut: '-',
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

    setIdUjianTersimpan(idUjian)
    setNilaiTersimpan(true)

    const { error: errorStatus } = await supabase
      .from('pengajuan')
      .update({
        status: 'Selesai',
        tanggal_pelaksanaan: selected.tanggal_pelaksanaan || tanggalUjian,
        nama_penguji: selected.nama_penguji || teacherDisplayName(currentUser),
      })
      .eq('id_pengajuan', selected.id_pengajuan)

    setSaving(false)

    if (errorStatus) {
      setPesanSimpan('Hasil ujian tersimpan, tetapi status antrean belum berubah. Lembar nilai tetap bisa dicetak.')
    } else {
      setPesanSimpan('Hasil ujian tersimpan. Lembar nilai dan SKL siap dicetak.')
    }

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
                <strong>Jadwal ujian:</strong>
                <br />
                {formatDateString(selected.tanggal_pelaksanaan || '')}
                {waktuDariStatus(selected.status) ? ` · ${waktuDariStatus(selected.status)}` : ''}
              </p>
              <p>
                <strong>Penguji:</strong>
                <br />
                {selected.nama_penguji || teacherDisplayName(currentUser)}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-bold">Jilid Asal</label>
                <select
                  value={jilidAsal}
                  onChange={(e) => setJilidAsal(e.target.value)}
                  disabled={nilaiTersimpan}
                  className="w-full rounded-xl border border-slate-300 p-2 text-sm disabled:bg-slate-100"
                >
                  <option value="">-- Pilih Jilid --</option>
                  {opsiJilid.map((opt) => (
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
                  disabled={nilaiTersimpan}
                  className="w-full rounded-xl border border-slate-300 p-2 text-sm disabled:bg-slate-100"
                >
                  <option value="">-- Pilih Jilid --</option>
                  {opsiJilid.map((opt) => (
                    <option key={`tujuan-${opt}`} value={opt}>
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
                    placeholder=""
                    disabled={nilaiTersimpan}
                    onChange={(e) => aspek.setter(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-300 p-2 text-sm disabled:bg-slate-100"
                  />
                </div>
              ))}
            </div>

            <div className="rounded-xl border bg-slate-50 p-3 text-center">
              <p className="text-xs font-bold">
                Jumlah Nilai Akhir: <span className="text-lg text-sky-700">{totalNilai == null ? '—' : totalNilai}</span>
              </p>
              <p className="text-xs">
                Predikat: <strong>{ringkasan?.predikat || '—'}</strong> | Status:{' '}
                <strong className={ringkasan?.keputusan === 'Lulus' ? 'text-emerald-700' : ringkasan ? 'text-red-600' : 'text-slate-500'}>
                  {ringkasan?.keputusan || '—'}
                </strong>
              </p>
            </div>
            <p className="text-[11px] leading-5 text-slate-500">
              Predikat: Mumtaz (90–100), Jayyid Jiddan (80–89), Jayyid (70–79). Nilai di bawah 70 mendapat predikat Maqbul dan dinyatakan tidak lulus.
            </p>

            {pesanSimpan && (
              <p className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800">{pesanSimpan}</p>
            )}

            <TombolCetak
              siap={nilaiTersimpan}
              lulus={lulusUjian(ringkasan?.keputusan)}
              onNilai={() => bukaCetak('nilai')}
              onSkl={() => bukaCetak('skl')}
            />
            {!nilaiTersimpan && (
              <p className="text-[11px] text-slate-500">Simpan hasil ujian untuk mengaktifkan cetak lembar nilai dan SKL.</p>
            )}

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setSelected(null)
                  setNilaiTersimpan(false)
                  setPesanSimpan('')
                }}
                className="rounded-xl bg-[#800000] py-2.5 text-sm font-bold text-white"
              >
                {nilaiTersimpan ? 'Kembali ke antrean' : 'Batal'}
              </button>
              <button
                type="button"
                onClick={handleSimpanUjian}
                disabled={saving || nilaiTersimpan}
                className="rounded-xl bg-emerald-600 py-2.5 text-sm font-bold text-white disabled:opacity-50"
              >
                {saving ? 'Menyimpan...' : nilaiTersimpan ? 'Sudah tersimpan' : 'Simpan Hasil Ujian'}
              </button>
            </div>
          </div>
        </div>
        {dokumenCetak && (
          <CetakUjianQiroah jenis={dokumenCetak.jenis} data={dokumenCetak.data} onClose={() => setDokumenCetak(null)} />
        )}
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
        <p className="mt-1 text-sm text-white/80">Jadwal ujian yang sudah dikonfirmasi dan penilaian kenaikan jilid</p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
        <div>
          <p className="text-sm font-extrabold text-amber-950">Menunggu penjadwalan</p>
          <p className="text-xs text-amber-800">
            {menunggu.length > 0
              ? `${menunggu.length} siswa belum ditentukan tanggal dan waktu ujiannya.`
              : 'Tidak ada pengajuan yang menunggu jadwal.'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setPopupJadwal(true)}
          disabled={menunggu.length === 0}
          className="inline-flex items-center gap-1 rounded-xl bg-amber-500 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
        >
          <CalendarClock className="size-3.5" />
          Tentukan jadwal
          {menunggu.length > 0 && (
            <span className="rounded-full bg-white px-1.5 text-[10px] font-black text-amber-700">{menunggu.length}</span>
          )}
        </button>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-extrabold text-slate-800">Antrean Ujian Terjadwal</h3>
          <button
            type="button"
            onClick={() => loadAntrean()}
            className="inline-flex items-center gap-1 rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-bold text-white"
          >
            <RefreshCw className="size-3.5" /> Refresh
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse text-center text-xs">
            <thead>
              <tr className="bg-slate-100 font-bold text-slate-700">
                <th className="border p-2">No</th>
                <th className="border p-2">Tgl Ujian</th>
                <th className="border p-2">Waktu</th>
                <th className="border p-2">Nama Siswa</th>
                <th className="border p-2">Jilid</th>
                <th className="border p-2">Kelas</th>
                <th className="border p-2">Penguji</th>
                <th className="border p-2">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="border p-4 text-slate-400">
                    Memuat data antrean...
                  </td>
                </tr>
              ) : antrean.length === 0 ? (
                <tr>
                  <td colSpan={8} className="border p-4 text-slate-400">
                    Belum ada siswa yang jadwal ujiannya sudah dikonfirmasi.
                  </td>
                </tr>
              ) : (
                antrean.map((item, idx) => (
                  <tr key={item.id_pengajuan}>
                    <td className="border p-2">{idx + 1}</td>
                    <td className="border p-2 whitespace-nowrap">{formatDateString(item.tanggal_pelaksanaan || '')}</td>
                    <td className="border p-2 whitespace-nowrap">{waktuDariStatus(item.status) || '-'}</td>
                    <td className="border p-2 font-bold">{item.nama_siswa}</td>
                    <td className="border p-2">{item.jilid_diujikan}</td>
                    <td className="border p-2">{item.kelas}</td>
                    <td className="border p-2">{pengujiEfektif(item) || '-'}</td>
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

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-1 text-sm font-extrabold text-slate-800">Hasil Penilaian</h3>
        <p className="mb-3 text-xs text-slate-500">
          Cetak ulang lembar nilai dan surat keterangan lulus. SKL hanya aktif bila keputusan ujian adalah Lulus.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse text-center text-xs">
            <thead>
              <tr className="bg-slate-100 font-bold text-slate-700">
                <th className="border p-2">No</th>
                <th className="border p-2">Tanggal</th>
                <th className="border p-2">Nama Siswa</th>
                <th className="border p-2">Jilid</th>
                <th className="border p-2">Predikat</th>
                <th className="border p-2">Keputusan</th>
                <th className="border p-2">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="border p-4 text-slate-400">
                    Memuat hasil penilaian...
                  </td>
                </tr>
              ) : selesai.length === 0 ? (
                <tr>
                  <td colSpan={7} className="border p-4 text-slate-400">
                    Belum ada hasil ujian yang tersimpan untuk penguji ini.
                  </td>
                </tr>
              ) : (
                selesai.map((item, idx) => {
                  const rekap = rekapanUntuk(item)
                  const lulus = lulusUjian(rekap?.keputusan)
                  return (
                    <tr key={item.id_pengajuan}>
                      <td className="border p-2">{idx + 1}</td>
                      <td className="border p-2 whitespace-nowrap">
                        {formatDateString(String(rekap?.tanggal_ujian || item.tanggal_pelaksanaan || ''))}
                      </td>
                      <td className="border p-2 font-bold">{item.nama_siswa}</td>
                      <td className="border p-2">{rekap?.jilid_asal || item.jilid_diujikan}</td>
                      <td className="border p-2">{rekap?.predikat || '-'}</td>
                      <td className={`border p-2 font-bold ${lulus ? 'text-emerald-700' : 'text-red-600'}`}>
                        {rekap?.keputusan || '-'}
                      </td>
                      <td className="border p-2">
                        <TombolCetak
                          rapat
                          siap={Boolean(rekap)}
                          lulus={lulus}
                          onNilai={() => cetakRekapan(item, 'nilai')}
                          onSkl={() => cetakRekapan(item, 'skl')}
                        />
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {popupJadwal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between bg-[#1b4332] px-5 py-3 text-white">
              <div>
                <h3 className="font-extrabold">Penjadwalan Ujian Qiroatul Quran</h3>
                <p className="text-[11px] text-white/80">{labelStatusPengajuan('menunggu_jadwal')} · {menunggu.length} siswa</p>
              </div>
              <button type="button" onClick={() => setPopupJadwal(false)} className="rounded-lg p-1 hover:bg-white/10">
                <X className="size-4" />
              </button>
            </div>
            <div className="space-y-3 overflow-y-auto p-4">
              {menunggu.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-500">Semua pengajuan untuk Anda sudah memiliki jadwal.</p>
              ) : (
                menunggu.map((item) => {
                  const draft = draftJadwal[item.id_pengajuan] || { tanggal: '', waktu: '' }
                  return (
                    <div key={item.id_pengajuan} className="rounded-xl border border-slate-200 p-3">
                      <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-extrabold text-slate-900">{item.nama_siswa}</p>
                          <p className="text-[11px] text-slate-500">
                            Kelas {item.kelas} · {item.unit || '-'} · {item.jilid_diujikan}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            Diajukan {formatDateString(item.tanggal_diajukan)} oleh {item.diajukan_oleh || '-'}
                          </p>
                        </div>
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                          {pengujiUntukKelas(item.kelas, item.unit) || item.nama_penguji || 'Penguji belum dipetakan'}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-end gap-2">
                        <label className="text-[11px] font-bold text-slate-600">
                          Tanggal
                          <input
                            type="date"
                            value={draft.tanggal}
                            onChange={(event) => {
                              const tanggal = event.target.value
                              setDraftJadwal((prev) => ({
                                ...prev,
                                [item.id_pengajuan]: {
                                  tanggal,
                                  waktu: prev[item.id_pengajuan]?.waktu || '',
                                },
                              }))
                            }}
                            className="mt-1 block rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                          />
                        </label>
                        <label className="text-[11px] font-bold text-slate-600">
                          Waktu
                          <input
                            type="time"
                            value={draft.waktu}
                            onChange={(event) => {
                              const waktu = event.target.value
                              setDraftJadwal((prev) => ({
                                ...prev,
                                [item.id_pengajuan]: {
                                  tanggal: prev[item.id_pengajuan]?.tanggal || '',
                                  waktu,
                                },
                              }))
                            }}
                            className="mt-1 block rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => simpanJadwal(item)}
                          disabled={menyimpanJadwal === item.id_pengajuan}
                          className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
                        >
                          {menyimpanJadwal === item.id_pengajuan ? 'Menyimpan...' : 'Simpan jadwal'}
                        </button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      )}
      {dokumenCetak && (
        <CetakUjianQiroah jenis={dokumenCetak.jenis} data={dokumenCetak.data} onClose={() => setDokumenCetak(null)} />
      )}
    </div>
  )
}