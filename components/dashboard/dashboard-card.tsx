import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

type DashboardCardProps = {
  title: string
  subtitle?: string
  icon: LucideIcon
  action?: React.ReactNode
  className?: string
  children: React.ReactNode
}

export function DashboardCard({ title, subtitle, icon: Icon, action, className, children }: DashboardCardProps) {
  return (
    <section
      aria-labelledby={`${title}-heading`.replace(/\s+/g, '-').toLowerCase()}
      className={cn('flex flex-col rounded-2xl border bg-card p-5 shadow-sm', className)}
    >
      <header className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">
            <Icon className="size-5" aria-hidden="true" />
          </span>
          <div>
            <h2
              id={`${title}-heading`.replace(/\s+/g, '-').toLowerCase()}
              className="text-sm font-semibold text-foreground"
            >
              {title}
            </h2>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
        </div>
        {action}
      </header>
      <div className="flex flex-1 flex-col">{children}</div>
    </section>
  )
}
