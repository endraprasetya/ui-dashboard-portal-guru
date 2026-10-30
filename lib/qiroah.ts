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

export const PEMETAAN_PENGUJI_NOGOSARI = [
  { kelas: ['1A'], nama: 'Haryono, S.Pd' },
  { kelas: ['1B'], nama: 'Ali Wahyudin, S.Pd.I' },
  { kelas: ['2A', '2B'], nama: 'Andreas Haryanto, S.Pd' },
  { kelas: ['3A', '3B', '4A', '4B', '5A', '5B', '6A', '6B'], nama: 'Prasetyo, S.Pd' },
  { kelas: ['1C', '1D'], nama: 'Ambar Novitasari, S.Pd' },
  { kelas: ['2C', '2D'], nama: 'Asiyah' },
  { kelas: ['3C', '3D'], nama: 'Shabrina Silmi' },
  { kelas: ['4C', '4D', '5C', '5D', '6C', '6D'], nama: 'Dian Aprilia' },
] as const

export function normalKelas(kelas?: string) {
  return String(kelas || '')
    .toUpperCase()
    .replace(/KELAS/g, '')
    .replace(/[^A-Z0-9]/g, '')
}

export function unitNogosari(unit?: string) {
  return String(unit || '')
    .toLowerCase()
    .replace(/[^a-z]/g, '')
    .includes('nogosari')
}

export function pengujiUntukKelas(kelas?: string, unit?: string) {
  if (!unitNogosari(unit)) return ''
  const kunci = normalKelas(kelas)
  const found = PEMETAAN_PENGUJI_NOGOSARI.find((item) => item.kelas.some((nama) => normalKelas(nama) === kunci))
  return found?.nama || ''
}

function namaInti(value?: string) {
  return String(value || '')
    .toLowerCase()
    .replace(/,/g, ' ')
    .replace(/\bs\.?\s*pd\.?\s*i?\b/g, ' ')
    .replace(/[^a-z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function namaPengujiCocok(namaUser?: string, namaPenguji?: string) {
  const pengguna = namaInti(namaUser)
  const penguji = namaInti(namaPenguji)
  if (!pengguna || !penguji) return false
  if (pengguna === penguji) return true
  const pendek = pengguna.length < penguji.length ? pengguna : penguji
  const panjang = pengguna.length < penguji.length ? penguji : pengguna
  if (pendek.length < 4) return false
  return panjang.includes(pendek)
}

export function statusInti(status?: string) {
  return String(status || '')
    .split('|')[0]
    .trim()
    .toLowerCase()
}

export function waktuDariStatus(status?: string) {
  const jam = String(status || '')
    .split('|')[1]
    ?.trim()
  return jam && /^\d{2}:\d{2}/.test(jam) ? jam.slice(0, 5) : ''
}

export function statusDenganWaktu(waktu: string) {
  const jam = String(waktu || '').trim().slice(0, 5)
  return /^\d{2}:\d{2}$/.test(jam) ? `terjadwal|${jam}` : 'terjadwal'
}

export function menungguJadwal(status?: string) {
  const inti = statusInti(status)
  if (!inti || inti === '-') return true
  if (inti.includes('selesai') || inti.includes('terjadwal') || inti.includes('lulus') || inti.includes('batal')) return false
  return inti.includes('menunggu') || inti.includes('pengajuan') || inti.includes('diajukan') || inti.includes('antr') || inti.includes('antre')
}

export function sudahTerjadwal(status?: string) {
  const inti = statusInti(status)
  return inti === 'terjadwal' || inti.includes('terjadwal') || inti === 'dijadwalkan' || inti === 'sudah dijadwalkan'
}

export function labelStatusPengajuan(status?: string) {
  if (sudahTerjadwal(status)) return 'Terjadwal'
  if (menungguJadwal(status)) return 'Menunggu jadwal'
  if (statusInti(status) === 'selesai') return 'Selesai'
  return String(status || '-').split('|')[0]
}

function daftarPembimbing(value?: string) {
  return String(value || '')
    .split(/[,;]/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function unitSama(unitUser?: string, unitBaris?: string) {
  const pengguna = String(unitUser || '').trim().toLowerCase()
  const baris = String(unitBaris || '').trim().toLowerCase()
  if (!pengguna || pengguna === 'semua unit') return true
  if (!baris) return false
  return pengguna === baris || baris.includes(pengguna) || pengguna.includes(baris)
}

export function pengujiEfektif(row: { kelas?: string; unit?: string; nama_penguji?: string }) {
  const tertulis = String(row.nama_penguji || '').trim()
  if (tertulis) return tertulis
  return pengujiUntukKelas(row.kelas, row.unit)
}

export function untukPengampu(
  row: { diajukan_oleh?: string; unit?: string; id_pembimbing?: string },
  currentUser?: { nama_lengkap?: string; nama?: string; username?: string; unit?: string; target_id?: string } | null,
) {
  if (!currentUser) return false
  const target = String(currentUser.target_id || '').trim().toLowerCase()
  const pembimbing = daftarPembimbing(row.id_pembimbing).map((item) => item.toLowerCase())
  if (target && pembimbing.includes(target)) return true
  if (!namaPengujiCocok(teacherDisplayName(currentUser), row.diajukan_oleh)) return false
  return unitSama(currentUser.unit, row.unit)
}

export function barisUntukPenguji(
  row: { kelas?: string; unit?: string; nama_penguji?: string },
  currentUser?: { nama_lengkap?: string; nama?: string; username?: string; role?: string; unit?: string } | null,
) {
  if (!currentUser) return false
  const peran = String(currentUser.role || '').toLowerCase()
  const admin = peran.includes('admin')
  const namaUser = teacherDisplayName(currentUser)
  const namaBaris = pengujiEfektif(row)
  if (namaBaris && namaPengujiCocok(namaUser, namaBaris)) return true
  const unitUser = String(currentUser.unit || '').trim()
  if (!namaBaris && peran.includes('penguji') && unitUser && unitUser.toLowerCase() !== 'semua unit' && unitSama(unitUser, row.unit)) {
    return true
  }
  return admin
}
