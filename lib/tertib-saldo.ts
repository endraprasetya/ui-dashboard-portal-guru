import { SAMBUTAN_TERTIB_WALI } from '@/lib/teks-informasi-tertib'

/** Modal kepercayaan awal per bulan (Portal Wali & Tertib Point). */
export const MODAL_POIN_BULANAN = 200

export type SaldoTertibBulanan = {
  modal: number
  positif: number
  negatif: number
  sisa: number
}

type BarisLog = { sid?: string; month?: string; pts?: number }

export function isPortalWali(user?: { role?: string } | null) {
  return /wali\s*murid|wali murid|portal\s*wali|^wali$/i.test(String(user?.role || '').trim())
}

/** Saldo = modal 200 + total kebaikan − total pelanggaran (bulan aktif). */
export function hitungSaldoTertibBulanan(
  logs: BarisLog[],
  idSiswa: string,
  bulan: string,
  modal = MODAL_POIN_BULANAN,
): SaldoTertibBulanan {
  let positif = 0
  let negatif = 0
  const sid = String(idSiswa)
  for (const row of logs) {
    if (String(row.sid) !== sid || row.month !== bulan) continue
    const pts = Number(row.pts) || 0
    if (pts > 0) positif += pts
    else negatif += Math.abs(pts)
  }
  const sisa = modal + positif - negatif
  return { modal, positif, negatif, sisa }
}

export { SAMBUTAN_TERTIB_WALI }
