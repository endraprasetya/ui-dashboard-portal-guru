/** Opsi keterangan / tindakan guru saat mencatat Tertib Point (disimpan di kolom `keterangan`). */

export const KETERANGAN_TERTIB_OPSI = [
  'Sudah dinasehati',
  'Sudah diberi peringatan',
  'Tetap mengulangi pelanggaran',
  'Lainnya',
] as const

export type KeteranganTertibOpsi = (typeof KETERANGAN_TERTIB_OPSI)[number]

export const KETERANGAN_TERTIB_LAINNYA: KeteranganTertibOpsi = 'Lainnya'

const OPSI_TANPA_LAINNYA = KETERANGAN_TERTIB_OPSI.filter((o) => o !== KETERANGAN_TERTIB_LAINNYA)

const PEMISAH = ' · '

export function gabungKeteranganTertib(pilihan: readonly string[], lainnya: string): string {
  const bagian: string[] = []
  for (const opsi of OPSI_TANPA_LAINNYA) {
    if (pilihan.includes(opsi)) bagian.push(opsi)
  }
  if (pilihan.includes(KETERANGAN_TERTIB_LAINNYA)) {
    const teks = lainnya.trim()
    bagian.push(teks ? `${KETERANGAN_TERTIB_LAINNYA}: ${teks}` : KETERANGAN_TERTIB_LAINNYA)
  }
  return bagian.join(PEMISAH)
}

export const PESAN_KETERANGAN_WAJIB =
  'Harap pilih minimal satu tindakan / keterangan terlebih dahulu!'

export const PESAN_LAINNYA_WAJIB =
  'Harap isi keterangan pada opsi Lainnya sebelum menyimpan.'

export function validasiKeteranganTertib(pilihan: readonly string[], lainnya: string): string | null {
  if (pilihan.length === 0) return PESAN_KETERANGAN_WAJIB
  if (pilihan.includes(KETERANGAN_TERTIB_LAINNYA) && !lainnya.trim()) {
    return PESAN_LAINNYA_WAJIB
  }
  return null
}

/** Parse nilai tersimpan (termasuk catatan lama berupa teks bebas). */
export function pecahKeteranganTertib(simpan: string): { pilihan: string[]; lainnya: string } {
  const raw = String(simpan || '').trim()
  if (!raw) return { pilihan: [], lainnya: '' }

  const parts = raw.split(PEMISAH).map((s) => s.trim()).filter(Boolean)
  const pilihan: string[] = []
  let lainnya = ''
  let adaLegacy = false

  for (const part of parts) {
    const opsiResmi = OPSI_TANPA_LAINNYA.find((o) => o.toLowerCase() === part.toLowerCase())
    if (opsiResmi) {
      if (!pilihan.includes(opsiResmi)) pilihan.push(opsiResmi)
      continue
    }
    if (part === KETERANGAN_TERTIB_LAINNYA) {
      if (!pilihan.includes(KETERANGAN_TERTIB_LAINNYA)) pilihan.push(KETERANGAN_TERTIB_LAINNYA)
      continue
    }
    if (part.startsWith(`${KETERANGAN_TERTIB_LAINNYA}:`)) {
      if (!pilihan.includes(KETERANGAN_TERTIB_LAINNYA)) pilihan.push(KETERANGAN_TERTIB_LAINNYA)
      lainnya = part.slice(KETERANGAN_TERTIB_LAINNYA.length + 1).trim()
      continue
    }
    adaLegacy = true
    lainnya = part
  }

  if (pilihan.length === 0 || (adaLegacy && !pilihan.includes(KETERANGAN_TERTIB_LAINNYA))) {
    if (!pilihan.includes(KETERANGAN_TERTIB_LAINNYA)) pilihan.push(KETERANGAN_TERTIB_LAINNYA)
    if (!lainnya) lainnya = raw
  }

  return { pilihan, lainnya }
}
