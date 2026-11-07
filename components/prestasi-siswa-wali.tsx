'use client'

import { Award, BookOpen, Medal, Sparkles } from 'lucide-react'
import { REKAM_PRESTASI_SISWA, type BidangPrestasi, type RekamPrestasi } from '@/lib/portal-wali-data'

function KartuPrestasi({ item }: { item: RekamPrestasi }) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-extrabold text-slate-900">{item.judul}</h3>
        <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-800">
          {item.tingkat || 'Sekolah'}
        </span>
      </div>
      {item.tanggal ? <p className="mt-1 text-[11px] font-semibold text-slate-500">{item.tanggal}</p> : null}
      {item.penyelenggara ? <p className="mt-1 text-xs text-slate-500">{item.penyelenggara}</p> : null}
      {item.keterangan ? <p className="mt-2 text-xs leading-relaxed text-slate-600">{item.keterangan}</p> : null}
    </article>
  )
}

function BagianKosong({ bidang }: { bidang: BidangPrestasi }) {
  const akademik = bidang === 'akademik'
  return (
    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
      {akademik ? (
        <BookOpen className="mx-auto size-8 text-slate-300" />
      ) : (
        <Medal className="mx-auto size-8 text-slate-300" />
      )}
      <p className="mt-3 text-sm font-bold text-slate-700">
        {akademik ? 'Belum ada prestasi akademik' : 'Belum ada prestasi non-akademik'}
      </p>
      <p className="mt-1 text-xs leading-relaxed text-slate-500">
        Rekam jejak {akademik ? 'nilai, olimpiade, dan capaian belajar' : 'lomba, kejuaraan, dan bakat'} ananda akan tampil
        di sini setelah diinput sekolah.
      </p>
    </div>
  )
}

export function PrestasiSiswaWali() {
  const akademik = REKAM_PRESTASI_SISWA.filter((item) => item.bidang === 'akademik')
  const nonAkademik = REKAM_PRESTASI_SISWA.filter((item) => item.bidang === 'non-akademik')

  return (
    <div className="mx-auto max-w-lg space-y-4 pb-8">
      <header className="rounded-2xl bg-amber-600 px-4 py-5 text-center text-white shadow-md">
        <p className="text-[10px] font-bold uppercase tracking-widest text-amber-100">Rekam jejak ananda</p>
        <h1 className="mt-1 inline-flex items-center justify-center gap-2 text-lg font-black">
          <Award className="size-5" /> Prestasi Siswa
        </h1>
        <p className="mt-1 text-xs text-amber-50">
          Capaian akademik dan non-akademik santri selama di SD Islam Terpadu Al Madinah.
        </p>
      </header>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-sky-700" />
          <h2 className="text-sm font-extrabold text-slate-900">Prestasi akademik</h2>
        </div>
        {akademik.length === 0 ? (
          <BagianKosong bidang="akademik" />
        ) : (
          <div className="space-y-2">
            {akademik.map((item) => (
              <KartuPrestasi key={item.id} item={item} />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Medal className="size-4 text-emerald-700" />
          <h2 className="text-sm font-extrabold text-slate-900">Prestasi non-akademik</h2>
        </div>
        {nonAkademik.length === 0 ? (
          <BagianKosong bidang="non-akademik" />
        ) : (
          <div className="space-y-2">
            {nonAkademik.map((item) => (
              <KartuPrestasi key={item.id} item={item} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
