'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowLeft, CheckCircle2, Eye, Plus, Printer, Save, Trash2, UserX, X } from 'lucide-react'
import {
  DAFTAR_MAPEL,
  KETERANGAN_ABSEN,
  NAMA_HARI,
  TIPE_LINK,
  defaultSemester,
  emptyJurnalJam,
  fetchJurnalHari,
  fetchKelasDanJumlahSiswa,
  fetchSiswaKelas,
  hitungKehadiran,
  jamHariIni,
  rowsToEntries,
  simpanJurnalHari,
  teacherName,
  teacherUnit,
  todayInputValue,
  type JurnalJam,
  type SiswaKelas,
  type SiswaTidakHadir,
} from '@/lib/jurnal'

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
  const [kelas, setKelas] = useState('')
  const [tanggal, setTanggal] = useState(todayInputValue())
  const [semester, setSemester] = useState(defaultSemester())
  const [entries, setEntries] = useState<Record<number, JurnalJam>>({})
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState('')
  const [statusError, setStatusError] = useState(false)

  const [ttdJam, setTtdJam] = useState<number | null>(null)
  const [pilihAbsenJam, setPilihAbsenJam] = useState<number | null>(null)
  const [lihatAbsenJam, setLihatAbsenJam] = useState<number | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawingRef = useRef(false)

  const selectedDate = tanggal ? new Date(`${tanggal}T00:00:00`) : null
  const hariIndex = selectedDate ? selectedDate.getDay() : -1
  const jadwal = selectedDate ? jamHariIni(selectedDate) : null
  const jumlahKelas = siswaKelas.length || (kelas ? jumlahSiswa[kelas] || 0 : 0)

  const getEntry = (jam: number, source = entries) =>
    source[jam] || emptyJurnalJam(jumlahKelas ? String(jumlahKelas) : '')

  const entryRekap = (entry: JurnalJam) => hitungKehadiran(jumlahKelas, entry.siswaTidakHadir, entry.absen)

  const updateEntry = (jam: number, patch: Partial<JurnalJam>) => {
    setEntries((current) => {
      const next = { ...getEntry(jam, current), ...patch }
      const rekap = hitungKehadiran(jumlahKelas, next.siswaTidakHadir, next.absen)
      next.hadir = String(rekap.hadir)
      next.absen = String(rekap.tidakHadir)
      return { ...current, [jam]: next }
    })
  }

  useEffect(() => {
    async function loadKelas() {
      const result = await fetchKelasDanJumlahSiswa(currentUser)
      setKelasList(result.classes)
      setJumlahSiswa(result.counts)
      setKelas((prev) => prev || result.classes[0] || '')
    }
    loadKelas()
  }, [currentUser])

  useEffect(() => {
    if (!kelas) {
      setSiswaKelas([])
      return
    }
    fetchSiswaKelas(kelas, currentUser).then(setSiswaKelas)
  }, [kelas, currentUser])

  const muatJurnal = useCallback(async () => {
    if (!kelas || !tanggal) return
    setLoading(true)
    setStatus('')
    setStatusError(false)

    const { rows, error } = await fetchJurnalHari(kelas, tanggal)
    const total = jumlahSiswa[kelas] || 0

    if (error) {
      setStatus('Gagal memuat jurnal dari Supabase. ' + error.message)
      setStatusError(true)
      setEntries({})
    } else if (rows.length > 0) {
      setEntries(rowsToEntries(rows, total))
      const smt = rows.find((row) => row.semester != null)?.semester
      if (smt) setSemester(String(smt))
      setStatus('Jurnal hari ini dimuat dari Supabase.')
    } else {
      setEntries({})
      setStatus('Semua siswa dihitung hadir. Tandai yang tidak hadir jika ada, lalu simpan.')
    }

    setLoading(false)
  }, [kelas, tanggal, jumlahSiswa])

  useEffect(() => {
    muatJurnal()
  }, [muatJurnal])

  const handleSimpan = async () => {
    if (!kelas || !tanggal || !jadwal) return
    setSaving(true)
    setStatus('')
    setStatusError(false)

    const jamAktif = jadwal.map((item) => item.j).filter((jam): jam is number => typeof jam === 'number')
    const payload: Record<number, JurnalJam> = {}
    for (const jam of jamAktif) payload[jam] = getEntry(jam)

    const { error } = await simpanJurnalHari({
      kelas,
      tanggal,
      semester: Number(semester),
      totalSiswa: jumlahKelas,
      entries: payload,
    })

    setSaving(false)
    if (error) {
      setStatus('Gagal menyimpan jurnal: ' + error.message)
      setStatusError(true)
      return
    }
    setStatus('Jurnal dan presensi tersimpan ke Supabase.')
    setStatusError(false)
  }

  const setAbsenSiswa = (jam: number, siswa: SiswaKelas, keterangan: string | null) => {
    const entry = getEntry(jam)
    const tanpaSiswa = entry.siswaTidakHadir.filter(
      (item) => item.id_siswa !== siswa.id_siswa && item.nama !== siswa.nama_siswa,
    )
    const nextList: SiswaTidakHadir[] = keterangan
      ? [...tanpaSiswa, { nama: siswa.nama_siswa, keterangan, id_siswa: siswa.id_siswa }]
      : tanpaSiswa
    updateEntry(jam, { siswaTidakHadir: nextList })
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

  const absenDilihat = lihatAbsenJam != null ? getEntry(lihatAbsenJam).siswaTidakHadir : []
  const absenDipilih = pilihAbsenJam != null ? getEntry(pilihAbsenJam).siswaTidakHadir : []

  return (
    <div className="space-y-4">
      <style>{`
        @media print {
          header, .no-print { display: none !important; }
          body { background: white !important; }
          .jurnal-print { box-shadow: none !important; border: none !important; }
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

        <div className="flex flex-wrap items-end gap-3 border-b border-slate-200 px-5 py-4">
          <label className="text-xs font-bold text-slate-600">
            Kelas
            <select
              value={kelas}
              onChange={(e) => setKelas(e.target.value)}
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

          <label className="text-xs font-bold text-slate-600">
            Tanggal
            <input
              type="date"
              value={tanggal}
              onChange={(e) => setTanggal(e.target.value)}
              className="mt-1 block rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800"
            />
          </label>

          <label className="text-xs font-bold text-slate-600">
            Semester
            <select
              value={semester}
              onChange={(e) => setSemester(e.target.value)}
              className="mt-1 block rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800"
            >
              <option value="1">1 (Satu)</option>
              <option value="2">2 (Dua)</option>
            </select>
          </label>

          <button
            type="button"
            onClick={handleSimpan}
            disabled={!jadwal || saving || loading}
            className="no-print inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-50"
          >
            <Save className="size-4" />
            {saving ? 'Menyimpan...' : 'Simpan jurnal'}
          </button>

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

        <div className="space-y-3 px-5 py-4">
          <p className={`text-xs ${statusError ? 'font-bold text-red-600' : 'text-slate-500'}`}>
            {loading ? 'Memuat jurnal...' : status}
            {!loading && jumlahKelas > 0 && (
              <>
                {' '}
                Default <b className="text-emerald-700">{jumlahKelas} siswa hadir</b>
                {unit ? ` (${unit})` : ''}. Tandai yang tidak hadir saja.
              </>
            )}
          </p>

          {!jadwal ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 py-16 text-center text-slate-500">
              Hari {hariIndex >= 0 ? NAMA_HARI[hariIndex] : '-'} libur. Tidak ada jam pelajaran.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full min-w-[1140px] border-collapse text-left text-xs">
                <thead>
                  <tr className="bg-emerald-50 text-center font-bold text-emerald-900">
                    <th className="border border-slate-200 p-2">Jam ke</th>
                    <th className="border border-slate-200 p-2">Waktu</th>
                    <th className="border border-slate-200 p-2">Mata pelajaran</th>
                    <th className="border border-slate-200 p-2">Materi pokok</th>
                    <th className="border border-slate-200 p-2">Kegiatan pembelajaran</th>
                    <th className="border border-slate-200 p-2">Link pembelajaran</th>
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
                          <td className="border border-slate-200 p-2" colSpan={8}>
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
                          <input
                            type="text"
                            list="daftar-mapel"
                            value={entry.mapel}
                            onChange={(e) => updateEntry(jam, { mapel: e.target.value })}
                            className="w-full rounded border border-slate-200 px-2 py-1.5"
                          />
                        </td>
                        <td className="border border-slate-200 p-1.5">
                          <textarea
                            value={entry.materi}
                            onChange={(e) => updateEntry(jam, { materi: e.target.value })}
                            className="min-h-14 w-full resize-y rounded border border-slate-200 px-2 py-1.5"
                          />
                        </td>
                        <td className="border border-slate-200 p-1.5">
                          <textarea
                            value={entry.kegiatan}
                            onChange={(e) => updateEntry(jam, { kegiatan: e.target.value })}
                            className="min-h-14 w-full resize-y rounded border border-slate-200 px-2 py-1.5"
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
                        <td className="w-16 border border-slate-200 p-1.5 text-center">
                          <div className="rounded bg-emerald-50 py-1.5 text-sm font-black text-emerald-800">
                            {rekap.hadir}
                          </div>
                        </td>
                        <td className="w-40 border border-slate-200 p-1.5">
                          <div className="flex items-center justify-center gap-1">
                            <span className="min-w-6 text-center text-sm font-black text-slate-800">{rekap.tidakHadir}</span>
                            <button
                              type="button"
                              disabled={entry.siswaTidakHadir.length === 0}
                              onClick={() => setLihatAbsenJam(jam)}
                              className="no-print rounded bg-slate-800 px-2 py-1 text-[10px] font-bold text-white disabled:opacity-40"
                            >
                              <span className="inline-flex items-center gap-1">
                                <Eye className="size-3" /> Tampilkan
                              </span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setPilihAbsenJam(jam)}
                              className="no-print rounded border border-amber-300 bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-800"
                            >
                              Pilih
                            </button>
                          </div>
                        </td>
                        <td className="w-28 border border-slate-200 p-1.5 text-center">
                          {entry.ttd && (
                            <img src={entry.ttd} alt="Paraf" className="mx-auto mb-1 max-h-11 max-w-24" />
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

      {lihatAbsenJam != null && (
        <div className="no-print fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-bold text-slate-800">Siswa tidak hadir · Jam ke-{lihatAbsenJam}</p>
              <button type="button" onClick={() => setLihatAbsenJam(null)} className="text-slate-400 hover:text-slate-700">
                <X className="size-4" />
              </button>
            </div>
            {absenDilihat.length === 0 ? (
              <p className="text-sm text-slate-500">Tidak ada data siswa tidak hadir pada jam ini.</p>
            ) : (
              <ul className="divide-y divide-slate-100 text-sm">
                {absenDilihat.map((item, index) => (
                  <li key={`${item.nama}-${index}`} className="flex items-center justify-between py-2">
                    <span className="font-semibold text-slate-800">{item.nama}</span>
                    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-800">
                      {item.keterangan}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  const jam = lihatAbsenJam
                  setLihatAbsenJam(null)
                  setPilihAbsenJam(jam)
                }}
                className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-bold text-white"
              >
                Ubah daftar
              </button>
            </div>
          </div>
        </div>
      )}

      {pilihAbsenJam != null && (
        <div className="no-print fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-2xl bg-white p-5 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-slate-800">Pilih siswa tidak hadir · Jam ke-{pilihAbsenJam}</p>
                <p className="text-xs text-slate-500">Siswa yang tidak dipilih tetap dihitung hadir.</p>
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
            <div className="mt-4 flex items-center justify-between">
              <p className="text-xs text-slate-500">
                Tidak hadir: <b>{absenDipilih.length}</b> · Hadir: <b>{Math.max(0, jumlahKelas - absenDipilih.length)}</b>
              </p>
              <button
                type="button"
                onClick={() => setPilihAbsenJam(null)}
                className="inline-flex items-center gap-1 rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-bold text-white"
              >
                <UserX className="size-3.5" /> Selesai
              </button>
            </div>
          </div>
        </div>
      )}

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
