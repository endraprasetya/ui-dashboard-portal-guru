import { MODAL_POIN_BULANAN, type SaldoTertibBulanan } from '@/lib/tertib-saldo'

export function TertibSaldoKartu({
  saldo,
  namaBulan,
  ringkas = false,
}: {
  saldo: SaldoTertibBulanan
  namaBulan: string
  ringkas?: boolean
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <section className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-4 shadow-sm">
        <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-800">Saldo awal poin bulanan</p>
        <p className="mt-1 text-3xl font-black tabular-nums text-emerald-900">{saldo.modal}</p>
        <p className="mt-2 text-xs leading-relaxed text-emerald-900/80">
          Sebagai awal bentuk kepercayaan bahwa anak mampu menaati tata tertib sekolah.
        </p>
        {!ringkas && <p className="mt-2 text-[10px] text-emerald-700/70">Periode: {namaBulan}</p>}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Sisa saldo poin</p>
        <p className="mt-1 text-3xl font-black tabular-nums text-slate-900">{saldo.sisa}</p>
        {saldo.positif > 0 || saldo.negatif > 0 ? (
          <p className="mt-2 text-xs text-slate-600">
            {saldo.modal} + <span className="font-semibold text-emerald-600">{saldo.positif}</span> (kebaikan)
            − <span className="font-semibold text-red-600">{saldo.negatif}</span> (pelanggaran)
          </p>
        ) : (
          <p className="mt-2 text-xs text-slate-600">
            Rumus: {MODAL_POIN_BULANAN} + total kebaikan − total pelanggaran bulan ini.
          </p>
        )}
      </section>
    </div>
  )
}
