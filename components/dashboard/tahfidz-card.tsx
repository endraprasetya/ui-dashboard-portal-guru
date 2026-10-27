import { BookHeart, CheckCircle2 } from 'lucide-react'
import { tahfidz } from '@/lib/dashboard-data'
import { DashboardCard } from './dashboard-card'

export function TahfidzCard() {
  const progress = Math.round((tahfidz.juzCompleted / tahfidz.totalJuzTarget) * 100)

  return (
    <DashboardCard
      title="Capaian Tahfidz"
      subtitle={`Setoran terakhir · ${tahfidz.lastDate}`}
      icon={BookHeart}
      action={
        <span className="inline-flex items-center gap-1 rounded-full bg-success/12 px-2.5 py-1 text-xs font-semibold text-success-foreground">
          <CheckCircle2 className="size-3.5" aria-hidden="true" />
          {tahfidz.status}
        </span>
      }
    >
      <div className="flex items-end justify-between gap-4 rounded-xl bg-muted p-4">
        <div>
          <p className="text-xs text-muted-foreground">Surah terakhir</p>
          <p className="text-xl font-bold text-foreground">{tahfidz.surah}</p>
          <p className="text-xs text-muted-foreground">Ayat {tahfidz.ayat}</p>
        </div>
        <p lang="ar" dir="rtl" className="font-arabic text-3xl leading-none text-primary">
          {tahfidz.surahArabic}
        </p>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl border p-3">
          <dt className="text-xs text-muted-foreground">Juz aktif</dt>
          <dd className="text-lg font-bold text-foreground">Juz {tahfidz.juz}</dd>
        </div>
        <div className="rounded-xl border p-3">
          <dt className="text-xs text-muted-foreground">Total hafalan</dt>
          <dd className="text-lg font-bold text-foreground">{tahfidz.juzCompleted} Juz</dd>
        </div>
      </dl>

      <div className="mt-auto pt-4">
        <div className="mb-1.5 flex justify-between text-xs">
          <span className="text-muted-foreground">Target tahun ini ({tahfidz.totalJuzTarget} Juz)</span>
          <span className="font-semibold text-foreground">{progress}%</span>
        </div>
        <div
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Progres target tahfidz"
          className="h-2 overflow-hidden rounded-full bg-muted"
        >
          <div className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }} />
        </div>
      </div>
    </DashboardCard>
  )
}
