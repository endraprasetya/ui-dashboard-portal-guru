const KUNCI_TAMPILAN_PORTAL = 'portal-tampilan-terakhir'

export function ingatTampilanPortal(view: string) {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(KUNCI_TAMPILAN_PORTAL, view)
  } catch {
    /* sesi penyimpanan tidak tersedia */
  }
}

function alamatKembali(tujuan: string) {
  if (tujuan.startsWith('/')) return tujuan
  if (tujuan === 'dashboard') return '/'
  return `/?view=${encodeURIComponent(tujuan)}`
}

function tampilanPortalTersimpan() {
  try {
    return sessionStorage.getItem(KUNCI_TAMPILAN_PORTAL) || ''
  } catch {
    return ''
  }
}

/** Kembali satu langkah. Dari cetak rapor portal, pulihkan menu asal, bukan beranda jika asalnya menu lain. */
export function kembaliSatuLangkah(cadangan: string) {
  if (typeof window === 'undefined') return
  const dariQuery = new URLSearchParams(window.location.search).get('kembali')
  if (dariQuery) {
    window.location.assign(alamatKembali(dariQuery))
    return
  }
  const dariPortal = window.location.pathname.startsWith('/raport')
  const tampilan = tampilanPortalTersimpan()
  if (dariPortal && tampilan && tampilan !== 'dashboard') {
    window.location.assign(alamatKembali(tampilan))
    return
  }
  if (window.history.length > 1) {
    window.history.back()
    return
  }
  window.location.assign(cadangan)
}
