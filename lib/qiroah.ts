export const JILID_OPTIONS = [
  'At-Tartil Jilid 1',
  'At-Tartil Jilid 2',
  'At-Tartil Jilid 3',
  'At-Tartil Jilid 4',
  'At-Tartil Jilid 5',
  "Al-Qur'an (Talaqqi)",
] as const

export const JILID_UJIAN_OPTIONS = [
  'At-Tartil Jilid 1',
  'At-Tartil Jilid 2',
  'At-Tartil Jilid 3',
  'At-Tartil Jilid 4',
  'At-Tartil Jilid 5',
  "Al-Qur'an",
] as const

export const TARGET_QIROAH = [
  { kelas: 'Kelas 1', target: 'At Tartil 1-3' },
  { kelas: 'Kelas 2', target: 'At Tartil 4-5' },
  { kelas: 'Kelas 3 ke atas', target: 'Al-Quran' },
] as const

export function isYa(value: unknown) {
  const v = String(value ?? '')
    .trim()
    .toLowerCase()
  return v === 'ya' || v === 'true' || v === '1'
}

export function formatDateString(dateStr: string) {
  if (!dateStr) return '-'
  if (dateStr.includes('/')) return dateStr.split(' ')[0]
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    return d.toLocaleDateString('id-ID')
  } catch {
    return dateStr
  }
}

export function parseCustomDate(dateStr: string) {
  if (!dateStr) return null
  try {
    if (dateStr.includes('/')) {
      const [datePart] = dateStr.split(' ')
      const [day, month, year] = datePart.split('/')
      return new Date(`${year}-${month}-${day}`)
    }
    return new Date(dateStr)
  } catch {
    return null
  }
}

export function formatCapaianQiroah(record: { jilid?: string; halaman?: string } | null) {
  if (!record) return null
  const jilid = record.jilid || '-'
  const halaman = record.halaman || '-'
  return `${jilid} · ${halaman}`
}

export function cekTargetQiroahSiswa(kelas: string, capaianStr: string) {
  if (!capaianStr || !kelas) return false

  const klsNum = parseInt(kelas.toString().replace(/[^0-9]/g, ''), 10) || 0
  const teksCapaian = capaianStr.toLowerCase()

  let bobot = 0
  if (
    teksCapaian.includes('al quran') ||
    teksCapaian.includes('al-quran') ||
    teksCapaian.includes("al-qur'an") ||
    teksCapaian.includes("al qur'an") ||
    teksCapaian.includes('alquran') ||
    teksCapaian.includes('talaqqi')
  ) {
    bobot = 7
  } else if (teksCapaian.includes('jilid 6') || teksCapaian.includes('at tartil 6')) bobot = 6
  else if (teksCapaian.includes('jilid 5') || teksCapaian.includes('at tartil 5')) bobot = 5
  else if (teksCapaian.includes('jilid 4') || teksCapaian.includes('at tartil 4')) bobot = 4
  else if (teksCapaian.includes('jilid 3') || teksCapaian.includes('at tartil 3')) bobot = 3
  else if (teksCapaian.includes('jilid 2') || teksCapaian.includes('at tartil 2')) bobot = 2
  else if (teksCapaian.includes('jilid 1') || teksCapaian.includes('at tartil 1')) bobot = 1

  if (klsNum === 1) return bobot >= 1
  if (klsNum === 2) return bobot >= 4
  if (klsNum >= 3) return bobot >= 7
  return false
}

export function nextJilid(jilidAsal: string) {
  const jStr = jilidAsal.toLowerCase()
  if (jStr.includes('jilid 1')) return 'At-Tartil Jilid 2'
  if (jStr.includes('jilid 2')) return 'At-Tartil Jilid 3'
  if (jStr.includes('jilid 3')) return 'At-Tartil Jilid 4'
  if (jStr.includes('jilid 4')) return 'At-Tartil Jilid 5'
  if (jStr.includes('jilid 5')) return "Al-Qur'an"
  if (jStr.includes("qur'an") || jStr.includes('quran') || jStr.includes('talaqqi')) return 'Hafalan Mandiri'
  return 'Lanjut'
}

export function hasPengujiRole(currentUser?: { role?: string } | null) {
  const role = String(currentUser?.role || '').toLowerCase()
  return role.includes('admin') || role.includes('penguji')
}

export function teacherDisplayName(currentUser?: any) {
  return currentUser?.nama_lengkap || currentUser?.nama || currentUser?.username || 'Guru'
}

export function generateQiroahId() {
  return 'QR' + Math.floor(1000000000 + Math.random() * 9000000000)
}

export function generateUjianId() {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const stamp = `${String(now.getFullYear()).slice(2)}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
  return `UJ-${stamp}`
}
