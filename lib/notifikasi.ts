import { supabase } from '@/lib/supabase'
import { educationCalendar } from '@/lib/teacher-data'
import { jamHariIni, teacherUnit, todayInputValue } from '@/lib/jurnal'
import { barisUntukPenguji, sudahTerjadwal, untukPengampu, waktuDariStatus, menungguJadwal } from '@/lib/qiroah'

export type KategoriNotifikasi = 'pengumuman' | 'qiroah' | 'tahfidz' | 'jurnal' | 'tertib'

export type NotifikasiItem = {
  id: string
  kategori: KategoriNotifikasi
  judul: string
  detail: string
  tujuan: string
}

export type NotifikasiQiroah = NotifikasiItem & {
  peran: 'penguji' | 'pengampu'
  nama: string
  kelas: string
  tanggal: string
  waktu: string
  penguji: string
}

export const LABEL_KATEGORI: Record<KategoriNotifikasi, string> = {
  pengumuman: 'Pengumuman sekolah',
  qiroah: 'Qiroah',
  tahfidz: 'Tahfidz',
  jurnal: 'Jurnal pembelajaran',
  tertib: 'Tertib Point',
}

const URUTAN: KategoriNotifikasi[] = ['pengumuman', 'qiroah', 'tahfidz', 'jurnal', 'tertib']
const KUNCI_DIBACA = 'portal-guru-notifikasi-dibaca'
const BATAS = 5

const BULAN: Record<string, number> = {
  januari: 0,
  jan: 0,
  februari: 1,
  feb: 1,
  maret: 2,
  mar: 2,
  april: 3,
  apr: 3,
  mei: 4,
  juni: 5,
  jun: 5,
  juli: 6,
  jul: 6,
  agustus: 7,
  agu: 7,
  agt: 7,
  september: 8,
  sep: 8,
  oktober: 9,
  okt: 9,
  november: 10,
  nov: 10,
  desember: 11,
  des: 11,
}

export function akhirPengumuman(detail: string, sekarang = new Date()) {
  const pola = /(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/g
  let akhir: Date | null = null
  for (const cocok of detail.matchAll(pola)) {
    const bulan = BULAN[cocok[2].toLowerCase()]
    if (bulan == null) continue
    const tanggal = new Date(Number(cocok[3]), bulan, Number(cocok[1]))
    if (!Number.isNaN(tanggal.getTime())) akhir = tanggal
  }
  if (!akhir) return true
  const hariIni = new Date(sekarang.getFullYear(), sekarang.getMonth(), sekarang.getDate())
  return akhir >= hariIni
}

export function pengumumanAktif(sekarang = new Date()): NotifikasiItem[] {
  return educationCalendar
    .filter((item) => akhirPengumuman(item.detail, sekarang))
    .map((item) => ({
      id: `pengumuman:${item.title}`,
      kategori: 'pengumuman' as const,
      judul: item.title,
      detail: item.detail,
      tujuan: 'pengumuman',
    }))
}

export function bacaIdTersimpan() {
  if (typeof localStorage === 'undefined') return [] as string[]
  try {
    const raw = JSON.parse(localStorage.getItem(KUNCI_DIBACA) || '[]')
    return Array.isArray(raw) ? raw.filter((item) => typeof item === 'string') : []
  } catch {
    return []
  }
}

export function simpanIdDibaca(ids: string[]) {
  const unik = Array.from(new Set(ids)).slice(-400)
  localStorage.setItem(KUNCI_DIBACA, JSON.stringify(unik))
  return unik
}

function tanggalPendek(value?: string) {
  const iso = String(value || '').slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return ''
  const date = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

async function namaSiswa(ids: string[]) {
  const unik = Array.from(new Set(ids.filter(Boolean)))
  if (unik.length === 0) return new Map<string, { nama: string; kelas: string; unit: string }>()
  const { data } = await supabase.from('siswa').select('id_siswa,nama_siswa,kelas,unit').in('id_siswa', unik)
  const peta = new Map<string, { nama: string; kelas: string; unit: string }>()
  for (const row of data || []) {
    peta.set(String(row.id_siswa), {
      nama: String(row.nama_siswa || 'Siswa'),
      kelas: String(row.kelas || ''),
      unit: String(row.unit || ''),
    })
  }
  return peta
}

function unitCocok(unitBaris: string, unitGuru: string) {
  if (!unitGuru) return true
  const baris = unitBaris.trim().toLowerCase()
  const guru = unitGuru.trim().toLowerCase()
  if (!baris) return false
  return baris.includes(guru) || guru.includes(baris)
}

export async function muatNotifikasi(currentUser?: any) {
  const pengumuman = pengumumanAktif()
  const qiroah: NotifikasiQiroah[] = []
  const lain: NotifikasiItem[] = []
  if (!currentUser) return { semua: pengumuman, qiroah }

  const unit = teacherUnit(currentUser)
  const hariIni = todayInputValue()
  const awalHari = new Date()
  awalHari.setHours(0, 0, 0, 0)
  const tujuhHari = new Date(awalHari)
  tujuhHari.setDate(tujuhHari.getDate() - 7)
  const bulan = `${awalHari.getFullYear()}-${String(awalHari.getMonth() + 1).padStart(2, '0')}`

  const [pengajuan, tahfidz, jurnal, tertib] = await Promise.all([
    supabase
      .from('pengajuan')
      .select('id_pengajuan,nama_siswa,kelas,unit,jilid_diujikan,tanggal_pelaksanaan,status,nama_penguji,diajukan_oleh')
      .order('tanggal_pelaksanaan', { ascending: true }),
    supabase
      .from('setoran_tahfidz')
      .select('id_setoran,tanggal,id_siswa,hafalan_baru,status')
      .gte('tanggal', awalHari.toISOString())
      .order('tanggal', { ascending: false })
      .limit(12),
    jamHariIni(new Date())
      ? supabase.from('jurnal_pembelajaran').select('id', { count: 'exact', head: true }).eq('tanggal', hariIni)
      : Promise.resolve({ count: 1, error: null }),
    supabase
      .from('tertib_point')
      .select('id_tertib_point,id_siswa,label,pts,created_at,unit')
      .eq('bulan', bulan)
      .lt('pts', 0)
      .order('created_at', { ascending: false })
      .limit(12),
  ])

  for (const row of pengajuan.data || []) {
    if (menungguJadwal(row.status) && barisUntukPenguji(row, currentUser)) {
      qiroah.push({
        id: `qiroah-penguji:${row.id_pengajuan}`,
        kategori: 'qiroah',
        peran: 'penguji',
        judul: `Pengajuan ujian ${row.nama_siswa || 'siswa'}`,
        detail: `${row.kelas || '-'} · ${row.jilid_diujikan || 'kenaikan jilid'} menunggu penjadwalan`,
        tujuan: 'qiroah_penguji',
        nama: row.nama_siswa || 'Siswa',
        kelas: row.kelas || '-',
        tanggal: '',
        waktu: '',
        penguji: row.nama_penguji || '',
      })
    }
    if (sudahTerjadwal(row.status) && untukPengampu(row, currentUser)) {
      const waktu = waktuDariStatus(row.status)
      const tanggal = tanggalPendek(row.tanggal_pelaksanaan)
      qiroah.push({
        id: `qiroah-pengampu:${row.id_pengajuan}`,
        kategori: 'qiroah',
        peran: 'pengampu',
        judul: `Jadwal ujian ${row.nama_siswa || 'siswa'}`,
        detail: `${row.kelas || '-'} · ${tanggal || 'tanggal menyusul'}${waktu ? ` pukul ${waktu}` : ''} · ${row.nama_penguji || 'penguji'}`,
        tujuan: 'qiroah_menu',
        nama: row.nama_siswa || 'Siswa',
        kelas: row.kelas || '-',
        tanggal,
        waktu,
        penguji: row.nama_penguji || '',
      })
    }
  }

  if (!tahfidz.error) {
    const peta = await namaSiswa((tahfidz.data || []).map((row) => String(row.id_siswa || '')))
    const setoran = (tahfidz.data || []).filter((row) => {
      const siswa = peta.get(String(row.id_siswa || ''))
      return siswa ? unitCocok(siswa.unit, unit) : !unit
    })
    setoran.slice(0, BATAS).forEach((row) => {
      const siswa = peta.get(String(row.id_siswa || ''))
      lain.push({
        id: `tahfidz:${row.id_setoran}`,
        kategori: 'tahfidz',
        judul: `Setoran ${siswa?.nama || 'santri'}`,
        detail: `${siswa?.kelas || '-'} · ${row.hafalan_baru || 'hafalan'}${row.status ? ` · ${row.status}` : ''}`,
        tujuan: 'tahfidz_menu',
      })
    })
    if (setoran.length > BATAS) {
      lain.push({
        id: `tahfidz:lainnya:${hariIni}`,
        kategori: 'tahfidz',
        judul: `${setoran.length - BATAS} setoran hafalan lain hari ini`,
        detail: 'Lihat daftar setoran di menu Tahfidz.',
        tujuan: 'tahfidz_menu',
      })
    }
  }

  if (!jurnal.error && jurnal.count === 0) {
    lain.push({
      id: `jurnal:${hariIni}`,
      kategori: 'jurnal',
      judul: 'Jurnal pembelajaran hari ini belum tercatat',
      detail: 'Catat materi dan kegiatan pembelajaran sebelum hari berakhir.',
      tujuan: 'jurnal',
    })
  }

  if (!tertib.error) {
    const baris = (tertib.data || []).filter((row) => {
      const dibuat = row.created_at ? Date.parse(row.created_at) : NaN
      const baru = !Number.isFinite(dibuat) || dibuat >= tujuhHari.getTime()
      return baru && unitCocok(String(row.unit || ''), unit)
    })
    const peta = await namaSiswa(baris.map((row) => String(row.id_siswa || '')))
    baris.slice(0, BATAS).forEach((row) => {
      const siswa = peta.get(String(row.id_siswa || ''))
      lain.push({
        id: `tertib:${row.id_tertib_point}`,
        kategori: 'tertib',
        judul: `Pelanggaran ${siswa?.nama || 'santri'}`,
        detail: `${siswa?.kelas || '-'} · ${row.label || 'tertib point'} (${row.pts} poin)`,
        tujuan: 'tertib_point',
      })
    })
  }

  const semua = [...pengumuman, ...qiroah, ...lain].sort(
    (a, b) => URUTAN.indexOf(a.kategori) - URUTAN.indexOf(b.kategori),
  )
  return { semua, qiroah }
}
