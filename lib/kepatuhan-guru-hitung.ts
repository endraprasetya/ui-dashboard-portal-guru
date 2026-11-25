import { isKelasAlumni, unitSama, type UserGuru } from '@/lib/siswa'
import { namaPengujiCocok, normalKelas, teacherDisplayName } from '@/lib/qiroah'

export type StatusKepatuhan = 'Sudah' | 'Belum' | 'Tidak tercatat'

export type BarisKepatuhanGuru = {
  nama: string
  unit: string
  jurnal: StatusKepatuhan
  qiroah: StatusKepatuhan
  tahfidz: StatusKepatuhan
}

export type AkunGuruKepatuhan = UserGuru & { role?: string | null }

export type MasukanKepatuhanGuru = {
  unit: string
  hari: string
  guru: AkunGuruKepatuhan[]
  siswa: { id_siswa?: string | null; kelas?: string | null; id_pembimbing?: string | null; unit?: string | null }[]
  jurnal: { tanggal?: unknown; kelas?: string | null; guru?: string | null }[]
  qiroah: { tanggal?: unknown; ustadz?: string | null; unit?: string | null; id_siswa?: string | null }[]
  tahfidz: { tanggal?: unknown; id_siswa?: string | null; nama_ustadz?: string | null }[]
  jurnalGagal?: boolean
  qiroahGagal?: boolean
  tahfidzGagal?: boolean
}

/** Tanggal kalender Asia/Jakarta, supaya tengah malam tidak ikut tanggal UTC. */
export function hariIniWib(sekarang = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(sekarang)
}

export function hariBerikutnya(hari: string) {
  const [tahun, bulan, tanggal] = hari.split('-').map(Number)
  return new Date(Date.UTC(tahun, bulan - 1, tanggal + 1)).toISOString().slice(0, 10)
}

/** Awal dan akhir hari WIB sebagai UTC, supaya setoran tengah malam tidak jatuh ke tanggal UTC. */
export function rentangHariWib(hari: string) {
  const [tahun, bulan, tanggal] = hari.split('-').map(Number)
  const awal = new Date(Date.UTC(tahun, bulan - 1, tanggal, -7))
  const akhir = new Date(Date.UTC(tahun, bulan - 1, tanggal + 1, -7))
  return { awal: awal.toISOString(), akhir: akhir.toISOString() }
}

/** Date-only dibiarkan apa adanya. Timestamp diubah ke tanggal WIB. */
export function tanggalKeHariWib(nilai: unknown) {
  const teks = String(nilai ?? '').trim()
  if (!teks) return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(teks.slice(0, 10)) && teks.length <= 10) return teks.slice(0, 10)
  const waktu = Date.parse(teks)
  if (!Number.isFinite(waktu)) return ''
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date(waktu))
}

function unitDariKelas(kelas?: string | null) {
  const teks = String(kelas || '').trim()
  const batas = teks.indexOf('::')
  if (batas <= 0) return ''
  return teks.slice(0, batas).trim()
}

function kelasTampil(kelas?: string | null) {
  const teks = String(kelas || '').trim()
  const batas = teks.indexOf('::')
  return batas > 0 ? teks.slice(batas + 2).trim() : teks
}

function peranKepala(role?: string | null) {
  const peran = String(role || '').trim().toLowerCase()
  return peran.includes('kepala') || peran.includes('kepsek')
}

function cocokIdentitas(guru: UserGuru, catatan: unknown) {
  const teks = String(catatan ?? '').trim()
  if (!teks) return false
  const id = teks.toUpperCase()
  for (const token of [guru.target_id, guru.id_user, guru.username, guru.nama_lengkap, guru.nama]) {
    const nilai = String(token || '').trim()
    if (nilai && nilai.toUpperCase() === id) return true
  }
  const nama = teacherDisplayName(guru)
  if (nama && nama !== 'Guru' && namaPengujiCocok(nama, teks)) return true
  const username = String(guru.username || '').trim()
  return Boolean(username && namaPengujiCocok(username, teks))
}

function cocokBinaan(pembimbing: string | null | undefined, guru: UserGuru) {
  const daftar = String(pembimbing || '')
    .split(/[,;]/)
    .map((item) => item.trim())
    .filter(Boolean)
  if (!daftar.length) return false
  const identitas = new Set(
    [guru.target_id, guru.id_user, guru.username, guru.nip, guru.NIP]
      .map((nilai) => String(nilai || '').trim().toUpperCase())
      .filter((nilai) => nilai.length >= 2),
  )
  const nama = teacherDisplayName(guru)
  for (const token of daftar) {
    if (identitas.has(token.toUpperCase())) return true
    // ID seperti U074 tidak boleh dinormalisasi menjadi huruf "u", karena itu mencocokkan semua guru.
    if (/^u\d+$/i.test(token)) continue
    if (nama && nama !== 'Guru' && namaPengujiCocok(nama, token)) return true
  }
  return false
}

function statusKanal(gagal: boolean | undefined, sudah: boolean): StatusKepatuhan {
  if (gagal) return 'Tidak tercatat'
  return sudah ? 'Sudah' : 'Belum'
}

/**
 * Satu guru dihitung Sudah bila catatan hari ini cocok dengan nama atau ID-nya,
 * atau kegiatan itu milik siswa/kelas binaan guru di unit yang sama.
 */
export function susunKepatuhanGuru(masukan: MasukanKepatuhanGuru): BarisKepatuhanGuru[] {
  const hari = masukan.hari
  const siswaUnit = masukan.siswa.filter((row) => unitSama(row.unit, masukan.unit) && !isKelasAlumni(row.kelas))
  const idSiswaUnit = new Set(siswaUnit.map((row) => String(row.id_siswa || '').trim()).filter(Boolean))

  const jurnalHari = masukan.jurnal.filter((row) => tanggalKeHariWib(row.tanggal) === hari)
  const jurnalUnit = jurnalHari.filter((row) => {
    const tertanda = unitDariKelas(row.kelas)
    if (tertanda) return unitSama(tertanda, masukan.unit)
    return false
  })
  const jurnalTanpaUnit = jurnalHari.filter((row) => !unitDariKelas(row.kelas))
  const qiroahHari = masukan.qiroah.filter((row) => {
    if (tanggalKeHariWib(row.tanggal) !== hari || !unitSama(row.unit, masukan.unit)) return false
    const id = String(row.id_siswa || '').trim()
    return !id || idSiswaUnit.has(id)
  })
  const tahfidzHari = masukan.tahfidz.filter(
    (row) => tanggalKeHariWib(row.tanggal) === hari && idSiswaUnit.has(String(row.id_siswa || '')),
  )

  const unik = new Map<string, BarisKepatuhanGuru>()
  for (const akun of masukan.guru) {
    if (!unitSama(akun.unit, masukan.unit) || peranKepala(akun.role)) continue
    const nama = teacherDisplayName(akun)
    if (!nama || nama === 'Guru') continue
    const siswaBinaan = new Set<string>()
    const kelasBinaan = new Set<string>()
    for (const siswa of siswaUnit) {
      if (!cocokBinaan(siswa.id_pembimbing, akun)) continue
      const id = String(siswa.id_siswa || '').trim()
      if (id) siswaBinaan.add(id)
      const kelas = normalKelas(siswa.kelas)
      if (kelas) kelasBinaan.add(kelas)
    }
    const jurnalSudah =
      jurnalUnit.some(
        (row) => cocokIdentitas(akun, row.guru) || kelasBinaan.has(normalKelas(kelasTampil(row.kelas))),
      ) || jurnalTanpaUnit.some((row) => cocokIdentitas(akun, row.guru))
    const qiroahSudah = qiroahHari.some(
      (row) => cocokIdentitas(akun, row.ustadz) || siswaBinaan.has(String(row.id_siswa || '')),
    )
    const tahfidzSudah = tahfidzHari.some(
      (row) => cocokIdentitas(akun, row.nama_ustadz) || siswaBinaan.has(String(row.id_siswa || '')),
    )
    const baris: BarisKepatuhanGuru = {
      nama,
      unit: masukan.unit,
      jurnal: statusKanal(masukan.jurnalGagal, jurnalSudah),
      qiroah: statusKanal(masukan.qiroahGagal, qiroahSudah),
      tahfidz: statusKanal(masukan.tahfidzGagal, tahfidzSudah),
    }
    const kunci = `${nama.toLowerCase()}|${masukan.unit}`
    const lama = unik.get(kunci)
    if (!lama) {
      unik.set(kunci, baris)
      continue
    }
    const gabung = (a: StatusKepatuhan, b: StatusKepatuhan): StatusKepatuhan => {
      if (a === 'Sudah' || b === 'Sudah') return 'Sudah'
      if (a === 'Belum' || b === 'Belum') return 'Belum'
      return 'Tidak tercatat'
    }
    unik.set(kunci, {
      ...lama,
      jurnal: gabung(lama.jurnal, baris.jurnal),
      qiroah: gabung(lama.qiroah, baris.qiroah),
      tahfidz: gabung(lama.tahfidz, baris.tahfidz),
    })
  }

  return [...unik.values()].sort(
    (a, b) => Number(a.jurnal === 'Sudah') - Number(b.jurnal === 'Sudah') || a.nama.localeCompare(b.nama, 'id'),
  )
}
