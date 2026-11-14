'use client'

import { useEffect, useMemo, useState } from 'react'
import { CircleCheck, CircleAlert, Wallet } from 'lucide-react'
import { muatAnandaUntukWali } from '@/lib/portal-wali-siswa'
import type { SantriWali } from '@/lib/portal-wali'
import { labelPeriodeBerjalan, labelTapel, saringRincianPortalWali } from '@/lib/ampss-urai'
import type { DetailTunggakan } from '@/lib/keuangan-tipe'

function rupiah(nilai: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(nilai)
}

function kunciNisAnanda(ananda: SantriWali[], user?: Record<string, unknown> | null) {
  return [
    ...new Set(
      [...ananda.flatMap((anak) => [anak.nis, anak.id]), String(user?.nis || '')].filter(
        (nilai): nilai is string => Boolean(nilai && String(nilai).replace(/\D/g, '').length >= 3),
      ),
    ),
  ]
}

export function KeuanganWaliBeranda({
  currentUser,
  onBuka,
}: {
  currentUser?: Record<string, unknown> | null
  onBuka?: () => void
}) {
  const { data, memuat } = useKeuanganWali(currentUser)
  if (memuat || data.length === 0) return null
  const menunggak = data.filter((item) => item.tunggakan > 0)
  const total = menunggak.reduce((jumlah, item) => jumlah + item.tunggakan, 0)

  const isi = (
    <>
      <div className="mb-2 flex items-center gap-2 text-sky-900">
        <Wallet className="size-4" />
        <h3 className="text-sm font-extrabold">Keuangan ananda</h3>
      </div>
      <p className="text-[11px] text-slate-500">Tagihan tertunda hanya dihitung sampai {labelPeriodeBerjalan('2627')}.</p>
      {menunggak.length === 0 ? (
        <p className="mt-2 text-sm font-semibold text-emerald-800">Tidak ada tunggakan pada bulan berjalan dan sebelumnya.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {menunggak.map((item) => (
            <li key={item.nis} className="rounded-xl border border-amber-100 bg-amber-50/70 px-3 py-2">
              <p className="text-xs font-bold text-slate-800">{item.nama} · {item.kelas}</p>
              <p className="text-[11px] text-amber-900">Tunggakan {rupiah(item.tunggakan)} · {item.rincian.length} tagihan</p>
            </li>
          ))}
        </ul>
      )}
      {total > 0 ? <p className="mt-2 text-xs font-extrabold text-amber-950">Total tertunda {rupiah(total)}</p> : null}
    </>
  )

  if (onBuka) {
    return (
      <button type="button" onClick={onBuka} className="w-full rounded-2xl border border-sky-200 bg-white p-4 text-left shadow-sm transition hover:border-sky-300 hover:shadow-md">
        {isi}
      </button>
    )
  }

  return <section className="rounded-2xl border border-sky-200 bg-white p-4 shadow-sm">{isi}</section>
}

export function KeuanganWaliMenu({ currentUser }: { currentUser?: Record<string, unknown> | null }) {
  const { data, memuat, galat, periode } = useKeuanganWali(currentUser)

  return (
    <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wide text-sky-700">Keuangan siswa</p>
        <h2 className="text-lg font-black text-slate-900">Tagihan &amp; tunggakan</h2>
        <p className="text-xs text-slate-500">
          Status tunggakan aktif hanya mencakup {periode}. Tagihan Desember 2026 hingga Juni 2027 disembunyikan sampai jatuh tempo.
        </p>
      </div>

      {memuat && <p className="text-sm text-slate-500">Mengambil tagihan ananda…</p>}
      {galat && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{galat}</p>}
      {!memuat && !galat && data.length === 0 && (
        <p className="text-sm text-slate-500">Data keuangan ananda belum ditemukan. Pastikan NIS siswa tertaut pada akun wali.</p>
      )}

      {data.map((item) => (
        <KartuTunggakanAnanda key={item.nis} data={item} />
      ))}
    </section>
  )
}

function KartuTunggakanAnanda({ data }: { data: DetailTunggakan }) {
  const lunas = data.tunggakan <= 0
  return (
    <article className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-extrabold text-slate-900">{data.nama}</p>
          <p className="text-[11px] text-slate-500">Kelas {data.kelas} · NIS {data.nis}</p>
        </div>
        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${lunas ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'}`}>
          {lunas ? <CircleCheck className="size-3.5" /> : <CircleAlert className="size-3.5" />}
          {lunas ? 'Lunas' : 'Menunggak'}
        </span>
      </div>
      <p className="mt-2 text-lg font-black text-slate-900">{rupiah(data.tunggakan)}</p>
      <p className="text-[11px] text-slate-500">Total tagihan tertunda s.d. bulan berjalan</p>

      {data.rincian.length === 0 ? (
        <p className="mt-3 text-xs text-slate-500">Tidak ada tagihan jatuh tempo yang belum dibayar.</p>
      ) : (
        <ul className="mt-3 divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
          {data.rincian.map((item) => (
            <li key={`${item.tapel}-${item.kode}`} className="flex items-start justify-between gap-3 px-3 py-2">
              <div>
                <p className="text-xs font-bold text-slate-800">{item.item}</p>
                <p className="text-[11px] text-slate-500">{labelTapel(item.tapel)}</p>
              </div>
              <p className="text-xs font-extrabold text-amber-900">{rupiah(item.jumlah)}</p>
            </li>
          ))}
        </ul>
      )}
    </article>
  )
}

function useKeuanganWali(currentUser?: Record<string, unknown> | null) {
  const [data, setData] = useState<DetailTunggakan[]>([])
  const [memuat, setMemuat] = useState(true)
  const [galat, setGalat] = useState('')
  const periode = useMemo(() => labelPeriodeBerjalan('2627'), [])

  useEffect(() => {
    let batal = false
    setMemuat(true)
    setGalat('')
    muatAnandaUntukWali(currentUser)
      .then(async (ananda) => {
        const nis = kunciNisAnanda(ananda, currentUser)
        if (nis.length === 0) return [] as DetailTunggakan[]
        const respon = await fetch(`/api/portal-wali/keuangan?${nis.map((nilai) => `nis=${encodeURIComponent(nilai)}`).join('&')}`)
        const json = await respon.json()
        if (!respon.ok) throw new Error(json.pesan || 'Data keuangan belum dapat dimuat.')
        return (json as DetailTunggakan[]).map((item) => {
          const rincian = saringRincianPortalWali(item.rincian || [])
          const tunggakan = rincian.reduce((jumlah, baris) => jumlah + baris.jumlah, 0)
          return { ...item, rincian, tunggakan, status: tunggakan > 0 ? 'Menunggak' : 'Lunas' }
        })
      })
      .then((hasil) => {
        if (!batal) setData(hasil)
      })
      .catch((error: Error) => {
        if (!batal) {
          setData([])
          setGalat(error.message || 'Data keuangan belum dapat dimuat.')
        }
      })
      .finally(() => {
        if (!batal) setMemuat(false)
      })
    return () => {
      batal = true
    }
  }, [currentUser])

  return { data, memuat, galat, periode }
}
