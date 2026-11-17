export type JejakSentuh = { id: string; x: number; y: number; geser: boolean }

const BATAS_GESER = 12

type Titik = { pointerType?: string; clientX: number; clientY: number }

/** Catat awal sentuhan tanpa memilih item, supaya geseran daftar tidak dianggap ketukan. */
export function mulaiSentuhPilih(
  jejak: { current: JejakSentuh | null },
  sudah: { current: boolean },
  event: Titik,
  id: string,
) {
  if (event.pointerType === 'mouse') return
  sudah.current = false
  jejak.current = { id, x: event.clientX, y: event.clientY, geser: false }
}

export function geserSentuhPilih(jejak: { current: JejakSentuh | null }, event: Titik) {
  const awal = jejak.current
  if (!awal || event.pointerType === 'mouse') return
  const jarak = Math.hypot(event.clientX - awal.x, event.clientY - awal.y)
  if (jarak > BATAS_GESER) awal.geser = true
}

/** Pilih hanya jika jari diangkat di item yang sama tanpa bergeser. */
export function lepasSentuhPilih(
  jejak: { current: JejakSentuh | null },
  sudah: { current: boolean },
  event: Titik,
  id: string,
  pilih: () => void,
) {
  if (event.pointerType === 'mouse') return
  const awal = jejak.current
  jejak.current = null
  sudah.current = true
  if (!awal || awal.id !== id || awal.geser) return
  pilih()
}

export function batalSentuhPilih(jejak: { current: JejakSentuh | null }) {
  jejak.current = null
}
