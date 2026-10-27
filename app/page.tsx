'use client'

import { useState, type ReactNode } from 'react'
import { Login } from '@/components/login'
import { TahfidzRekap } from '@/components/tahfidz-rekap'
import { TahfidzForm } from '@/components/tahfidz-form'
import { QiroahForm } from '@/components/qiroah-form'
import { QiroahRekap } from '@/components/qiroah-rekap'
import { QiroahPenilaian } from '@/components/qiroah-penilaian'
import { QiroahPenguji } from '@/components/qiroah-penguji'
import TertibPoint from '@/components/tertib-point'
import { JurnalPembelajaran } from '@/components/jurnal-pembelajaran'
import { AbsensiRekap } from '@/components/absensi-rekap'
import { hasPengujiRole } from '@/lib/qiroah'
import {
  educationCalendar,
  recentActivities,
  teacherTodos,
  teachingDays,
  todaySchedule,
} from '@/lib/teacher-data'
import {
  BookOpen,
  BookCheck,
  FileText,
  CalendarCheck2,
  Edit3,
  BarChart2,
  Printer,
  FileCheck,
  ArrowLeft,
  ArrowRight,
  Bell,
  ClipboardList,
  CheckCircle2,
  CalendarDays,
  ClipboardCheck,
  Plus,
  ShieldAlert,
} from 'lucide-react'

export default function Home() {
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [currentView, setCurrentView] = useState<string>('dashboard')
  const [completedTodos, setCompletedTodos] = useState<string[]>([])

  const handleLogout = () => {
    localStorage.removeItem('user_session')
    setCurrentUser(null)
    setCurrentView('dashboard')
    window.location.reload()
  }

  const todayLabel = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  const initials = String(currentUser?.nama_lengkap || currentUser?.username || 'PG')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part: string) => part[0]?.toUpperCase())
    .join('') || 'PG'

  if (!currentUser) {
    return <Login onLoginSuccess={(user) => setCurrentUser(user)} />
  }

  const isTahfidz = currentView.startsWith('tahfidz')
  const isQiroah = currentView.startsWith('qiroah')
  const canPenguji = hasPengujiRole(currentUser)

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 font-sans">
      <header className="no-print sticky top-0 z-40 border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-[#0d9488] font-black text-white shadow">
              PG
            </div>
            <div>
              <h1 className="text-sm font-extrabold text-slate-900">Portal Guru</h1>
              <p className="text-[11px] font-medium text-slate-500">
                SD Al Madinah {currentUser.unit && currentUser.unit !== 'Semua Unit' ? currentUser.unit : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold text-slate-800">
                Ahlan wa Sahlan, {currentUser.nama_lengkap || currentUser.username}
              </p>
              <p className="text-[11px] text-teal-600 font-medium">Semoga hari ini penuh keberkahan.</p>
            </div>
            <div className="flex size-8 items-center justify-center rounded-full bg-amber-100 font-bold text-amber-800 text-xs">
              {initials}
            </div>
            <button
              onClick={handleLogout}
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 shadow-sm hover:bg-slate-50 transition"
            >
              Keluar
            </button>
          </div>
        </div>

        {/* Navigasi Menu Atas */}
        <div className="mx-auto flex max-w-6xl gap-6 px-4 overflow-x-auto text-xs font-semibold border-t border-slate-100 pt-2">
          {[
            { id: 'dashboard', label: 'Dashboard', active: currentView === 'dashboard' },
            { id: 'tahfidz_menu', label: "Tahfidzul Qur'an", active: isTahfidz },
            { id: 'qiroah_menu', label: "Qiroatul Qur'an", active: isQiroah },
            { id: 'jurnal', label: 'Jurnal Pembelajaran', active: currentView === 'jurnal' },
            { id: 'absensi', label: 'Absensi', active: currentView === 'absensi' },
            { id: 'tertib_point', label: 'Tertib Point', active: currentView === 'tertib_point' },
            { id: 'pengumuman', label: 'Pengumuman', active: currentView === 'pengumuman' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id)}
              className={`whitespace-nowrap pb-2.5 transition ${
                item.active
                  ? 'border-b-2 border-emerald-600 font-extrabold text-emerald-700'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </header>

      <main className={`mx-auto p-4 sm:p-6 space-y-6 ${currentView === 'jurnal' || currentView === 'absensi' ? 'max-w-7xl' : 'max-w-6xl'}`}>
        {currentView === 'dashboard' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-emerald-600 capitalize">{todayLabel}</p>
                <h2 className="text-xl font-black text-slate-900">Dashboard Guru</h2>
                <p className="text-xs text-slate-500">Kelola kegiatan belajar dan perkembangan santri dengan mudah.</p>
              </div>
              <button
                onClick={() => setCurrentView('pengumuman')}
                className="hidden sm:flex items-center gap-1.5 rounded-full bg-emerald-700 px-3 py-1.5 text-xs font-bold text-white shadow-sm"
              >
                <Bell className="size-3.5" /> 3 notifikasi
              </button>
            </div>

            {/* Grid Card Menu Utama (Termasuk Card Merah Cerah Tertib Point) */}
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
              <button
                onClick={() => setCurrentView('tahfidz_menu')}
                className="group relative overflow-hidden rounded-2xl bg-[#059669] p-5 text-left text-white shadow transition hover:shadow-lg hover:-translate-y-0.5"
              >
                <div className="flex items-center justify-between pb-6">
                  <div className="rounded-xl bg-white/20 p-2.5">
                    <BookOpen className="size-5" />
                  </div>
                  <ArrowRight className="size-4 opacity-75" />
                </div>
                <h3 className="text-sm font-extrabold">Tahfidzul Qur&apos;an</h3>
                <p className="mt-1 text-[11px] opacity-80">Kelola setoran, hafalan, dan kenaikan hafalan santri</p>
              </button>

              <button
                onClick={() => setCurrentView('qiroah_menu')}
                className="rounded-2xl bg-[#0284c7] p-5 text-left text-white shadow transition hover:shadow-lg hover:-translate-y-0.5"
              >
                <div className="flex items-center justify-between pb-6">
                  <div className="rounded-xl bg-white/20 p-2.5">
                    <BookCheck className="size-5" />
                  </div>
                  <ArrowRight className="size-4 opacity-75" />
                </div>
                <h3 className="text-sm font-extrabold">Qiroatul Qur&apos;an</h3>
                <p className="mt-1 text-[11px] opacity-80">Input bacaan, jilid, dan kenaikan jilid santri</p>
              </button>

              <button
                onClick={() => setCurrentView('jurnal')}
                className="rounded-2xl bg-[#eab308] p-5 text-left text-white shadow transition hover:shadow-lg hover:-translate-y-0.5"
              >
                <div className="flex items-center justify-between pb-6">
                  <div className="rounded-xl bg-white/20 p-2.5">
                    <FileText className="size-5" />
                  </div>
                  <ArrowRight className="size-4 opacity-75" />
                </div>
                <h3 className="text-sm font-extrabold">Jurnal Pembelajaran</h3>
                <p className="mt-1 text-[11px] opacity-80">Catat materi, kegiatan, dan evaluasi pembelajaran</p>
              </button>

              <button
                onClick={() => setCurrentView('absensi')}
                className="rounded-2xl bg-[#334155] p-5 text-left text-white shadow transition hover:shadow-lg hover:-translate-y-0.5"
              >
                <div className="flex items-center justify-between pb-6">
                  <div className="rounded-xl bg-white/20 p-2.5">
                    <CalendarCheck2 className="size-5" />
                  </div>
                  <ArrowRight className="size-4 opacity-75" />
                </div>
                <h3 className="text-sm font-extrabold">Absensi</h3>
                <p className="mt-1 text-[11px] opacity-80">Rekap dan laporan kehadiran dari jurnal harian</p>
              </button>

              {/* CARD TERTIB POINT WARNA MERAH CERAH */}
              <button
                onClick={() => setCurrentView('tertib_point')}
                className="rounded-2xl bg-red-500 p-5 text-left text-white shadow transition hover:shadow-lg hover:-translate-y-0.5"
              >
                <div className="flex items-center justify-between pb-6">
                  <div className="rounded-xl bg-white/20 p-2.5">
                    <ShieldAlert className="size-5" />
                  </div>
                  <ArrowRight className="size-4 opacity-75" />
                </div>
                <h3 className="text-sm font-extrabold">Tertib Point</h3>
                <p className="mt-1 text-[11px] opacity-80">Catat kontribusi dan pelanggaran disiplin santri</p>
              </button>
            </div>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">Prioritas hari ini</p>
                  <h3 className="mt-1 text-sm font-extrabold text-slate-900">To Do List Guru</h3>
                </div>
                <ClipboardList className="size-5 text-emerald-600" />
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                {teacherTodos.map((todo) => {
                  const completed = completedTodos.includes(todo.id)
                  return (
                    <button
                      key={todo.id}
                      type="button"
                      onClick={() =>
                        setCompletedTodos((current) =>
                          completed ? current.filter((id) => id !== todo.id) : [...current, todo.id],
                        )
                      }
                      className={`flex items-start gap-3 rounded-xl border p-3 text-left transition ${
                        completed
                          ? 'border-emerald-200 bg-emerald-50/70'
                          : 'border-slate-100 bg-slate-50/60 hover:border-emerald-200 hover:bg-emerald-50/50'
                      }`}
                    >
                      <span
                        className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border ${
                          completed
                            ? 'border-emerald-600 bg-emerald-600 text-white'
                            : 'border-slate-300 bg-white text-transparent'
                        }`}
                      >
                        <CheckCircle2 className="size-4" />
                      </span>
                      <span>
                        <span className={`block text-sm font-bold ${completed ? 'text-emerald-800 line-through' : 'text-slate-800'}`}>
                          {todo.title}
                        </span>
                        <span className="mt-1 block text-xs leading-5 text-slate-500">{todo.detail}</span>
                      </span>
                    </button>
                  )
                })}
              </div>
            </section>

            <div className="grid gap-6 grid-cols-1 lg:grid-cols-[1.4fr_0.9fr]">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-sm font-extrabold text-slate-900">Jadwal Mengajar Hari Ini</h3>
                  <CalendarDays className="size-5 text-emerald-600" />
                </div>
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
                  {teachingDays.map((day) => (
                    <div
                      key={day.day}
                      className={`rounded-lg px-2 py-2 text-center ${
                        day.day === 'Selasa'
                          ? 'bg-emerald-100 text-emerald-800'
                          : day.lessons === 0
                            ? 'bg-slate-50 text-slate-400'
                            : 'bg-slate-50 text-slate-600'
                      }`}
                    >
                      <p className="text-[11px] font-bold">{day.day}</p>
                      <p className="mt-0.5 text-[10px]">{day.lessons ? `${day.lessons} JP` : 'Libur'}</p>
                    </div>
                  ))}
                </div>
                <div className="space-y-2 text-xs">
                  {todaySchedule.map((item) => (
                    <div
                      key={item.time}
                      className={`flex flex-col gap-2 rounded-xl border p-3 sm:flex-row sm:items-center sm:justify-between ${
                        item.status === 'Berlangsung'
                          ? 'bg-emerald-50 border-emerald-100'
                          : 'bg-slate-50 border-slate-100'
                      }`}
                    >
                      <div>
                        <span className="font-bold text-slate-800">{item.time}</span>
                        <p className="text-slate-500 font-medium">
                          {item.subject} · Kelas {item.className} - {item.room}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded-lg px-2.5 py-1 text-[10px] font-bold ${
                            item.status === 'Berlangsung'
                              ? 'bg-emerald-600 text-white'
                              : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {item.status}
                        </span>
                        {item.status !== 'Selesai' && (
                          <button
                            type="button"
                            onClick={() => setCurrentView('jurnal')}
                            className="inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1 text-[10px] font-bold text-emerald-700 border border-emerald-200"
                          >
                            <Plus className="size-3" /> Isi Jurnal
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-sm font-extrabold text-slate-900">Absensi Cepat Kelas</h3>
                  <ClipboardCheck className="size-5 text-emerald-600" />
                </div>
                <div className="flex items-center gap-5">
                  <div
                    className="relative flex size-24 shrink-0 items-center justify-center rounded-full"
                    style={{ background: 'conic-gradient(#059669 0 86%, #f59e0b 86% 91%, #e2e8f0 91% 100%)' }}
                  >
                    <div className="flex size-16 flex-col items-center justify-center rounded-full bg-white">
                      <strong className="text-lg text-slate-900">28</strong>
                      <span className="text-[10px] text-slate-500">dari 30</span>
                    </div>
                  </div>
                  <div className="space-y-1.5 text-xs">
                    <p><span className="mr-2 inline-block size-2 rounded-full bg-emerald-500" />Hadir <strong>28</strong></p>
                    <p><span className="mr-2 inline-block size-2 rounded-full bg-amber-400" />Izin <strong>1</strong></p>
                    <p><span className="mr-2 inline-block size-2 rounded-full bg-slate-300" />Sakit <strong>1</strong></p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setCurrentView('absensi')}
                  className="w-full rounded-xl border border-slate-200 bg-white py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  Buka Absensi Santri
                </button>
              </div>
            </div>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">Pengumuman penting</p>
                  <h3 className="mt-1 text-sm font-extrabold text-slate-900">Kalender Pendidikan</h3>
                </div>
                <CalendarDays className="size-5 text-emerald-600" />
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {educationCalendar.map((item) => (
                  <div key={item.title} className="flex gap-3 rounded-xl bg-emerald-50/70 p-3">
                    <div className="flex min-h-12 min-w-12 shrink-0 flex-col items-center justify-center rounded-lg bg-white px-1.5 text-emerald-700 shadow-sm">
                      <strong className="text-[11px] leading-tight">{item.date.split(' ')[0]}</strong>
                      <span className="text-[10px] font-semibold uppercase">{item.date.split(' ')[1]}</span>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">{item.title}</p>
                      <p className="mt-1 text-xs leading-5 text-slate-500">{item.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 p-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">Aktivitas Anda</p>
                  <h3 className="mt-1 text-sm font-extrabold text-slate-900">Riwayat Input Terakhir</h3>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[620px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-5 py-3 font-semibold">Nama / Kelas</th>
                      <th className="px-5 py-3 font-semibold">Aktivitas</th>
                      <th className="px-5 py-3 font-semibold">Modul</th>
                      <th className="px-5 py-3 font-semibold">Waktu</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {recentActivities.map((item) => (
                      <tr key={`${item.student}-${item.time}`} className="hover:bg-emerald-50/40">
                        <td className="px-5 py-4 font-semibold text-slate-800">{item.student}</td>
                        <td className="px-5 py-4 text-slate-600">{item.activity}</td>
                        <td className="px-5 py-4">
                          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                            {item.type}
                          </span>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap text-xs text-slate-500">{item.time}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}

        {/* RENDER HALAMAN TERTIB POINT */}
        {currentView === 'tertib_point' && (
          <div>
            <button
              onClick={() => setCurrentView('dashboard')}
              className="mb-4 inline-flex items-center gap-1.5 rounded-xl bg-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-300 transition"
            >
              <ArrowLeft className="size-4" /> Kembali ke Dashboard
            </button>
            <TertibPoint currentUser={currentUser} />
          </div>
        )}

        {currentView === 'tahfidz_menu' && (
          <div className="mx-auto max-w-2xl space-y-4 pt-4">
            <div className="flex items-center justify-between rounded-2xl bg-[#2563eb] px-6 py-4 text-white shadow-md">
              <button
                onClick={() => setCurrentView('dashboard')}
                className="inline-flex items-center gap-1.5 rounded-xl bg-white/20 px-4 py-2 text-xs font-bold hover:bg-white/30 transition"
              >
                <ArrowLeft className="size-4" /> Kembali
              </button>
              <h2 className="text-base font-black tracking-wide">Menu Tahfidz</h2>
              <div className="w-16" />
            </div>

            <button
              onClick={() => setCurrentView('tahfidz_setoran')}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#059669] py-4 text-sm font-extrabold text-white shadow-md hover:bg-[#047857] transition"
            >
              <Edit3 className="size-5" /> Setoran Baru
            </button>

            <button
              onClick={() => setCurrentView('tahfidz_rekap')}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#0284c7] py-4 text-sm font-extrabold text-white shadow-md hover:bg-[#0369a1] transition"
            >
              <BarChart2 className="size-5" /> Rekap Laporan
            </button>

            <button
              onClick={() => setCurrentView('tahfidz_cetak')}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#eab308] py-4 text-sm font-extrabold text-white shadow-md hover:bg-[#ca8a04] transition"
            >
              <Printer className="size-5" /> Cetak Kartu
            </button>

            <button
              onClick={() => setCurrentView('tahfidz_rapor')}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#2563eb] py-4 text-sm font-extrabold text-white shadow-md hover:bg-[#1d4ed8] transition"
            >
              <FileCheck className="size-5" /> Input Rapor
            </button>
          </div>
        )}

        {currentView === 'tahfidz_setoran' && (
          <TahfidzForm onBack={() => setCurrentView('tahfidz_menu')} currentUser={currentUser} />
        )}

        {currentView === 'tahfidz_rekap' && (
          <TahfidzRekap onBack={() => setCurrentView('tahfidz_menu')} currentUser={currentUser} />
        )}

        {(currentView === 'tahfidz_cetak' || currentView === 'tahfidz_rapor') && (
          <PlaceholderModule
            title={currentView === 'tahfidz_cetak' ? 'Cetak Kartu Hafalan' : 'Input Rapor Tahfidz'}
            description={
              currentView === 'tahfidz_cetak'
                ? 'Fitur cetak kartu hafalan akan dihubungkan pada tahap berikutnya.'
                : 'Fitur input rapor berkala HQ akan dihubungkan pada tahap berikutnya.'
            }
            onBack={() => setCurrentView('tahfidz_menu')}
            backLabel="Kembali ke Menu Tahfidz"
          />
        )}

        {currentView === 'jurnal' && (
          <JurnalPembelajaran onBack={() => setCurrentView('dashboard')} currentUser={currentUser} />
        )}

        {currentView === 'absensi' && (
          <AbsensiRekap onBack={() => setCurrentView('dashboard')} currentUser={currentUser} />
        )}

        {currentView === 'pengumuman' && (
          <PlaceholderModule
            title="Pengumuman Penting"
            description="Kalender pendidikan tahun pelajaran 2026/2027."
            onBack={() => setCurrentView('dashboard')}
          >
            <div className="space-y-3">
              {educationCalendar.map((item) => (
                <div key={item.title} className="flex gap-3 rounded-xl border border-emerald-100 bg-emerald-50/70 p-3">
                  <div className="flex min-h-12 min-w-12 shrink-0 flex-col items-center justify-center rounded-lg bg-white px-1.5 text-emerald-700 shadow-sm">
                    <strong className="text-[11px] leading-tight">{item.date.split(' ')[0]}</strong>
                    <span className="text-[10px] font-semibold uppercase">{item.date.split(' ')[1]}</span>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">{item.title}</p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">{item.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </PlaceholderModule>
        )}

        {currentView === 'qiroah_menu' && (
          <div className="mx-auto max-w-2xl space-y-4 pt-4">
            <div className="flex items-center justify-between rounded-2xl bg-[#0284c7] px-6 py-4 text-white shadow-md">
              <button
                onClick={() => setCurrentView('dashboard')}
                className="inline-flex items-center gap-1.5 rounded-xl bg-white/20 px-4 py-2 text-xs font-bold hover:bg-white/30 transition"
              >
                <ArrowLeft className="size-4" /> Kembali
              </button>
              <h2 className="text-base font-black tracking-wide">Menu Qiroah</h2>
              <div className="w-16" />
            </div>

            <button
              onClick={() => setCurrentView('qiroah_setoran')}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#059669] py-4 text-sm font-extrabold text-white shadow-md hover:bg-[#047857] transition"
            >
              <Edit3 className="size-5" /> Setoran Qiroah
            </button>

            <button
              onClick={() => setCurrentView('qiroah_rekap')}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#0284c7] py-4 text-sm font-extrabold text-white shadow-md hover:bg-[#0369a1] transition"
            >
              <BarChart2 className="size-5" /> Laporan Perkembangan
            </button>

            <button
              onClick={() => setCurrentView('qiroah_penilaian')}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#eab308] py-4 text-sm font-extrabold text-white shadow-md hover:bg-[#ca8a04] transition"
            >
              <ClipboardList className="size-5" /> Penilaian Tugas Rumah
            </button>

            {canPenguji && (
              <button
                onClick={() => setCurrentView('qiroah_penguji')}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#1b4332] py-4 text-sm font-extrabold text-white shadow-md hover:bg-[#16382a] transition"
              >
                <FileCheck className="size-5" /> Menu Penguji
              </button>
            )}
          </div>
        )}

        {currentView === 'qiroah_setoran' && (
          <QiroahForm onBack={() => setCurrentView('qiroah_menu')} currentUser={currentUser} />
        )}

        {currentView === 'qiroah_rekap' && (
          <QiroahRekap onBack={() => setCurrentView('qiroah_menu')} currentUser={currentUser} />
        )}

        {currentView === 'qiroah_penilaian' && (
          <QiroahPenilaian onBack={() => setCurrentView('qiroah_menu')} currentUser={currentUser} />
        )}

        {currentView === 'qiroah_penguji' && (
          <QiroahPenguji onBack={() => setCurrentView('qiroah_menu')} currentUser={currentUser} />
        )}
      </main>
    </div>
  )
}

function PlaceholderModule({
  title,
  description,
  onBack,
  backLabel = 'Kembali ke Dashboard',
  children,
}: {
  title: string
  description: string
  onBack: () => void
  backLabel?: string
  children?: ReactNode
}) {
  return (
    <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <button
        type="button"
        onClick={onBack}
        className="mb-4 inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-bold text-white hover:bg-amber-600"
      >
        <ArrowLeft className="size-4" /> {backLabel}
      </button>
      <h2 className="text-xl font-extrabold text-slate-900 mb-2">{title}</h2>
      <p className="text-sm text-slate-500 mb-4">{description}</p>
      {children}
    </div>
  )
}