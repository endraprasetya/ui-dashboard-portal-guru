'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { TertibSaldoKartu } from '@/components/tertib-saldo-kartu'
import {
  hitungSaldoTertibBulanan,
  isPortalWali,
  SAMBUTAN_TERTIB_WALI,
  type SaldoTertibBulanan,
} from '@/lib/tertib-saldo'

type Santri = { id: string; name: string; kelas: string }
type Log = { sid: string; month: string; pts: number; label: string; guru: string; ts: number }

function formatMonthName(bulan: string) {
  const [y, m] = bulan.split('-').map(Number)
  if (!y || !m) return bulan
  return new Date(y, m - 1, 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
}

function mapLog(row: any): Log {
  return {
    sid: String(row.id_siswa || ''),
    month: String(row.bulan || ''),
    pts: Number(row.pts) || 0,
    label: String(row.label || ''),
    guru: String(row.guru || '-'),
    ts: row.created_at ? Date.parse(row.created_at) : Date.now(),
  }
}

export default function TertibPointWali({ currentUser }: { currentUser?: any }) {
  const [bulan, setBulan] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
  const [santri, setSantri] = useState<Santri[]>([])
  const [logs, setLogs] = useState<Log[]>([])
  const [idPilih, setIdPilih] = useState('')
  const [memuat, setMemuat] = useState(true)

  const load = useCallback(async () => {
    setMemuat(true)
    const idTautan = String(
      currentUser?.id_siswa || currentUser?.target_id || currentUser?.username || '',
    ).trim()

    const { data: siswaData } = await supabase
      .from('siswa')
      .select('id_siswa,nama_siswa,kelas')
      .order('nama_siswa', { ascending: true })

    const daftar: Santri[] = (siswaData || []).map((row) => ({
      id: String(row.id_siswa),
      name: String(row.nama_siswa || ''),
      kelas: String(row.kelas || ''),
    }))
    setSantri(daftar)

    const defaultId =
      daftar.find((s) => s.id === idTautan)?.id ||
      (idTautan ? daftar.find((s) => s.name.toLowerCase().includes(idTautan.toLowerCase()))?.id : '') ||
      daftar[0]?.id ||
      ''
    setIdPilih((prev) => prev || defaultId)

    const { data: logData } = await supabase
      .from('tertib_point')
      .select('id_siswa,bulan,pts,label,guru,created_at')
      .eq('bulan', bulan)
      .order('created_at', { ascending: false })

    setLogs((logData || []).map(mapLog))
    setMemuat(false)
  }, [bulan, currentUser])

  useEffect(() => {
    void load()
  }, [load])

  const aktif = santri.find((s) => s.id === idPilih)
  const saldo: SaldoTertibBulanan = useMemo(
    () => (idPilih ? hitungSaldoTertibBulanan(logs, idPilih, bulan) : hitungSaldoTertibBulanan([], '', bulan)),
    [logs, idPilih, bulan],
  )

  const riwayat = useMemo(
    () => logs.filter((l) => l.sid === idPilih).sort((a, b) => b.ts - a.ts),
    [logs, idPilih],
  )

  if (!isPortalWali(currentUser)) {
    return (
      <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        Halaman ini khusus akun Portal Wali Murid.
      </p>
    )
  }

  return (
    <div className="mx-auto max-w-lg space-y-4 px-1 pb-8">
      <header className="rounded-2xl bg-emerald-800 px-4 py-5 text-center text-white shadow-md">
        <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-200">{SAMBUTAN_TERTIB_WALI.subjudul}</p>
        <h1 className="mt-1 text-lg font-black">{SAMBUTAN_TERTIB_WALI.judul}</h1>
        <p className="mt-1 text-xs text-emerald-100">{SAMBUTAN_TERTIB_WALI.keteranganKelas}</p>
      </header>

      <label className="block text-xs font-bold text-slate-600">
        Bulan penilaian
        <input
          type="month"
          value={bulan}
          onChange={(e) => setBulan(e.target.value)}
          className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-semibold"
        />
      </label>

      {santri.length > 1 && (
        <label className="block text-xs font-bold text-slate-600">
          Pilih ananda
          <select
            value={idPilih}
            onChange={(e) => setIdPilih(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
          >
            {santri.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} · {s.kelas}
              </option>
            ))}
          </select>
        </label>
      )}

      {memuat ? (
        <p className="py-8 text-center text-sm text-slate-500">Memuat data poin…</p>
      ) : aktif ? (
        <>
          <p className="text-center text-sm font-semibold text-slate-800">
            {aktif.name} <span className="text-slate-500">· Kelas {aktif.kelas}</span>
          </p>
          <TertibSaldoKartu saldo={saldo} namaBulan={formatMonthName(bulan)} />

          <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <h2 className="text-xs font-bold uppercase text-slate-500">Riwayat bulan ini</h2>
            {riwayat.length === 0 ? (
              <p className="py-4 text-center text-xs text-slate-400">Belum ada catatan poin.</p>
            ) : (
              <ul className="mt-2 divide-y divide-slate-100 text-sm">
                {riwayat.map((r, i) => (
                  <li key={i} className="flex justify-between gap-2 py-2">
                    <span className="text-slate-700">{r.label}</span>
                    <span className={`shrink-0 font-bold ${r.pts > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {r.pts > 0 ? `+${r.pts}` : r.pts}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      ) : (
        <p className="text-center text-sm text-slate-500">Data santri tidak ditemukan.</p>
      )}
    </div>
  )
}
