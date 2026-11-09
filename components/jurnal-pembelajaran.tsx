'use client'

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, CheckCircle2, Plus, Printer, Save, Trash2, UserX, X } from 'lucide-react'
import { BidangSuara, useDikte } from '@/components/input-suara'
import {
  DAFTAR_MAPEL,
  KETERANGAN_ABSEN,
  NAMA_HARI,
  TIPE_LINK,
  defaultSemester,
  emptyJurnalJam,
  deteksiJamAbsenKustom,
  fetchJurnalHari,
  fetchKelasDanJumlahSiswa,
  fetchSiswaKelas,
  hitungKehadiran,
  jamAktifDariJadwal,
  jamHariIni,
  rowsToEntries,
  salinAbsenJamPertama,
  saringAbsenKelas,
  simpanJurnalHari,
  teacherName,
  teacherUnit,
  todayInputValue,
  type JurnalJam,
  type SiswaKelas,
  type SiswaTidakHadir,
} from '@/lib/jurnal'

const TombolSimpanJurnal = memo(function TombolSimpanJurnal({
  disabled,
  saving,
  onSimpan,
}: {
  disabled: boolean
  saving: boolean
  onSimpan: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSimpan}
      disabled={disabled}
      className="no-print inline-flex min-w-[10.25rem] shrink-0 items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-800 disabled:pointer-events-none disabled:opacity-60"
      style={{ contain: 'layout paint' }}
    >
      <Save className="size-4 shrink-0" />
      <span className="truncate">{saving ? 'Menyimpan...' : 'Simpan jurnal'}</span>
    </button>
  )
})

function InputLokal({
  value,
  onCommit,
  className,
  ...rest
}: {
  value: string
  onCommit: (nilai: string) => void
  className?: string
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'onBlur'>) {
  const [lokal, setLokal] = useState(value)
  const valueRef = useRef(value)
  if (value !== valueRef.current) {
    valueRef.current = value
    if (value !== lokal) setLokal(value)
  }
  return (
    <input
      {...rest}
      value={lokal}
      className={className}
      onChange={(event) => setLokal(event.target.value)}
      onBlur={() => {
        if (lokal !== valueRef.current) onCommit(lokal)
      }}
    />
  )
}

const JurnalMetaBar = memo(function JurnalMetaBar({
  kelas,
  kelasList,
  tanggal,
  semester,
  guru,
  unit,
  hariIndex,
  tanggalLabel,
  saving,
  bisaSimpan,
  onKelas,
  onTanggal,
  onSemester,
  onSimpan,
}: {
  kelas: string
  kelasList: string[]
  tanggal: string
  semester: string
  guru: string
  unit: string
  hariIndex: number
  tanggalLabel: string
  saving: boolean
  bisaSimpan: boolean
  onKelas: (nilai: string) => void
  onTanggal: (nilai: string) => void
  onSemester: (nilai: string) => void
  onSimpan: () => void
}) {
  return (
    <div className="jurnal-print-meta flex flex-wrap items-end gap-3 border-b border-slate-200 px-5 py-4">
      <label className="no-print text-xs font-bold text-slate-600">
        Kelas
        <select
          value={kelas}
          onChange={(e) => onKelas(e.target.value)}
          className="mt-1 block min-w-28 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800"
        >
          {kelasList.length === 0 && <option value="">Memuat kelas...</option>}
          {kelasList.map((nama) => (
            <option key={nama} value={nama}>
              {nama}
            </option>
          ))}
        </select>
      </label>

      <label className="no-print text-xs font-bold text-slate-600">
        Tanggal
        <input
          type="date"
          value={tanggal}
          onChange={(e) => onTanggal(e.target.value)}
          className="mt-1 block rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800"
        />
      </label>

      <label className="no-print text-xs font-bold text-slate-600">
        Semester
        <select
          value={semester}
          onChange={(e) => onSemester(e.target.value)}
          className="mt-1 block rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800"
        >
          <option value="1">1 (Satu)</option>
          <option value="2">2 (Dua)</option>
        </select>
      </label>

      <TombolSimpanJurnal disabled={!bisaSimpan || saving} saving={saving} onSimpan={onSimpan} />
      <button
        type="button"
        onClick={() => window.print()}
        className="no-print inline-flex items-center gap-2 rounded-lg border border-emerald-700 bg-white px-4 py-2 text-sm font-bold text-emerald-800 hover:bg-emerald-50"
      >
        <Printer className="size-4" /> Cetak
      </button>

      <div className="ml-auto text-right">
        <p className="text-base font-black text-slate-900">
          {hariIndex >= 0 ? NAMA_HARI[hariIndex] : '-'}, {tanggalLabel}
        </p>
        <p className="text-xs text-slate-500">
          Kelas {kelas || '-'} / Semester {semester}
          {unit ? ` · Unit ${unit}` : ''}
        </p>
        <p className="text-xs font-semibold text-emerald-700">Guru: {guru}</p>
      </div>
    </div>
  )
})

export function JurnalPembelajaran({
  onBack,
  currentUser,
}: {
  onBack: () => void
  currentUser?: any
}) {
  const guru = teacherName(currentUser)
  const unit = teacherUnit(currentUser)

  const [kelasList, setKelasList] = useState<string[]>([])
  const [jumlahSiswa, setJumlahSiswa] = useState<Record<string, number>>({})
  const [siswaKelas, setSiswaKelas] = useState<SiswaKelas[]>([])
  const [rosterKelas, setRosterKelas] = useState('')
  const [kelas, setKelas] = useState('')
  const [tanggal, setTanggal] = useState(todayInputValue())
  const [semester, setSemester] = useState(defaultSemester())
  const [entries, setEntries] = useState<Record<number, JurnalJam>>({})
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [absenKustomJam, setAbsenKustomJam] = useState<Set<number>>(() => new Set())
  const absenKustomJamRef = useRef<Set<number>>(new Set())
  const [status, setStatus] = useState('')
  const [statusError, setStatusError] = useState(false)
  const [toastSukses, setToastSukses] = useState('')

  const [ttdJam, setTtdJam] = useState<number | null>(null)
  const [pilihAbsenJam, setPilihAbsenJam] = useState<number | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawingRef = useRef(false)
  const dikte = useDikte()
  const currentUserRef = useRef(currentUser)
  currentUserRef.current = currentUser
  const siswaKelasRef = useRef(siswaKelas)
  siswaKelasRef.current = siswaKelas
  const jumlahSiswaRef = useRef(jumlahSiswa)
  jumlahSiswaRef.current = jumlahSiswa
  const hentikanDikteRef = useRef(dikte.hentikan)
  hentikanDikteRef.current = dikte.hentikan

  const userKunci = useMemo(
    () =>
      [
        currentUser?.target_id,
        currentUser?.id_user,
        currentUser?.username,
        currentUser?.unit,
      ]
        .map((item) => String(item || '').trim())
        .join('|'),
    [currentUser?.target_id, currentUser?.id_user, currentUser?.username, currentUser?.unit],
  )

  const selectedDate = tanggal ? new Date(`${tanggal}T00:00:00`) : null
  const hariIndex = selectedDate ? selectedDate.getDay() : -1
  const jadwal = selectedDate ? jamHariIni(selectedDate) : null
  const jumlahKelas = siswaKelas.length || (kelas ? jumlahSiswa[kelas] || 0 : 0)

  const getEntry = (jam: number, source = entries) =>
    source[jam] || emptyJurnalJam(jumlahKelas ? String(jumlahKelas) : '')

  const absenKelas = (absen: SiswaTidakHadir[]) => saringAbsenKelas(absen, siswaKelas)

  const entryRekap = (entry: JurnalJam) => hitungKehadiran(jumlahKelas, absenKelas(entry.siswaTidakHadir))

  const tandaiJamAbsenKustom = (jam: number) => {
    if (jam <= 1) return
    const next = new Set(absenKustomJamRef.current)
    next.add(jam)
    absenKustomJamRef.current = next
    setAbsenKustomJam(next)
  }

  const hapusJamAbsenKustom = (jam: number) => {
    const next = new Set(absenKustomJamRef.current)
    next.delete(jam)
    absenKustomJamRef.current = next
    setAbsenKustomJam(next)
  }

  const updateEntry = (
    jam: number,
    patch: Partial<JurnalJam>,
    opsi?: { terapkanSalinJamPertama?: boolean },
  ) => {
    setEntries((current) => {
      const next = { ...getEntry(jam, current), ...patch }
      next.siswaTidakHadir = absenKelas(next.siswaTidakHadir || [])
      const rekap = hitungKehadiran(jumlahKelas, next.siswaTidakHadir)
      next.hadir = String(rekap.hadir)
      next.absen = String(rekap.tidakHadir)
      const hanyaAbsensi = Object.keys(patch).every((kunci) =>
        ['siswaTidakHadir', 'hadir', 'absen'].includes(kunci),
      )
      if (!hanyaAbsensi) next.guru = guru

      let updated: Record<number, JurnalJam> = { ...current, [jam]: next }
      if (opsi?.terapkanSalinJamPertama && jam === 1 && jadwal) {
        const jamAktif = jamAktifDariJadwal(jadwal)
        updated = salinAbsenJamPertama(updated, jamAktif, jumlahKelas, absenKustomJamRef.current)
      }
      return updated
    })
  }

  const updateEntryRef = useRef(updateEntry)
  updateEntryRef.current = updateEntry

  useEffect(() => {
    let batal = false
    async function loadKelas() {
      const result = await fetchKelasDanJumlahSiswa(currentUserRef.current)
      if (batal) return
      setKelasList(result.classes)
      setJumlahSiswa(result.counts)
      setKelas((prev) => prev || result.classes[0] || '')
    }
    void loadKelas()
    return () => {
      batal = true
    }
  }, [userKunci])

  useEffect(() => {
    if (!kelas) {
      setSiswaKelas([])
      setRosterKelas('')
      return
    }
    let batal = false
    fetchSiswaKelas(kelas, currentUserRef.current).then((rows) => {
      if (batal) return
      setSiswaKelas(rows)
      setRosterKelas(kelas)
    })
    return () => {
      batal = true
    }
  }, [kelas, userKunci])

  const kunciRoster = useMemo(
    () => siswaKelas.map((item) => item.id_siswa).join('|'),
    [siswaKelas],
  )

  const rosterSiap = Boolean(kelas && tanggal && rosterKelas === kelas)
  const kunciMuatJurnal = rosterSiap ? `${kelas}\u0001${tanggal}\u0001${kunciRoster}` : ''

  useEffect(() => {
    if (!kunciMuatJurnal) return

    const [kelasMuat, tanggalMuat] = kunciMuatJurnal.split('\u0001')
    let batal = false
    hentikanDikteRef.current()

    async function muatJurnal() {
      setLoading(true)
      setToastSukses('')
      setStatus('')
      setStatusError(false)

      const roster = siswaKelasRef.current
      const total = roster.length || jumlahSiswaRef.current[kelasMuat] || 0
      const { rows, error } = await fetchJurnalHari(kelasMuat, tanggalMuat)
      if (batal) return

      const tanggalHari = tanggalMuat ? new Date(`${tanggalMuat}T00:00:00`) : null

      if (error) {
        setStatus('Gagal memuat jurnal dari Supabase. ' + error.message)
        setStatusError(true)
        setEntries({})
      } else if (rows.length > 0) {
        const loaded = rowsToEntries(rows, total, roster)
        const jamAktif = tanggalHari ? jamAktifDariJadwal(jamHariIni(tanggalHari)) : []
        const kustom = deteksiJamAbsenKustom(loaded, jamAktif)
        absenKustomJamRef.current = kustom
        setAbsenKustomJam(kustom)
        setEntries(loaded)
        const smt = rows.find((row) => row.semester != null)?.semester
        if (smt) setSemester(String(smt))
        setStatus('Jurnal hari ini dimuat dari Supabase.')
      } else {
        absenKustomJamRef.current = new Set()
        setAbsenKustomJam(new Set())
        setEntries({})
        setStatus('Semua siswa dihitung hadir. Isi jurnal lalu tekan tombol Simpan jurnal.')
      }

      setLoading(false)
    }

    void muatJurnal()
    return () => {
      batal = true
    }
  }, [kunciMuatJurnal])

  const tutupDaftarAbsen = () => {
    const jam = pilihAbsenJam
    setPilihAbsenJam(null)
    if (jam === 1) {
      setStatus('Absensi Jam ke-1 sudah disalin ke jam berikutnya di layar. Tekan Simpan jurnal untuk menulis ke Supabase.')
      setStatusError(false)
    } else if (jam != null && jam > 1) {
      setStatus(`Absensi Jam ke-${jam} diubah di layar. Tekan Simpan jurnal untuk menulis ke Supabase.`)
      setStatusError(false)
    }
  }

  const samakanAbsenJamPertama = (jam: number) => {
    if (!jadwal) return
    hapusJamAbsenKustom(jam)
    const jamAktif = jamAktifDariJadwal(jadwal)
    setEntries((current) => salinAbsenJamPertama(current, jamAktif, jumlahKelas, absenKustomJamRef.current))
  }

  const simpanJurnalRef = useRef<() => Promise<void>>(async () => {})
  simpanJurnalRef.current = async () => {
    if (!kelas || !tanggal || !jadwal) return
    const aktif = document.activeElement
    if (aktif instanceof HTMLElement) aktif.blur()
    await new Promise((selesai) => window.setTimeout(selesai, 0))
    setSaving(true)
    setStatus('')
    setStatusError(false)

    const jamAktif = jamAktifDariJadwal(jadwal)
    const merged = salinAbsenJamPertama(entries, jamAktif, jumlahKelas, absenKustomJamRef.current)
    setEntries(merged)

    const payload: Record<number, JurnalJam> = {}
    for (const jam of jamAktif) payload[jam] = getEntry(jam, merged)

    const { error } = await simpanJurnalHari({
      kelas,
      tanggal,
      semester: Number(semester),
      totalSiswa: jumlahKelas,
      entries: payload,
      guru,
      roster: siswaKelas,
    })

    setSaving(false)
    if (error) {
      setStatus('Gagal menyimpan jurnal: ' + error.message)
      setStatusError(true)
      setToastSukses('')
      return
    }
    const pesan = `Jurnal kelas ${kelas} · ${tanggalLabel} berhasil disimpan.`
    setStatus(pesan)
    setStatusError(false)
    setToastSukses(pesan)
    window.setTimeout(() => setToastSukses(''), 4500)
  }

  const onSimpanJurnal = useCallback(() => {
    void simpanJurnalRef.current()
  }, [])

  const setAbsenSiswa = (jam: number, siswa: SiswaKelas, keterangan: string | null) => {
    const entry = getEntry(jam)
    const tanpaSiswa = absenKelas(entry.siswaTidakHadir).filter(
      (item) => item.id_siswa !== siswa.id_siswa && item.nama !== siswa.nama_siswa,
    )
    const nextList: SiswaTidakHadir[] = keterangan
      ? [...tanpaSiswa, { nama: siswa.nama_siswa, keterangan, id_siswa: siswa.id_siswa }]
      : tanpaSiswa
    if (jam !== 1) tandaiJamAbsenKustom(jam)
    updateEntry(
      jam,
      { siswaTidakHadir: nextList, absen: String(nextList.length) },
      { terapkanSalinJamPertama: jam === 1 },
    )
  }

  const openTtd = (jam: number) => {
    setTtdJam(jam)
    requestAnimationFrame(() => {
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.lineWidth = 2
      ctx.lineCap = 'round'
      ctx.strokeStyle = '#111'
    })
  }

  const canvasPos = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return [0, 0]
    const rect = canvas.getBoundingClientRect()
    return [
      ((event.clientX - rect.left) * canvas.width) / rect.width,
      ((event.clientY - rect.top) * canvas.height) / rect.height,
    ]
  }

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    drawingRef.current = true
    canvas.setPointerCapture(event.pointerId)
    const [x, y] = canvasPos(event)
    ctx.beginPath()
    ctx.moveTo(x, y)
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    const [x, y] = canvasPos(event)
    ctx.lineTo(x, y)
    ctx.stroke()
  }

  const handlePointerUp = () => {
    drawingRef.current = false
  }

  const simpanTtd = () => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx || ttdJam == null) return
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data
    const blank = !Array.from(pixels).some((value, index) => index % 4 === 3 && value > 0)
    updateEntry(ttdJam, { ttd: blank ? null : canvas.toDataURL('image/png') })
    setTtdJam(null)
  }

  const tanggalLabel = selectedDate
    ? selectedDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
    : '-'

  const absenDipilih = pilihAbsenJam != null ? absenKelas(getEntry(pilihAbsenJam).siswaTidakHadir) : []

  return (
    <div className="jurnal-print-root space-y-4">
      <style>{`
        @media print {
          @page {
            size: 330mm 210mm landscape;
            margin: 6mm 5mm;
          }
          html, body {
            width: 330mm !important;
            height: 210mm !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: hidden !important;
            background: white !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          header, nav, .no-print { display: none !important; }
          main { max-width: none !important; padding: 0 !important; margin: 0 !important; }
          .jurnal-print-root {
            width: 100% !important;
            max-height: 198mm !important;
            overflow: hidden !important;
            page-break-inside: avoid;
            break-inside: avoid;
          }
          .jurnal-print {
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
            overflow: hidden !important;
          }
          .jurnal-print-meta {
            padding: 2mm 3mm !important;
            border-bottom-width: 1px !important;
          }
          .jurnal-print-body {
            padding: 2mm 3mm !important;
          }
          .jurnal-print-table-wrap {
            overflow: hidden !important;
            border-radius: 0 !important;
          }
          .jurnal-print-table {
            width: 100% !important;
            min-width: 0 !important;
            table-layout: fixed;
            font-size: 6.5pt !important;
            line-height: 1.12 !important;
          }
          .jurnal-print-table th,
          .jurnal-print-table td {
            padding: 1.5px 2px !important;
            vertical-align: top !important;
            word-break: break-word;
            overflow: hidden;
          }
          .jurnal-print-table th:nth-child(1) { width: 4%; }
          .jurnal-print-table th:nth-child(2) { width: 6%; }
          .jurnal-print-table th:nth-child(3) { width: 9%; }
          .jurnal-print-table th:nth-child(4) { width: 14%; }
          .jurnal-print-table th:nth-child(5) { width: 14%; }
          .jurnal-print-table th:nth-child(6) { width: 10%; }
          .jurnal-print-table th:nth-child(7) { width: 10%; }
          .jurnal-print-table th:nth-child(8) { width: 5%; }
          .jurnal-print-table th:nth-child(9) { width: 8%; }
          .jurnal-print-table th:nth-child(10) { width: 10%; }
          .jurnal-print-table input,
          .jurnal-print-table textarea {
            border: none !important;
            background: transparent !important;
            box-shadow: none !important;
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
            min-height: 0 !important;
            font: inherit !important;
            color: inherit !important;
            resize: none !important;
          }
          .jurnal-print-table img {
            max-height: 10mm !important;
            max-width: 100% !important;
          }
        }
      `}</style>

      <button
        type="button"
        onClick={onBack}
        className="no-print inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-bold text-white transition hover:bg-amber-600"
      >
        <ArrowLeft className="size-4" /> Kembali ke Dashboard
      </button>

      <div className="jurnal-print overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-emerald-800 bg-emerald-800 px-5 py-4 text-white">
          <h2 className="text-lg font-black">Jurnal Pembelajaran</h2>
          <p className="text-xs text-emerald-100">Catatan KBM harian dan presensi per jam pelajaran</p>
        </div>

        <JurnalMetaBar
          kelas={kelas}
          kelasList={kelasList}
          tanggal={tanggal}
          semester={semester}
          guru={guru}
          unit={unit}
          hariIndex={hariIndex}
          tanggalLabel={tanggalLabel}
          saving={saving}
          bisaSimpan={Boolean(jadwal)}
          onKelas={setKelas}
          onTanggal={setTanggal}
          onSemester={setSemester}
          onSimpan={onSimpanJurnal}
        />

        <div className="jurnal-print-body space-y-3 px-5 py-4">
          <p className="no-print text-xs text-slate-500">
            {loading ? 'Memuat jurnal...' : null}
            {!loading && jumlahKelas > 0 && (
              <>
                {' '}
                Default <b className="text-emerald-700">{jumlahKelas} siswa hadir</b>
                {unit ? ` (${unit})` : ''}. Tandai yang tidak hadir saja.
              </>
            )}
          </p>
          {!loading && jadwal && (
            <p className="no-print text-xs font-semibold text-amber-900 bg-amber-50 rounded-lg border border-amber-100 px-3 py-2">
              Tidak ada penyimpanan otomatis ke Supabase. Absensi Jam ke-1 yang Anda ubah langsung disalin ke jam
              berikutnya di layar (kecuali jam dengan absen khusus). Ubah per jam untuk izin/pulang di tengah pelajaran
              lewat <b>Atur absen</b>. Semua data baru tersimpan hanya setelah Anda menekan <b>Simpan jurnal</b>.
            </p>
          )}
          {!loading && status && (
            <p
              className={`no-print rounded-lg px-3 py-2 text-xs font-semibold ${
                statusError ? 'bg-red-50 text-red-700' : 'bg-slate-50 text-slate-600'
              }`}
            >
              {status}
            </p>
          )}
          {dikte.galat && <p className="no-print text-xs font-bold text-red-600">{dikte.galat}</p>}

          {!jadwal ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 py-16 text-center text-slate-500">
              Hari {hariIndex >= 0 ? NAMA_HARI[hariIndex] : '-'} libur. Tidak ada jam pelajaran.
            </div>
          ) : (
            <div className="jurnal-print-table-wrap overflow-x-auto rounded-xl border border-slate-200">
              <table className="jurnal-print-table w-full min-w-[1320px] border-collapse text-left text-xs">
                <thead>
                  <tr className="bg-emerald-50 text-center font-bold text-emerald-900">
                    <th className="border border-slate-200 p-2">Jam ke</th>
                    <th className="border border-slate-200 p-2">Waktu</th>
                    <th className="border border-slate-200 p-2">Mata pelajaran</th>
                    <th className="border border-slate-200 p-2">Materi pokok</th>
                    <th className="border border-slate-200 p-2">Kegiatan pembelajaran</th>
                    <th className="border border-slate-200 p-2">Link pembelajaran</th>
                    <th className="border border-slate-200 p-2">Tugas di Rumah</th>
                    <th className="border border-slate-200 p-2">Hadir</th>
                    <th className="border border-slate-200 p-2">Tidak hadir</th>
                    <th className="border border-slate-200 p-2">Paraf guru</th>
                  </tr>
                </thead>
                <tbody>
                  {jadwal.map((item, index) => {
                    if (item.r) {
                      return (
                        <tr key={`rest-${index}`} className="bg-amber-50 text-center font-semibold text-amber-900">
                          <td className="border border-slate-200 p-2 text-xs font-normal text-slate-500">{item.w}</td>
                          <td className="border border-slate-200 p-2" colSpan={9}>
                            {item.r}
                          </td>
                        </tr>
                      )
                    }

                    const jam = item.j as number
                    const entry = getEntry(jam)
                    const rekap = entryRekap(entry)

                    return (
                      <tr key={jam}>
                        <td className="border border-slate-200 p-2 text-center font-black text-slate-800">{jam}</td>
                        <td className="whitespace-nowrap border border-slate-200 p-2 text-slate-500">{item.w}</td>
                        <td className="border border-slate-200 p-1.5">
                          <InputLokal
                            type="text"
                            list="daftar-mapel"
                            value={entry.mapel}
                            onCommit={(nilai) => updateEntry(jam, { mapel: nilai })}
                            className="w-full rounded border border-slate-200 px-2 py-1.5"
                          />
                        </td>
                        <td className="border border-slate-200 p-1.5 align-top">
                          <BidangSuara
                            value={entry.materi}
                            mendengarkan={dikte.aktif === `${jam}:materi`}
                            onChange={(value) => updateEntry(jam, { materi: value })}
                            onToggle={() =>
                              dikte.toggle(
                                `${jam}:materi`,
                                () => getEntry(jam).materi,
                                (value) => updateEntryRef.current(jam, { materi: value }),
                              )
                            }
                          />
                        </td>
                        <td className="border border-slate-200 p-1.5 align-top">
                          <BidangSuara
                            value={entry.kegiatan}
                            mendengarkan={dikte.aktif === `${jam}:kegiatan`}
                            onChange={(value) => updateEntry(jam, { kegiatan: value })}
                            onToggle={() =>
                              dikte.toggle(
                                `${jam}:kegiatan`,
                                () => getEntry(jam).kegiatan,
                                (value) => updateEntryRef.current(jam, { kegiatan: value }),
                              )
                            }
                          />
                        </td>
                        <td className="border border-slate-200 p-1.5">
                          <div className="space-y-1.5">
                            {entry.links.map((link, linkIndex) => (
                              <div key={`${jam}-${linkIndex}`} className="flex items-center gap-1">
                                <select
                                  value={link.tipe}
                                  onChange={(e) => {
                                    const links = entry.links.map((itemLink, i) =>
                                      i === linkIndex ? { ...itemLink, tipe: e.target.value } : itemLink,
                                    )
                                    updateEntry(jam, { links })
                                  }}
                                  className="w-24 shrink-0 rounded border border-slate-200 px-1 py-1"
                                >
                                  {TIPE_LINK.map(([value, label]) => (
                                    <option key={value} value={value}>
                                      {label}
                                    </option>
                                  ))}
                                </select>
                                <input
                                  type="url"
                                  placeholder="https://..."
                                  value={link.url}
                                  onChange={(e) => {
                                    const links = entry.links.map((itemLink, i) =>
                                      i === linkIndex ? { ...itemLink, url: e.target.value } : itemLink,
                                    )
                                    updateEntry(jam, { links })
                                  }}
                                  className="w-full rounded border border-slate-200 px-2 py-1"
                                />
                                {link.url && (
                                  <a
                                    href={link.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="whitespace-nowrap text-[11px] font-bold text-emerald-700"
                                  >
                                    Buka
                                  </a>
                                )}
                                <button
                                  type="button"
                                  title="Hapus link"
                                  onClick={() =>
                                    updateEntry(jam, {
                                      links: entry.links.filter((_, i) => i !== linkIndex),
                                    })
                                  }
                                  className="no-print rounded border border-slate-200 px-1.5 py-0.5 text-slate-500 hover:bg-slate-100"
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                            <button
                              type="button"
                              onClick={() =>
                                updateEntry(jam, {
                                  links: [...entry.links, { tipe: 'video', url: '' }],
                                })
                              }
                              className="no-print inline-flex items-center gap-1 rounded border border-emerald-200 bg-white px-2 py-1 text-[11px] font-bold text-emerald-700 hover:bg-emerald-50"
                            >
                              <Plus className="size-3" /> Tambah link
                            </button>
                          </div>
                        </td>
                        <td className="w-44 border border-slate-200 p-1.5 align-top">
                          <BidangSuara
                            value={entry.tugas}
                            mendengarkan={dikte.aktif === `${jam}:tugas`}
                            onChange={(value) => updateEntry(jam, { tugas: value })}
                            onToggle={() =>
                              dikte.toggle(
                                `${jam}:tugas`,
                                () => getEntry(jam).tugas,
                                (value) => updateEntryRef.current(jam, { tugas: value }),
                              )
                            }
                            placeholder="Tugas di rumah"
                          />
                        </td>
                        <td className="w-16 border border-slate-200 p-1.5 text-center">
                          <div className="rounded bg-emerald-50 py-1.5 text-sm font-black text-emerald-800">
                            {rekap.hadir}
                          </div>
                        </td>
                        <td className="w-40 border border-slate-200 p-1.5">
                          <div className="flex flex-col items-center gap-0.5">
                            {absenKustomJam.has(jam) ? (
                              <span className="no-print rounded bg-violet-100 px-1 text-[9px] font-bold text-violet-800">
                                Absen khusus jam ini
                              </span>
                            ) : null}
                          <button
                            type="button"
                            onClick={() => setPilihAbsenJam(jam)}
                            className="no-print w-full rounded border border-amber-300 bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-900 hover:bg-amber-100"
                          >
                            Atur absen ({rekap.tidakHadir})
                          </button>
                          </div>
                        </td>
                        <td className="w-28 border border-slate-200 p-1.5 text-center">
                          {entry.ttd && (
                            <img src={entry.ttd} alt="Paraf" className="mx-auto mb-1 max-h-11 max-w-24" />
                          )}
                          {(entry.guru || guru) && (
                            <p className="mb-1 text-[10px] font-semibold leading-tight text-slate-600">{entry.guru || guru}</p>
                          )}
                          <button
                            type="button"
                            onClick={() => openTtd(jam)}
                            className="no-print rounded border border-slate-200 bg-white px-2 py-1 text-[11px] font-bold text-slate-600 hover:bg-slate-50"
                          >
                            {entry.ttd ? 'Ubah' : 'Tanda tangan'}
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              <datalist id="daftar-mapel">
                {DAFTAR_MAPEL.map((mapel) => (
                  <option key={mapel} value={mapel} />
                ))}
              </datalist>
            </div>
          )}
        </div>
      </div>

      {pilihAbsenJam != null && (
        <div className="no-print fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-2xl bg-white p-5 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-slate-800">Atur kehadiran · Jam ke-{pilihAbsenJam}</p>
                <p className="text-xs text-slate-500">
                  Pilih status per siswa; perubahan langsung berlaku di layar (tanpa simpan otomatis ke Supabase).
                  {pilihAbsenJam === 1 ? (
                    <>
                      {' '}
                      Jam ke-1 otomatis disalin ke jam berikutnya, kecuali jam yang sudah Anda ubah khusus.
                    </>
                  ) : (
                    <> Perubahan hanya untuk jam ini (mis. izin/pulang di tengah pelajaran).</>
                  )}
                </p>
              </div>
              <button type="button" onClick={() => setPilihAbsenJam(null)} className="text-slate-400 hover:text-slate-700">
                <X className="size-4" />
              </button>
            </div>
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
              {siswaKelas.length === 0 ? (
                <p className="text-sm text-slate-500">Daftar siswa kelas ini belum tersedia.</p>
              ) : (
                siswaKelas.map((siswa) => {
                  const terpilih = absenDipilih.find(
                    (item) => item.id_siswa === siswa.id_siswa || item.nama === siswa.nama_siswa,
                  )
                  return (
                    <div key={siswa.id_siswa} className="flex items-center justify-between gap-2 rounded-xl border border-slate-100 px-3 py-2">
                      <span className="text-sm font-semibold text-slate-800">{siswa.nama_siswa}</span>
                      <select
                        value={terpilih?.keterangan || ''}
                        onChange={(e) => setAbsenSiswa(pilihAbsenJam, siswa, e.target.value || null)}
                        className="rounded-lg border border-slate-300 px-2 py-1 text-xs font-bold"
                      >
                        <option value="">Hadir</option>
                        {KETERANGAN_ABSEN.map((keterangan) => (
                          <option key={keterangan} value={keterangan}>
                            {keterangan}
                          </option>
                        ))}
                      </select>
                    </div>
                  )
                })
              )}
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-slate-500">
                Tidak hadir: <b>{absenDipilih.length}</b> · Hadir: <b>{Math.max(0, jumlahKelas - absenDipilih.length)}</b>
              </p>
              <div className="flex flex-wrap gap-2">
                {pilihAbsenJam != null && pilihAbsenJam > 1 ? (
                  <button
                    type="button"
                    onClick={() => samakanAbsenJamPertama(pilihAbsenJam)}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                  >
                    Samakan dengan Jam ke-1
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={tutupDaftarAbsen}
                  className="inline-flex items-center gap-1 rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-bold text-white"
                >
                  <UserX className="size-3.5" /> Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {toastSukses ? (
        <div
          className="no-print pointer-events-none fixed bottom-6 right-4 z-[60] flex max-w-sm items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-700 px-4 py-3 text-sm font-bold text-white shadow-lg"
          role="status"
          aria-live="polite"
        >
          <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-100" />
          <span>{toastSukses}</span>
        </div>
      ) : null}

      {ttdJam != null && (
        <div className="no-print fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-bold text-slate-800">Tanda tangan guru · Jam ke-{ttdJam}</p>
              <button type="button" onClick={() => setTtdJam(null)} className="text-slate-400 hover:text-slate-700">
                <X className="size-4" />
              </button>
            </div>
            <canvas
              ref={canvasRef}
              width={320}
              height={140}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              className="mb-3 w-full touch-none rounded-lg border border-slate-300 bg-white"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  const canvas = canvasRef.current
                  const ctx = canvas?.getContext('2d')
                  if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height)
                }}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600"
              >
                <Trash2 className="size-3.5" /> Hapus
              </button>
              <button
                type="button"
                onClick={() => setTtdJam(null)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={simpanTtd}
                className="inline-flex items-center gap-1 rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-bold text-white"
              >
                <CheckCircle2 className="size-3.5" /> Simpan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
