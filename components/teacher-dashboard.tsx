'use client'



import { useState } from 'react'

import {

  ArrowLeft,

  ArrowRight,

  Bell,

  BookOpen,

  CalendarDays,

  CheckCircle2,

  ClipboardCheck,

  ClipboardList,

  FileText,

  Menu,

  PenLine,

  Plus,

  Printer,

  X,

  FileSpreadsheet,

  BarChart3,

  Edit3,

} from 'lucide-react'

import { educationCalendar, recentActivities, teacher, teacherTodos, teachingDays, todaySchedule } from '@/lib/teacher-data'

import { TahfidzForm } from '@/components/tahfidz-form'

import { TahfidzRekap } from '@/components/tahfidz-rekap'

import TertibPoint from "./tertib-point";



const navItems = ['Dashboard', 'Tahfidzul Qur’an', 'Qiroatul Qur’an', 'Jurnal Pembelajaran', 'Absensi', 'Pengumuman']



const actionCards = [

  { title: "Tahfidzul Qur'an", description: 'Kelola setoran, hafalan, dan kenaikan hafalan santri', icon: PenLine, className: 'bg-emerald-600 text-white shadow-emerald-200', moduleKey: 'Tahfidzul Qur’an' },

  { title: "Qiroatul Qur'an", description: 'Input bacaan, jilid, dan kenaikan jilid santri', icon: BookOpen, className: 'bg-sky-500 text-white shadow-sky-200', moduleKey: 'Qiroatul Qur’an' },

  { title: 'Jurnal Pembelajaran', description: 'Catat materi, kegiatan, dan evaluasi pembelajaran', icon: FileText, className: 'bg-amber-400 text-amber-950 shadow-amber-100', moduleKey: 'Jurnal Pembelajaran' },

  { title: 'Absensi', description: 'Kelola kehadiran santri setiap hari', icon: ClipboardCheck, className: 'bg-slate-700 text-white shadow-slate-200', moduleKey: 'Absensi' },

]



export function TeacherDashboard() {

  const [menuOpen, setMenuOpen] = useState(false)

  const [activeNav, setActiveNav] = useState('Dashboard')

  // Sub-view khusus untuk Tahfidz: 'menu' | 'setoran' | 'rekap' | 'cetak' | 'rapor'

  const [tahfidzSubView, setTahfidzSubView] = useState<'menu' | 'setoran' | 'rekap' | 'cetak' | 'rapor'>('menu')

  const [completedTodos, setCompletedTodos] = useState<string[]>([])



  // Handler pindah navigasi utama

  const handleNavClick = (item: string) => {

    setActiveNav(item)

    if (item === 'Tahfidzul Qur’an') {

      setTahfidzSubView('menu') // Kembali ke tampilan 4 tombol utama Tahfidz

    }

  }



  return (

    <div className="min-h-screen bg-[#f5f8f6] text-slate-800">

      <header className="border-b border-emerald-950/10 bg-white">

        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">

          <div className="flex items-center gap-3">

            <div className="flex size-11 items-center justify-center rounded-2xl bg-emerald-700 text-white shadow-sm"><BookOpen className="size-6" /></div>

            <div><p className="text-sm font-extrabold tracking-tight text-emerald-900">Portal Guru</p><p className="text-xs text-slate-500">{teacher.school}</p></div>

          </div>

          <div className="hidden items-center gap-5 md:flex"><div className="text-right"><p className="text-sm font-semibold text-slate-800">Ahlan wa Sahlan, {teacher.name}</p><p className="text-xs text-slate-500">Semoga hari ini penuh keberkahan.</p></div><div className="flex size-10 items-center justify-center rounded-full bg-amber-100 text-sm font-bold text-amber-800">{teacher.initials}</div><button className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:border-emerald-300 hover:text-emerald-700">Keluar</button></div>

          <button type="button" className="rounded-lg p-2 text-slate-600 md:hidden" onClick={() => setMenuOpen(!menuOpen)} aria-label="Buka menu">{menuOpen ? <X /> : <Menu />}</button>

        </div>

        {menuOpen && <div className="border-t border-slate-100 px-4 py-3 md:hidden"><p className="mb-3 text-sm font-semibold">Ahlan wa Sahlan, {teacher.name}</p><button className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold">Keluar</button></div>}

      </header>



      {/* Navigasi Atas */}

      <nav className="border-b border-slate-200 bg-white" aria-label="Navigasi modul">

        <div className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 sm:px-6 lg:px-8">

          {navItems.map((item) => (

            <button

              key={item}

              onClick={() => handleNavClick(item)}

              className={`whitespace-nowrap border-b-2 px-3 py-3 text-sm font-medium transition ${activeNav === item ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500 hover:text-emerald-700'}`}

            >

              {item}

            </button>

          ))}

        </div>

      </nav>



      <main className="mx-auto max-w-7xl space-y-6 px-4 py-7 sm:px-6 lg:px-8 lg:py-9">

        {/* ========================================================= */}

        {/* MODUL TAHFIDZUL QUR'AN                                    */}

        {/* ========================================================= */}

        {activeNav === 'Tahfidzul Qur’an' ? (

          <div>

            {/* SUB-VIEW 1: MENU UTAMA TAHFIDZ (4 TOMBOL SEPERTI GAMBAR 888) */}

            {tahfidzSubView === 'menu' && (

              <div className="mx-auto max-w-3xl space-y-4">

                <div className="flex items-center justify-between bg-blue-600 px-4 py-3 text-white rounded-xl shadow">

                  <button

                    onClick={() => setActiveNav('Dashboard')}

                    className="inline-flex items-center gap-1 text-xs font-bold bg-white/20 px-3 py-1.5 rounded-lg hover:bg-white/30"

                  >

                    <ArrowLeft className="size-4" /> Kembali

                  </button>

                  <h1 className="text-base font-extrabold tracking-wide">Menu Tahfidz</h1>

                </div>



                <div className="grid gap-3 pt-2">

                  <button

                    onClick={() => setTahfidzSubView('setoran')}

                    className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 p-4 text-base font-bold text-white shadow-md transition hover:bg-emerald-700 hover:shadow-lg"

                  >

                    <Edit3 className="size-5" /> Setoran Baru

                  </button>



                  <button

                    onClick={() => setTahfidzSubView('rekap')}

                    className="flex items-center justify-center gap-2 rounded-xl bg-sky-500 p-4 text-base font-bold text-white shadow-md transition hover:bg-sky-600 hover:shadow-lg"

                  >

                    <BarChart3 className="size-5" /> Rekap Laporan

                  </button>



                  <button

                    onClick={() => setTahfidzSubView('cetak')}

                    className="flex items-center justify-center gap-2 rounded-xl bg-amber-400 p-4 text-base font-bold text-amber-950 shadow-md transition hover:bg-amber-500 hover:shadow-lg"

                  >

                    <Printer className="size-5" /> Cetak Kartu

                  </button>



                  <button

                    onClick={() => setTahfidzSubView('rapor')}

                    className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 p-4 text-base font-bold text-white shadow-md transition hover:bg-blue-700 hover:shadow-lg"

                  >

                    <FileSpreadsheet className="size-5" /> Input Rapor

                  </button>

                </div>

              </div>

            )}



            {/* SUB-VIEW 2: FORM INPUT SETORAN BARU */}

            {tahfidzSubView === 'setoran' && (

              <TahfidzForm onBack={() => setTahfidzSubView('menu')} currentUser={teacher} />

            )}



            {/* SUB-VIEW 3: REKAP LAPORAN */}

{tahfidzSubView === 'rekap' && (

  <TahfidzRekap onBack={() => setTahfidzSubView('menu')} currentUser={teacher} />

)}



            {/* SUB-VIEW 4: CETAK KARTU */}

            {tahfidzSubView === 'cetak' && (

              <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

                <button

                  onClick={() => setTahfidzSubView('menu')}

                  className="mb-4 inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-bold text-white hover:bg-amber-600"

                >

                  <ArrowLeft className="size-4" /> Kembali ke Menu Tahfidz

                </button>

                <h2 className="text-xl font-extrabold text-slate-900 mb-2">Cetak Kartu Hafalan</h2>

                <p className="text-sm text-slate-500">Fitur cetak kartu akan dihubungkan di tahap selanjutnya.</p>

              </div>

            )}



            {/* SUB-VIEW 5: INPUT RAPOR */}

            {tahfidzSubView === 'rapor' && (

              <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

                <button

                  onClick={() => setTahfidzSubView('menu')}

                  className="mb-4 inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-bold text-white hover:bg-amber-600"

                >

                  <ArrowLeft className="size-4" /> Kembali ke Menu Tahfidz

                </button>

                <h2 className="text-xl font-extrabold text-slate-900 mb-2">Penilaian Rapor Berkala HQ</h2>

                <p className="text-sm text-slate-500">Fitur penarikan draf nilai rapor otomatis akan dihubungkan di tahap selanjutnya.</p>

              </div>

            )}

          </div>

        ) : (

          /* ========================================================= */

          /* DASHBOARD DUMMY UTAMA GURU                                */

          /* ========================================================= */

          <>

            <section className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><p className="mb-2 text-sm font-semibold text-emerald-700">Selasa, 13 Oktober 2026</p><h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">Dashboard Guru</h1><p className="mt-1 text-sm text-slate-500">Kelola kegiatan belajar dan perkembangan santri dengan mudah.</p></div><button className="inline-flex w-fit items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800"><Bell className="size-4" />3 notifikasi</button></section>



            {/* Kartu Menu Utama */}

            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Menu utama">

              {actionCards.map(({ title, description, icon: Icon, className, moduleKey }) => (

                <button

                  key={title}

                  onClick={() => handleNavClick(moduleKey)}

                  className={`group rounded-2xl p-5 text-left shadow-lg transition hover:-translate-y-1 hover:shadow-xl ${className}`}

                >

                  <div className="mb-7 flex items-start justify-between">

                    <span className="flex size-11 items-center justify-center rounded-xl bg-white/20"><Icon className="size-5" /></span>

                    <ArrowRight className="size-5 opacity-70 transition group-hover:translate-x-1" />

                  </div>

                  <h2 className="font-bold">{title}</h2>

                  <p className="mt-1 text-xs leading-5 opacity-80">{description}</p>

                </button>

              ))}

            </section>



            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">

              <div className="mb-5 flex items-center justify-between">

                <div><p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">Prioritas hari ini</p><h2 className="mt-1 text-lg font-bold text-slate-900">To Do List Guru</h2></div>

                <ClipboardList className="size-5 text-emerald-600" />

              </div>

              <div className="grid gap-3 md:grid-cols-3">

                {teacherTodos.map((todo) => {

                  const completed = completedTodos.includes(todo.id)

                  return <button key={todo.id} type="button" onClick={() => setCompletedTodos((current) => completed ? current.filter((id) => id !== todo.id) : [...current, todo.id])} className={`flex items-start gap-3 rounded-xl border p-3 text-left transition ${completed ? 'border-emerald-200 bg-emerald-50/70' : 'border-slate-100 bg-slate-50/60 hover:border-emerald-200 hover:bg-emerald-50/50'}`}><span className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border ${completed ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300 bg-white text-transparent'}`}><CheckCircle2 className="size-4" /></span><span><span className={`block text-sm font-bold ${completed ? 'text-emerald-800 line-through' : 'text-slate-800'}`}>{todo.title}</span><span className="mt-1 block text-xs leading-5 text-slate-500">{todo.detail}</span></span></button>

                })}

              </div>

            </section>



            <div className="grid gap-6 lg:grid-cols-[1.4fr_0.9fr]">

              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div className="mb-5 flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">Jadwal mengajar</p><h2 className="mt-1 text-lg font-bold text-slate-900">Jadwal Mengajar Hari Ini</h2></div><CalendarDays className="size-5 text-emerald-600" /></div><div className="mb-5 grid grid-cols-4 gap-2 sm:grid-cols-7">{teachingDays.map((day) => <div key={day.day} className={`rounded-lg px-2 py-2 text-center ${day.day === 'Senin' ? 'bg-emerald-100 text-emerald-800' : day.lessons === 0 ? 'bg-slate-50 text-slate-400' : 'bg-slate-50 text-slate-600'}`}><p className="text-[11px] font-bold">{day.day}</p><p className="mt-0.5 text-[10px]">{day.lessons ? `${day.lessons} JP` : 'Libur'}</p></div>)}</div><div className="space-y-3">{todaySchedule.map((item) => <div key={item.time} className="flex flex-col gap-3 rounded-xl border border-slate-100 p-3 sm:flex-row sm:items-center"><div className="w-28 shrink-0 text-sm font-bold text-slate-700">{item.time}</div><div className="flex-1"><p className="text-sm font-semibold text-slate-900">{item.subject}</p><p className="text-xs text-slate-500">Kelas {item.className} · {item.room}</p></div><span className={`w-fit rounded-full px-2.5 py-1 text-[11px] font-bold ${item.status === 'Berlangsung' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{item.status}</span>{item.status !== 'Selesai' && <button className="inline-flex items-center justify-center gap-1 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-100"><Plus className="size-3" /> Isi Jurnal</button>}</div>)}</div></section>

              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div className="mb-5 flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">Hari ini</p><h2 className="mt-1 text-lg font-bold text-slate-900">Absensi Cepat Kelas</h2></div><ClipboardCheck className="size-5 text-emerald-600" /></div><div className="mb-5 flex items-center gap-5"><div className="relative flex size-28 shrink-0 items-center justify-center rounded-full" style={{ background: 'conic-gradient(#059669 0 86%, #f59e0b 86% 91%, #e2e8f0 91% 100%)' }}><div className="flex size-20 flex-col items-center justify-center rounded-full bg-white"><strong className="text-2xl text-slate-900">28</strong><span className="text-[10px] text-slate-500">dari 30</span></div></div><div className="space-y-2 text-sm"><p><span className="mr-2 inline-block size-2 rounded-full bg-emerald-500" />Hadir <strong>28</strong></p><p><span className="mr-2 inline-block size-2 rounded-full bg-amber-400" />Izin <strong>1</strong></p><p><span className="mr-2 inline-block size-2 rounded-full bg-slate-300" />Sakit <strong>1</strong></p></div></div><button className="w-full rounded-lg border border-emerald-200 py-2.5 text-sm font-bold text-emerald-700 hover:bg-emerald-50">Buka Absensi Santri</button></section>

            </div>



            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div className="mb-5 flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">Pengumuman sekolah</p><h2 className="mt-1 text-lg font-bold text-slate-900">Kalender Pendidikan</h2></div><CalendarDays className="size-5 text-emerald-600" /></div><div className="grid gap-3 md:grid-cols-3">{educationCalendar.map((item) => <div key={item.date} className="flex gap-3 rounded-xl bg-emerald-50/70 p-3"><div className="flex size-12 shrink-0 flex-col items-center justify-center rounded-lg bg-white text-emerald-700 shadow-sm"><strong className="text-sm">{item.date.split(' ')[0]}</strong><span className="text-[10px] font-semibold uppercase">{item.date.split(' ')[1]}</span></div><div><p className="text-sm font-bold text-slate-800">{item.title}</p><p className="mt-1 text-xs leading-5 text-slate-500">{item.detail}</p></div></div>)}</div></section>



            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="flex items-center justify-between border-b border-slate-100 p-5 sm:p-6"><div><p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">Aktivitas Anda</p><h2 className="mt-1 text-lg font-bold text-slate-900">Riwayat Input Terakhir</h2></div><button className="inline-flex items-center gap-1 text-sm font-bold text-emerald-700 hover:text-emerald-900">Lihat semua <ArrowRight className="size-4" /></button></div><div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3 font-semibold">Nama / Kelas</th><th className="px-5 py-3 font-semibold">Aktivitas</th><th className="px-5 py-3 font-semibold">Modul</th><th className="px-5 py-3 font-semibold">Waktu</th></tr></thead><tbody className="divide-y divide-slate-100">{recentActivities.map((item) => <tr key={`${item.student}-${item.time}`} className="hover:bg-emerald-50/40"><td className="px-5 py-4 font-semibold text-slate-800">{item.student}</td><td className="px-5 py-4 text-slate-600">{item.activity}</td><td className="px-5 py-4"><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">{item.type}</span></td><td className="px-5 py-4 whitespace-nowrap text-xs text-slate-500">{item.time}</td></tr>)}</tbody></table></div></section>

          </>

        )}

      </main>



      <footer className="flex items-center justify-between border-t border-slate-200 pt-5 text-xs text-slate-500"><span>© 2026 {teacher.school}</span><span className="hidden sm:inline">Portal Guru · Dibuat untuk memudahkan mengajar</span></footer>

    </div>

  )

}