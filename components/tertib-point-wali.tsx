'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { buatKendaliSegar } from '@/lib/langganan-segar'
import { supabase } from '@/lib/supabase'
import { TertibSaldoKartu } from '@/components/tertib-saldo-kartu'
import { TertibPeringkatKelas } from '@/components/tertib-peringkat-kelas'
import { muatAnandaUntukWali } from '@/lib/portal-wali-siswa'
import type { SantriWali } from '@/lib/portal-wali'
import {
  hitungSaldoTertibBulanan,
  isPortalWali,
  SAMBUTAN_TERTIB_WALI,
  tigaBesarKelas,
  type SaldoTertibBulanan,
} from '@/lib/tertib-saldo'

type Log = { sid: string; month: string; pts: number; label: string; guru: string; ts: number }

function formatMonthName(bulan: string) {
  const [y, m] = bulan.split('-').map(Number)
  if (!y || !m) return bulan
  return new Date(y, m - 1, 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
}

function mapLog(row: Record<string, unknown>): Log {
  return {
    sid: String(row.id_siswa || ''),
    month: String(row.bulan || ''),
    pts: Number(row.pts) || 0,
    label: String(row.label || ''),
    guru: String(row.guru || '-'),
    ts: row.created_at ? Date.parse(String(row.created_at)) : Date.now(),
  }
}

export default function TertibPointWali({
  currentUser,
  tanpaCekPeran = false,
}: {
  currentUser?: Record<string, unknown>
  tanpaCekPeran?: boolean
}) {
  const [bulan, setBulan] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
  const [ananda, setAnanda] = useState<SantriWali[]>([])
  const [temanKelas, setTemanKelas] = useState<SantriWali[]>([])
  const [logs, setLogs] = useState<Log[]>([])
  const [idPilih, setIdPilih] = useState('')
  const [memuat, setMemuat] = useState(true)

  const loadPoinKelas = useCallback(async (kelas: string, unit = '', senyap = false) => {
    if (!kelas) {
      setTemanKelas([])
      setLogs([])
      setMemuat(false)
      return
    }
    if (!senyap) setMemuat(true)

    const unitBersih = unit.trim()
    let querySiswa = supabase
      .from('siswa')
      .select('id_siswa,nama_siswa,kelas,unit')
      .eq('kelas', kelas)
      .not('kelas', 'ilike', '%Alumni%')
      .order('nama_siswa', { ascending: true })

    if (unitBersih) querySiswa = querySiswa.eq('unit', unitBersih)

    const { data: siswaKelas } = await querySiswa

    const teman: SantriWali[] = (siswaKelas || []).map((row) => ({
      id: String(row.id_siswa),
      name: String(row.nama_siswa || ''),
      kelas: String(row.kelas || ''),
      unit: String(row.unit || '').trim() || undefined,
    }))
    setTemanKelas(teman)

    const ids = teman.map((s) => s.id)
    if (ids.length === 0) {
      setLogs([])
      setMemuat(false)
      return
    }

    let queryLog = supabase
      .from('tertib_point')
      .select('id_siswa,bulan,pts,label,guru,created_at,unit')
      .eq('bulan', bulan)
      .in('id_siswa', ids)
      .order('created_at', { ascending: false })

    if (unitBersih) queryLog = queryLog.eq('unit', unitBersih)

    const { data: logData } = await queryLog

    setLogs((logData || []).map((row) => mapLog(row as Record<string, unknown>)))
    setMemuat(false)
  }, [bulan])

  useEffect(() => {
    let batal = false
    setMemuat(true)
    muatAnandaUntukWali(currentUser).then((daftar) => {
      if (batal) return
      setAnanda(daftar)
      setIdPilih((prev) => {
        if (prev && daftar.some((s) => s.id === prev)) return prev
        return daftar[0]?.id || ''
      })
      const pertama = daftar[0]
      void loadPoinKelas(pertama?.kelas || '', pertama?.unit || '')
    })
    return () => {
      batal = true
    }
  }, [currentUser, bulan, loadPoinKelas])

  const aktif = ananda.find((s) => s.id === idPilih) || ananda[0]

  useEffect(() => {
    if (aktif?.kelas) void loadPoinKelas(aktif.kelas, aktif.unit || '', true)
  }, [aktif?.kelas, aktif?.unit, loadPoinKelas])

  useEffect(() => {
    if (!aktif?.kelas) return
    const kelas = aktif.kelas
    const unit = aktif.unit || ''
    const segar = buatKendaliSegar(() => {
      void loadPoinKelas(kelas, unit, true)
    })
    const kanal = supabase
      .channel(`tertib-wali-${bulan}-${kelas}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tertib_point' }, () => {
        segar.dariRealtime()
      })
    return segar.pasang(kanal)
  }, [aktif?.kelas, aktif?.unit, bulan, loadPoinKelas])

  const saldo: SaldoTertibBulanan = useMemo(
    () => (aktif ? hitungSaldoTertibBulanan(logs, aktif.id, bulan) : hitungSaldoTertibBulanan([], '', bulan)),
    [logs, aktif, bulan],
  )

  const riwayat = useMemo(
    () => (aktif ? logs.filter((l) => l.sid === aktif.id).sort((a, b) => b.ts - a.ts) : []),
    [logs, aktif],
  )

  const peringkat = useMemo(
    () => (aktif?.kelas ? tigaBesarKelas(temanKelas, logs, bulan, 3) : []),
    [temanKelas, logs, bulan, aktif?.kelas],
  )

  if (!tanpaCekPeran && !isPortalWali(currentUser)) {
    return (
      <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        Halaman ini khusus akun Portal Wali Murid. Buka{' '}
        <a href="/portal-wali" className="font-bold text-emerald-800 underline">
          /portal-wali
        </a>
        .
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

      {ananda.length > 1 && (
        <label className="block text-xs font-bold text-slate-600">
          Pilih ananda
          <select
            value={aktif?.id || ''}
            onChange={(e) => setIdPilih(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
          >
            {ananda.map((s) => (
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
          <TertibSaldoKartu saldo={saldo} namaBulan={formatMonthName(bulan)} varian="wali" />
          <TertibPeringkatKelas
            kelas={aktif.kelas}
            peringkat={peringkat}
            idAnanda={aktif.id}
            namaBulan={formatMonthName(bulan)}
          />

          <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <h2 className="text-xs font-bold uppercase text-slate-500">Riwayat bulan ini</h2>
            {riwayat.length === 0 ? (
              <p className="py-4 text-center text-xs text-slate-400">Belum ada catatan poin.</p>
            ) : (
              <ul className="mt-2 divide-y divide-slate-100 text-sm">
                {riwayat.map((r, i) => (
                  <li key={i} className="flex justify-between gap-2 py-2">
                    <span className="min-w-0">
                      <time className="block text-[11px] font-semibold tabular-nums text-slate-500">
                        {Number.isFinite(r.ts) && r.ts > 0
                          ? new Date(r.ts)
                              .toLocaleDateString('id-ID', {
                                timeZone: 'Asia/Jakarta',
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              })
                              .replace(/\./g, '')
                          : '—'}
                      </time>
                      <span className="text-slate-700">{r.label}</span>
                    </span>
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
        <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-center text-sm text-amber-900">
          Data ananda belum tertaut ke akun wali ini. Pastikan kolom <strong>id_ortu</strong> di data siswa sesuai
          username / ID akun wali, lalu hubungi admin sekolah bila perlu.
        </p>
      )}
    </div>
  )
}
