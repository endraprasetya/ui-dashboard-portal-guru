import { AlertCircle, ArrowUpRight, Wallet, WalletCards } from 'lucide-react'
import { finance, formatRupiah } from '@/lib/dashboard-data'
import { DashboardCard } from './dashboard-card'

export function FinanceCard() {
  return (
    <DashboardCard title="Keuangan & SPP" subtitle="Tagihan dan uang saku santri" icon={WalletCards}>
      <div className="rounded-xl border border-warning/40 bg-warning/10 p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs text-muted-foreground">{finance.billMonth}</p>
            <p className="mt-0.5 text-xl font-bold text-foreground">{formatRupiah(finance.billAmount)}</p>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-warning/25 px-2.5 py-1 text-xs font-semibold text-warning-foreground">
            <AlertCircle className="size-3.5" aria-hidden="true" />
            {finance.billStatus}
          </span>
        </div>
        <p className="mt-2 text-xs text-warning-foreground">Jatuh tempo {finance.dueDate}</p>
        <button
          type="button"
          className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
        >
          Bayar Sekarang
          <ArrowUpRight className="size-4" aria-hidden="true" />
        </button>
      </div>

      <div className="mt-auto flex items-center justify-between gap-3 pt-4">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-gold/20 text-gold-foreground">
            <Wallet className="size-5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-xs text-muted-foreground">Saldo uang saku</p>
            <p className="text-lg font-bold text-foreground">{formatRupiah(finance.pocketBalance)}</p>
          </div>
        </div>
        <p className="text-right text-[11px] leading-tight text-muted-foreground">
          Top up terakhir
          <br />
          <span className="font-medium text-foreground">{finance.lastTopUp}</span>
        </p>
      </div>
    </DashboardCard>
  )
}
