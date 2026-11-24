/** Sapaan kolom tanda tangan pembimbing Rapor HQ, berdasarkan kolom `role` di `users`. */

export const LABEL_PEMBIMBING_USTADZ = 'Ustadz Pembimbing'
export const LABEL_PEMBIMBING_USTADZAH = 'Ustadzah Pembimbing'
export const LABEL_PEMBIMBING_UMUM = 'Pembimbing'

function teksRole(nilai: unknown) {
  if (Array.isArray(nilai)) return nilai.map((item) => String(item ?? '').trim()).filter(Boolean).join(' ')
  const mentah = String(nilai ?? '').trim()
  if (mentah.startsWith('[') && mentah.endsWith(']')) {
    try {
      const parsed = JSON.parse(mentah)
      if (Array.isArray(parsed)) return parsed.map((item) => String(item ?? '').trim()).filter(Boolean).join(' ')
    } catch {
      /* role teks biasa */
    }
  }
  return mentah
}

export function labelPembimbingDariRole(role: unknown): string {
  const teks = teksRole(role)
  if (/\bustadzah\b/i.test(teks)) return LABEL_PEMBIMBING_USTADZAH
  if (/\bustadz\b/i.test(teks)) return LABEL_PEMBIMBING_USTADZ
  return LABEL_PEMBIMBING_USTADZ
}

export function labelPembimbingDariDaftarPeran(daftar: unknown[]): string {
  const unik = [...new Set(daftar.map(labelPembimbingDariRole))]
  if (unik.length === 0) return LABEL_PEMBIMBING_USTADZ
  if (unik.length === 1) return unik[0]
  const adaUstadzah = unik.includes(LABEL_PEMBIMBING_USTADZAH)
  const adaUstadz = unik.includes(LABEL_PEMBIMBING_USTADZ)
  if (adaUstadzah && !adaUstadz) return LABEL_PEMBIMBING_USTADZAH
  if (adaUstadz && !adaUstadzah) return LABEL_PEMBIMBING_USTADZ
  return LABEL_PEMBIMBING_UMUM
}

export function roleDariSesiPengguna() {
  if (typeof window === 'undefined') return ''
  try {
    const mentah = window.localStorage.getItem('user_session')
    const user = mentah ? JSON.parse(mentah) : null
    return user?.role ?? ''
  } catch {
    return ''
  }
}
