import { daftarTampilanRiwayatHq, type KirimRaporHq } from '@/lib/rapor-hq-kirim'

export function RiwayatWaktuPemeriksaanHq({
  baris,
}: {
  baris: Pick<KirimRaporHq, 'diajukanPada' | 'dikirimPada' | 'diperiksaPada' | 'riwayatWaktu'>
}) {
  const daftar = daftarTampilanRiwayatHq(baris)
  if (daftar.length === 0) return null
  return (
    <ol className="mt-1.5 space-y-0.5 border-l border-slate-300 pl-2 text-[10px] leading-tight text-slate-600">
      {daftar.map((item, indeks) => (
        <li key={`${item.jenis}-${item.pada}-${indeks}`}>
          <span className="font-bold text-slate-700">{item.label}</span>
          <span className="text-slate-400"> · </span>
          <time dateTime={item.pada}>{item.waktu}</time>
        </li>
      ))}
    </ol>
  )
}
