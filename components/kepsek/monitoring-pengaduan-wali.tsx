'use client'

import { useEffect, useMemo, useState } from 'react'
import { ExternalLink, MessageCircleWarning, RefreshCw, X } from 'lucide-react'
import {
  daftarOpsiPenerusanPengaduan,
  opsiWaliKelasDariKelasAnak,
} from '@/lib/peta-wali-kelas-pengaduan'
import {
  formatWaktuPengaduan,
  klasifikasiPengaduanWali,
  labelStatusAlurPengaduan,
  muatPengaduanWaliUnit,
  PESAN_KOLOM_PENGADUAN_BELUM_ADA,
  simpanTindakLanjutPengaduanWali,
  type KlasifikasiPengaduan,
  type PengaduanWaliMurid,
  type StatusAlurPengaduan,
} from '@/lib/pengaduan-wali-murid'

function kelasStatus(status: StatusAlurPengaduan) {
  if (status === 'selesai') return 'bg-emerald-100 text-emerald-800'
  if (status === 'masuk') return 'bg-amber-100 text-amber-900'
  if (status === 'diteruskan') return 'bg-sky-100 text-sky-900'
  return 'bg-violet-100 text-violet-900'
}

function PratinjauLampiran({ item }: { item: PengaduanWaliMurid }) {
  if (!item.lampiranUrl) return <p className="text-xs text-slate-500">Tidak ada lampiran.</p>
  if (item.lampiranTipe === 'image') {
    return (
      <a href={item.lampiranUrl} target="_blank" rel="noopener noreferrer" className="block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={item.lampiranUrl} alt="Lampiran pengaduan" className="max-h-48 rounded-xl border object-contain" />
      </a>
    )
  }
  if (item.lampiranTipe === 'video') {
    return <video src={item.lampiranUrl} controls className="max-h-52 w-full rounded-xl border bg-black" />
  }
  return (
    <a
      href={item.lampiranUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-xs font-bold text-sky-800 underline"
    >
      <ExternalLink className="size-3.5" /> Buka lampiran ({item.lampiranTipe || 'berkas'})
    </a>
  )
}

function ModalDetail({
  item,
  onTutup,
  onSegarkan,
}: {
  item: PengaduanWaliMurid
  onTutup: () => void
  onSegarkan: () => void
}) {
  const saranAwal = opsiWaliKelasDariKelasAnak(item.kelasAnak)?.kunci || ''
  const [klasifikasi, setKlasifikasi] = useState<KlasifikasiPengaduan | ''>(item.klasifikasiPenanganan || '')
  const [kunciPenerima, setKunciPenerima] = useState(item.penerimaKunci || saranAwal)
  const [catatan, setCatatan] = useState(item.catatanKs)
  const [jawaban, setJawaban] = useState(item.tindakLanjutJawaban)
  const [menyimpan, setMenyimpan] = useState(false)
  const [galat, setGalat] = useState('')

  const opsiPenerusan = useMemo(() => daftarOpsiPenerusanPengaduan(), [])
  const waliOpsi = useMemo(() => opsiPenerusan.filter((baris) => baris.kunci.startsWith('wk:')), [opsiPenerusan])
  const wakaOpsi = useMemo(() => opsiPenerusan.filter((baris) => baris.kunci.startsWith('waka:')), [opsiPenerusan])

  useEffect(() => {
    const padaEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onTutup()
    }
    window.addEventListener('keydown', padaEscape)
    return () => window.removeEventListener('keydown', padaEscape)
  }, [onTutup])

  useEffect(() => {
    if (klasifikasi === 'diteruskan' && !kunciPenerima) {
      const saran = opsiWaliKelasDariKelasAnak(item.kelasAnak)
      if (saran) setKunciPenerima(saran.kunci)
    }
  }, [klasifikasi, item.kelasAnak, kunciPenerima])

  const simpanKlasifikasi = async () => {
    if (!klasifikasi) {
      setGalat('Pilih klasifikasi penanganan.')
      return
    }
    setMenyimpan(true)
    setGalat('')
    try {
      await klasifikasiPengaduanWali({
        id: item.id,
        klasifikasi,
        penerimaKunci: kunciPenerima,
        catatanKs: catatan,
      })
      onSegarkan()
      onTutup()
    } catch (error) {
      setGalat(error instanceof Error ? error.message : 'Klasifikasi belum tersimpan.')
    } finally {
      setMenyimpan(false)
    }
  }

  const simpanJawaban = async () => {
    setMenyimpan(true)
    setGalat('')
    try {
      await simpanTindakLanjutPengaduanWali({
        id: item.id,
        tindakLanjutJawaban: jawaban,
        catatanKs: catatan,
      })
      onSegarkan()
      onTutup()
    } catch (error) {
      setGalat(error instanceof Error ? error.message : 'Tindak lanjut belum tersimpan.')
    } finally {
      setMenyimpan(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      onClick={onTutup}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <ModalJudulDetail item={item} onTutup={onTutup} />

        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5">
        <dl className="mt-4 grid gap-2 text-xs sm:grid-cols-2">
          <div>
            <dt className="font-bold text-slate-500">Wali murid</dt>
            <dd className="font-semibold text-slate-900">{item.namaWaliMurid}</dd>
          </div>
          <div>
            <dt className="font-bold text-slate-500">No. WhatsApp</dt>
            <dd>
              <a href={`https://wa.me/${item.noWa.replace(/^0/, '62')}`} className="font-semibold text-emerald-800 underline" target="_blank" rel="noopener noreferrer">
                {item.noWa}
              </a>
            </dd>
          </div>
          <div>
            <dt className="font-bold text-slate-500">Anak</dt>
            <dd className="font-semibold text-slate-900">
              {item.namaAnak}
              {item.kelasAnak ? ` · Kelas ${item.kelasAnak}` : ''}
            </dd>
          </div>
          <div>
            <dt className="font-bold text-slate-500">Kategori</dt>
            <dd className="font-semibold text-slate-900">{item.kategori}</dd>
          </div>
        </dl>

        <div className="mt-3 rounded-xl bg-slate-50 p-3 text-xs leading-relaxed text-slate-800">
          <p className="text-[10px] font-bold uppercase text-slate-500">Isi pengaduan</p>
          <p className="mt-1 whitespace-pre-wrap">{item.isiPengaduan}</p>
        </div>

        <div className="mt-3">
          <p className="text-[10px] font-bold uppercase text-slate-500">Lampiran</p>
          <div className="mt-1">
            <PratinjauLampiran item={item} />
          </div>
        </div>

        <section className="mt-5 space-y-2 border-t pt-4">
          <p className="text-xs font-extrabold text-slate-800">Klasifikasi oleh Kepala Sekolah</p>
          <div className="flex flex-wrap gap-2">
            <label className="flex cursor-pointer items-center gap-1.5 text-xs">
              <input
                type="radio"
                name={`klasifikasi-${item.id}`}
                checked={klasifikasi === 'ditangani_ks'}
                onChange={() => setKlasifikasi('ditangani_ks')}
                disabled={item.statusAlur === 'selesai'}
              />
              Ditangani KS
            </label>
            <label className="flex cursor-pointer items-center gap-1.5 text-xs">
              <input
                type="radio"
                name={`klasifikasi-${item.id}`}
                checked={klasifikasi === 'diteruskan'}
                onChange={() => setKlasifikasi('diteruskan')}
                disabled={item.statusAlur === 'selesai'}
              />
              Diteruskan
            </label>
          </div>
          {klasifikasi === 'diteruskan' ? (
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-600" htmlFor={`penerima-${item.id}`}>
                Wali kelas / waka terkait
              </label>
              <select
                id={`penerima-${item.id}`}
                value={kunciPenerima}
                onChange={(e) => setKunciPenerima(e.target.value)}
                disabled={item.statusAlur === 'selesai'}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
              >
                <option value="">— Pilih penerima —</option>
                <optgroup label="Wali kelas">
                  {waliOpsi.map((baris) => (
                    <option key={baris.kunci} value={baris.kunci}>
                      {baris.label}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Waka">
                  {wakaOpsi.map((baris) => (
                    <option key={baris.kunci} value={baris.kunci}>
                      {baris.label}
                    </option>
                  ))}
                </optgroup>
              </select>
              {!kunciPenerima && item.tujuanPenerusan ? (
                <p className="text-[10px] text-slate-500">Tersimpan sebelumnya: {item.tujuanPenerusan}</p>
              ) : null}
            </div>
          ) : null}
          <textarea
            value={catatan}
            onChange={(e) => setCatatan(e.target.value)}
            rows={2}
            placeholder="Catatan internal KS (opsional)"
            disabled={item.statusAlur === 'selesai'}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
          />
          {item.statusAlur !== 'selesai' ? (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={menyimpan}
                onClick={() => void simpanKlasifikasi()}
                className="rounded-xl bg-violet-800 px-3 py-2 text-xs font-bold text-white hover:bg-violet-900 disabled:opacity-60"
              >
                Simpan klasifikasi
              </button>
              <button
                type="button"
                disabled={menyimpan}
                onClick={onTutup}
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                Tutup
              </button>
            </div>
          ) : null}
        </section>

        {item.responPenerima ? (
          <section className="mt-4 space-y-2 border-t pt-4">
            <p className="text-xs font-extrabold text-slate-800">Respon wali kelas / waka</p>
            <div className="rounded-xl border border-sky-200 bg-sky-50 p-3 text-xs whitespace-pre-wrap text-slate-800">
              {item.responPenerima}
            </div>
            {item.diresponPada ? (
              <p className="text-[11px] text-slate-500">Disimpan {formatWaktuPengaduan(item.diresponPada)}</p>
            ) : null}
          </section>
        ) : null}

        <section className="mt-4 space-y-2 border-t pt-4">
          <p className="text-xs font-extrabold text-slate-800">Tindak lanjut &amp; jawaban kepada wali murid</p>
          <textarea
            value={jawaban}
            onChange={(e) => setJawaban(e.target.value)}
            rows={4}
            placeholder="Tuliskan tindak lanjut / jawaban resmi..."
            disabled={item.statusAlur === 'selesai' && Boolean(item.tindakLanjutJawaban)}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
          />
          {item.statusAlur !== 'selesai' ? (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={menyimpan}
                onClick={() => void simpanJawaban()}
                className="rounded-xl bg-emerald-800 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-900 disabled:opacity-60"
              >
                Simpan &amp; tandai selesai
              </button>
              <button
                type="button"
                disabled={menyimpan}
                onClick={onTutup}
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                Tutup
              </button>
            </div>
          ) : (
            <ModalFootSelesai onTutup={onTutup} selesaiPada={item.ditindaklanjutiPada} />
          )}
        </section>

        {galat ? <p className="mt-3 text-xs text-red-700">{galat}</p> : null}
        </div>
      </div>
    </div>
  )
}

function ModalFootSelesai({ onTutup, selesaiPada }: { onTutup: () => void; selesaiPada: string }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <p className="text-[11px] text-emerald-800">Diselesaikan {formatWaktuPengaduan(selesaiPada)}</p>
      <button
        type="button"
        onClick={onTutup}
        className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
      >
        Tutup
      </button>
    </div>
  )
}

function ModalJudulDetail({ item, onTutup }: { item: PengaduanWaliMurid; onTutup: () => void }) {
  return (
    <header className="relative sticky top-0 z-30 shrink-0 border-b border-slate-200 bg-white px-5 py-4 pr-14">
      <div>
        <p className="text-[10px] font-bold uppercase text-violet-800">Detail pengaduan</p>
        <h3 className="text-base font-extrabold text-slate-900">{item.namaAnak}</h3>
        <p className="text-xs text-slate-500">{formatWaktuPengaduan(item.createdAt)}</p>
        <span className={`mt-2 inline-block rounded-full px-2 py-0.5 text-[11px] font-bold ${kelasStatus(item.statusAlur)}`}>
          {labelStatusAlurPengaduan(item.statusAlur)}
        </span>
      </div>
      <button
        type="button"
        onClick={onTutup}
        className="absolute right-3 top-3 z-40 flex size-9 items-center justify-center rounded-full border border-slate-200 bg-white text-lg font-bold leading-none text-slate-700 shadow-md hover:bg-slate-100"
        aria-label="Tutup dialog"
        title="Tutup"
      >
        <X className="size-5" strokeWidth={2.5} aria-hidden />
      </button>
    </header>
  )
}

export function MonitoringPengaduanWali({ unit }: { unit: string }) {
  const [data, setData] = useState<PengaduanWaliMurid[]>([])
  const [memuat, setMemuat] = useState(true)
  const [galat, setGalat] = useState('')
  const [peringatanSkema, setPeringatanSkema] = useState('')
  const [saring, setSaring] = useState<'semua' | StatusAlurPengaduan>('semua')
  const [detail, setDetail] = useState<PengaduanWaliMurid | null>(null)

  const muat = (diam = false) => {
    if (!unit) {
      setData([])
      setMemuat(false)
      return
    }
    if (!diam) setMemuat(true)
    setGalat('')
    muatPengaduanWaliUnit(unit)
      .then(({ daftar, peringatanSkema: peringatan }) => {
        setData(daftar)
        setPeringatanSkema(peringatan)
      })
      .catch((error: Error) => {
        setData([])
        setPeringatanSkema('')
        setGalat(error.message || 'Daftar pengaduan belum dapat dimuat.')
      })
      .finally(() => setMemuat(false))
  }

  useEffect(() => {
    muat()
    const pengulangan = window.setInterval(() => muat(true), 30000)
    return () => window.clearInterval(pengulangan)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unit])

  const tampil = useMemo(() => {
    const sumber = saring === 'semua' ? data : data.filter((item) => item.statusAlur === saring)
    return sumber.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }, [data, saring])

  const ringkas = useMemo(() => {
    const hitung = (s: StatusAlurPengaduan) => data.filter((item) => item.statusAlur === s).length
    return { total: data.length, masuk: hitung('masuk'), proses: hitung('ditangani_ks') + hitung('diteruskan'), selesai: hitung('selesai') }
  }, [data])

  return (
    <>
      <section id="layanan-aduan-wali" className="no-print scroll-mt-28 space-y-3 rounded-2xl border border-violet-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-violet-950">
              <MessageCircleWarning className="size-4" />
              <h2 className="text-sm font-extrabold">Layanan Aduan Wali Murid</h2>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              {ringkas.total} pengaduan ({ringkas.masuk} masuk, {ringkas.proses} dalam penanganan, {ringkas.selesai} selesai)
            </p>
          </div>
          <button
            type="button"
            onClick={() => muat()}
            disabled={memuat}
            className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-violet-950 hover:bg-slate-50 disabled:opacity-60"
          >
            <RefreshCw className={`size-3.5 ${memuat ? 'animate-spin' : ''}`} /> Muat ulang
          </button>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {(['semua', 'masuk', 'ditangani_ks', 'diteruskan', 'selesai'] as const).map((nilai) => (
            <button
              key={nilai}
              type="button"
              onClick={() => setSaring(nilai)}
              className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${saring === nilai ? 'bg-violet-900 text-white' : 'bg-slate-100 text-slate-600'}`}
            >
              {nilai === 'semua' ? 'Semua' : labelStatusAlurPengaduan(nilai)}
            </button>
          ))}
        </div>

        {peringatanSkema ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
            {peringatanSkema || PESAN_KOLOM_PENGADUAN_BELUM_ADA}
          </p>
        ) : null}
        {galat ? <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-900">{galat}</p> : null}
        {memuat && data.length === 0 ? <p className="text-sm text-slate-500">Memuat pengaduan wali murid...</p> : null}
        {!memuat && tampil.length === 0 ? <p className="text-sm text-slate-500">Belum ada pengaduan pada saringan ini.</p> : null}

        {tampil.length > 0 ? (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-[720px] w-full text-left text-xs">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2 font-bold">Pelapor &amp; anak</th>
                  <th className="px-3 py-2 font-bold">Kategori</th>
                  <th className="px-3 py-2 font-bold">Ringkas</th>
                  <th className="px-3 py-2 font-bold">Status</th>
                  <th className="px-3 py-2 font-bold">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {tampil.slice(0, 15).map((item) => (
                  <tr key={item.id} className="border-t border-slate-100 align-top">
                    <td className="px-3 py-2">
                      <p className="font-extrabold text-slate-900">{item.namaWaliMurid}</p>
                      <p className="text-[11px] text-slate-500">WA {item.noWa}</p>
                      <p className="mt-1 text-[11px] font-semibold text-slate-700">
                        {item.namaAnak}
                        {item.kelasAnak ? ` · ${item.kelasAnak}` : ''}
                      </p>
                      <p className="text-[11px] text-slate-400">{formatWaktuPengaduan(item.createdAt)}</p>
                    </td>
                    <td className="px-3 py-2 font-semibold text-slate-800">{item.kategori}</td>
                    <td className="max-w-xs px-3 py-2 text-[11px] leading-relaxed text-slate-700">
                      <p className="line-clamp-4 whitespace-pre-wrap">{item.isiPengaduan}</p>
                      {item.lampiranUrl ? <p className="mt-1 font-semibold text-sky-800">Ada lampiran ({item.lampiranTipe || 'berkas'})</p> : null}
                    </td>
                    <td className="px-3 py-2">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${kelasStatus(item.statusAlur)}`}>
                        {labelStatusAlurPengaduan(item.statusAlur)}
                      </span>
                      {item.tujuanPenerusan ? <p className="mt-1 text-[10px] text-slate-500">→ {item.tujuanPenerusan}</p> : null}
                    </td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() => setDetail(item)}
                        className="rounded-lg bg-violet-800 px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-violet-900"
                      >
                        Periksa
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>

      {detail ? (
        <ModalDetail
          item={detail}
          onTutup={() => setDetail(null)}
          onSegarkan={() => {
            muat(true)
            setDetail(null)
          }}
        />
      ) : null}
    </>
  )
}