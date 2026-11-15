'use client'

import { useEffect, useState } from 'react'
import { Check, ClipboardList, X } from 'lucide-react'
import {
  labelAkunKas,
  labelRincianItem,
  labelSiswaTransaksi,
  muatDaftarAkun,
  muatTransaksiKas,
  rupiahKas,
  uuidPengguna,
  validasiTransaksiKas,
  type BarisAkun,
  type TransaksiKas,
} from '@/lib/kasir'
import type { AkunSesi } from '@/lib/bendahara'

export function BendaharaValidasiKas({
  unit,
  user,
  onSetelahValidasi,
}: {
  namaBendahara?: string
  unit?: string
  user?: AkunSesi | null
  onSetelahValidasi?: () => void
}) {
  const [baris, setBaris] = useState<TransaksiKas[]>([])
  const [akun, setAkun] = useState<BarisAkun[]>([])
  const [memuat, setMemuat] = useState(true)
  const [galat, setGalat] = useState('')
  const [pesan, setPesan] = useState('')
  const [proses, setProses] = useState('')

  const muat = async (senyap = false) => {
    if (!senyap) setMemuat(true)
    setGalat('')
    try {
      const [draf, daftarAkun] = await Promise.all([muatTransaksiKas('Draft', unit), muatDaftarAkun().catch(() => [])])
      setBaris(draf)
      setAkun(daftarAkun)
    } catch (error) {
      console.error('Gagal memuat draft Bendahara', error)
      setGalat(error instanceof Error ? error.message : 'Gagal memuat draft transaksi.')
      setBaris([])
    } finally {
      setMemuat(false)
    }
  }

  useEffect(() => {
    void muat()
  }, [unit])

  const ubahStatus = async (nomorBukti: string, status: 'Disetujui' | 'Ditolak') => {
    const alasan = status === 'Ditolak' ? window.prompt('Alasan penolakan (opsional):') : ''
    if (status === 'Ditolak' && alasan === null) return
    setProses(nomorBukti)
    setPesan('')
    try {
      await validasiTransaksiKas(nomorBukti, status, uuidPengguna(user))
      setPesan(`Bukti ${nomorBukti} ${status === 'Disetujui' ? 'disetujui' : 'ditolak'}.`)
      await muat(true)
      onSetelahValidasi?.()
    } catch (error) {
      setGalat(error instanceof Error ? error.message : 'Gagal memvalidasi transaksi.')
    } finally {
      setProses('')
    }
  }

  return (
    <section className="space-y-3 rounded-2xl border border-amber-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-amber-800">Validasi kasir</p>
          <h2 className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
            <ClipboardList className="size-4" /> Transaksi Draft
          </h2>
          <p className="text-[11px] text-slate-500">Setujui atau tolak pencatatan harian dari Kasir sebelum masuk buku kas.</p>
        </div>
        <button type="button" onClick={() => void muat()} className="rounded-xl border border-slate-200 px-3 py-1.5 text-[11px] font-bold text-slate-600">
          Segarkan
        </button>
      </div>
      {memuat ? <p className="text-sm text-slate-500">Memuat draft transaksi...</p> : null}
      {galat ? <p className="rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{galat}</p> : null}
      {pesan ? <p className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">{pesan}</p> : null}
      {!memuat && baris.length === 0 && !galat ? (
        <p className="text-sm text-slate-500">Tidak ada transaksi berstatus Draft.</p>
      ) : null}
      {baris.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse text-left text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-600">
                <th className="border-b p-2">Bukti / Tanggal</th>
                <th className="border-b p-2">Jenis</th>
                <th className="border-b p-2">Item akun</th>
                <th className="border-b p-2">Kas/Bank</th>
                <th className="border-b p-2">Siswa</th>
                <th className="border-b p-2 text-end">Nominal</th>
                <th className="border-b p-2">Uraian</th>
                <th className="border-b p-2 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {baris.map((item) => (
                <tr key={item.nomor_bukti} className="align-top">
                  <td className="border-b p-2">
                    <p className="font-bold text-slate-800">{item.nomor_bukti}</p>
                    <p className="text-[11px] text-slate-500">{item.tanggal} · {item.dicatat_oleh || '-'}</p>
                  </td>
                  <td className="border-b p-2 font-semibold">{item.jenis_transaksi}</td>
                  <td className="border-b p-2">
                    {(item.items.length > 0 ? item.items : [{ kode_akun: item.kode_akun, nominal: item.nominal }]).map((det, indeks) => (
                      <p key={`${det.kode_akun}-${det.nominal}-${indeks}`}>
                        {labelRincianItem(det, akun)}
                        <span className="ml-1 text-slate-500">{rupiahKas(det.nominal)}</span>
                      </p>
                    ))}
                  </td>
                  <td className="border-b p-2">{labelAkunKas(item.akun_kas_bank)}</td>
                  <td className="border-b p-2">
                    {labelSiswaTransaksi(item) ? (
                      <span>
                        {labelSiswaTransaksi(item)}
                        {item.kode_tagihan ? <span className="mt-0.5 block text-[11px] text-slate-500">{item.kode_tagihan}</span> : null}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="border-b p-2 text-end font-extrabold">{rupiahKas(Number(item.nominal))}</td>
                  <td className="border-b p-2 text-slate-600">{item.uraian || '-'}</td>
                  <td className="border-b p-2">
                    <div className="flex justify-center gap-1">
                      <button
                        type="button"
                        disabled={proses === item.nomor_bukti}
                        onClick={() => void ubahStatus(item.nomor_bukti, 'Disetujui')}
                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-700 px-2.5 py-1.5 text-[11px] font-bold text-white disabled:opacity-50"
                      >
                        <Check className="size-3.5" /> Setujui
                      </button>
                      <button
                        type="button"
                        disabled={proses === item.nomor_bukti}
                        onClick={() => void ubahStatus(item.nomor_bukti, 'Ditolak')}
                        className="inline-flex items-center gap-1 rounded-lg bg-[#800000] px-2.5 py-1.5 text-[11px] font-bold text-white disabled:opacity-50"
                      >
                        <X className="size-3.5" /> Tolak
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  )
}
