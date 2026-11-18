'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { BadgeCheck, FileText } from 'lucide-react'
import { muatAnandaUntukWali } from '@/lib/portal-wali-siswa'
import {
  ajukanKeringanan,
  formatWaktuKeringanan,
  muatPengajuanUntukNis,
  nilaiInputWaktuJakarta,
  rupiahKeringanan,
  type PengajuanKeringanan,
} from '@/lib/pengajuan-keringanan'

export function BannerKeringananWali({ currentUser }: { currentUser?: Record<string, unknown> | null }) {
  const [daftar, setDaftar] = useState<PengajuanKeringanan[]>([])

  useEffect(() => {
    let batal = false
    muatAnandaUntukWali(currentUser)
      .then((ananda) => {
        const nis = [
          ...new Set(
            [...ananda.map((anak) => anak.nis), String(currentUser?.nis || '')].filter(
              (nilai): nilai is string => Boolean(nilai && String(nilai).trim()),
            ),
          ),
        ]
        return muatPengajuanUntukNis(nis)
      })
      .then((hasil) => {
        if (batal) return
        const unik = new Map<string, PengajuanKeringanan>()
        for (const item of hasil) {
          if (item.statusPersetujuan !== 'Disetujui') continue
          const kunci = item.nis.replace(/\D/g, '')
          if (kunci && !unik.has(kunci)) unik.set(kunci, item)
        }
        setDaftar([...unik.values()])
      })
      .catch(() => {
        if (!batal) setDaftar([])
      })
    return () => {
      batal = true
    }
  }, [currentUser])

  if (daftar.length === 0) return null
  const total = daftar.reduce((jumlah, item) => jumlah + item.nominalTunggakan, 0)

  return (
    <section aria-label="Ringkasan persetujuan keringanan" className="rounded-2xl border border-emerald-300 bg-emerald-50 p-4 shadow-sm">
      <div className="flex items-start gap-2 text-emerald-950">
        <BadgeCheck className="mt-0.5 size-4 shrink-0" />
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-800">Persetujuan keringanan pembayaran</p>
          <p className="text-sm font-extrabold">Pengajuan wali murid telah disetujui Kepala Sekolah.</p>
        </div>
      </div>
      <p className="mt-3 text-sm font-black text-emerald-950">Total akumulasi tunggakan {rupiahKeringanan(total)}</p>
      <ul className="mt-2 space-y-2">
        {daftar.map((item) => (
          <li key={item.id} className="rounded-xl border border-emerald-200 bg-white px-3 py-2">
            <p className="text-xs font-extrabold text-slate-900">
              {item.namaSiswa}
              {item.kelas ? ` · Kelas ${item.kelas}` : ''} · NIS {item.nis}
            </p>
            <p className="mt-1 text-[11px] font-bold text-emerald-800">Status persetujuan: Disetujui</p>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-700">
              Komitmen kesanggupan pelunasan: {item.kesanggupanBayar}
            </p>
            <p className="mt-1 text-[11px] text-slate-500">Target pelunasan {formatWaktuKeringanan(item.tanggalRencanaLunas)}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}

export function PanelPengajuanKeringanan({
  siswa,
  unit,
  riwayat,
  onSelesai,
}: {
  siswa: { nis: string; nama: string; kelas: string; tunggakan: number }
  unit: string
  riwayat?: PengajuanKeringanan | null
  onSelesai: () => void
}) {
  const terkunci = riwayat?.statusPersetujuan === 'Pending' || riwayat?.statusPersetujuan === 'Disetujui'
  const [buka, setBuka] = useState(false)
  const [nomorSurat, setNomorSurat] = useState('')
  const [kesanggupan, setKesanggupan] = useState('')
  const [target, setTarget] = useState(nilaiInputWaktuJakarta())
  const [menyimpan, setMenyimpan] = useState(false)
  const [galat, setGalat] = useState('')

  const kirim = async (event: FormEvent) => {
    event.preventDefault()
    setMenyimpan(true)
    setGalat('')
    try {
      await ajukanKeringanan({
        nis: siswa.nis,
        namaSiswa: siswa.nama,
        kelas: siswa.kelas,
        unit,
        nominalTunggakan: siswa.tunggakan,
        nomorSurat,
        kesanggupanBayar: kesanggupan,
        tanggalRencanaLunas: target,
      })
      setBuka(false)
      setNomorSurat('')
      setKesanggupan('')
      onSelesai()
    } catch (error) {
      setGalat(error instanceof Error ? error.message : 'Pengajuan belum dapat dikirim.')
    } finally {
      setMenyimpan(false)
    }
  }

  return (
    <div className="mt-3 rounded-xl border border-sky-200 bg-white p-3">
      <div className="flex items-start gap-2">
        <FileText className="mt-0.5 size-4 shrink-0 text-sky-800" />
        <div>
          <p className="text-xs font-extrabold text-slate-900">Permohonan Keringanan / Penundaan Pembayaran</p>
          <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">
            Setelah menerima surat pemberitahuan tunggakan, wali murid dapat mengajukan keringanan atau penundaan pelunasan.
          </p>
        </div>
      </div>

      {riwayat ? <RingkasPengajuan data={riwayat} /> : null}
      {galat ? <p className="mt-2 rounded-lg bg-amber-50 px-2 py-1.5 text-[11px] text-amber-900">{galat}</p> : null}

      {terkunci ? null : buka ? (
        <form onSubmit={(event) => void kirim(event)} className="mt-3 space-y-2">
          <p className="text-[11px] font-semibold text-slate-600">
            Nominal tunggakan yang diajukan: {rupiahKeringanan(siswa.tunggakan)}
          </p>
          <label className="block text-[11px] font-bold text-slate-700">
            Rencana / Nomor Surat
            <input
              value={nomorSurat}
              onChange={(event) => setNomorSurat(event.target.value)}
              required
              maxLength={80}
              placeholder="Nomor surat pemberitahuan tunggakan"
              className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-2 text-xs font-medium text-slate-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
            />
          </label>
          <label className="block text-[11px] font-bold text-slate-700">
            Pernyataan Kesanggupan Melunasi
            <textarea
              value={kesanggupan}
              onChange={(event) => setKesanggupan(event.target.value)}
              required
              minLength={10}
              maxLength={1000}
              rows={3}
              placeholder="Tuliskan komitmen pelunasan yang sanggup dipenuhi."
              className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-2 text-xs font-medium text-slate-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
            />
          </label>
          <label className="block text-[11px] font-bold text-slate-700">
            Target Tanggal / Waktu Pelunasan
            <input
              type="datetime-local"
              value={target}
              onChange={(event) => setTarget(event.target.value)}
              required
              className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-2 text-xs font-medium text-slate-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
            />
          </label>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setBuka(false)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-[11px] font-bold text-slate-600">
              Batal
            </button>
            <button
              type="submit"
              disabled={menyimpan}
              className="rounded-lg bg-emerald-700 px-3 py-1.5 text-[11px] font-extrabold text-white disabled:opacity-60"
            >
              {menyimpan ? 'Mengirim...' : 'Kirim pengajuan'}
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setBuka(true)}
          className="mt-3 rounded-lg bg-sky-800 px-3 py-2 text-[11px] font-extrabold text-white"
        >
          {riwayat?.statusPersetujuan === 'Ditolak' ? 'Ajukan kembali' : 'Ajukan permohonan'}
        </button>
      )}
    </div>
  )
}

function RingkasPengajuan({ data }: { data: PengajuanKeringanan }) {
  const kelas =
    data.statusPersetujuan === 'Disetujui'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-950'
      : data.statusPersetujuan === 'Ditolak'
        ? 'border-rose-200 bg-rose-50 text-rose-950'
        : 'border-amber-200 bg-amber-50 text-amber-950'
  return (
    <div className={`mt-2 rounded-lg border px-2.5 py-2 text-[11px] ${kelas}`}>
      <p className="font-extrabold">Status persetujuan: {data.statusPersetujuan}</p>
      <p className="mt-1">Tunggakan saat diajukan {rupiahKeringanan(data.nominalTunggakan)}</p>
      <p className="mt-1">Komitmen: {data.kesanggupanBayar}</p>
      <p className="mt-1">Target pelunasan {formatWaktuKeringanan(data.tanggalRencanaLunas)}</p>
      {data.nomorSuratRekomendasi ? <p className="mt-1">Surat rekomendasi {data.nomorSuratRekomendasi}</p> : null}
      {data.statusPersetujuan === 'Ditolak' && data.catatanKeputusan ? <p className="mt-1">Catatan: {data.catatanKeputusan}</p> : null}
    </div>
  )
}
