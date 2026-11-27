import { normalKelas, namaPengujiCocok, teacherDisplayName } from '@/lib/qiroah'

/** Pemetaan resmi wali kelas 1A–6D (tanpa mengubah `role` di tabel user). */
export const WALI_KELAS_PENGADUAN: Record<string, string> = {
  '1A': 'Irvan Dwi Raharjo, S.Ds',
  '1B': 'Wisono, S.Pd',
  '1C': 'Ima Karmila Karim, S.Pd.I',
  '1D': 'Warsi, S.Pd',
  '2A': 'Haryono, S.Pd',
  '2B': 'Heru Purnomo, S.Pd',
  '2C': 'Novitasari, S.Sos',
  '2D': 'Dwi Mei Supianti, S.Pd',
  '3A': 'Daffa Arifian Zaky, S.Pd',
  '3B': 'Muqorrobin, S.Pd',
  '3C': 'Suginem, S.Pd',
  '3D': 'Ambar Novitasari, S.Pd',
  '4A': 'Musa Abdulloh',
  '4B': 'Yulianto, S.Pd',
  '4C': 'Shabrina Silmi',
  '4D': 'Titik Dwi Retno Palupi, A.Md.Kes',
  '5A': 'Andreas Haryanto, S.Pd',
  '5B': 'Muhammad Arifin, S.Pd',
  '5C': 'Erni Fasichah, S.Pd',
  '5D': 'Riskha Fatmaningrum, S.Pd',
  '6A': 'Muhamad Musthofa Imtikhan',
  '6B': 'Ery Kristyono, S.Pd',
  '6C': 'Siswati, S.Pd',
  '6D': 'Imilda, S.Si',
}

export const WAKA_PENGADUAN = [
  { kunci: 'waka:kurikulum', jabatan: 'Waka Kurikulum', label: 'Waka Kurikulum' },
  { kunci: 'waka:kesiswaan', jabatan: 'Waka Kesiswaan', label: 'Waka Kesiswaan' },
  { kunci: 'waka:sarpras', jabatan: 'Waka Sarana Prasarana', label: 'Waka Sarana Prasarana' },
  { kunci: 'waka:aik', jabatan: 'Waka AIK / Tahfidz', label: 'Waka AIK / Tahfidz' },
] as const

export type OpsiPenerusanPengaduan = {
  kunci: string
  nama: string
  jabatan: string
  label: string
}

const KELAS_WALI = Object.keys(WALI_KELAS_PENGADUAN).sort((a, b) =>
  a.localeCompare(b, undefined, { numeric: true }),
)

export function daftarOpsiPenerusanPengaduan(): OpsiPenerusanPengaduan[] {
  const wali: OpsiPenerusanPengaduan[] = KELAS_WALI.map((kelas) => {
    const nama = WALI_KELAS_PENGADUAN[kelas]
    return {
      kunci: `wk:${kelas}`,
      nama,
      jabatan: `Wali kelas ${kelas}`,
      label: `${kelas} — ${nama}`,
    }
  })
  const waka: OpsiPenerusanPengaduan[] = WAKA_PENGADUAN.map((baris) => ({
    kunci: baris.kunci,
    nama: '',
    jabatan: baris.jabatan,
    label: baris.label,
  }))
  return [...wali, ...waka]
}

export function opsiPenerusanDariKunci(kunci: string): OpsiPenerusanPengaduan | null {
  const k = String(kunci || '').trim()
  if (!k) return null
  return daftarOpsiPenerusanPengaduan().find((item) => item.kunci === k) || null
}

export function normalKelasAnakPengaduan(kelas?: string) {
  const mentah = String(kelas || '').trim()
  if (!mentah) return ''
  const kandidat = mentah.match(/\b[1-6]\s*[A-Da-d]\b/)?.[0] || mentah
  return normalKelas(kandidat)
}

export function opsiWaliKelasDariKelasAnak(kelasAnak: string): OpsiPenerusanPengaduan | null {
  const kelas = normalKelasAnakPengaduan(kelasAnak)
  if (!kelas || !WALI_KELAS_PENGADUAN[kelas]) return null
  return opsiPenerusanDariKunci(`wk:${kelas}`)
}

export function teksTujuanPenerusan(opsi: OpsiPenerusanPengaduan) {
  if (opsi.nama) return `${opsi.jabatan} · ${opsi.nama}`
  return opsi.jabatan
}

/** Kolom `penerima_jenis` + `penerima_kelas` → kunci internal dropdown (`wk:1A`, `waka:kurikulum`). */
export function kunciDariPenerimaSkema(penerimaJenis: string, penerimaKelas: string) {
  const jenis = String(penerimaJenis || '').trim().toLowerCase()
  const kelas = normalKelas(penerimaKelas)
  if (jenis === 'wali_kelas' && kelas) return `wk:${kelas}`
  if (jenis === 'waka' && kelas) return `waka:${kelas.toLowerCase()}`
  if (jenis.startsWith('waka:')) return jenis
  if (jenis.startsWith('wk:')) return jenis
  return ''
}

export function skemaPenerimaDariOpsi(opsi: OpsiPenerusanPengaduan) {
  if (opsi.kunci.startsWith('wk:')) {
    return {
      penerima_jenis: 'wali_kelas',
      penerima_kelas: opsi.kunci.slice(3),
      penerima_nama: opsi.nama || null,
    }
  }
  const slug = opsi.kunci.replace(/^waka:/, '')
  return {
    penerima_jenis: 'waka',
    penerima_kelas: slug,
    penerima_nama: opsi.nama || null,
  }
}

const WAKA_ROLE: { kunci: string; pola: RegExp }[] = [
  { kunci: 'waka:kurikulum', pola: /kurikulum/i },
  { kunci: 'waka:kesiswaan', pola: /kesiswaan/i },
  { kunci: 'waka:sarpras', pola: /sarana|sarpras|prasarana/i },
  { kunci: 'waka:aik', pola: /\baik\b|tahfidz|tahfid/i },
]

export function kunciPenerimaUntukGuru(user?: unknown): string[] {
  const nama = teacherDisplayName(user)
  const kunci = new Set<string>()
  for (const [kelas, guru] of Object.entries(WALI_KELAS_PENGADUAN)) {
    if (namaPengujiCocok(nama, guru)) kunci.add(`wk:${kelas}`)
  }
  const role = String((user as { role?: string })?.role || '')
  for (const baris of WAKA_ROLE) {
    if (baris.pola.test(role)) kunci.add(baris.kunci)
  }
  return [...kunci]
}

export function guruMenerimaPengaduan(
  user: unknown,
  input: {
    penerimaKunci?: string
    penerimaJenis?: string
    penerimaKelas?: string
    penerimaNama?: string
    tujuanPenerusan?: string
    statusAlur?: string
  },
) {
  if (input.statusAlur !== 'diteruskan') return false
  const kunci =
    String(input.penerimaKunci || '').trim() ||
    kunciDariPenerimaSkema(input.penerimaJenis || '', input.penerimaKelas || '')
  const milik = kunciPenerimaUntukGuru(user)
  if (kunci && milik.includes(kunci)) return true
  const namaGuru = teacherDisplayName(user)
  const namaPenerima = String(input.penerimaNama || '').trim()
  if (namaPenerima && namaPengujiCocok(namaGuru, namaPenerima)) return true
  const tujuan = String(input.tujuanPenerusan || '').trim()
  if (tujuan) {
    if (namaPengujiCocok(namaGuru, tujuan)) return true
    for (const [kelas, guru] of Object.entries(WALI_KELAS_PENGADUAN)) {
      if (milik.includes(`wk:${kelas}`) && tujuan.includes(kelas)) return true
      if (namaPengujiCocok(namaGuru, guru) && tujuan.includes(kelas)) return true
    }
    for (const baris of WAKA_PENGADUAN) {
      if (milik.includes(baris.kunci) && tujuan.toLowerCase().includes(baris.jabatan.toLowerCase().slice(5))) return true
    }
  }
  return false
}

export function guruBerpotensiMenerimaPengaduan(user?: unknown) {
  return kunciPenerimaUntukGuru(user).length > 0
}