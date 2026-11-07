import { educationCalendar } from '@/lib/teacher-data'

export function DaftarPengumuman({
  batas,
  ringkas = false,
}: {
  batas?: number
  ringkas?: boolean
}) {
  const daftar = batas ? educationCalendar.slice(0, batas) : educationCalendar

  return (
    <div className={ringkas ? 'space-y-2' : 'grid gap-3 sm:grid-cols-2 lg:grid-cols-3'}>
      {daftar.map((item) => (
        <article
          key={item.title}
          className="flex gap-3 rounded-xl border border-emerald-100 bg-emerald-50/70 p-3"
        >
          <div className="flex min-h-12 min-w-12 shrink-0 flex-col items-center justify-center rounded-lg bg-white px-1.5 text-emerald-700 shadow-sm">
            <strong className="text-[11px] leading-tight">{item.date.split(' ')[0]}</strong>
            <span className="text-[10px] font-semibold uppercase">{item.date.split(' ')[1] || ''}</span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-800">{item.title}</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">{item.detail}</p>
          </div>
        </article>
      ))}
    </div>
  )
}
