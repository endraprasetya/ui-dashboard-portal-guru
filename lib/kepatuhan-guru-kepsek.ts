import { supabase } from '@/lib/supabase'
import { kanonNamaUnit } from '@/lib/siswa'
import {
  hariBerikutnya,
  hariIniWib,
  rentangHariWib,
  susunKepatuhanGuru,
  type AkunGuruKepatuhan,
  type BarisKepatuhanGuru,
} from '@/lib/kepatuhan-guru-hitung'

export type { BarisKepatuhanGuru }

const UMUR_CACHE_MS = 4 * 60 * 1000

export type HasilKepatuhanGuru = {
  unit: string
  hari: string
  baris: BarisKepatuhanGuru[]
  catatan: string[]
  dimuatPada: number
}

type Simpanan = { at: number; data: HasilKepatuhanGuru }
const memori = new Map<string, Simpanan>()

function kunciCache(unit: string, hari: string) {
  return `kepatuhan-guru-kepsek:v2:${unit}:${hari}`
}

function bacaCache(unit: string, hari: string) {
  const sekarang = Date.now()
  const kunci = kunciCache(unit, hari)
  const dariMemori = memori.get(kunci)
  if (dariMemori && sekarang - dariMemori.at < UMUR_CACHE_MS && dariMemori.data.hari === hari) return dariMemori.data
  if (typeof sessionStorage === 'undefined') return null
  try {
    const mentah = sessionStorage.getItem(kunci)
    if (!mentah) return null
    const simpan = JSON.parse(mentah) as Simpanan
    if (!simpan?.data || simpan.data.hari !== hari || sekarang - Number(simpan.at) > UMUR_CACHE_MS) return null
    memori.set(kunci, simpan)
    return simpan.data
  } catch {
    return null
  }
}

function tulisCache(data: HasilKepatuhanGuru) {
  const simpan = { at: data.dimuatPada, data }
  memori.set(kunciCache(data.unit, data.hari), simpan)
  if (typeof sessionStorage === 'undefined') return
  try {
    sessionStorage.setItem(kunciCache(data.unit, data.hari), JSON.stringify(simpan))
  } catch {
    /* kuota penyimpanan penuh tidak menghentikan tampilan */
  }
}

async function ambilKolom(
  tabel: 'jurnal_pembelajaran' | 'setoran_qiroah' | 'setoran_tahfidz' | 'users' | 'siswa',
  kolom: string[],
  saring: (kueri: any) => any,
) {
  let pesan = ''
  for (const pilih of kolom) {
    const { data, error } = await saring(supabase.from(tabel).select(pilih))
    if (!error) return { data: (data || []) as Record<string, unknown>[], gagal: false }
    pesan = error.message || ''
    if (!/column|schema cache|does not exist/i.test(pesan)) break
  }
  return { data: [] as Record<string, unknown>[], gagal: true, pesan }
}

async function ambilSiswaUnit(unit: string) {
  const baris: Record<string, unknown>[] = []
  const ukuran = 1000
  for (let dari = 0; dari <= 4000; dari += ukuran) {
    const { data, error } = await supabase
      .from('siswa')
      .select('id_siswa,kelas,id_pembimbing,unit')
      .ilike('unit', `%${unit}%`)
      .not('kelas', 'ilike', '%Alumni%')
      .range(dari, dari + ukuran - 1)
    if (error) return { data: [] as Record<string, unknown>[], gagal: true, pesan: error.message }
    const bagian = data || []
    baris.push(...bagian)
    if (bagian.length < ukuran) break
  }
  return { data: baris, gagal: false, pesan: '' }
}

async function ambilTahfidzHari(ids: string[], awal: string, akhir: string) {
  const unik = [...new Set(ids.map((id) => String(id || '').trim()).filter(Boolean))]
  if (unik.length === 0) return { data: [] as Record<string, unknown>[], gagal: false, pesan: '' }
  const kolom = ['tanggal,id_siswa,nama_ustadz', 'tanggal,id_siswa']
  const semua: Record<string, unknown>[] = []
  let gagal = false
  let pesan = ''
  for (let indeks = 0; indeks < unik.length; indeks += 200) {
    const bagian = unik.slice(indeks, indeks + 200)
    const hasil = await ambilKolom('setoran_tahfidz', kolom, (kueri) =>
      kueri.in('id_siswa', bagian).gte('tanggal', awal).lt('tanggal', akhir).limit(2000),
    )
    if (hasil.gagal) {
      gagal = true
      pesan = hasil.pesan || ''
      break
    }
    semua.push(...hasil.data)
  }
  return { data: semua, gagal, pesan }
}

async function ambilPadaHari(
  tabel: 'jurnal_pembelajaran' | 'setoran_qiroah' | 'setoran_tahfidz',
  kolom: string[],
  hari: string,
  awal: string,
  akhir: string,
  tambah: (kueri: any) => any,
) {
  const ketat = await ambilKolom(tabel, kolom, (kueri) => tambah(kueri.gte('tanggal', awal).lt('tanggal', akhir)))
  if (!ketat.gagal || !/invalid|date|timestamp|out of range|time zone/i.test(ketat.pesan || '')) return ketat
  const besok = hariBerikutnya(hari)
  return ambilKolom(tabel, kolom, (kueri) => tambah(kueri.gte('tanggal', hari).lt('tanggal', besok)))
}

/** Satu kueri per tabel untuk hari ini + unit. Hasil diingat 4 menit. */
export async function muatKepatuhanGuru(unitMentah: string, opsi?: { segar?: boolean }): Promise<HasilKepatuhanGuru> {
  const unit = kanonNamaUnit(unitMentah) || String(unitMentah || '').trim()
  const hari = hariIniWib()
  const { awal, akhir } = rentangHariWib(hari)
  const kosong: HasilKepatuhanGuru = { unit, hari, baris: [], catatan: [], dimuatPada: Date.now() }
  if (!unit) return { ...kosong, catatan: ['Unit akun belum terbaca.'] }
  if (!opsi?.segar) {
    const tersimpan = bacaCache(unit, hari)
    if (tersimpan) return tersimpan
  }

  const catatan: string[] = []
  const [guru, siswa, qiroah, jurnal] = await Promise.all([
    ambilKolom('users', ['nama_lengkap,username,unit,role,target_id', 'nama_lengkap,username,unit,role'], (kueri) =>
      kueri.ilike('unit', `%${unit}%`).limit(500),
    ),
    ambilSiswaUnit(unit),
    ambilPadaHari('setoran_qiroah', ['tanggal,ustadz,unit,id_siswa', 'tanggal,unit,id_siswa'], hari, awal, akhir, (kueri) =>
      kueri.ilike('unit', `%${unit}%`).limit(2000),
    ),
    ambilKolom('jurnal_pembelajaran', ['tanggal,kelas,guru'], (kueri) =>
      kueri.gte('tanggal', hari).lt('tanggal', hariBerikutnya(hari)).ilike('kelas', `${unit}::%`).limit(2000),
    ),
  ])
  if (guru.gagal) catatan.push('Daftar guru belum dapat dimuat.')
  if (siswa.gagal) catatan.push('Daftar siswa binaan belum dapat dimuat.')
  if (jurnal.gagal) catatan.push('Jurnal hari ini belum dapat dimuat.')
  if (qiroah.gagal) catatan.push('Setoran qiroah hari ini belum dapat dimuat.')

  const besok = hariBerikutnya(hari)
  const tahfidz = await ambilTahfidzHari(
    siswa.data.map((row) => String(row.id_siswa || '')),
    hari,
    besok,
  )
  if (tahfidz.gagal) catatan.push('Setoran tahfidz hari ini belum dapat dimuat.')

  const hasil: HasilKepatuhanGuru = {
    unit,
    hari,
    baris: susunKepatuhanGuru({
      unit,
      hari,
      guru: guru.data as AkunGuruKepatuhan[],
      siswa: siswa.data as MasukanSiswa[],
      jurnal: jurnal.data,
      qiroah: qiroah.data,
      tahfidz: tahfidz.data,
      jurnalGagal: jurnal.gagal,
      qiroahGagal: qiroah.gagal,
      tahfidzGagal: tahfidz.gagal,
    }),
    catatan,
    dimuatPada: Date.now(),
  }
  if (hasil.baris.length > 0 || catatan.length === 0) tulisCache(hasil)
  return hasil
}

type MasukanSiswa = {
  id_siswa?: string | null
  kelas?: string | null
  id_pembimbing?: string | null
  unit?: string | null
}
