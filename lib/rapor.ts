import { cekTargetQiroahSiswa, formatCapaianQiroah, pemetaanKenaikanJilid, TARGET_QIROAH } from '@/lib/qiroah'
import { fetchPejabatUntukCetak, type PejabatCetak } from '@/lib/setting-cetak'
import { supabase } from '@/lib/supabase'
import { fetchAllSurah } from '@/lib/surah'
import { formatMurojaahRecord, formatZiyadahRecord } from '@/lib/tahfidz'

export type IdentitasRapor = {
  idSiswa: string
  nama: string
  nis: string
  nisn: string
  kelas: string
  unit: string
  jenisKelamin: string
  pembimbing: string
  pembimbingNiy: string
}

export type BarisJuz = {
  juz: string
  capaian: string
  jumlah: number
  catatan: string
}

export type RingkasQiroah = {
  capaian: string
  target: string
  memenuhi: boolean
  catatan: string
  jumlah: number
}

export type HasilUjianRapor = {
  tanggal: string
  jilidAsal: string
  jilidTujuan: string
  nilai: string
  predikat: string
  keputusan: string
}

export type DataRapor = {
  siswa: IdentitasRapor
  semester: string
  tahunAjaran: string
  tanggalCetak: string
  tahfidz: BarisJuz[]
  ziyadahTerakhir: string
  murojaahTerakhir: string
  catatanTahfidz: string
  qiroah: RingkasQiroah
  ujian: HasilUjianRapor[]
  kepsek: PejabatCetak
  lokasi: string
}

function teks(value: unknown) {
  const hasil = String(value ?? '')
    .replace(/\r\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (!hasil || hasil === '-' || hasil.toLowerCase() === 'null') return ''
  return hasil
}

function tanggalPanjang(value?: string) {
  const iso = String(value || '').slice(0, 10)
  const date = iso ? new Date(`${iso}T00:00:00`) : new Date()
  if (Number.isNaN(date.getTime())) {
    return new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
  }
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}

function periodeAjaran(tanggal = new Date()) {
  const bulan = tanggal.getMonth() + 1
  const tahun = tanggal.getFullYear()
  const gasal = bulan >= 7
  const awal = gasal ? tahun : tahun - 1
  return {
    semester: gasal ? 'Gasal' : 'Genap',
    tahunAjaran: `${awal}/${awal + 1}`,
  }
}

function targetQiroahKelas(kelas: string) {
  const angka = parseInt(String(kelas).replace(/\D/g, ''), 10) || 0
  if (angka <= 1) return TARGET_QIROAH[0].target
  if (angka === 2) return TARGET_QIROAH[1].target
  return TARGET_QIROAH[2].target
}

function normalSurah(nama: string) {
  return teks(nama)
    .toLowerCase()
    .replace(/^surah\s+|^surat\s+|^qs\.?\s*/i, '')
    .replace(/[^a-z0-9']/g, '')
}

async function ambilDataDiri(nama: string, kelas: string, nis: string) {
  if (nis) {
    const { data } = await supabase
      .from('data_diri_siswa')
      .select('nama_lengkap,kelas,nomor_induk_sekolah,nisn,jenis_kelamin')
      .eq('nomor_induk_sekolah', nis)
      .limit(1)
      .maybeSingle()
    if (data) return data
  }
  if (nama && kelas) {
    const { data } = await supabase
      .from('data_diri_siswa')
      .select('nama_lengkap,kelas,nomor_induk_sekolah,nisn,jenis_kelamin')
      .eq('nama_lengkap', nama)
      .eq('kelas', kelas)
      .limit(1)
      .maybeSingle()
    return data
  }
  return null
}

function parseTanggal(value: unknown) {
  const raw = teks(value)
  if (!raw) return 0
  if (raw.includes('/')) {
    const [tanggal] = raw.split(' ')
    const [hari, bulan, tahun] = tanggal.split('/')
    const date = new Date(`${tahun}-${bulan}-${hari}`)
    return Number.isNaN(date.getTime()) ? 0 : date.getTime()
  }
  const date = new Date(raw)
  return Number.isNaN(date.getTime()) ? 0 : date.getTime()
}

export async function fetchRaporSiswa(idSiswa: string): Promise<DataRapor | null> {
  const id = teks(idSiswa)
  if (!id) return null

  const { data: siswaRow, error: galatSiswa } = await supabase
    .from('siswa')
    .select('id_siswa,nama_siswa,kelas,unit,id_pembimbing,nis')
    .eq('id_siswa', id)
    .maybeSingle()

  if (galatSiswa || !siswaRow) return null

  const nama = teks(siswaRow.nama_siswa)
  const kelas = teks(siswaRow.kelas)
  const unit = teks(siswaRow.unit)
  const nis = teks(siswaRow.nis)

  const [tahfidzRes, qiroahRes, ujianRes, surahs, pejabat, diri] = await Promise.all([
    supabase
      .from('setoran_tahfidz')
      .select(
        'tanggal,hafalan_baru,ayat_mulai,ayat_selesai,status,keterangan,keterangan_pesan_hafalan,tugas_rumah,murojaah,surah_ziyadah,surah_murojaah',
      )
      .eq('id_siswa', id)
      .order('tanggal', { ascending: false })
      .limit(80),
    supabase
      .from('setoran_qiroah')
      .select('tanggal,jilid,halaman,status,catatan,nilai,ustadz')
      .eq('id_siswa', id)
      .order('tanggal', { ascending: false })
      .limit(80),
    supabase
      .from('rekapan')
      .select('tanggal_ujian,jilid_asal,jilid_tujuan,nilai_akhir,predikat,keputusan')
      .eq('id_siswa', id)
      .order('tanggal_ujian', { ascending: false })
      .limit(12),
    fetchAllSurah(),
    fetchPejabatUntukCetak({ unit, kelas, idSiswa: id, namaSiswa: nama }),
    ambilDataDiri(nama, kelas, nis),
  ])
  const idsPembimbing = teks(siswaRow.id_pembimbing)
    .split(/[,;]/)
    .map((item) => item.trim())
    .filter(Boolean)

  let pembimbing = ''
  let pembimbingNiy = ''
  if (idsPembimbing.length > 0) {
    const { data: guru } = await supabase
      .from('users')
      .select('target_id,nama_lengkap')
      .in('target_id', idsPembimbing)
    pembimbing = (guru || [])
      .map((row) => teks(row.nama_lengkap))
      .filter(Boolean)
      .join(', ')
  }

  const setoranTahfidz = [...(tahfidzRes.data || [])].sort((a, b) => parseTanggal(b.tanggal) - parseTanggal(a.tanggal))
  const setoranQiroah = [...(qiroahRes.data || [])].sort((a, b) => parseTanggal(b.tanggal) - parseTanggal(a.tanggal))

  const petaJuz = new Map<string, { capaian: string; jumlah: number; catatan: string; waktu: number }>()
  for (const row of setoranTahfidz) {
    const ziyadah = formatZiyadahRecord(row)
    const namaSurah = teks(row.surah_ziyadah) || teks(row.hafalan_baru)
    const surah = surahs.find((item) => {
      const a = normalSurah(item.nama_surat)
      const b = normalSurah(namaSurah)
      return a && b && (a === b || a.includes(b) || b.includes(a))
    })
    const kunciJuz = surah ? `Juz ${surah.juz}` : 'Belum terpetakan'
    const waktu = parseTanggal(row.tanggal)
    const lama = petaJuz.get(kunciJuz)
    if (!lama) {
      petaJuz.set(kunciJuz, {
        capaian: ziyadah,
        jumlah: 1,
        catatan: teks(row.keterangan_pesan_hafalan) || teks(row.keterangan) || teks(row.status),
        waktu,
      })
      continue
    }
    lama.jumlah += 1
    if (waktu >= lama.waktu) {
      lama.capaian = ziyadah
      lama.catatan = teks(row.keterangan_pesan_hafalan) || teks(row.keterangan) || lama.catatan
      lama.waktu = waktu
    }
  }

  const tahfidz = Array.from(petaJuz.entries())
    .map(([juz, item]) => ({ juz, capaian: item.capaian, jumlah: item.jumlah, catatan: item.catatan }))
    .sort((a, b) => a.juz.localeCompare(b.juz, 'id', { numeric: true }))

  const terakhirTahfidz = setoranTahfidz[0]
  const terakhirQiroah = setoranQiroah[0]
  const capaianQiroah = formatCapaianQiroah(terakhirQiroah) || '-'
  const target = targetQiroahKelas(kelas)
  const { semester, tahunAjaran } = periodeAjaran()

  return {
    siswa: {
      idSiswa: id,
      nama,
      nis: nis || teks(diri?.nomor_induk_sekolah),
      nisn: teks(diri?.nisn),
      kelas,
      unit,
      jenisKelamin: teks(diri?.jenis_kelamin),
      pembimbing,
      pembimbingNiy,
    },
    semester,
    tahunAjaran,
    tanggalCetak: tanggalPanjang(),
    tahfidz,
    ziyadahTerakhir: terakhirTahfidz ? formatZiyadahRecord(terakhirTahfidz) : '-',
    murojaahTerakhir: terakhirTahfidz ? formatMurojaahRecord(terakhirTahfidz) : '-',
    catatanTahfidz: teks(terakhirTahfidz?.keterangan_pesan_hafalan) || teks(terakhirTahfidz?.keterangan) || teks(terakhirTahfidz?.tugas_rumah),
    qiroah: {
      capaian: capaianQiroah,
      target,
      memenuhi: cekTargetQiroahSiswa(kelas, capaianQiroah),
      catatan: teks(terakhirQiroah?.catatan) || teks(terakhirQiroah?.status),
      jumlah: setoranQiroah.length,
    },
    ujian: (ujianRes.data || []).map((row) => {
      const peta = pemetaanKenaikanJilid('', teks(row.jilid_asal), teks(row.jilid_tujuan))
      return {
      tanggal: tanggalPanjang(teks(row.tanggal_ujian)),
      jilidAsal: peta.asal,
      jilidTujuan: peta.tujuan,
      nilai: teks(row.nilai_akhir),
      predikat: teks(row.predikat),
      keputusan: teks(row.keputusan),
    }
    }),
    kepsek: pejabat.kepsek,
    lokasi: pejabat.lokasi || unit || 'Nogosari',
  }
}
