'use client'

import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Plus, Save, Trash2, Wallet } from 'lucide-react'
import type { AkunSesi } from '@/lib/bendahara'
import {
  KODE_AKUN_KAS,
  kanonUnitKeuangan,
  labelAkunKas,
  muatDaftarAkun,
  rupiahKas,
  simpanTransaksiDisetujui,
  uuidPengguna,
  type BarisAkun,
  type JenisTransaksiKas,
} from '@/lib/kasir'
import { todayInputValue } from '@/lib/jurnal'

type BarisItem = {
  kunci: string
  kode_akun: string
  nominal: string
}

function barisBaru(): BarisItem {
  return {
    kunci: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    kode_akun: '',
    nominal: '',
  }
}

export function BendaharaCatatTransaksi({
  user,
  unit,
  onTersimpan,
}: {
  user: AkunSesi
  unit: string
  onTersimpan?: () => void
}) {
  const [akun, setAkun] = useState<BarisAkun[]>([])
  const [tanggal, setTanggal] = useState(todayInputValue())
  const [jenis, setJenis] = useState<JenisTransaksiKas>('Pengeluaran')
  const [akunKas, setAkunKas] = useState<(typeof KODE_AKUN_KAS)[number]>('3101')
  const [item, setItem] = useState<BarisItem[]>([barisBaru()])
  const [uraian, setUraian] = useState('')
  const [pesan, setPesan] = useState('')
  const [galat, setGalat] = useState('')
  const [menyimpan, setMenyimpan] = useState(false)

  useEffect(() => {
    let batal = false
    muatDaftarAkun()
      .then((daftar) => {
        if (!batal) setAkun(daftar)
      })
      .catch((error: Error) => {
        if (!batal) setGalat(error.message || 'Master akun belum dapat dimuat.')
      })
    return () => {
      batal = true
    }
  }, [])

  const akunJenis = useMemo(() => akun.filter((baris) => baris.kategori === jenis), [akun, jenis])
  const akunKasMaster = useMemo(() => {
    const dariTabel = akun.filter((baris) => KODE_AKUN_KAS.includes(baris.kode_akun as (typeof KODE_AKUN_KAS)[number]))
    if (dariTabel.length > 0) return dariTabel
    return KODE_AKUN_KAS.map((kode) => ({ kode_akun: kode, nama_akun: labelAkunKas(kode), kategori: 'Kas' as const }))
  }, [akun])

  const totalNominal = useMemo(
    () => item.reduce((jumlah, baris) => jumlah + (Number(baris.nominal.replace(/\D/g, '')) || 0), 0),
    [item],
  )

  useEffect(() => {
    setItem((sekarang) => {
      const berikutnya = sekarang.map((baris) =>
        !baris.kode_akun || akunJenis.some((akunBaris) => akunBaris.kode_akun === baris.kode_akun)
          ? baris
          : { ...baris, kode_akun: '' },
      )
      const sama = berikutnya.every((baris, indeks) => baris.kode_akun === sekarang[indeks]?.kode_akun)
      return sama ? sekarang : berikutnya
    })
  }, [akunJenis])

  const ubahItem = (kunci: string, patch: Partial<BarisItem>) => {
    setItem((sekarang) => sekarang.map((baris) => (baris.kunci === kunci ? { ...baris, ...patch } : baris)))
  }

  const kirim = async (event: FormEvent) => {
    event.preventDefault()
    setGalat('')
    setPesan('')
    const daftar = item
      .map((baris) => ({
        kode_akun: baris.kode_akun,
        nominal: Number(baris.nominal.replace(/\D/g, '')) || 0,
        nama_akun: akun.find((akunBaris) => akunBaris.kode_akun === baris.kode_akun)?.nama_akun,
      }))
      .filter((baris) => baris.kode_akun && baris.nominal > 0)
    if (daftar.length === 0) {
      setGalat('Isi minimal satu baris kode akun dan nominal.')
      return
    }
    if (!uraian.trim()) {
      setGalat('Isi uraian transaksi, misalnya gaji, sarana prasarana, atau pencairan BOS.')
      return
    }
    setMenyimpan(true)
    try {
      const nomor = await simpanTransaksiDisetujui(
        {
          tanggal,
          jenis_transaksi: jenis,
          akun_kas_bank: akunKas,
          items: daftar,
          uraian: uraian.trim(),
          dicatat_oleh: String(user.nama_lengkap || user.username || 'Bendahara'),
          unit: kanonUnitKeuangan(unit) || unit,
        },
        uuidPengguna(user),
      )
      setPesan(
        `Bukti ${nomor} tersimpan dan langsung disetujui (${daftar.length} item, ${rupiahKas(totalNominal)}). Laporan arus kas, LRA, dan neraca sudah ikut diperbarui.`,
      )
      setItem([barisBaru()])
      setUraian('')
      onTersimpan?.()
    } catch (error) {
      console.error('Simpan transaksi Bendahara gagal', error)
      setGalat(error instanceof Error ? error.message : 'Gagal menyimpan transaksi.')
    } finally {
      setMenyimpan(false)
    }
  }

  return (
    <section id="catat-transaksi" className="rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2 text-emerald-900">
        <Wallet className="size-5" />
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-800">Input bendahara</p>
          <h2 className="text-sm font-extrabold">Catat Transaksi Bendahara</h2>
          <p className="text-[11px] font-medium text-slate-500">
            Pengeluaran non-rutin atau penerimaan langsung. Tersimpan langsung berstatus Disetujui, tanpa tahap Draft.
          </p>
        </div>
      </div>
      <form onSubmit={kirim} className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-bold text-slate-600">
          Tanggal
          <input
            type="date"
            value={tanggal}
            onChange={(e) => setTanggal(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-300 p-2.5 text-sm font-semibold"
            required
          />
        </label>
        <label className="text-xs font-bold text-slate-600">
          Jenis Transaksi
          <select
            value={jenis}
            onChange={(e) => setJenis(e.target.value as JenisTransaksiKas)}
            className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-sm font-semibold"
          >
            <option value="Pengeluaran">Pengeluaran</option>
            <option value="Penerimaan">Penerimaan</option>
          </select>
        </label>
        <label className="text-xs font-bold text-slate-600 sm:col-span-2">
          Akun Kas/Bank
          <select
            value={akunKas}
            onChange={(e) => setAkunKas(e.target.value as (typeof KODE_AKUN_KAS)[number])}
            className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-sm font-semibold"
          >
            {akunKasMaster.map((baris) => (
              <option key={baris.kode_akun} value={baris.kode_akun}>
                {baris.kode_akun} · {baris.nama_akun}
              </option>
            ))}
          </select>
        </label>

        <div className="space-y-2 sm:col-span-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-slate-700">Rincian kode akun & nominal</p>
            <button
              type="button"
              onClick={() => setItem((sekarang) => [...sekarang, barisBaru()])}
              className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-[11px] font-bold text-emerald-800"
            >
              <Plus className="size-3.5" /> Tambah baris
            </button>
          </div>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full min-w-[520px] border-collapse text-left text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-600">
                  <th className="w-10 border-b p-2">No</th>
                  <th className="border-b p-2">Kode akun</th>
                  <th className="w-40 border-b p-2">Nominal</th>
                  <th className="w-12 border-b p-2" />
                </tr>
              </thead>
              <tbody>
                {item.map((baris, indeks) => (
                  <tr key={baris.kunci}>
                    <td className="border-b p-2 font-semibold text-slate-500">{indeks + 1}</td>
                    <td className="border-b p-2">
                      <select
                        value={baris.kode_akun}
                        onChange={(event) => ubahItem(baris.kunci, { kode_akun: event.target.value })}
                        className="w-full rounded-lg border border-slate-300 bg-white p-2 text-sm font-semibold"
                        required
                      >
                        <option value="">{akunJenis.length ? '-- Pilih Akun --' : 'Master akun belum tersedia'}</option>
                        {akunJenis.map((akunBaris) => (
                          <option key={akunBaris.kode_akun} value={akunBaris.kode_akun}>
                            {akunBaris.kode_akun} · {akunBaris.nama_akun}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="border-b p-2">
                      <input
                        inputMode="numeric"
                        value={baris.nominal}
                        onChange={(event) => ubahItem(baris.kunci, { nominal: event.target.value.replace(/[^\d]/g, '') })}
                        placeholder="0"
                        className="w-full rounded-lg border border-slate-300 p-2 text-sm font-semibold"
                        required
                      />
                    </td>
                    <td className="border-b p-2 text-center">
                      <button
                        type="button"
                        disabled={item.length === 1}
                        onClick={() => setItem((sekarang) => sekarang.filter((x) => x.kunci !== baris.kunci))}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-700 disabled:opacity-30"
                        aria-label="Hapus baris"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-right text-sm font-black text-emerald-900">Total {rupiahKas(totalNominal)}</p>
        </div>

        <label className="text-xs font-bold text-slate-600 sm:col-span-2">
          Uraian
          <textarea
            value={uraian}
            onChange={(e) => setUraian(e.target.value)}
            rows={3}
            required
            className="mt-1 w-full rounded-xl border border-slate-300 p-2.5 text-sm font-semibold"
            placeholder="Contoh: Honor guru bantu November, pengadaan sarana, pencairan BOS, atau transfer antar bank."
          />
        </label>
        {galat ? <p className="rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 sm:col-span-2">{galat}</p> : null}
        {pesan ? <p className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800 sm:col-span-2">{pesan}</p> : null}
        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={menyimpan}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
          >
            <Save className="size-4" /> {menyimpan ? 'Menyimpan...' : 'Simpan & Setujui'}
          </button>
        </div>
      </form>
    </section>
  )
}
