import { supabase } from '@/lib/supabase'
import { JADWAL_PELAJARAN, jamHariIni, todayInputValue } from '@/lib/jurnal'
import { fetchAllSiswa } from '@/lib/siswa'

export type BarisJadwalHari = {
  id: string
  time: string
  subject: string
  className: string
  materi: string
  status: 'Selesai' | 'Berlangsung' | 'Akan datang'
}

export type TugasGuru = {
  id: string
  title: string
  detail: string
  tujuan: string
}

const NAMA_HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']

function menitDariJam(teks: string) {
  const [jam, menit] = String(teks || '').split('.').map((bagian) => Number(bagian))
  if (!Number.isFinite(jam) || !Number.isFinite(menit)) return null
  return jam * 60 + menit
}

function waktuJam(jam: number) {
  return JADWAL_PELAJARAN.find((item) => item.j === jam)?.w || ''
}

function statusJam(jam: number, sekarang: Date): BarisJadwalHari['status'] {
  const rentang = waktuJam(jam).split('-').map((bagian) => bagian.trim())
  const mulai = menitDariJam(rentang[0] || '')
  const selesai = menitDariJam(rentang[1] || '')
  const kini = sekarang.getHours() * 60 + sekarang.getMinutes()
  if (mulai == null || selesai == null) return 'Akan datang'
  if (kini >= selesai) return 'Selesai'
  if (kini >= mulai) return 'Berlangsung'
  return 'Akan datang'
}

function parseTanggal(nilai: unknown) {
  const raw = String(nilai || '').trim()
  const garis = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (garis) return new Date(Number(garis[3]), Number(garis[2]) - 1, Number(garis[1]))
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]))
  const tanggal = new Date(raw)
  return Number.isNaN(tanggal.getTime()) ? null : tanggal
}

function hariSama(tanggal: Date, acuan: Date) {
  return (
    tanggal.getFullYear() === acuan.getFullYear() &&
    tanggal.getMonth() === acuan.getMonth() &&
    tanggal.getDate() === acuan.getDate()
  )
}

function labelKelas(kelas: string) {
  const teks = kelas.trim()
  if (!teks) return 'Kelas'
  if (/^kelas\b/i.test(teks)) return teks
  return `Kelas ${teks}`
}

function ringkasNama(nama: string[], batas = 3) {
  const unik = Array.from(new Set(nama.map((item) => item.trim()).filter(Boolean)))
  if (unik.length === 0) return ''
  const awal = unik.slice(0, batas).join(', ')
  return unik.length > batas ? `${awal}, dan ${unik.length - batas} siswa lain` : awal
}

async function ambilKelompok<T>(id: string[], muat: (bagian: string[]) => Promise<T[]>) {
  const hasil: T[] = []
  for (let index = 0; index < id.length; index += 80) {
    hasil.push(...(await muat(id.slice(index, index + 80))))
  }
  return hasil
}

export function ringkasanPekan(sekarang = new Date()) {
  const urutan = [1, 2, 3, 4, 5, 6, 0]
  return urutan.map((hari) => {
    const tanggal = new Date(sekarang)
    tanggal.setDate(sekarang.getDate() + ((hari - sekarang.getDay() + 7) % 7))
    const slot = jamHariIni(tanggal)
    const lessons = slot ? slot.filter((item) => item.j).length : 0
    return { day: NAMA_HARI[hari], lessons, aktif: sekarang.getDay() === hari }
  })
}

export function keteranganJadwal(item: Pick<BarisJadwalHari, 'subject' | 'className' | 'materi'>) {
  const materi = item.materi.trim() || 'belum dicatat'
  return `${item.subject} - ${labelKelas(item.className)} - Materi Pokok: ${materi}`
}

export async function muatAgendaGuru(currentUser?: { target_id?: string; nama_lengkap?: string; nama?: string; username?: string } | null, sekarang = new Date()) {
  const kosong = { jadwal: [] as BarisJadwalHari[], tugas: [] as TugasGuru[] }
  if (!currentUser) return kosong

  const siswa = await fetchAllSiswa(currentUser)
  const kelas = Array.from(new Set(siswa.map((item) => String(item.kelas || '').trim()).filter(Boolean)))
  const idSiswa = Array.from(new Set(siswa.map((item) => String(item.id_siswa || '').trim()).filter(Boolean)))
  const hariIni = todayInputValue(sekarang)
  const slot = jamHariIni(sekarang)?.filter((item) => item.j) || []
  const mulaiHari = new Date(sekarang.getFullYear(), sekarang.getMonth(), sekarang.getDate())
  const batasQiroah = new Date(mulaiHari)
  batasQiroah.setDate(batasQiroah.getDate() - 14)

  const jurnal = kelas.length
    ? await supabase
        .from('jurnal_pembelajaran')
        .select('kelas,jam,mapel,materi')
        .eq('tanggal', hariIni)
        .in('kelas', kelas)
    : { data: [], error: null }

  const barisJurnal = jurnal.error ? [] : jurnal.data || []
  const terisi = new Map<string, { mapel: string; materi: string }>()
  for (const row of barisJurnal) {
    const jam = Number(row.jam)
    const mapel = String(row.mapel || '').trim()
    const materi = String(row.materi || '').trim()
    if (!Number.isFinite(jam) || (!mapel && !materi)) continue
    terisi.set(`${String(row.kelas || '').trim()}-${jam}`, { mapel, materi })
  }

  const jadwal: BarisJadwalHari[] = Array.from(terisi.entries())
    .map(([kunci, catatan]) => {
      const pemisah = kunci.lastIndexOf('-')
      const namaKelas = kunci.slice(0, pemisah)
      const jam = Number(kunci.slice(pemisah + 1))
      return {
        id: kunci,
        time: waktuJam(jam) || `Jam ke-${jam}`,
        subject: catatan.mapel || 'Pembelajaran',
        className: namaKelas,
        materi: catatan.materi,
        status: statusJam(jam, sekarang),
        jam,
      }
    })
    .sort((a, b) => a.className.localeCompare(b.className, 'id', { numeric: true }) || a.jam - b.jam)
    .map((baris) => ({
      id: baris.id,
      time: baris.time,
      subject: baris.subject,
      className: baris.className,
      materi: baris.materi,
      status: baris.status,
    }))

  const tugas: TugasGuru[] = []
  if (slot.length > 0) {
    for (const namaKelas of kelas) {
      const kosongJam = slot
        .map((item) => Number(item.j))
        .filter((jam) => !terisi.has(`${namaKelas}-${jam}`))
      if (kosongJam.length === 0) continue
      const semuaKosong = kosongJam.length === slot.length
      tugas.push({
        id: `jurnal:${hariIni}:${namaKelas}`,
        title: semuaKosong ? `Isi jurnal pembelajaran ${labelKelas(namaKelas)}` : `Lengkapi jurnal ${labelKelas(namaKelas)}`,
        detail: semuaKosong
          ? 'Materi pokok hari ini belum tercatat di jurnal pembelajaran.'
          : `Jam ke-${kosongJam.join(', ')} belum diisi materi pokok.`,
        tujuan: 'jurnal',
      })
    }
  }

  if (idSiswa.length > 0 && slot.length > 0) {
    const setoranHariIni = await ambilKelompok(idSiswa, async (bagian) => {
      const { data, error } = await supabase
        .from('setoran_tahfidz')
        .select('id_siswa,tanggal')
        .in('id_siswa', bagian)
        .gte('tanggal', mulaiHari.toISOString())
        .limit(1000)
      if (error) return [] as { id_siswa?: string; tanggal?: string }[]
      return data || []
    })
    const sudahSetor = new Set(
      setoranHariIni
        .filter((row) => {
          const tanggal = parseTanggal(row.tanggal)
          return tanggal ? hariSama(tanggal, sekarang) : false
        })
        .map((row) => String(row.id_siswa || '')),
    )
    const belum = siswa.filter((item) => !sudahSetor.has(String(item.id_siswa)))
    if (belum.length > 0) {
      tugas.push({
        id: `tahfidz:${hariIni}`,
        title: 'Periksa setoran Tahfidz yang masih menunggu',
        detail: `${belum.length} siswa binaan belum ada setoran hari ini: ${ringkasNama(belum.map((item) => item.nama_siswa))}.`,
        tujuan: 'tahfidz_setoran',
      })
    }
  }

  if (idSiswa.length > 0) {
    const setoranQiroah = await ambilKelompok(idSiswa, async (bagian) => {
      const { data, error } = await supabase
        .from('setoran_qiroah')
        .select('id_qiroah,id_siswa,nama_siswa,tanggal,tugas_rumah,status_setoran,nilai,ustadz')
        .in('id_siswa', bagian)
        .gte('tanggal', batasQiroah.toISOString())
        .limit(1000)
      if (error) return [] as Record<string, unknown>[]
      return data || []
    })
    const menunggu = setoranQiroah.filter((row) => {
      const tugasRumah = String(row.tugas_rumah || '').trim()
      const tanggal = parseTanggal(row.tanggal)
      const dinilai = String(row.status_setoran || '').toLowerCase().includes('sudah') || String(row.nilai || '').trim() !== ''
      return tugasRumah && tugasRumah !== '-' && !dinilai && tanggal != null && tanggal >= batasQiroah
    })
    if (menunggu.length > 0) {
      const nama = menunggu.map((row) => String(row.nama_siswa || siswa.find((item) => item.id_siswa === row.id_siswa)?.nama_siswa || 'siswa'))
      tugas.push({
        id: `qiroah:${hariIni}`,
        title: 'Periksa setoran Qiroah yang masih menunggu',
        detail: `${menunggu.length} tugas rumah belum dinilai: ${ringkasNama(nama)}.`,
        tujuan: 'qiroah_penilaian',
      })
    }
  }

  return { jadwal, tugas }
}
