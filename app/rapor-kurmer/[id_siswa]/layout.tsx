import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Cetak Rapor Kurmer',
  description: 'Lembar rapor Kurikulum Merdeka · kertas F4 satu halaman.',
}

export default function LayoutCetakRaporKurmer({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-white text-slate-900 print:min-h-0">{children}</div>
}
