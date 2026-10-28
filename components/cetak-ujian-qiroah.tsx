'use client'

import { useEffect, useState } from 'react'
import { Printer, X } from 'lucide-react'

export type HasilUjianCetak = {
  nomor: string
  nama: string
  kelas: string
  unit: string
  tanggal: string
  penguji: string
  guruPengampu: string
  jilidAsal: string
  jilidTujuan: string
  kelancaran: number
  makhraj: number
  harakat: number
  tajwid: number | null
  adab: number
  nilaiAkhir: number
  predikat: string
  keputusan: string
  catatan: string
}

type TandaTangan = {
  tempat: string
  kepsekNama: string
  kepsekNip: string
  koordinatorNama: string
  koordinatorNip: string
}

const TTD_KEY = 'portal-guru-ttd-ujian'
const TTD_ABSENSI_KEY = 'portal-guru-ttd-absensi'

function garis(value: string, panjang = 24) {
  const teks = value.trim()
  return teks || '.'.repeat(panjang)
}

function tanggalPanjang(value?: string) {
  const iso = String(value || '').slice(0, 10)
  if (!iso) return '-'
  const date = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(date.getTime())) return value || '-'
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}

function tahunDokumen(value?: string) {
  const iso = String(value || '').slice(0, 4)
  return /^\d{4}$/.test(iso) ? iso : String(new Date().getFullYear())
}

export function lulusUjian(keputusan?: string) {
  return String(keputusan || '').trim().toLowerCase() === 'lulus'
}

export function CetakUjianQiroah({
  jenis,
  data,
  onClose,
  kepsekTetap,
}: {
  jenis: 'nilai' | 'skl'
  data: HasilUjianCetak
  onClose: () => void
  kepsekTetap?: { nama: string; niy: string }
}) {
  const [ttd, setTtd] = useState<TandaTangan>({
    tempat: '',
    kepsekNama: '',
    kepsekNip: '',
    koordinatorNama: '',
    koordinatorNip: '',
  })
  const [siap, setSiap] = useState(false)
  const skl = jenis === 'skl'
  const nomor = `${skl ? 'SKL' : 'LN'}/QQ/${tahunDokumen(data.tanggal)}/${data.nomor || '-'}`
  const tempatTanggal = `${ttd.tempat.trim() ? `${ttd.tempat.trim()}, ` : ''}${tanggalPanjang(data.tanggal)}`

  useEffect(() => {
    try {
      const raw = localStorage.getItem(TTD_KEY)
      const absensi = localStorage.getItem(TTD_ABSENSI_KEY)
      const saved = raw ? JSON.parse(raw) : {}
      const kepsekLama = absensi ? JSON.parse(absensi) : {}
      setTtd({
        tempat: typeof saved.tempat === 'string' ? saved.tempat : typeof kepsekLama.tempat === 'string' ? kepsekLama.tempat : '',
        kepsekNama: kepsekTetap?.nama || (typeof saved.kepsekNama === 'string' ? saved.kepsekNama : typeof kepsekLama.kepsekNama === 'string' ? kepsekLama.kepsekNama : ''),
        kepsekNip: kepsekTetap?.niy || (typeof saved.kepsekNip === 'string' ? saved.kepsekNip : typeof kepsekLama.kepsekNip === 'string' ? kepsekLama.kepsekNip : ''),
        koordinatorNama: typeof saved.koordinatorNama === 'string' ? saved.koordinatorNama : '',
        koordinatorNip: typeof saved.koordinatorNip === 'string' ? saved.koordinatorNip : '',
      })
    } catch {
      /* data tanda tangan yang rusak diabaikan */
    }
    setSiap(true)
  }, [kepsekTetap?.nama, kepsekTetap?.niy])

  useEffect(() => {
    if (!siap) return
    localStorage.setItem(TTD_KEY, JSON.stringify(ttd))
  }, [siap, ttd])

  const setField = (key: keyof TandaTangan, value: string) => {
    setTtd((prev) => ({ ...prev, [key]: value }))
  }

  const aspek = [
    ['Kelancaran Membaca', String(data.kelancaran)],
    ['Ketepatan Makhraj', String(data.makhraj)],
    ['Ketepatan Harakat', String(data.harakat)],
    ['Penerapan Tajwid', data.tajwid == null ? '—' : String(data.tajwid)],
    ['Adab dan Sikap Membaca', String(data.adab)],
  ]

  return (
    <div className="overlay-cetak fixed inset-0 z-[80] overflow-auto bg-slate-900/60 p-4">
      <style>{`
        @page { size: 210mm 330mm; margin: 12mm 15mm; }
        .lembar-cetak { font-family: "Times New Roman", Times, serif; color: #111; }
        .lembar-cetak table { width: 100%; border-collapse: collapse; }
        .lembar-cetak .nilai td, .lembar-cetak .nilai th { border: 1px solid #111; padding: 4px 8px; }
        .ttd-ujian td { border: none !important; width: 33.33%; text-align: center; vertical-align: top; }
        @media print {
          body * { visibility: hidden; }
          .lembar-cetak, .lembar-cetak * { visibility: visible; }
          .overlay-cetak { position: absolute; inset: 0; background: #fff !important; padding: 0; overflow: visible; }
          .lembar-cetak { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none !important; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="no-print mx-auto mb-3 max-w-[210mm] rounded-2xl bg-slate-900 p-4 text-white shadow-lg">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-bold">Pratinjau cetak · kertas F4</p>
          <div className="flex gap-2">
            <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-1 rounded-lg bg-white px-3 py-2 text-xs font-bold text-slate-900">
              <Printer className="size-3.5" /> Cetak F4
            </button>
            <button type="button" onClick={onClose} className="inline-flex items-center gap-1 rounded-lg bg-slate-700 px-3 py-2 text-xs font-bold text-white">
              <X className="size-3.5" /> Tutup
            </button>
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="text-[11px] font-bold">
            Tempat
            <input value={ttd.tempat} onChange={(event) => setField('tempat', event.target.value)} placeholder="Kota" className="mt-1 block w-full rounded-lg border border-white/20 bg-white px-2 py-1.5 text-sm text-slate-900" />
          </label>
          <label className="text-[11px] font-bold">
            Koordinator QQ
            <input value={ttd.koordinatorNama} onChange={(event) => setField('koordinatorNama', event.target.value)} className="mt-1 block w-full rounded-lg border border-white/20 bg-white px-2 py-1.5 text-sm text-slate-900" />
          </label>
          <label className="text-[11px] font-bold">
            NIP koordinator
            <input value={ttd.koordinatorNip} onChange={(event) => setField('koordinatorNip', event.target.value)} className="mt-1 block w-full rounded-lg border border-white/20 bg-white px-2 py-1.5 text-sm text-slate-900" />
          </label>
          <label className="text-[11px] font-bold">
            Kepala sekolah
            <input value={ttd.kepsekNama} readOnly={Boolean(kepsekTetap)} onChange={(event) => setField('kepsekNama', event.target.value)} className="mt-1 block w-full rounded-lg border border-white/20 bg-white px-2 py-1.5 text-sm text-slate-900 read-only:bg-slate-100" />
          </label>
          <label className="text-[11px] font-bold">
            {kepsekTetap ? 'NIY kepala sekolah' : 'NIP kepala sekolah'}
            <input value={ttd.kepsekNip} readOnly={Boolean(kepsekTetap)} onChange={(event) => setField('kepsekNip', event.target.value)} className="mt-1 block w-full rounded-lg border border-white/20 bg-white px-2 py-1.5 text-sm text-slate-900 read-only:bg-slate-100" />
          </label>
        </div>
      </div>

      <article className="lembar-cetak mx-auto min-h-[330mm] max-w-[210mm] bg-white px-8 py-7 text-[12pt] leading-relaxed shadow-xl">
        <header className="border-b-4 border-double border-black pb-2 text-center">
          <p className="text-[11pt] font-bold tracking-wide">SD ISLAM TERPADU AL MADINAH</p>
          <p className="text-[10pt]">{data.unit ? `Unit ${data.unit}` : 'Qiroatul Qur’an'}</p>
          <p className="text-[10pt]">Program Qiroatul Qur’an (At-Tartil)</p>
        </header>

        <div className="mt-4 text-center">
          <h1 className="text-[14pt] font-bold underline">
            {skl ? 'SURAT KETERANGAN LULUS' : 'LEMBAR PENILAIAN UJIAN'}
          </h1>
          <p className="text-[11pt]">Ujian Kenaikan Jilid Qiroatul Qur’an (At-Tartil)</p>
          <p className="text-[10pt]">Nomor: {nomor}</p>
        </div>

        {skl ? (
          <div className="mt-5 text-[12pt]">
            <p>Yang bertanda tangan di bawah ini menerangkan bahwa:</p>
            <table className="mt-2">
              <tbody>
                <tr>
                  <td className="w-36 py-0.5">Nama</td>
                  <td>: {data.nama}</td>
                </tr>
                <tr>
                  <td className="py-0.5">Kelas</td>
                  <td>: {data.kelas || '-'}</td>
                </tr>
                <tr>
                  <td className="py-0.5">Unit</td>
                  <td>: {data.unit || '-'}</td>
                </tr>
                <tr>
                  <td className="py-0.5">Jilid asal</td>
                  <td>: {data.jilidAsal || '-'}</td>
                </tr>
                <tr>
                  <td className="py-0.5">Jilid tujuan</td>
                  <td>: {data.jilidTujuan || '-'}</td>
                </tr>
              </tbody>
            </table>
            <p className="mt-4 text-justify">
              telah mengikuti Ujian Kenaikan Jilid Qiroatul Qur’an (At-Tartil) pada tanggal {tanggalPanjang(data.tanggal)} dan
              dinyatakan <strong>LULUS</strong> dengan nilai akhir <strong>{data.nilaiAkhir}</strong> serta predikat{' '}
              <strong>{data.predikat}</strong>.
            </p>
            <p className="mt-3 text-justify">
              Demikian surat keterangan ini dibuat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.
            </p>
          </div>
        ) : (
          <div className="mt-5">
            <table>
              <tbody>
                <tr>
                  <td className="w-36 py-0.5">Nama</td>
                  <td>: {data.nama}</td>
                </tr>
                <tr>
                  <td className="py-0.5">Kelas / Unit</td>
                  <td>: {data.kelas || '-'} / {data.unit || '-'}</td>
                </tr>
                <tr>
                  <td className="py-0.5">Guru pengampu</td>
                  <td>: {data.guruPengampu || '-'}</td>
                </tr>
                <tr>
                  <td className="py-0.5">Tanggal ujian</td>
                  <td>: {tanggalPanjang(data.tanggal)}</td>
                </tr>
                <tr>
                  <td className="py-0.5">Jilid asal</td>
                  <td>: {data.jilidAsal || '-'}</td>
                </tr>
                <tr>
                  <td className="py-0.5">Jilid tujuan</td>
                  <td>: {data.jilidTujuan || '-'}</td>
                </tr>
              </tbody>
            </table>

            <table className="nilai mt-4 text-[11pt]">
              <thead>
                <tr>
                  <th className="w-10">No</th>
                  <th className="text-left">Aspek penilaian</th>
                  <th className="w-24">Nilai</th>
                </tr>
              </thead>
              <tbody>
                {aspek.map(([label, nilai], index) => (
                  <tr key={label}>
                    <td className="text-center">{index + 1}</td>
                    <td>{label}</td>
                    <td className="text-center">{nilai}</td>
                  </tr>
                ))}
                <tr>
                  <td />
                  <td className="font-bold">Nilai akhir</td>
                  <td className="text-center font-bold">{data.nilaiAkhir}</td>
                </tr>
                <tr>
                  <td />
                  <td className="font-bold">Predikat</td>
                  <td className="text-center font-bold">{data.predikat}</td>
                </tr>
                <tr>
                  <td />
                  <td className="font-bold">Keputusan</td>
                  <td className="text-center font-bold">{data.keputusan}</td>
                </tr>
              </tbody>
            </table>
            {data.tajwid == null && (
              <p className="mt-2 text-[10pt]">Tajwid tidak dinilai pada ujian jilid 1 dan jilid 2.</p>
            )}
            <p className="mt-3 text-[11pt]">
              <strong>Catatan penguji:</strong> {data.catatan.trim() || '-'}
            </p>
            <p className="mt-2 text-[10pt]">
              Predikat: Mumtaz (90–100), Jayyid Jiddan (80–89), Jayyid (70–79). Nilai di bawah 70 mendapat predikat Maqbul dan
              dinyatakan tidak lulus.
            </p>
          </div>
        )}

        <table className="ttd-ujian mt-8 text-[11pt]">
          <tbody>
            <tr>
              <td>Penguji</td>
              <td>Koordinator QQ</td>
              <td>
                {tempatTanggal}
                <br />
                Kepala Sekolah
              </td>
            </tr>
            <tr>
              <td style={{ height: '28mm' }} />
              <td />
              <td />
            </tr>
            <tr>
              <td>
                <span className="font-bold underline">{garis(data.penguji, 18)}</span>
                <br />
                <span className="whitespace-nowrap">NIP. {garis('', 14)}</span>
              </td>
              <td>
                <span className="font-bold underline">{garis(ttd.koordinatorNama, 18)}</span>
                <br />
                <span className="whitespace-nowrap">NIP. {garis(ttd.koordinatorNip, 14)}</span>
              </td>
              <td>
                <span className="font-bold underline">{garis(ttd.kepsekNama, 18)}</span>
                <br />
                <span className="whitespace-nowrap">{kepsekTetap ? 'NIY' : 'NIP'}. {garis(ttd.kepsekNip, 14)}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </article>
    </div>
  )
}
