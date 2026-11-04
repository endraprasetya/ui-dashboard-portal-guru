import { supabase } from '@/lib/supabase'

export type BarisSetting = {
  nama_variabel: string
  nilai: string
  niy: string
  keterangan: string
}

export type PejabatCetak = {
  nama: string
  niy: string
}

export type KonteksCetakPejabat = {
  unit: string
  kelas?: string
  penguji?: string
  guruPengampu?: string
  jenisKelamin?: string
  idSiswa?: string
  namaSiswa?: string
}

export type PejabatCetakTerselesaikan = {
  unit: string
  lokasi: string
  kepsek: PejabatCetak
  koordinator: PejabatCetak
  pengujiNiy: string
  jenisAsrama: 'Putra' | 'Putri' | null
}

function teks(value: unknown) {
  const hasil = String(value ?? '')
    .replace(/\r\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (!hasil || hasil === '-' || hasil.toLowerCase() === 'null') return ''
  return hasil
}

function kunci(nama: string) {
  return teks(nama)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function slugUnit(unit?: string) {
  return teks(unit).replace(/^unit\s+/i, '')
}

function judulUnit(unit: string) {
  const bersih = slugUnit(unit)
  if (!bersih) return ''
  return bersih.replace(/\b\w/g, (huruf) => huruf.toUpperCase())
}

function normalNama(nama: string) {
  return kunci(
    teks(nama)
      .replace(/,/g, ' ')
      .replace(/\b(s\.?\s*pd\.?|s\.?\s*ag\.?|s\.?\s*pi\.?|b\.?\s*a\.?|m\.?\s*pd\.?)\b/gi, ''),
  )
}

function tokenNama(nama: string) {
  return normalNama(nama)
    .split(' ')
    .filter((item) => item.length > 2)
}

export function namaPejabatCocok(cari: string, nilaiSetting: string) {
  const a = normalNama(cari)
  const b = normalNama(nilaiSetting)
  if (!a || !b) return false
  if (a === b) return true
  if (a.includes(b) || b.includes(a)) return true

  const ta = tokenNama(cari)
  const tb = tokenNama(nilaiSetting)
  if (ta.length === 0 || tb.length === 0) return false

  const cocok = ta.filter((t) => tb.some((u) => u === t || u.includes(t) || t.includes(u)))
  if (cocok.length >= 2) return true
  return cocok.some((t) => t.length >= 6)
}

function putraPutriDariVariabel(namaVar: string): 'Putra' | 'Putri' | null {
  const k = kunci(namaVar)
  if (k.includes('putri')) return 'Putri'
  if (k.includes('putra')) return 'Putra'
  return null
}

function jenisDariKelamin(jenisKelamin?: string): 'Putra' | 'Putri' | null {
  const k = kunci(jenisKelamin || '')
  if (k.includes('putri') || k.includes('perempuan') || k === 'w' || k.includes('wanita')) return 'Putri'
  if (k.includes('putra') || k.includes('laki') || k === 'l') return 'Putra'
  return null
}

/** Unit yang dikenali dari baris setting, mis. Kepsek_Nogosari / Unit_Sekolah_Kartasura. */
export function daftarUnitSetting(baris: BarisSetting[]) {
  const hasil: string[] = []
  for (const row of baris) {
    const k = kunci(row.nama_variabel)
    const kepsek = k.match(/^kepsek (.+)$/)
    const sekolah = k.match(/^unit sekolah (.+)$/)
    const potongan = (kepsek?.[1] || sekolah?.[1] || '').trim()
    if (!potongan) continue
    const nama = judulUnit(potongan)
    if (nama && !hasil.some((item) => kunci(item) === kunci(nama))) hasil.push(nama)
  }
  return hasil
}

export function kenaliUnit(baris: BarisSetting[], unitMentah?: string) {
  const dikenal = daftarUnitSetting(baris)
  const sumber = kunci(slugUnit(unitMentah))
  if (!sumber) return ''

  const tepat = dikenal.find((item) => kunci(item) === sumber)
  if (tepat) return tepat

  const memuat = dikenal.find((item) => sumber.includes(kunci(item)) || kunci(item).includes(sumber))
  if (memuat) return memuat

  return judulUnit(unitMentah || '')
}

function unitDariNamaVariabel(namaVar: string, dikenal: string[]) {
  const k = kunci(namaVar)
  return dikenal.find((item) => k.includes(kunci(item))) || ''
}

function barisUntukUnit(namaVar: string, unit: string, dikenal: string[]) {
  const unitBaris = unitDariNamaVariabel(namaVar, dikenal)
  const unitSiswa = kunci(unit)
  if (!unitSiswa || !unitBaris) return false
  return kunci(unitBaris) === unitSiswa
}

function cariKepsek(baris: BarisSetting[], unit: string, dikenal: string[]): PejabatCetak {
  if (!kunci(unit)) return { nama: '', niy: '' }

  const exact = kunci(`Kepsek_${unit}`)
  for (const row of baris) {
    if (kunci(row.nama_variabel) === exact) {
      return { nama: teks(row.nilai), niy: teks(row.niy) }
    }
  }

  for (const row of baris) {
    const k = kunci(row.nama_variabel)
    if (!k.startsWith('kepsek ')) continue
    if (!barisUntukUnit(row.nama_variabel, unit, dikenal)) continue
    return { nama: teks(row.nilai), niy: teks(row.niy) }
  }

  return { nama: '', niy: '' }
}

function cariKoordinator(baris: BarisSetting[], unit: string, jenis: 'Putra' | 'Putri', dikenal: string[]): PejabatCetak {
  if (!kunci(unit)) return { nama: '', niy: '' }

  const exact = kunci(`Koordinator_QQ_${unit}_${jenis}`)
  for (const row of baris) {
    if (kunci(row.nama_variabel) === exact) {
      return { nama: teks(row.nilai), niy: teks(row.niy) }
    }
  }

  for (const row of baris) {
    const k = kunci(row.nama_variabel)
    if (!k.includes('koordinator') || !k.includes('qq')) continue
    if (!barisUntukUnit(row.nama_variabel, unit, dikenal)) continue
    if (putraPutriDariVariabel(row.nama_variabel) !== jenis) continue
    return { nama: teks(row.nilai), niy: teks(row.niy) }
  }

  return { nama: '', niy: '' }
}

function cariPenguji(baris: BarisSetting[], unit: string, dikenal: string[], ...nama: string[]) {
  const kandidat = baris.filter((row) => {
    const k = kunci(row.nama_variabel)
    if (!k.includes('penguji')) return false
    if (unit && dikenal.length > 0) return barisUntukUnit(row.nama_variabel, unit, dikenal)
    return true
  })

  for (const cari of nama) {
    const teksCari = teks(cari)
    if (!teksCari) continue
    for (const row of kandidat) {
      if (namaPejabatCocok(teksCari, row.nilai)) {
        return {
          niy: teks(row.niy),
          jenis: putraPutriDariVariabel(row.nama_variabel),
          unit: unitDariNamaVariabel(row.nama_variabel, dikenal),
        }
      }
    }
  }

  return { niy: '', jenis: null as 'Putra' | 'Putri' | null, unit: '' }
}

export function resolvePejabatCetak(baris: BarisSetting[], ctx: KonteksCetakPejabat): PejabatCetakTerselesaikan {
  const dikenal = daftarUnitSetting(baris)
  const pengujiAwal = cariPenguji(baris, kenaliUnit(baris, ctx.unit), dikenal, ctx.guruPengampu || '', ctx.penguji || '')
  const unit = kenaliUnit(baris, ctx.unit) || pengujiAwal.unit || (dikenal.includes('Nogosari') ? 'Nogosari' : '')
  const penguji = unit && pengujiAwal.unit && kunci(pengujiAwal.unit) !== kunci(unit)
    ? cariPenguji(baris, unit, dikenal, ctx.guruPengampu || '', ctx.penguji || '')
    : pengujiAwal

  const jenis = penguji.jenis || jenisDariKelamin(ctx.jenisKelamin) || 'Putra'
  const lokasi = unit

  return {
    unit,
    lokasi,
    kepsek: cariKepsek(baris, unit, dikenal),
    koordinator: cariKoordinator(baris, unit, jenis, dikenal),
    pengujiNiy: penguji.niy,
    jenisAsrama: jenis,
  }
}

export async function fetchSettingCetak(): Promise<BarisSetting[]> {
  const { data, error } = await supabase.from('setting').select('nama_variabel,nilai,niy,keterangan')

  if (error) {
    console.error('Gagal memuat setting cetak:', error.message)
    return []
  }

  return (data || []).map((row) => ({
    nama_variabel: teks(row.nama_variabel),
    nilai: teks(row.nilai),
    niy: teks(row.niy),
    keterangan: teks(row.keterangan),
  }))
}

async function unitDariSiswa(ctx: KonteksCetakPejabat) {
  const id = teks(ctx.idSiswa)
  const nama = teks(ctx.namaSiswa)
  const kelas = teks(ctx.kelas)
  const kosong = { unit: '', jenisKelamin: '' }

  const baca = (row: { unit?: string; jenis_kelamin?: string } | null) => ({
    unit: teks(row?.unit),
    jenisKelamin: teks(row?.jenis_kelamin),
  })

  if (id) {
    const lengkap = await supabase.from('siswa').select('unit,jenis_kelamin').eq('id_siswa', id).limit(1).maybeSingle()
    if (!lengkap.error && lengkap.data) {
      const hasil = baca(lengkap.data)
      if (hasil.unit || hasil.jenisKelamin) return hasil
    }
    const cadangan = await supabase.from('siswa').select('unit').eq('id_siswa', id).limit(1).maybeSingle()
    if (!cadangan.error && cadangan.data) {
      const hasil = baca(cadangan.data)
      if (hasil.unit) return hasil
    }
  }

  if (nama && kelas) {
    const lengkap = await supabase
      .from('siswa')
      .select('unit,jenis_kelamin')
      .eq('nama_siswa', nama)
      .eq('kelas', kelas)
      .limit(1)
      .maybeSingle()
    if (!lengkap.error && lengkap.data) return baca(lengkap.data)
    const cadangan = await supabase
      .from('siswa')
      .select('unit')
      .eq('nama_siswa', nama)
      .eq('kelas', kelas)
      .limit(1)
      .maybeSingle()
    if (!cadangan.error && cadangan.data) return baca(cadangan.data)
  }

  return kosong
}

export async function fetchPejabatUntukCetak(ctx: KonteksCetakPejabat): Promise<PejabatCetakTerselesaikan> {
  const baris = await fetchSettingCetak()
  let unit = teks(ctx.unit)
  let jenisKelamin = teks(ctx.jenisKelamin)

  if (!kenaliUnit(baris, unit) || !jenisKelamin) {
    const siswa = await unitDariSiswa(ctx)
    if (!unit) unit = siswa.unit
    if (!jenisKelamin) jenisKelamin = siswa.jenisKelamin
  }

  return resolvePejabatCetak(baris, { ...ctx, unit, jenisKelamin })
}
