'use client'

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { ExternalLink, Megaphone, MessageCircleWarning, RefreshCw } from 'lucide-react'
import {
  formatWaktuPengaduan,
  labelStatusAlurPengaduan,
  muatPengaduanDiteruskanUntukGuru,
  simpanResponPenerimaPengaduanWali,
  type PengaduanWaliMurid,
  type TipeLampiranPengaduan,
} from '@/lib/pengaduan-wali-murid'
import { guruBerpotensiMenerimaPengaduan } from '@/lib/peta-wali-kelas-pengaduan'
import { unitDariAkun } from '@/lib/siswa'

function PratinjauLampiran({ item }: { item: PengaduanWaliMurid }) {
  if (!item.lampiranUrl) return null
  const tipe = item.lampiranTipe as TipeLampiranPengaduan | ''
  if (tipe === 'image') {
    return (
      <a href={item.lampiranUrl} target="_blank" rel="noopener noreferrer" className="block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={item.lampiranUrl} alt="Lampiran" className="max-h-40 rounded-xl border object-contain" />
      </a>
    )
  }
  if (tipe === 'video') {
    return <video src={item.lampiranUrl} controls className="max-h-44 w-full rounded-xl border bg-black" />
  }
  return (
    <a
      href={item.lampiranUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-xs font-bold text-sky-800 underline"
    >
      <ExternalLink className="size-3.5" /> Buka lampiran
    </a>
  )
}

function PanelCatatanKepalaSekolah({ catatan }: { catatan: string }) {
  if (!catatan) {
    return (
      <MotionPanel kosong>
        <p className="text-xs text-amber-900/80">Belum ada pesan khusus dari Kepala Sekolah pada aduan ini.</p>
      </MotionPanel>
    )
  }
  return (
    <MotionPanel kosong={false}>
      <p className="mt-2 whitespace-pre-wrap text-sm font-medium leading-relaxed text-amber-950">{catatan}</p>
    </MotionPanel>
  )
}

function MotionPanel({
  kosong,
  children,
}: {
  kosong: boolean
  children?: ReactNode
}) {
  return (
    <div
      className={`mt-3 rounded-2xl border-2 p-4 shadow-sm ${
        kosong ? 'border-amber-100 bg-amber-50/60' : 'border-amber-300 bg-gradient-to-br from-amber-50 to-orange-50'
      }`}
    >
      <div className="flex items-start gap-2">
        <Megaphone className={`size-4 shrink-0 ${kosong ? 'text-amber-600' : 'text-amber-800'}`} aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-extrabold uppercase tracking-wide text-amber-900">
            Catatan / pesan Kepala Sekolah
          </p>
          {children}
          {!kosong ? (
            <p className="mt-1 text-[10px] font-semibold text-amber-800/90">Mohon jadikan arahan utama penanganan aduan ini.</p>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function KartuAduan({
  item,
  onSegarkan,
  sorot,
}: {
  item: PengaduanWaliMurid
  onSegarkan: () => void
  sorot?: boolean
}) {
  const [respon, setRespon] = useState(item.responPenerima)
  const [menyimpan, setMenyimpan] = useState(false)
  const [galat, setGalat] = useState('')
  const [sukses, setSukses] = useState('')
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    if (!sorot || !ref.current) return
    ref.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [sorot])

  const simpan = async () => {
    setMenyimpan(true)
    setGalat('')
    setSukses('')
    try {
      await simpanResponPenerimaPengaduanWali({ id: item.id, responPenerima: respon })
      setSukses('Respon tersimpan. Kepala Sekolah dapat membacanya di dashboard.')
      onSegarkan()
    } catch (error) {
      setGalat(error instanceof Error ? error.message : 'Respon belum tersimpan.')
    } finally {
      setMenyimpan(false)
    }
  }

  const tujuan = item.tujuanPenerusan || (item.penerimaJenis ? `${item.penerimaJenis}${item.penerimaKelas ? ` · ${item.penerimaKelas}` : ''}` : '—')

  return (
    <article
      ref={ref}
      id={`aduan-${item.id}`}
      className={`rounded-2xl border p-4 shadow-sm transition ${
        sorot ? 'border-violet-500 bg-violet-50/80 ring-2 ring-violet-300' : 'border-violet-200 bg-violet-50/40'
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-bold uppercase text-violet-800">Diteruskan kepada Anda</p>
          <p className="text-sm font-extrabold text-slate-900">
            {item.namaAnak}
            {item.kelasAnak ? ` · ${item.kelasAnak}` : ''}
          </p>
          <p className="text-[11px] text-slate-500">{formatWaktuPengaduan(item.createdAt)} · {item.kategori}</p>
        </div>
        <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-bold text-sky-900">
          {labelStatusAlurPengaduan(item.statusAlur)}
        </span>
      </div>

      <dl className="mt-3 grid gap-1 text-[11px] sm:grid-cols-2">
        <div>
          <dt className="font-bold text-slate-500">Wali murid</dt>
          <dd className="font-semibold text-slate-900">{item.namaWaliMurid}</dd>
        </div>
        <div>
          <dt className="font-bold text-slate-500">Tujuan penerusan</dt>
          <dd className="font-semibold text-slate-900">{tujuan}</dd>
        </div>
      </dl>

      <PanelCatatanKepalaSekolah catatan={item.catatanKs} />

      <div className="mt-3 rounded-xl border border-slate-100 bg-white p-3 text-xs leading-relaxed text-slate-800">
        <p className="text-[10px] font-bold uppercase text-slate-500">Isi pengaduan</p>
        <p className="mt-1 whitespace-pre-wrap">{item.isiPengaduan}</p>
      </div>

      {item.lampiranUrl ? (
        <div className="mt-2">
          <p className="text-[10px] font-bold uppercase text-slate-500">Lampiran</p>
          <div className="mt-1">
            <PratinjauLampiran item={item} />
          </div>
        </div>
      ) : null}

      <section className="mt-4 space-y-2 border-t border-violet-200 pt-3">
        <p className="text-xs font-extrabold text-slate-800">Respon / tindak lanjut Anda</p>
        <textarea
          value={respon}
          onChange={(e) => setRespon(e.target.value)}
          rows={4}
          placeholder="Tuliskan tanggapan, langkah penanganan, atau koordinasi dengan wali murid..."
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
        />
        <button
          type="button"
          disabled={menyimpan}
          onClick={() => void simpan()}
          className="rounded-xl bg-violet-800 px-3 py-2 text-xs font-bold text-white hover:bg-violet-900 disabled:opacity-60"
        >
          Simpan respon
        </button>
        {item.diresponPada ? (
          <p className="text-[11px] text-emerald-800">Terakhir disimpan {formatWaktuPengaduan(item.diresponPada)}</p>
        ) : null}
        {galat ? <p className="text-xs text-red-700">{galat}</p> : null}
        {sukses ? <p className="text-xs text-emerald-800">{sukses}</p> : null}
      </section>
    </article>
  )
}

export function AduanDiteruskanGuru({
  currentUser,
  fokusId,
  selaluTampil = false,
  ringkas = true,
}: {
  currentUser: unknown
  fokusId?: string
  /** Tampilkan section meski bukan penerima resmi (halaman menu Pengaduan). */
  selaluTampil?: boolean
  /** Sembunyikan seluruh blok jika bukan penerima (kotak beranda). */
  ringkas?: boolean
}) {
  const [data, setData] = useState<PengaduanWaliMurid[]>([])
  const [memuat, setMemuat] = useState(true)
  const [galat, setGalat] = useState('')
  const unit = unitDariAkun(currentUser as { unit?: string })
  const berpotensi = guruBerpotensiMenerimaPengaduan(currentUser)

  const muat = useCallback(
    (diam = false) => {
      if (!currentUser || (!berpotensi && !selaluTampil)) {
        setData([])
        setMemuat(false)
        return
      }
      if (!unit) {
        setData([])
        setMemuat(false)
        return
      }
      if (!berpotensi) {
        setData([])
        setMemuat(false)
        return
      }
      if (!diam) setMemuat(true)
      setGalat('')
      muatPengaduanDiteruskanUntukGuru(unit, currentUser)
        .then(setData)
        .catch((error: Error) => {
          setData([])
          setGalat(error.message || 'Aduan diteruskan belum dapat dimuat.')
        })
        .finally(() => setMemuat(false))
    },
    [berpotensi, currentUser, selaluTampil, unit],
  )

  useEffect(() => {
    muat()
    const pengulangan = window.setInterval(() => muat(true), 45_000)
    return () => window.clearInterval(pengulangan)
  }, [muat])

  if (!currentUser) return null
  if (!berpotensi && ringkas) return null
  if (!berpotensi && selaluTampil) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-sm text-slate-600">
          Tidak ada aduan yang ditujukan ke akun Anda. Wali kelas dan waka yang tercantum dalam pemetaan resmi akan melihat
          aduan diteruskan di sini serta di lonceng notifikasi.
        </p>
      </section>
    )
  }

  return (
    <section className={`rounded-2xl border border-violet-200 bg-white shadow-sm ${ringkas ? 'p-5' : 'p-0 border-0 shadow-none'}`}>
      {ringkas ? (
        <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
          <div className="flex items-center gap-2 text-violet-950">
            <MessageCircleWarning className="size-4 shrink-0" />
            <div>
              <h3 className="text-sm font-extrabold">Aduan diteruskan</h3>
              <p className="text-xs text-slate-500">Pengaduan wali murid yang Kepala Sekolah teruskan kepada Anda</p>
            </div>
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
      ) : null}

      {galat ? <p className="mb-3 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">{galat}</p> : null}
      {memuat && data.length === 0 ? <p className="text-sm text-slate-500">Memuat aduan...</p> : null}
      {!memuat && data.length === 0 ? (
        <p className="text-sm text-slate-500">Belum ada aduan diteruskan ke Anda saat ini.</p>
      ) : null}

      <div className="space-y-4">
        {data.map((item) => (
          <KartuAduan
            key={item.id}
            item={item}
            sorot={Boolean(fokusId && fokusId === item.id)}
            onSegarkan={() => muat(true)}
          />
        ))}
      </div>
    </section>
  )
}