'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Search } from 'lucide-react'
import { fetchAllSiswa, fetchDaftarSiswa, type Siswa } from '@/lib/siswa'
import { adalahKepalaSekolah } from '@/lib/kepala-sekolah'
import { isAdminRole } from '@/lib/guru-bantu/utils'

export function PilihRaporSiswa({
  onBack,
  currentUser,
}: {
  onBack?: () => void
  currentUser?: { target_id?: string; id_user?: string; username?: string; role?: string; nama_lengkap?: string } | null
}) {
  const [siswa, setSiswa] = useState<Siswa[]>([])
  const [memuat, setMemuat] = useState(true)
  const [cari, setCari] = useState('')
  const [kelas, setKelas] = useState('')

  useEffect(() => {
    let batal = false
    const muat = adalahKepalaSekolah(currentUser) || isAdminRole(String(currentUser?.role || ''))
      ? fetchDaftarSiswa()
      : fetchAllSiswa(currentUser)
    muat.then((data) => {
      if (batal) return
      setSiswa(data)
      setMemuat(false)
    })
    return () => {
      batal = true
    }
  }, [currentUser])

  const daftarKelas = useMemo(
    () => Array.from(new Set(siswa.map((item) => item.kelas).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'id', { numeric: true })),
    [siswa],
  )

  const tampil = useMemo(() => {
    const kata = cari.trim().toLowerCase()
    return siswa
      .filter((item) => (!kelas || item.kelas === kelas) && (!kata || item.nama_siswa.toLowerCase().includes(kata) || String(item.id_siswa).toLowerCase().includes(kata)))
      .slice(0, 80)
  }, [siswa, cari, kelas])

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center justify-between rounded-2xl bg-[#2563eb] px-6 py-4 text-white shadow-md">
        {onBack ? (
          <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 rounded-xl bg-white/20 px-4 py-2 text-xs font-bold">
            <ArrowLeft className="size-4" /> Kembali
          </button>
        ) : (
          <Link href="/" className="inline-flex items-center gap-1.5 rounded-xl bg-white/20 px-4 py-2 text-xs font-bold">
            <ArrowLeft className="size-4" /> Dashboard
          </Link>
        )}
        <h2 className="text-base font-black tracking-wide">Cetak Rapor Siswa</h2>
        <span className="w-16" />
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-sm text-slate-600">Pilih siswa binaan, lalu buka lembar rapor Tahfidz &amp; Qiroah yang siap dicetak.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-bold text-slate-600">
            Kelas
            <select value={kelas} onChange={(event) => setKelas(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm">
              <option value="">Semua kelas</option>
              {daftarKelas.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-bold text-slate-600">
            Cari nama / ID
            <span className="relative mt-1 block">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                value={cari}
                onChange={(event) => setCari(event.target.value)}
                placeholder="Nama siswa"
                className="w-full rounded-xl border border-slate-300 py-2.5 pl-9 pr-3 text-sm"
              />
            </span>
          </label>
        </div>

        {memuat ? (
          <p className="mt-6 text-sm text-slate-500">Memuat daftar siswa…</p>
        ) : tampil.length === 0 ? (
          <p className="mt-6 text-sm text-slate-500">Tidak ada siswa yang cocok.</p>
        ) : (
          <ul className="mt-4 divide-y divide-slate-100">
            {tampil.map((item) => (
              <li key={item.id_siswa}>
                <Link
                  href={`/report/${encodeURIComponent(item.id_siswa)}`}
                  className="flex items-center justify-between gap-3 py-3 text-sm hover:bg-slate-50"
                >
                  <span>
                    <span className="font-bold text-slate-800">{item.nama_siswa}</span>
                    <span className="mt-0.5 block text-xs text-slate-500">
                      {item.kelas}
                      {item.unit ? ` · ${item.unit}` : ''} · {item.id_siswa}
                    </span>
                  </span>
                  <span className="rounded-lg bg-sky-700 px-3 py-1.5 text-[11px] font-bold text-white">Buka rapor</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
