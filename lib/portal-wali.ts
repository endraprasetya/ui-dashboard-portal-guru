/** Utilitas akun & penautan siswa — Portal Wali (Parent Portal). */

export type SantriWali = {
  id: string
  name: string
  kelas: string
  unit?: string
  idOrtu?: string
}

/** Mendeteksi akun wali dari kolom `role` (dan varian di database). */
export function isPortalWali(user?: { role?: string } | null) {
  const role = String(user?.role || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
  if (!role) return false
  if (/\b(ustadz|ustad|guru|admin|penguji|koordinator|pembimbing|kepala\s*sekolah|bendahara)\b/i.test(role) && !/wali/.test(role)) {
    return false
  }
  return (
    /\bportal\s*wali\b/.test(role) ||
    /\bwali\s*murid\b/.test(role) ||
    /\borang\s*tua\b/.test(role) ||
    /\bparent\b/.test(role) ||
    /\bortu\b/.test(role) ||
    /^wali$/.test(role) ||
    (/\bwali\b/.test(role) && !/\bguru\b/.test(role) && !/\bustad/.test(role))
  )
}

export function kunciAkunWali(user?: Record<string, unknown> | null) {
  return [
    user?.id_siswa,
    user?.target_id,
    user?.id_user,
    user?.username,
    user?.id_ortu,
    user?.nis,
    user?.nama_lengkap,
  ]
    .map((item) => String(item ?? '').trim().toLowerCase())
    .filter((item) => item.length >= 2)
}

export function cocokAnandaWali(siswa: SantriWali, user?: Record<string, unknown> | null) {
  const kunci = kunciAkunWali(user)
  if (kunci.length === 0) return false
  const id = siswa.id.toLowerCase()
  const ortu = String(siswa.idOrtu || '').trim().toLowerCase()
  if (kunci.includes(id)) return true
  if (ortu && kunci.some((k) => ortu === k || ortu.includes(k) || k.includes(ortu))) return true
  const nama = siswa.name.toLowerCase()
  return kunci.some((k) => k.length > 4 && (nama.includes(k) || k.includes(nama.split(' ')[0] || '')))
}
