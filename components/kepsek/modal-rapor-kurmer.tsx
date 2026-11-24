'use client'

import { useMemo, useState } from 'react'
import { Printer, X } from 'lucide-react'
import { ModalKerangka } from '@/components/kepsek/modal-kerangka'
import { GAYA_CETAK_RAPOR_KURMER, LembarRaporKurmer } from '@/components/rapor-kurmer-cetak'
import type { LaporanKepsek } from '@/lib/kepala-sekolah'
import {
  hitungPemantauanRaporKurmer,
  kumpulanSiswaKurmerMasuk,
  nilaiAsesmenKurmer,
  PILIHAN_ASESMEN_RAPOR_KURMER,
} from '@/lib/kepsek-rapor-kurmer'
import { fetchDataCetakKurmer, formatNilaiKurmer, type DataCetakKurmer, type JenisAsesmenKurmer } from '@/lib/rapor-kurmer'

function BadgeStatus({ teks }: { teks: string }) {
  const sudah = teks === 'Sudah Menyetorkan'
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${sudah ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'}`}>
      {teks}
    </span>
  )
}

export function ModalRaporKurmer({ laporan, onTutup }: { laporan: LaporanKepsek; onTutup: () => void }) {
  const [asesmen, setAsesmen] = useState<JenisAsesmenKurmer>(laporan.raporKurmerRingkas.asesmen)
  const [kelas, setKelas] = useState('semua')
  const [pratinjau, setPratinjau] = useState<DataCetakKurmer | null>(null)
  const [memuat, setMemuat] = useState('')
  const [galat, setGalat] = useState('')
  const mentah = laporan.raporKurmerMentah
  const baris = useMemo(() => hitungPemantauanRaporKurmer(mentah, asesmen), [mentah, asesmen])
  const masuk = kumpulanSiswaKurmerMasuk(mentah, asesmen)
  const nama = useMemo(() => new Map(laporan.siswa.map((item) => [item.id_siswa, item.nama_siswa])), [laporan.siswa])

  const siswaKirim = useMemo(() => {
    return mentah.kelasSiswa
      .flatMap((blok) => blok.idSiswa.map((id) => ({ id, kelas: blok.kelas, guru: blok.namaGuru })))
      .filter((item) => masuk.has(item.id))
      .filter((item) => kelas === 'semua' || item.kelas === kelas)
      .map((item) => {
        const nilai = mentah.nilai.filter((row) => row.idSiswa === item.id && nilaiAsesmenKurmer(row, asesmen) != null)
        return {
          ...item,
          nama: nama.get(item.id) || item.id,
          mapel: nilai.length,
        }
      })
      .sort((a, b) => a.kelas.localeCompare(b.kelas, 'id', { numeric: true }) || a.nama.localeCompare(b.nama, 'id'))
  }, [mentah, masuk, kelas, nama, asesmen])

  const bukaPratinjau = async (idSiswa: string, kelasSiswa: string) => {
    setMemuat(idSiswa)
    setGalat('')
    const data = await fetchDataCetakKurmer(
      idSiswa,
      {
        kelas: kelasSiswa,
        kodeMapel: 'bind',
        jenisAsesmen: asesmen,
        tahunAjaran: mentah.tahunAjaran,
        semester: mentah.semester,
      },
      { unit: laporan.unit },
    )
    setMemuat('')
    if (!data) {
      setGalat('Pratinjau rapor Kurmer belum dapat dimuat.')
      return
    }
    setPratinjau(data)
  }

  return (
    <>
      <ModalKerangka
        judul="Kiriman data rapor Kurmer"
        keterangan={`Unit ${laporan.unit} · Semester ${mentah.labelSemester} ${mentah.tahunAjaran}. Status nilai Kurikulum Merdeka per kelas.`}
        onTutup={onTutup}
        lebar="max-w-6xl"
      >
        <div className="mb-3 flex flex-wrap gap-2">
          {PILIHAN_ASESMEN_RAPOR_KURMER.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setAsesmen(item)}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold ${
                asesmen === item ? 'bg-[#143d32] text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {item}
            </button>
          ))}
        </div>
        {baris.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
            Belum ada kelas pada unit ini. Kotak kiriman rapor Kurmer siap dipakai begitu wali kelas menyimpan nilai.
          </p>
        ) : (
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="text-xs text-slate-500">
                <th className="border-b p-2">Wali kelas / guru</th>
                <th className="border-b p-2">Kelas</th>
                <th className="border-b p-2">Siswa masuk</th>
                <th className="border-b p-2">Status asesmen</th>
              </tr>
            </thead>
            <tbody>
              {baris.map((row) => (
                <tr key={`${row.namaGuru}-${row.kelas}`}>
                  <td className="border-b p-2 font-bold">{row.namaGuru}</td>
                  <td className="border-b p-2">{row.kelas}</td>
                  <td className="border-b p-2 tabular-nums">
                    {row.siswaMasuk}/{row.siswaTotal}
                  </td>
                  <td className="border-b p-2">
                    <BadgeStatus teks={row.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className="mt-6 border-t border-slate-200 pt-4">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h3 className="text-sm font-extrabold text-slate-800">Hasil nilai masuk dari wali kelas</h3>
              <p className="mt-1 text-xs text-slate-500">
                Nilai {asesmen} yang sudah tersimpan pada semester {mentah.labelSemester} {mentah.tahunAjaran}.
              </p>
            </div>
            <label className="text-xs font-bold text-slate-600">
              Kelas
              <select
                value={kelas}
                onChange={(event) => setKelas(event.target.value)}
                className="mt-1 block rounded-lg border border-slate-300 bg-white px-2 py-1.5 font-semibold"
              >
                <option value="semua">Semua kelas</option>
                {baris.map((row) => (
                  <option key={row.kelas} value={row.kelas}>
                    {row.kelas}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {galat ? <p className="mt-2 text-sm font-semibold text-red-700">{galat}</p> : null}
          {siswaKirim.length === 0 ? (
            <p className="mt-3 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
              Belum ada kiriman rapor Kurmer untuk asesmen ini.
            </p>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-left text-sm">
                <thead>
                  <tr className="text-xs text-slate-500">
                    <th className="border-b p-2">Siswa</th>
                    <th className="border-b p-2">Kelas</th>
                    <th className="border-b p-2">Wali kelas / guru</th>
                    <th className="border-b p-2">Mapel terisi</th>
                    <th className="border-b p-2">Status</th>
                    <th className="border-b p-2">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {siswaKirim.map((row) => (
                    <tr key={row.id}>
                      <td className="border-b p-2 font-bold text-slate-800">{row.nama}</td>
                      <td className="border-b p-2">{row.kelas}</td>
                      <td className="border-b p-2">{row.guru}</td>
                      <td className="border-b p-2 tabular-nums">{row.mapel}</td>
                      <td className="border-b p-2">
                        <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-bold text-sky-800">Terkirim</span>
                      </td>
                      <td className="border-b p-2">
                        <button
                          type="button"
                          disabled={memuat === row.id}
                          onClick={() => void bukaPratinjau(row.id, row.kelas)}
                          className="rounded-lg border border-[#143d32] px-3 py-1.5 text-xs font-bold text-[#143d32] hover:bg-emerald-50 disabled:opacity-50"
                        >
                          {memuat === row.id ? 'Memuat…' : 'Detail & Rapor'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </ModalKerangka>

      {pratinjau ? (
        <div className="fixed inset-0 z-[80] overflow-y-auto bg-slate-900/55 p-3 sm:p-6" role="dialog" aria-modal="true">
          <style>{GAYA_CETAK_RAPOR_KURMER}</style>
          <div className="mx-auto w-full max-w-4xl rounded-2xl bg-slate-100 shadow-xl">
            <div className="no-print flex flex-wrap items-center justify-between gap-2 rounded-t-2xl bg-[#143d32] px-4 py-3 text-white">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-100">Pratinjau rapor Kurmer</p>
                <p className="text-sm font-extrabold">{pratinjau.siswa.nama_siswa}</p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1 rounded-lg bg-white px-3 py-2 text-xs font-bold text-slate-900"
                >
                  <Printer className="size-3.5" /> Cetak / PDF
                </button>
                <button type="button" onClick={() => setPratinjau(null)} className="rounded-lg bg-white/15 p-2" aria-label="Tutup pratinjau">
                  <X className="size-4" />
                </button>
              </div>
            </div>
            <div className="no-print px-4 py-3 text-xs text-slate-600">
              Rata-rata nilai akhir {formatNilaiKurmer(pratinjau.statistik.rata)} · {pratinjau.filter.jenisAsesmen} · kelas {pratinjau.siswa.kelas}
            </div>
            <div className="bg-white p-3">
              <LembarRaporKurmer data={pratinjau} />
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
