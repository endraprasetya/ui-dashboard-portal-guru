'use client'

import { useMemo, useState } from 'react'
import { ModalKerangka } from '@/components/kepsek/modal-kerangka'
import type { LaporanKepsek } from '@/lib/kepala-sekolah'
import type { RekapAbsensiGuruBantuKepsek } from '@/lib/kepsek-guru-bantu'
import {
  PILIHAN_ASESMEN_RAPOR_HQ,
  hitungPemantauanRaporHq,
  type KodeAsesmenRaporHq,
} from '@/lib/kepsek-rapor-hq'

function BadgeStatus({ teks }: { teks: string }) {
  const sudah = teks === 'Sudah Menyetorkan'
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${sudah ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'}`}
    >
      {teks}
    </span>
  )
}

function BadgeAbsen({ status }: { status: string }) {
  const teks = String(status || '').trim()
  const hadir = teks === 'Hadir'
  const telat = teks === 'Terlambat'
  const kelas = hadir
    ? 'bg-emerald-100 text-emerald-800'
    : telat
      ? 'bg-amber-100 text-amber-900'
      : 'bg-slate-100 text-slate-600'
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${kelas}`}>{teks || '—'}</span>
}

function ThumbnailFoto({ url, label }: { url: string | null; label: string }) {
  if (!url) return <span className="text-xs text-slate-400">—</span>
  return (
    <a href={url} target="_blank" rel="noreferrer" className="inline-flex flex-col items-center gap-1">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt={label} className="size-12 rounded-lg border border-slate-200 object-cover" />
      <span className="text-[10px] font-bold text-emerald-800 underline">{label}</span>
    </a>
  )
}

export function ModalRaporHq({ laporan, onTutup }: { laporan: LaporanKepsek; onTutup: () => void }) {
  const [asesmen, setAsesmen] = useState<KodeAsesmenRaporHq>(laporan.raporHqRingkas.asesmen)
  const baris = useMemo(
    () => hitungPemantauanRaporHq(laporan.raporHqMentah, asesmen),
    [laporan.raporHqMentah, asesmen],
  )
  const { tahunAjaran, semester } = laporan.raporHqMentah

  return (
    <ModalKerangka
      judul="Pemantauan Rapor HQ"
      keterangan={`Unit ${laporan.unit} · ${semester} ${tahunAjaran}. Status menyetorkan nilai ujian tahfidz per kelas binaan.`}
      onTutup={onTutup}
      lebar="max-w-4xl"
    >
      <div className="mb-3 flex flex-wrap gap-2">
        {PILIHAN_ASESMEN_RAPOR_HQ.map((item) => (
          <button
            key={item.kode}
            type="button"
            onClick={() => setAsesmen(item.kode)}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold ${
              asesmen === item.kode ? 'bg-[#143d32] text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
      {baris.length === 0 ? (
        <p className="py-6 text-sm text-slate-500">Belum ada kombinasi guru–kelas binaan di unit ini.</p>
      ) : (
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="text-xs text-slate-500">
              <th className="border-b p-2">Nama guru</th>
              <th className="border-b p-2">Kelas</th>
              <th className="border-b p-2">Status asesmen</th>
            </tr>
          </thead>
          <tbody>
            {baris.map((row) => (
              <tr key={`${row.namaGuru}-${row.kelas}`}>
                <td className="border-b p-2 font-bold">{row.namaGuru}</td>
                <td className="border-b p-2">{row.kelas}</td>
                <td className="border-b p-2">
                  <BadgeStatus teks={row.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </ModalKerangka>
  )
}

export function ModalGuruBantu({
  rekap,
  unit,
  onTutup,
}: {
  rekap: RekapAbsensiGuruBantuKepsek
  unit: string
  onTutup: () => void
}) {
  return (
    <ModalKerangka
      judul="Absensi guru bantu"
      keterangan={`Unit ${unit} · ${rekap.tanggal}`}
      onTutup={onTutup}
      lebar="max-w-5xl"
    >
      <p className="mb-3 text-sm text-slate-700">
        {rekap.sudahAbsen} dari {rekap.total} guru sudah absen:{' '}
        <strong className="text-emerald-800">{rekap.hadir} Hadir</strong>,{' '}
        <strong className="text-amber-800">{rekap.terlambat} Terlambat</strong>,{' '}
        <strong>{rekap.tidakHadir} Tidak Hadir</strong>
      </p>
      {rekap.baris.length === 0 ? (
        <p className="py-6 text-sm text-slate-500">Belum ada akun guru bantu di unit ini.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-left text-sm">
            <thead>
              <tr className="text-xs text-slate-500">
                <th className="border-b p-2">Nama guru</th>
                <th className="border-b p-2">Jam hadir</th>
                <th className="border-b p-2">Status</th>
                <th className="border-b p-2">Jam pulang</th>
                <th className="border-b p-2">Foto</th>
              </tr>
            </thead>
            <tbody>
              {rekap.baris.map((row) => (
                <tr key={row.id_induk}>
                  <td className="border-b p-2 font-bold">{row.nama}</td>
                  <td className="border-b p-2 tabular-nums">{row.jam_masuk || '—'}</td>
                  <td className="border-b p-2">
                    <BadgeAbsen status={row.status === 'Belum absen' ? 'Tidak Hadir' : row.status} />
                  </td>
                  <td className="border-b p-2 tabular-nums">{row.jam_pulang || '—'}</td>
                  <td className="border-b p-2">
                    <div className="flex flex-wrap gap-3">
                      <ThumbnailFoto url={row.foto_masuk} label="Masuk" />
                      <ThumbnailFoto url={row.foto_pulang} label="Pulang" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </ModalKerangka>
  )
}
