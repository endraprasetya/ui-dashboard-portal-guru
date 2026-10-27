import { Clock, NotebookPen, UserRound } from 'lucide-react'
import { schedule } from '@/lib/dashboard-data'
import { cn } from '@/lib/utils'
import { DashboardCard } from './dashboard-card'

const statusLabel = {
  done: 'Selesai',
  ongoing: 'Berlangsung',
  upcoming: 'Akan datang',
} as const

export function ScheduleCard({ className }: { className?: string }) {
  return (
    <DashboardCard
      title="Jurnal Pembelajaran"
      subtitle="Jadwal belajar hari ini · Senin"
      icon={NotebookPen}
      className={className}
      action={
        <a href="#" className="text-xs font-semibold text-primary hover:underline">
          Lihat minggu ini
        </a>
      }
    >
      <ol className="flex flex-col gap-2">
        {schedule.map((item) => {
          const isOngoing = item.status === 'ongoing'
          return (
            <li
              key={item.time}
              className={cn(
                'flex flex-col gap-2 rounded-xl border p-3 sm:flex-row sm:items-center sm:gap-4',
                isOngoing && 'border-primary/40 bg-secondary',
                item.status === 'done' && 'opacity-70',
              )}
            >
              <span className="flex w-32 shrink-0 items-center gap-1.5 text-xs font-medium tabular-nums text-muted-foreground">
                <Clock className="size-3.5" aria-hidden="true" />
                {item.time}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">{item.subject}</p>
                <p className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                  <UserRound className="size-3.5 shrink-0" aria-hidden="true" />
                  {item.teacher}
                </p>
              </div>
              <span
                className={cn(
                  'inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold',
                  item.status === 'done' && 'bg-muted text-muted-foreground',
                  isOngoing && 'bg-primary text-primary-foreground',
                  item.status === 'upcoming' && 'bg-gold/20 text-gold-foreground',
                )}
              >
                {isOngoing && <span className="size-1.5 animate-pulse rounded-full bg-primary-foreground" />}
                {statusLabel[item.status]}
              </span>
            </li>
          )
        })}
      </ol>
    </DashboardCard>
  )
}
