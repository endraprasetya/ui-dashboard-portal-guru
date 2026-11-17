import { supabase } from '@/lib/supabase'

const UMUR_CACHE = 5 * 60 * 1000
const KOLOM_PENANDA = ['is_yatim', 'yatim', 'status_yatim'] as const

type EntriYatim = { angka: string; unit: string }

let cacheKunci: { waktu: number; entri: EntriYatim[] } | null = null

function namaUnit(nilai: unknown) {
  const k = String(nilai ?? '')
    .trim()
    .toLowerCase()
    .replace(/^unit\s+/, '')
  if (!k || k.includes('semua')) return ''
  if (k.includes('kartasura')) return 'kartasura'
  if (k.includes('cepogo')) return 'cepogo'
  if (k.includes('nogosari')) return 'nogosari'
  return k
}

export function bacaYatim(nilai: unknown) {
  if (nilai === true || nilai === 1) return true
  if (typeof nilai === 'number') return nilai === 1
  const teks = String(nilai ?? '').trim().toLowerCase()
  return teks === 'true' || teks === '1' || teks === 'ya' || teks === 'y' || teks === 'yatim'
}

function angkaIdentitas(nilai: unknown) {
  return String(nilai ?? '').replace(/\D/g, '')
}

function kolomHilang(pesan: string, kolom: string) {
  const teks = pesan.toLowerCase()
  return teks.includes(kolom.toLowerCase()) && /column|schema cache|does not exist|tidak ada/.test(teks)
}

export function nisTermasukYatim(kunci: Set<string>, nis: string) {
  const sasaran = angkaIdentitas(nis)
  if (sasaran.length < 3 || kunci.size === 0) return false
  for (const kandidat of kunci) {
    if (kandidat.length < 3) continue
    if (kandidat === sasaran || sasaran.endsWith(kandidat) || kandidat.endsWith(sasaran)) return true
  }
  return false
}

async function unduhPenanda(kolom: (typeof KOLOM_PENANDA)[number]) {
  const pageSize = 1000
  const baris: Record<string, unknown>[] = []
  let from = 0
  let denganUnit = true
  while (true) {
    const pilih = denganUnit ? `nis, id_siswa, unit, ${kolom}` : `nis, id_siswa, ${kolom}`
    const { data, error } = await supabase.from('siswa').select(pilih).range(from, from + pageSize - 1)
    if (error) {
      if (denganUnit && kolomHilang(error.message, 'unit')) {
        denganUnit = false
        from = 0
        baris.length = 0
        continue
      }
      return { error: error.message, baris, kolom }
    }
    const halaman = (data || []) as unknown as Record<string, unknown>[]
    baris.push(...halaman)
    if (halaman.length < pageSize) break
    from += pageSize
  }
  return { error: '', baris, kolom }
}

function kumpulkanYatim(baris: Record<string, unknown>[], kolom: string): EntriYatim[] {
  const entri: EntriYatim[] = []
  for (const row of baris) {
    if (!bacaYatim(row[kolom])) continue
    const unit = namaUnit(row.unit)
    for (const identitas of [row.nis, row.id_siswa]) {
      const angka = angkaIdentitas(identitas)
      if (angka.length >= 3) entri.push({ angka, unit })
    }
  }
  return entri
}

function saringKunciYatim(entri: EntriYatim[], unit?: string) {
  const sasaran = unit == null ? '' : namaUnit(unit)
  if (unit != null && !sasaran) return new Set<string>()
  const kunci = new Set<string>()
  for (const item of entri) {
    if (sasaran && item.unit !== sasaran) continue
    kunci.add(item.angka)
  }
  return kunci
}

export async function muatKunciYatim(unit?: string) {
  const sekarang = Date.now()
  if (cacheKunci && sekarang - cacheKunci.waktu < UMUR_CACHE) return saringKunciYatim(cacheKunci.entri, unit)

  for (const kolom of KOLOM_PENANDA) {
    const hasil = await unduhPenanda(kolom)
    if (hasil.error) {
      if (kolomHilang(hasil.error, kolom)) continue
      console.error('Gagal membaca status yatim:', hasil.error)
      break
    }
    const entri = kumpulkanYatim(hasil.baris, kolom)
    cacheKunci = { waktu: sekarang, entri }
    return saringKunciYatim(entri, unit)
  }

  cacheKunci = { waktu: sekarang, entri: [] }
  return new Set<string>()
}
