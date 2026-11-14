'use client'

import { useEffect, useState } from 'react'
import { Printer, X } from 'lucide-react'
import { fetchPejabatUntukCetak, type PejabatCetakTerselesaikan } from '@/lib/setting-cetak'
import { labelPredikatUjian, labelRentangKenaikanJilid } from '@/lib/qiroah'

export type HasilUjianCetak = {
  nomor: string
  nama: string
  kelas: string
  unit: string
  idSiswa?: string
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
  const [pejabat, setPejabat] = useState<PejabatCetakTerselesaikan | null>(null)
  const [memuat, setMemuat] = useState(true)
  const skl = jenis === 'skl'
  const nomor = `${skl ? 'SKL' : 'LN'}/QQ/${tahunDokumen(data.tanggal)}/${data.nomor || '-'}`

  useEffect(() => {
    let batal = false

    async function muat() {
      setMemuat(true)
      const hasil = await fetchPejabatUntukCetak({
        unit: data.unit,
        kelas: data.kelas,
        penguji: data.penguji,
        guruPengampu: data.guruPengampu,
        idSiswa: data.idSiswa,
        namaSiswa: data.nama,
      })

      if (batal) return

      if (!hasil.kepsek.nama && kepsekTetap && hasil.unit.toLowerCase() === 'nogosari') {
        hasil.kepsek = { nama: kepsekTetap.nama, niy: kepsekTetap.niy }
      }

      setPejabat(hasil)
      setMemuat(false)
    }

    muat()
    return () => {
      batal = true
    }
  }, [
    data.unit,
    data.kelas,
    data.nama,
    data.idSiswa,
    data.penguji,
    data.guruPengampu,
    kepsekTetap?.nama,
    kepsekTetap?.niy,
  ])

  const lokasi = pejabat?.lokasi || data.unit || 'Nogosari'
  const tempatTanggal = `${lokasi}, ${tanggalPanjang(data.tanggal)}`
  const kepsek = pejabat?.kepsek || { nama: '', niy: '' }
  const koordinator = pejabat?.koordinator || { nama: '', niy: '' }
  const pengujiNiy = pejabat?.pengujiNiy || ''

  const aspek = [
    ['Kelancaran Membaca', String(data.kelancaran)],
    ['Ketepatan Makhraj', String(data.makhraj)],
    ['Ketepatan Harakat', String(data.harakat)],
    ['Penerapan Tajwid', data.tajwid == null ? '—' : String(data.tajwid)],
    ['Adab dan Sikap Membaca', String(data.adab)],
  ]

  return (
    <div className="overlay-cetak fixed inset-0 z-[80] overflow-auto bg-slate-200/90 p-4 print:bg-white print:p-0">
      <style>{`
        @page { size: 210mm 330mm; margin: 12mm 15mm; }
        .lembar-cetak { font-family: "Times New Roman", Times, serif; color: #111; }
        .lembar-cetak table { width: 100%; border-collapse: collapse; }
        .lembar-cetak .nilai td, .lembar-cetak .nilai th { border: 1px solid #111; padding: 4px 8px; }
        .ttd-ujian td { border: none !important; width: 33.33%; text-align: center; vertical-align: top; padding: 0 6px; }
        .ttd-ujian .ruang-ttd { height: 28mm; }
        .ttd-ujian .nama-pejabat { display: inline-block; min-width: 9em; font-weight: bold; text-decoration: underline; }
        .ttd-ujian .niy-pejabat { display: block; margin-top: 2px; white-space: nowrap; }
        .ttd-ujian .tempat-tanggal { text-align: center; font-size: 11pt; padding-bottom: 8px; }
        @media print {
          body * { visibility: hidden; }
          .lembar-cetak, .lembar-cetak * { visibility: visible; }
          .overlay-cetak { position: absolute; inset: 0; background: #fff !important; padding: 0; overflow: visible; }
          .lembar-cetak { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none !important; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="no-print fixed right-4 top-4 z-[90] flex gap-2">
        <button
          type="button"
          onClick={() => window.print()}
          disabled={memuat}
          className="inline-flex items-center gap-1 rounded-lg bg-white px-3 py-2 text-xs font-bold text-slate-900 shadow-md ring-1 ring-slate-200 disabled:opacity-50"
        >
          <Printer className="size-3.5" /> Cetak F4
        </button>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center gap-1 rounded-lg bg-slate-800 px-3 py-2 text-xs font-bold text-white shadow-md"
        >
          <X className="size-3.5" /> Tutup
        </button>
      </div>

      <article className="lembar-cetak relative mx-auto min-h-[330mm] max-w-[210mm] bg-white px-8 py-7 text-[12pt] leading-relaxed shadow-xl print:shadow-none">
        {memuat && (
          <p className="no-print absolute inset-x-0 top-2 text-center text-[10pt] text-slate-500">Memuat data pejabat…</p>
        )}

        <header className="border-b-4 border-double border-black pb-2 text-center">
          <p className="text-[11pt] font-bold tracking-wide">SD ISLAM TERPADU AL MADINAH</p>
          <p className="text-[10pt]">{pejabat?.unit || data.unit ? `Unit ${pejabat?.unit || data.unit}` : 'Qiroatul Qur’an'}</p>
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
                  <td>: {pejabat?.unit || data.unit || '-'}</td>
                </tr>
                <tr>
                  <td className="py-0.5">Kenaikan jilid</td>
                  <td>: {labelRentangKenaikanJilid('', data.jilidAsal, data.jilidTujuan)}</td>
                </tr>
              </tbody>
            </table>
            <p className="mt-4 text-justify">
              telah mengikuti Ujian Kenaikan Jilid Qiroatul Qur’an (At-Tartil) pada tanggal {tanggalPanjang(data.tanggal)} dan
              dinyatakan <strong>LULUS</strong> dengan nilai akhir <strong>{data.nilaiAkhir}</strong> serta predikat{' '}
              <strong>{labelPredikatUjian(data.predikat)}</strong>.
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
                  <td>
                    : {data.kelas || '-'} / {pejabat?.unit || data.unit || '-'}
                  </td>
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
                  <td className="py-0.5">Kenaikan jilid</td>
                  <td>: {labelRentangKenaikanJilid('', data.jilidAsal, data.jilidTujuan)}</td>
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
                  <td className="text-center font-bold">{labelPredikatUjian(data.predikat)}</td>
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
              Predikat: Mumtaz (90–100), Jayyid Jiddan (80–89), Jayyid (70–79). Nilai di bawah 70 mendapat predikat Mengulang dan
              dinyatakan tidak lulus.
            </p>
          </div>
        )}

        <table className="ttd-ujian mt-8 text-[11pt]">
          <tbody>
            <tr>
              <td />
              <td />
              <td className="tempat-tanggal">{tempatTanggal}</td>
            </tr>
            <tr>
              <td>Penguji</td>
              <td>Koordinator QQ</td>
              <td>Kepala Sekolah</td>
            </tr>
            <tr>
              <td className="ruang-ttd" />
              <td className="ruang-ttd" />
              <td className="ruang-ttd" />
            </tr>
            <tr>
              <td>
                <span className="nama-pejabat">{garis(data.penguji, 18)}</span>
                <span className="niy-pejabat">NIY. {garis(pengujiNiy, 14)}</span>
              </td>
              <td>
                <span className="nama-pejabat">{garis(koordinator.nama, 18)}</span>
                <span className="niy-pejabat">NIY. {garis(koordinator.niy, 14)}</span>
              </td>
              <td>
                <span className="nama-pejabat">{garis(kepsek.nama, 18)}</span>
                <span className="niy-pejabat">NIY. {garis(kepsek.niy, 14)}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </article>
    </div>
  )
}
