import { History } from 'lucide-react'
import { hafalanHistory } from '@/lib/dashboard-data'
import { cn } from '@/lib/utils'
import { DashboardCard } from './dashboard-card'

const statusStyle: Record<string, string> = {
  Lancar: 'bg-success/12 text-success-foreground',
  Cukup: 'bg-gold/20 text-gold-foreground',
  'Perlu Mengulang': 'bg-destructive/10 text-destructive',
}

export function HafalanHistoryTable({ className }: { className?: string }) {
  return (
    <DashboardCard
      title="Riwayat Setoran Hafalan"
      subtitle="5 setoran terbaru"
      icon={History}
      className={className}
      action={
        <a href="#" className="text-xs font-semibold text-primary hover:underline">
          Lihat semua
        </a>
      }
    >
      <div className="-mx-5 overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead>
            <tr className="border-y bg-muted/60 text-xs text-muted-foreground">
              <th scope="col" className="px-5 py-2.5 font-medium">Tanggal</th>
              <th scope="col" className="px-3 py-2.5 font-medium">Surah</th>
              <th scope="col" className="px-3 py-2.5 font-medium">Ayat</th>
              <th scope="col" className="px-3 py-2.5 font-medium">Jenis</th>
              <th scope="col" className="px-3 py-2.5 font-medium">Nilai</th>
              <th scope="col" className="px-5 py-2.5 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {hafalanHistory.map((row) => (
              <tr key={`${row.date}-${row.ayat}`} className="transition-colors hover:bg-muted/40">
                <td className="whitespace-nowrap px-5 py-3 text-muted-foreground">{row.date}</td>
                <td className="whitespace-nowrap px-3 py-3 font-semibold text-foreground">{row.surah}</td>
                <td className="whitespace-nowrap px-3 py-3 tabular-nums text-foreground">{row.ayat}</td>
                <td className="px-3 py-3">
                  <span className="rounded-md border px-2 py-0.5 text-xs text-muted-foreground">{row.type}</span>
                </td>
                <td className="px-3 py-3 font-semibold tabular-nums text-foreground">{row.score}</td>
                <td className="px-5 py-3">
                  <span
                    className={cn(
                      'whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold',
                      statusStyle[row.status],
                    )}
                  >
                    {row.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DashboardCard>
  )
}
