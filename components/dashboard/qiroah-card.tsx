import { BookOpen, Quote } from 'lucide-react'
import { qiroah } from '@/lib/dashboard-data'
import { DashboardCard } from './dashboard-card'

export function QiroahCard() {
  const pageProgress = Math.round((qiroah.halaman / qiroah.totalHalaman) * 100)

  return (
    <DashboardCard title="Qiroah" subtitle={`Metode ${qiroah.method}`} icon={BookOpen}>
      <dl className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-muted p-4">
          <dt className="text-xs text-muted-foreground">Jilid</dt>
          <dd className="mt-0.5 text-2xl font-bold text-foreground">
            {qiroah.jilid}
            <span className="text-sm font-medium text-muted-foreground"> / {qiroah.totalJilid}</span>
          </dd>
          <div className="mt-2 flex gap-1" aria-hidden="true">
            {Array.from({ length: qiroah.totalJilid }).map((_, i) => (
              <span
                key={i}
                className={`h-1.5 flex-1 rounded-full ${i < qiroah.jilid ? 'bg-primary' : 'bg-border'}`}
              />
            ))}
          </div>
        </div>
        <div className="rounded-xl bg-muted p-4">
          <dt className="text-xs text-muted-foreground">Halaman</dt>
          <dd className="mt-0.5 text-2xl font-bold text-foreground">
            {qiroah.halaman}
            <span className="text-sm font-medium text-muted-foreground"> / {qiroah.totalHalaman}</span>
          </dd>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-border" aria-hidden="true">
            <div className="h-full rounded-full bg-gold" style={{ width: `${pageProgress}%` }} />
          </div>
        </div>
      </dl>

      <figure className="mt-4 flex-1 rounded-xl border border-dashed border-gold/60 bg-gold/8 p-4">
        <Quote className="mb-2 size-4 text-gold-foreground" aria-hidden="true" />
        <blockquote className="text-pretty text-sm leading-relaxed text-foreground">{qiroah.note}</blockquote>
        <figcaption className="mt-3 text-xs font-medium text-muted-foreground">— {qiroah.ustadz}</figcaption>
      </figure>
    </DashboardCard>
  )
}
