'use client'

import { useEffect, useState } from 'react'
import { Printer, X } from 'lucide-react'
import { cetakLembarRapor, GAYA_CETAK_RAPOR_TAHFIDZ, LembarRaporTahfidz } from '@/components/cetak-rapor-tahfidz'
import { fetchCetakRaporTahfidz, type DataCetakRaporTahfidz } from '@/lib/cetak-rapor-tahfidz'
import { formatAngkaRapor } from '@/lib/rapor-tahfidz-nilai'
import type { KirimRaporHq } from '@/lib/rapor-hq-kirim'
import { supabase } from '@/lib/supabase'

function teksNilai(nilai: number | null | undefined) {
  if (nilai == null || !Number.isFinite(Number(nilai))) return 'Belum dinilai'
  return formatAngkaRapor(nilai)
}

export function PratinjauRaporHqKepsek({ baris, onTutup }: { baris: KirimRaporHq; onTutup: () => void }) {
  const [data, setData] = useState<DataCetakRaporTahfidz | null>(null)
  const [indikator, setIndikator] = useState('')
  const [materi, setMateri] = useState(baris.materi)
  const [status, setStatus] = useState<'memuat' | 'siap' | 'kosong'>('memuat')

  useEffect(() => {
    let batal = false
    setStatus('memuat')
    Promise.all([
      fetchCetakRaporTahfidz(baris.idSiswa, baris.asesmen),
      supabase
        .from('materi_ujian_tahfidz')
        .select('surah,ayat,keterangan')
        .eq('id_siswa', baris.idSiswa)
        .eq('asesmen', baris.asesmen),
    ]).then(([cetak, materiRes]) => {
      if (batal) return
      const barisMateri = materiRes.data || []
      const label = barisMateri
        .map((row) => (row.ayat ? `${row.surah} (Ayat ${row.ayat})` : String(row.surah || '')))
        .filter(Boolean)
      if (label.length) setMateri(label.join('; '))
      setIndikator(
        Array.from(new Set(barisMateri.map((row) => String(row.keterangan || '').trim()).filter(Boolean))).join('; '),
      )
      if (!cetak) {
        setData(null)
        setStatus('kosong')
        return
      }
      setData({
        ...cetak,
        predikat: cetak.predikat || baris.predikat,
        siswa: { ...cetak.siswa, pembimbing: baris.namaGuru || cetak.siswa.pembimbing },
      })
      setStatus('siap')
    })
    return () => {
      batal = true
    }
  }, [baris])

  const nilaiAkhir = data?.nilaiRapor ?? baris.nilaiAkhir
  const predikat = data?.predikat || baris.predikat || 'Belum ada predikat'

  return (
    <div className="fixed inset-0 z-[80] overflow-y-auto bg-slate-900/55 p-3 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="judul-pratinjau-rapor">
      <style>{`
        ${GAYA_CETAK_RAPOR_TAHFIDZ}
        @media print {
          body * { visibility: hidden !important; }
          .lembar-rapor, .lembar-rapor * { visibility: visible !important; }
          .lembar-rapor {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 15mm 18mm !important;
            box-shadow: none !important;
          }
        }
      `}</style>
      <div className="mx-auto w-full max-w-4xl rounded-2xl bg-slate-100 shadow-xl">
        <div className="no-print flex flex-wrap items-start justify-between gap-3 rounded-t-2xl bg-[#143d32] px-4 py-3 text-white">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-100">Detail penilaian & rapor</p>
            <h2 id="judul-pratinjau-rapor" className="text-base font-extrabold">
              {baris.namaSiswa}
            </h2>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={cetakLembarRapor}
              disabled={status === 'memuat'}
              className="inline-flex items-center gap-1 rounded-lg bg-white px-3 py-2 text-xs font-bold text-slate-900 disabled:opacity-50"
            >
              <Printer className="size-3.5" /> Cetak / PDF
            </button>
            <button type="button" onClick={onTutup} className="rounded-lg bg-white/15 p-2" aria-label="Tutup detail rapor">
              <X className="size-4" />
            </button>
          </div>
        </div>

        <div className="no-print space-y-3 px-4 py-4">
          <section className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
            <dl className="grid gap-2 sm:grid-cols-2">
              <div>
                <dt className="text-[11px] font-bold uppercase text-slate-500">Siswa</dt>
                <dd className="font-bold text-slate-900">{baris.namaSiswa}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-bold uppercase text-slate-500">Kelas</dt>
                <dd>{baris.kelas || data?.siswa.kelasTampil || '-'}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-bold uppercase text-slate-500">Asesmen</dt>
                <dd>{baris.asesmen}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-bold uppercase text-slate-500">Guru pengampu</dt>
                <dd>{baris.namaGuru || data?.siswa.pembimbing || '-'}</dd>
              </div>
            </dl>
            <p className="mt-3 text-xs font-bold uppercase text-slate-500">Materi / surah dan indikator</p>
            <p className="mt-1 text-slate-800">{materi || 'Belum ada materi'}</p>
            <p className="mt-1 text-slate-600">{indikator || 'Indikator penilaian belum diisi.'}</p>
          </section>

          <section className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-slate-50 text-[11px] font-bold uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2">Surah</th>
                  <th className="px-3 py-2">Nilai kelancaran</th>
                  <th className="px-3 py-2">Nilai tajwid</th>
                  <th className="px-3 py-2">Nilai adab</th>
                  <th className="px-3 py-2">Nilai surat</th>
                </tr>
              </thead>
              <tbody>
                {status === 'memuat' ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-4 text-slate-500">
                      Memuat rincian nilai…
                    </td>
                  </tr>
                ) : data && data.detail.length > 0 ? (
                  data.detail.map((row) => (
                    <tr key={`${row.nomorSurat}-${row.namaSurat}`} className="border-t border-slate-100">
                      <td className="px-3 py-2 font-semibold">
                        {row.namaSurat}
                        {row.rentangAyat ? ` (${row.rentangAyat})` : ''}
                      </td>
                      <td className="px-3 py-2">{teksNilai(row.nilaiKelancaran)}</td>
                      <td className="px-3 py-2">{teksNilai(row.nilaiTajwid)}</td>
                      <td className="px-3 py-2">{teksNilai(row.nilaiAdab)}</td>
                      <td className="px-3 py-2 font-bold">{teksNilai(row.nilaiSurat)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-3 py-4 text-slate-500">
                      Rincian komponen nilai belum tersimpan. Materi yang dikirim tetap tampil di atas.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            <div className="flex flex-wrap gap-4 border-t border-slate-100 px-3 py-3 text-sm">
              <p>
                <span className="font-bold text-slate-500">Total / nilai akhir: </span>
                <span className="text-lg font-black text-slate-900">{teksNilai(nilaiAkhir)}</span>
              </p>
              <p>
                <span className="font-bold text-slate-500">Predikat: </span>
                <span className="font-extrabold text-slate-900">{predikat}</span>
              </p>
            </div>
          </section>
          <p className="text-xs text-slate-500">Lembar di bawah siap dicetak atau disimpan sebagai PDF lewat tombol Cetak / PDF.</p>
        </div>

        <div className="px-2 pb-4 sm:px-4">
          {status === 'memuat' ? <p className="no-print py-8 text-center text-sm text-slate-500">Menyiapkan lembar rapor…</p> : null}
          {status === 'kosong' ? (
            <p className="no-print rounded-xl bg-white px-4 py-6 text-center text-sm text-slate-600">
              Identitas siswa belum ditemukan, sehingga lembar rapor belum dapat dicetak.
            </p>
          ) : null}
          {data ? <LembarRaporTahfidz data={data} indikator={indikator} /> : null}
        </div>
      </div>
    </div>
  )
}
