'use client'

import { Camera, CalendarClock, ImageIcon, Users } from 'lucide-react'
import { GALERI_FOTO_EKSKUL, KEGIATAN_EKSKUL } from '@/lib/portal-wali-data'

export function EkskulWali() {
  return (
    <div className="mx-auto max-w-lg space-y-4 pb-8">
      <header className="rounded-2xl bg-sky-800 px-4 py-5 text-center text-white shadow-md">
        <p className="text-[10px] font-bold uppercase tracking-widest text-sky-200">Kegiatan di luar kelas</p>
        <h1 className="mt-1 text-lg font-black">Ekstrakurikuler</h1>
        <p className="mt-1 text-xs text-sky-100">
          Jadwal masih dinamis mengikuti kalender sekolah. Dokumentasi foto dapat dilihat di galeri di bawah.
        </p>
      </header>

      <section className="space-y-2">
        <h2 className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
          <CalendarClock className="size-4 text-sky-700" /> Daftar kegiatan
        </h2>
        {KEGIATAN_EKSKUL.map((item) => (
          <article key={item.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-sm font-extrabold text-slate-900">{item.nama}</h3>
              <span className="shrink-0 rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-bold uppercase text-sky-800">
                Dinamis
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-600">{item.keterangan}</p>
            <p className="mt-2 text-[11px] text-slate-500">
              <span className="font-semibold">Jadwal:</span> {item.jadwal}
            </p>
            <p className="text-[11px] text-slate-500">
              <span className="font-semibold">Pembina:</span> {item.pembina}
            </p>
          </article>
        ))}
      </section>

      <section className="space-y-2">
        <h2 className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
          <Camera className="size-4 text-emerald-700" /> Galeri foto kegiatan
        </h2>
        <p className="text-xs text-slate-500">
          Dokumentasi ekstrakurikuler akan tampil di sini agar wali murid dapat melihat langsung kegiatan ananda.
        </p>

        {GALERI_FOTO_EKSKUL.length > 0 ? (
          <div className="grid grid-cols-2 gap-2">
            {GALERI_FOTO_EKSKUL.map((foto) => (
              <figure key={foto.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                {foto.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={foto.url} alt={foto.judul} className="h-28 w-full object-cover" />
                ) : (
                  <div className="flex h-28 items-center justify-center bg-slate-100">
                    <ImageIcon className="size-8 text-slate-300" />
                  </div>
                )}
                <figcaption className="p-2">
                  <p className="text-[11px] font-bold text-slate-800">{foto.judul}</p>
                  <p className="text-[10px] text-slate-500">{foto.kegiatan}</p>
                </figcaption>
              </figure>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {[1, 2, 3, 4].map((slot) => (
              <div
                key={slot}
                className="flex h-28 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-slate-400"
              >
                <ImageIcon className="size-7" />
                <p className="mt-1 text-[10px] font-semibold">Slot foto {slot}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      <p className="flex items-start gap-2 rounded-xl bg-slate-50 px-3 py-2 text-[11px] leading-relaxed text-slate-500">
        <Users className="mt-0.5 size-3.5 shrink-0" />
        Struktur halaman ini sudah siap menampilkan jadwal resmi dan foto kegiatan begitu data diunggah sekolah.
      </p>
    </div>
  )
}
