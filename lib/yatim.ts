import { supabase } from '@/lib/supabase'

const UMUR_CACHE = 5 * 60 * 1000
const KOLOM_PENANDA = ['is_yatim', 'yatim', 'status_yatim'] as const

let cacheKunci: { waktu: number; kunci: Set<string> } | null = null

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
  while (true) {
    const { data, error } = await supabase
      .from('siswa')
      .select(`nis, id_siswa, ${kolom}`)
      .range(from, from + pageSize - 1)
    if (error) return { error: error.message, baris, kolom }
    const halaman = (data || []) as Record<string, unknown>[]
    baris.push(...halaman)
    if (halaman.length < pageSize) break
    from += pageSize
  }
  return { error: '', baris, kolom }
}

export async function muatKunciYatim() {
  const sekarang = Date.now()
  if (cacheKunci && sekarang - cacheKunci.waktu < UMUR_CACHE) return cacheKunci.kunci

  const kunci = new Set<string>()
  for (const kolom of KOLOM_PENANDA) {
    const hasil = await unduhPenanda(kolom)
    if (hasil.error) {
      if (kolomHilang(hasil.error, kolom)) continue
      console.error('Gagal membaca status yatim:', hasil.error)
      break
    }
    for (const row of hasil.baris) {
      if (!bacaYatim(row[kolom])) continue
      for (const identitas of [row.nis, row.id_siswa]) {
        const angka = angkaIdentitas(identitas)
        if (angka.length >= 3) kunci.add(angka)
      }
    }
    cacheKunci = { waktu: sekarang, kunci }
    return kunci
  }

  cacheKunci = { waktu: sekarang, kunci }
  return kunci
}
