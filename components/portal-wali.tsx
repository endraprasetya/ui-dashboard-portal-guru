'use client'

import { useState } from 'react'
import { UjianQiroahWaliBeranda, UjianQiroahWaliMenu } from '@/components/ujian-qiroah-wali'
import {
  ArrowRight,
  Award,
  CalendarDays,
  Camera,
  LayoutDashboard,
  Megaphone,
  ShieldAlert,
} from 'lucide-react'
import TertibPointWali from '@/components/tertib-point-wali'
import { PrestasiSiswaWali } from '@/components/prestasi-siswa-wali'
import { EkskulWali } from '@/components/ekskul-wali'
import { DaftarPengumuman } from '@/components/daftar-pengumuman'
import { educationCalendar } from '@/lib/teacher-data'

type ViewWali = 'dashboard' | 'tertib_point' | 'pengumuman' | 'prestasi' | 'ekskul' | 'qiroah'

const NAV: { id: ViewWali; label: string }[] = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'tertib_point', label: 'Tertib Poin' },
  { id: 'pengumuman', label: 'Pengumuman' },
  { id: 'prestasi', label: 'Prestasi' },
  { id: 'ekskul', label: 'Ekskul' },
  { id: 'qiroah', label: 'Qiroah' },
]

export function PortalWali({
  currentUser,
  onLogout,
}: {
  currentUser: any
  onLogout: () => void
}) {
  const [view, setView] = useState<ViewWali>('dashboard')
  const nama = String(currentUser?.nama_lengkap || currentUser?.username || 'Wali Murid')
  const initials =
    nama
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part: string) => part[0]?.toUpperCase())
      .join('') || 'WM'

  const todayLabel = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-700 font-black text-white shadow">
              PW
            </div>
            <div>
              <h1 className="text-sm font-extrabold text-slate-900">Portal Wali</h1>
              <p className="text-[11px] font-medium text-slate-500">SD Al Madinah Nogosari</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden text-right sm:block">
              <p className="text-xs font-bold text-slate-800">Ahlan wa Sahlan, {nama}</p>
              <p className="text-[11px] font-medium text-teal-600">Semoga ananda istiqamah.</p>
            </div>
            <div className="flex size-8 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-800">
              {initials}
            </div>
            <button
              type="button"
              onClick={onLogout}
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 shadow-sm hover:bg-slate-50"
            >
              Keluar
            </button>
          </div>
        </div>
        <nav className="mx-auto flex max-w-3xl gap-5 overflow-x-auto px-4 text-xs font-semibold">
          {NAV.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setView(item.id)}
              className={`whitespace-nowrap pb-2.5 transition ${
                view === item.id
                  ? 'border-b-2 border-emerald-600 font-extrabold text-emerald-700'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-3xl space-y-5 p-4 sm:p-6">
        {view === 'dashboard' && (
          <div className="space-y-5">
            <div>
              <p className="text-xs font-bold capitalize text-emerald-600">{todayLabel}</p>
              <h2 className="text-xl font-black text-slate-900">Dashboard Wali Murid</h2>
              <p className="text-xs text-slate-500">Pantau tertib poin, pengumuman, prestasi, dan kegiatan ananda.</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setView('tertib_point')}
                className="rounded-2xl bg-red-500 p-4 text-left text-white shadow transition hover:-translate-y-0.5 hover:shadow-lg"
              >
                <ShieldAlert className="size-5 opacity-90" />
                <h3 className="mt-6 text-sm font-extrabold">Tertib Poin</h3>
                <p className="mt-1 text-[11px] opacity-80">Saldo poin &amp; 3 besar kelas</p>
              </button>
              <button
                type="button"
                onClick={() => setView('pengumuman')}
                className="rounded-2xl bg-emerald-700 p-4 text-left text-white shadow transition hover:-translate-y-0.5 hover:shadow-lg"
              >
                <Megaphone className="size-5 opacity-90" />
                <h3 className="mt-6 text-sm font-extrabold">Pengumuman</h3>
                <p className="mt-1 text-[11px] opacity-80">{educationCalendar.length} agenda sekolah</p>
              </button>
              <button
                type="button"
                onClick={() => setView('prestasi')}
                className="rounded-2xl bg-amber-500 p-4 text-left text-white shadow transition hover:-translate-y-0.5 hover:shadow-lg"
              >
                <Award className="size-5 opacity-90" />
                <h3 className="mt-6 text-sm font-extrabold">Prestasi Siswa</h3>
                <p className="mt-1 text-[11px] opacity-80">Rekam jejak akademik &amp; lomba</p>
              </button>
              <button
                type="button"
                onClick={() => setView('ekskul')}
                className="rounded-2xl bg-sky-700 p-4 text-left text-white shadow transition hover:-translate-y-0.5 hover:shadow-lg"
              >
                <Camera className="size-5 opacity-90" />
                <h3 className="mt-6 text-sm font-extrabold">Ekskul &amp; Galeri</h3>
                <p className="mt-1 text-[11px] opacity-80">Kegiatan dan foto dokumentasi</p>
              </button>
            </div>

            <UjianQiroahWaliBeranda currentUser={currentUser} />

            <section className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-700">Modul pengumuman</p>
                  <h3 className="flex items-center gap-1.5 text-sm font-extrabold text-slate-900">
                    <CalendarDays className="size-4 text-emerald-600" /> Kalender pendidikan &amp; agenda sekolah
                  </h3>
                  <p className="mt-1 text-[11px] text-slate-500">Sumber: data pengumuman yang sama dengan Portal Guru.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setView('pengumuman')}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700"
                >
                  Lihat semua <ArrowRight className="size-3.5" />
                </button>
              </div>
              <DaftarPengumuman batas={4} ringkas />
            </section>
          </div>
        )}

        {view === 'tertib_point' && (
          <div>
            <TombolKembali onClick={() => setView('dashboard')} />
            <TertibPointWali currentUser={currentUser} tanpaCekPeran />
          </div>
        )}

        {view === 'pengumuman' && (
          <div className="space-y-4">
            <TombolKembali onClick={() => setView('dashboard')} />
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-700">Pengumuman penting</p>
              <h2 className="mt-1 text-lg font-black text-slate-900">Kalender Pendidikan</h2>
              <p className="mb-4 text-sm text-slate-500">Sumber yang sama dengan Portal Guru (tahun pelajaran 2026/2027).</p>
              <DaftarPengumuman />
            </section>
          </div>
        )}

        {view === 'prestasi' && (
          <div>
            <TombolKembali onClick={() => setView('dashboard')} />
            <PrestasiSiswaWali />
          </div>
        )}

        {view === 'ekskul' && (
          <div>
            <TombolKembali onClick={() => setView('dashboard')} />
            <EkskulWali />
          </div>
        )}

        {view === 'qiroah' && (
          <div>
            <TombolKembali onClick={() => setView('dashboard')} />
            <UjianQiroahWaliMenu currentUser={currentUser} />
          </div>
        )}
      </main>
    </div>
  )
}

function TombolKembali({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mb-3 inline-flex items-center gap-1.5 rounded-xl bg-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-300"
    >
      <LayoutDashboard className="size-4" /> Dashboard
    </button>
  )
}
