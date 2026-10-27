import { ChevronRight, Megaphone } from 'lucide-react'
import { announcements } from '@/lib/dashboard-data'
import { DashboardCard } from './dashboard-card'

export function AnnouncementsCard({ className }: { className?: string }) {
  return (
    <DashboardCard title="Pengumuman Sekolah" subtitle="Informasi terbaru" icon={Megaphone} className={className}>
      <ul className="-mx-2 flex flex-col">
        {announcements.map((item) => {
          const [day, month] = item.date.split(' ')
          return (
            <li key={item.title}>
              <a href="#" className="group flex gap-3 rounded-xl p-2 transition-colors hover:bg-muted">
                <span className="flex size-12 shrink-0 flex-col items-center justify-center rounded-xl bg-secondary text-primary">
                  <span className="text-base font-bold leading-none">{day}</span>
                  <span className="text-[10px] font-medium uppercase">{month}</span>
                </span>
                <div className="min-w-0 flex-1">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-gold-foreground">
                    {item.category}
                  </span>
                  <p className="text-sm font-semibold leading-snug text-foreground">{item.title}</p>
                  <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{item.excerpt}</p>
                </div>
                <ChevronRight
                  className="mt-1 size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </a>
            </li>
          )
        })}
      </ul>
    </DashboardCard>
  )
}
