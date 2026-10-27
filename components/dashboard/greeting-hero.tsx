import { CalendarDays, GraduationCap, Users } from 'lucide-react'
import { student } from '@/lib/dashboard-data'

export function GreetingHero() {
  return (
    <section
      aria-labelledby="greeting-heading"
      className="relative overflow-hidden rounded-3xl bg-primary px-6 py-7 text-primary-foreground sm:px-8 sm:py-8"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0), linear-gradient(45deg, transparent 48%, currentColor 49%, currentColor 51%, transparent 52%)',
          backgroundSize: '22px 22px, 44px 44px',
        }}
      />
      <div className="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p lang="ar" dir="rtl" className="mb-2 text-left font-arabic text-2xl text-gold">
            السَّلَامُ عَلَيْكُمْ
          </p>
          <h1 id="greeting-heading" className="text-balance text-2xl font-bold sm:text-3xl">
            Ahlan wa Sahlan, {student.shortName}
            <span className="font-medium text-primary-foreground/70"> – {student.className}</span>
          </h1>
          <p className="mt-2 max-w-xl text-pretty text-sm leading-relaxed text-primary-foreground/80">
            Semoga Allah senantiasa memudahkan langkah ananda dalam menuntut ilmu. Berikut ringkasan perkembangan
            hari ini.
          </p>
        </div>

        <ul className="flex flex-wrap gap-2 text-xs">
          <li className="flex items-center gap-1.5 rounded-full bg-primary-foreground/10 px-3 py-1.5">
            <GraduationCap className="size-3.5" aria-hidden="true" />
            NIS {student.nis}
          </li>
          <li className="flex items-center gap-1.5 rounded-full bg-primary-foreground/10 px-3 py-1.5">
            <Users className="size-3.5" aria-hidden="true" />
            {student.halaqah}
          </li>
          <li className="flex items-center gap-1.5 rounded-full bg-primary-foreground/10 px-3 py-1.5">
            <CalendarDays className="size-3.5" aria-hidden="true" />
            <time dateTime="2026-10-12">Senin, 12 Okt 2026</time>
          </li>
        </ul>
      </div>
    </section>
  )
}
