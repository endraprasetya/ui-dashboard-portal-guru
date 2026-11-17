import { supabase } from '@/lib/supabase'
import { adalahKasir, type AkunSesi } from '@/lib/bendahara'
import { kanonNamaUnit, unitDariAkun, type Siswa } from '@/lib/siswa'

export const KODE_AKUN_KAS = ['3101', '3102', '3103'] as const
export const STATUS_DRAFT = 'Draft'
export const STATUS_DISETUJUI = 'Disetujui'
export const STATUS_DITOLAK = 'Ditolak'

export type JenisTransaksiKas = 'Penerimaan' | 'Pengeluaran'
export type StatusTransaksiKas = typeof STATUS_DRAFT | typeof STATUS_DISETUJUI | typeof STATUS_DITOLAK

export type BarisAkun = {
  kode_akun: string
  nama_akun: string
  kategori: 'Penerimaan' | 'Pengeluaran' | 'Kas'
  is_active?: boolean
}

export type ItemTransaksiKas = {
  kode_akun: string
  nominal: number
  kode_tagihan?: string | null
  tapel_tagihan?: string | null
  nama_akun?: string | null
  nama_tagihan?: string | null
}

export type TransaksiKas = {
  nomor_bukti: string
  tanggal: string
  jenis_transaksi: JenisTransaksiKas
  kode_akun: string
  akun_kas_bank: string
  nominal: number
  items: ItemTransaksiKas[]
  id_siswa?: string | null
  nis?: string | null
  nama_siswa?: string | null
  uraian?: string | null
  kode_tagihan?: string | null
  tapel_tagihan?: string | null
  status: StatusTransaksiKas
  unit?: string | null
  dicatat_oleh?: string | null
  divalidasi_oleh?: string | null
  catatan_validasi?: string | null
  created_at?: string
}

export type InputItemTransaksiKas = {
  kode_akun: string
  nominal: number
  kode_tagihan?: string
  tapel_tagihan?: string
  nama_akun?: string
  nama_tagihan?: string
}

export type InputTransaksiKas = {
  tanggal: string
  jenis_transaksi: JenisTransaksiKas
  akun_kas_bank: string
  items: InputItemTransaksiKas[]
  id_siswa?: string
  nis?: string
  nama_siswa?: string
  uraian: string
  dicatat_oleh: string
  unit?: string
}

export type PembayaranKas = {
  nomor_bukti: string
  kode_akun: string
  nominal: number
  id_siswa?: string | null
  nis?: string | null
  nama_siswa?: string | null
  kode_tagihan?: string | null
  tapel_tagihan?: string | null
  unit?: string | null
}

function simpanSesi(user: AkunSesi) {
  const { password: _sandi, ...aman } = user
  localStorage.setItem('user_session', JSON.stringify(aman))
}

export type HasilValidasiKasir =
  | { status: 'ok'; user: AkunSesi }
  | { status: 'bukan'; user: AkunSesi }
  | { status: 'kosong' }

export async function validasiSesiKasir(sesi?: AkunSesi | null): Promise<HasilValidasiKasir> {
  if (!sesi) return { status: 'kosong' }
  if (!adalahKasir(sesi)) return { status: 'bukan', user: sesi }

  const username = String(sesi.username || '').trim()
  const target = String(sesi.target_id || sesi.id_user || '').trim()
  if (!username && !target) {
    localStorage.removeItem('user_session')
    return { status: 'kosong' }
  }

  let permintaan = supabase.from('users').select('*').limit(1)
  permintaan = username ? permintaan.eq('username', username) : permintaan.eq('target_id', target)

  const { data, error } = await permintaan
  if (error) throw new Error(error.message || 'Tidak dapat memvalidasi sesi Kasir.')

  const baris = (Array.isArray(data) ? data[0] : data) as AkunSesi | undefined
  if (!baris || !String(baris.username || baris.target_id || '').trim()) {
    localStorage.removeItem('user_session')
    return { status: 'kosong' }
  }

  const { password: _sandiKasir, ...barisAman } = baris
  const user: AkunSesi = {
    ...sesi,
    ...barisAman,
    target_id: baris.target_id || sesi.target_id || baris.username,
    nama_lengkap: baris.nama_lengkap || sesi.nama_lengkap || baris.username,
    unit: unitDariAkun(baris) || unitDariAkun(sesi),
    role: String(baris.role || '').trim(),
  }
  simpanSesi(user)
  if (!adalahKasir(user)) return { status: 'bukan', user }
  return { status: 'ok', user }
}

export function generateNomorBuktiKas(waktu = new Date()) {
  const pad = (n: number) => String(n).padStart(2, '0')
  const tahun = waktu.getFullYear()
  const bulan = pad(waktu.getMonth() + 1)
  const unik = `${pad(waktu.getDate())}${pad(waktu.getHours())}${pad(waktu.getMinutes())}${pad(waktu.getSeconds())}${String(waktu.getMilliseconds()).padStart(3, '0')}`
  return `BKM/${tahun}/${bulan}/${unik}`
}

export function kanonUnitKeuangan(unit?: string | null) {
  return kanonNamaUnit(unit)
}

export function unitKeuanganCocok(unitUser?: string | null, unitBaris?: string | null) {
  const a = kanonUnitKeuangan(unitUser)
  if (!a) return true
  const b = kanonUnitKeuangan(unitBaris)
  return Boolean(b) && a === b
}

export function identitasSekolahUnit(unit?: string | null) {
  const kunci = kanonUnitKeuangan(unit)
  const peta: Record<string, { yayasan: string; sekolah: string; kota: string }> = {
    Nogosari: {
      yayasan: 'Yayasan Islam Al Madinah',
      sekolah: 'SD Islam Terpadu Al Madinah Nogosari',
      kota: 'Boyolali',
    },
    Kartasura: {
      yayasan: 'Yayasan Islam Al Madinah',
      sekolah: 'SD Islam Terpadu Al Madinah Kartasura',
      kota: 'Sukoharjo',
    },
    Cepogo: {
      yayasan: 'Yayasan Islam Al Madinah',
      sekolah: 'SD Islam Terpadu Al Madinah Cepogo',
      kota: 'Boyolali',
    },
  }
  if (kunci && peta[kunci]) return { unit: kunci, ...peta[kunci] }
  const nama = String(unit || '').trim()
  return {
    unit: nama || 'Unit',
    yayasan: 'Yayasan Islam Al Madinah',
    sekolah: nama ? `SD Islam Terpadu Al Madinah ${nama}` : 'SD Islam Terpadu Al Madinah',
    kota: '',
  }
}

function statusDariBaris(baris: Record<string, unknown>): StatusTransaksiKas {
  const nilai = teks(baris.status_validasi || baris.status)
  if (nilai === STATUS_DISETUJUI || nilai === STATUS_DITOLAK) return nilai
  return STATUS_DRAFT
}

function teks(nilai: unknown) {
  return String(nilai ?? '').trim()
}

function namaKolomTidakAda(pesan: string) {
  const pola = [
    /Could not find the '([^']+)' column/i,
    /column ["'`]?([a-z0-9_]+)["'`]? does not exist/i,
    /column ["'`]?([a-z0-9_]+)["'`]? of relation/i,
  ]
  for (const uji of pola) {
    const cocok = pesan.match(uji)
    if (cocok?.[1]) return cocok[1]
  }
  return ''
}

function buangKolom(baris: Record<string, unknown>[], kolom: string) {
  return baris.map((item) => {
    const salinan = { ...item }
    delete salinan[kolom]
    return salinan
  })
}

function ringkasErrorSupabase(error: { message?: string; code?: string; details?: string; hint?: string }, baris: Record<string, unknown>[]) {
  const bagian = [error.message, error.details, error.hint].map((item) => teks(item)).filter(Boolean)
  console.error('Gagal menyimpan tabel_transaksi_kas', {
    code: error.code,
    pesan: error.message,
    details: error.details,
    hint: error.hint,
    kolom: Object.keys(baris[0] || {}),
    jumlahBaris: baris.length,
  })
  return bagian.join(' — ') || 'Gagal menyimpan transaksi ke tabel_transaksi_kas.'
}

async function sisipkanTransaksiKas(awal: Record<string, unknown>[]) {
  let baris = awal.map((item) => ({ ...item }))
  let idSiswaSudahDicobaNis = false
  for (let percobaan = 0; percobaan < 16; percobaan += 1) {
    const { error } = await supabase.from('tabel_transaksi_kas').insert(baris)
    if (!error) return
    const pesan = error.message || ''
    const kolom = namaKolomTidakAda(pesan)
    if (kolom === 'tanggal_transaksi') {
      baris = baris.map((item) => {
        const { tanggal_transaksi, ...sisa } = item
        return { ...sisa, tanggal: tanggal_transaksi || item.tanggal }
      })
      continue
    }
    if (kolom === 'tanggal') {
      baris = baris.map((item) => {
        const { tanggal, ...sisa } = item
        return { ...sisa, tanggal_transaksi: tanggal || item.tanggal_transaksi }
      })
      continue
    }
    if (kolom && baris.some((item) => Object.prototype.hasOwnProperty.call(item, kolom))) {
      baris = buangKolom(baris, kolom)
      continue
    }
    if (error.code === '23505' || /duplicate key|unique constraint|409/i.test(pesan)) {
      if (baris.length > 1) {
        throw new Error(
          ringkasErrorSupabase(error, baris) +
            ' — Multi-item harus tersimpan sebagai beberapa baris dengan nomor_bukti yang sama. Hapus unique constraint pada nomor_bukti (cukup unik bersama urutan).',
        )
      }
      const baru = generateNomorBuktiKas()
      baris = baris.map((item) => ({ ...item, nomor_bukti: baru }))
      continue
    }
    if (
      (/invalid input syntax/i.test(pesan) && /id_siswa/i.test(pesan)) ||
      (error.code === '23503' && /id_siswa/i.test(pesan))
    ) {
      if (!idSiswaSudahDicobaNis) {
        idSiswaSudahDicobaNis = true
        const berikutnya = baris.map((item) => ({ ...item, id_siswa: teks(item.nis) || teks(item.id_siswa) || null }))
        const sama = berikutnya.every((item, indeks) => item.id_siswa === baris[indeks].id_siswa)
        baris = berikutnya
        if (!sama) continue
      }
      baris = baris.map((item) => ({ ...item, id_siswa: null }))
      continue
    }
    throw new Error(ringkasErrorSupabase(error, baris))
  }
  throw new Error('Tidak dapat menyimpan transaksi ke tabel_transaksi_kas.')
}

export function labelAkunKas(kode: string) {
  if (kode === '3101') return '3101 · Kas Tunai'
  if (kode === '3102') return '3102 · Bank BRI'
  if (kode === '3103') return '3103 · Bank BSI'
  return kode
}

export function bersihkanNamaPendapatan(nama: string) {
  return String(nama || '')
    .replace(/^\s*pendapatan\s+/i, '')
    .trim()
}

export function labelRincianItem(
  item: Pick<ItemTransaksiKas, 'kode_akun' | 'nama_akun' | 'nama_tagihan'>,
  daftarAkun: BarisAkun[] = [],
) {
  const dariTagihan = bersihkanNamaPendapatan(teks(item.nama_tagihan))
  if (dariTagihan) return dariTagihan
  const dariItem = bersihkanNamaPendapatan(teks(item.nama_akun))
  if (dariItem) return dariItem
  const dariMaster = bersihkanNamaPendapatan(teks(daftarAkun.find((akun) => akun.kode_akun === item.kode_akun)?.nama_akun))
  if (dariMaster) return dariMaster
  return 'Item'
}

export async function muatDaftarAkun(): Promise<BarisAkun[]> {
  const { data, error } = await supabase
    .from('tabel_akun')
    .select('kode_akun,nama_akun,kategori,is_active')
    .order('kode_akun')
  if (error) throw new Error(error.message)
  return ((data || []) as BarisAkun[]).filter((baris) => baris.is_active !== false)
}

function kunciBukti(baris: Record<string, unknown>) {
  const nomor = teks(baris.nomor_bukti || baris.no_bukti || baris.no_pembayaran)
  if (nomor) return nomor
  return teks(baris.id)
}

function itemDariBaris(baris: Record<string, unknown>): ItemTransaksiKas[] {
  const json = baris.rincian
  if (Array.isArray(json) && json.length > 0) {
    return json
      .map((item) => {
        const det = item as Record<string, unknown>
        return {
          kode_akun: teks(det.kode_akun),
          nominal: Number(det.nominal) || 0,
          kode_tagihan: teks(det.kode_tagihan) || null,
          tapel_tagihan: teks(det.tapel_tagihan) || null,
        }
      })
      .filter((item) => item.kode_akun && item.nominal > 0)
  }
  const kode = teks(baris.kode_akun)
  const nominal = Number(baris.nominal) || 0
  if (!kode || nominal <= 0) return []
  return [
    {
      kode_akun: kode,
      nominal,
      kode_tagihan: teks(baris.kode_tagihan) || null,
      tapel_tagihan: teks(baris.tapel_tagihan) || null,
    },
  ]
}

function kelompokkanTransaksi(daftar: Record<string, unknown>[]): TransaksiKas[] {
  const peta = new Map<string, TransaksiKas>()
  const urutan: string[] = []
  const sudahJson = new Set<string>()
  for (const baris of daftar) {
    const nomor = kunciBukti(baris)
    if (!nomor) continue
    const dariJson = Array.isArray(baris.rincian) && (baris.rincian as unknown[]).length > 0
    if (dariJson && sudahJson.has(nomor)) continue
    const items = itemDariBaris(baris)
    if (dariJson) sudahJson.add(nomor)
    const ada = peta.get(nomor)
    if (ada) {
      if (dariJson) {
        ada.items = items
      } else {
        ada.items.push(...items)
      }
      ada.nominal = ada.items.reduce((jumlah, item) => jumlah + item.nominal, 0)
      if (!ada.kode_akun) ada.kode_akun = items[0]?.kode_akun || ''
      if (!ada.id_siswa) ada.id_siswa = teks(baris.id_siswa) || null
      if (!ada.nis) ada.nis = teks(baris.nis) || null
      if (!ada.nama_siswa) ada.nama_siswa = teks(baris.nama_siswa) || null
      if (!ada.unit) ada.unit = teks(baris.unit) || null
      if (!ada.tanggal) ada.tanggal = teks(baris.tanggal_transaksi || baris.tanggal || baris.created_at).slice(0, 10)
      continue
    }
    urutan.push(nomor)
    peta.set(nomor, {
      nomor_bukti: nomor,
      tanggal: teks(baris.tanggal_transaksi || baris.tanggal || baris.created_at).slice(0, 10),
      jenis_transaksi: (teks(baris.jenis_transaksi) as JenisTransaksiKas) || 'Penerimaan',
      kode_akun: items[0]?.kode_akun || teks(baris.kode_akun),
      akun_kas_bank: teks(baris.akun_kas_bank || baris.akun_kas),
      nominal: items.reduce((jumlah, item) => jumlah + item.nominal, 0),
      items,
      id_siswa: teks(baris.id_siswa) || null,
      nis: teks(baris.nis) || null,
      nama_siswa: teks(baris.nama_siswa) || null,
      uraian: teks(baris.uraian) || null,
      kode_tagihan: items[0]?.kode_tagihan || null,
      tapel_tagihan: items[0]?.tapel_tagihan || null,
      status: statusDariBaris(baris),
      unit: teks(baris.unit) || null,
      dicatat_oleh: teks(baris.dicatat_oleh) || null,
      divalidasi_oleh: teks(baris.divalidasi_oleh) || null,
      catatan_validasi: teks(baris.catatan_validasi) || null,
      created_at: teks(baris.created_at) || undefined,
    })
  }
  return urutan.map((nomor) => peta.get(nomor)!).filter(Boolean)
}

function barisSimpanTransaksi(input: InputTransaksiKas, status: StatusTransaksiKas, divalidasiOleh?: string | null) {
  const items = input.items.filter((item) => item.kode_akun && item.nominal > 0)
  if (items.length === 0) throw new Error('Minimal satu baris kode akun dan nominal harus diisi.')
  if (!KODE_AKUN_KAS.includes(input.akun_kas_bank as (typeof KODE_AKUN_KAS)[number])) {
    throw new Error('Akun kas/bank tidak dikenali. Pilih 3101, 3102, atau 3103.')
  }
  const nomorBukti = generateNomorBuktiKas()
  const uraian = input.uraian.trim() || '-'
  const unit = kanonUnitKeuangan(input.unit)
  const nis = teks(input.nis) || angkaIdentitas(input.id_siswa) || ''
  const idSiswa = teks(input.id_siswa) || nis || ''
  const validator = adalahUuid(divalidasiOleh) ? String(divalidasiOleh).trim() : null
  const baris = items.map((item, indeks) => {
    const dasar: Record<string, unknown> = {
      nomor_bukti: nomorBukti,
      tanggal_transaksi: input.tanggal,
      kode_akun: item.kode_akun,
      akun_kas_bank: input.akun_kas_bank,
      jenis_transaksi: input.jenis_transaksi,
      nominal: item.nominal,
      id_siswa: nis || idSiswa || null,
      uraian,
      status_validasi: status,
      urutan: indeks + 1,
      unit: unit || null,
      nis: nis || null,
      nama_siswa: input.nama_siswa || null,
      dicatat_oleh: input.dicatat_oleh,
      kode_tagihan: item.kode_tagihan || null,
      tapel_tagihan: item.tapel_tagihan || null,
    }
    if (status === STATUS_DISETUJUI) dasar.divalidasi_oleh = validator
    return dasar
  })
  return { nomorBukti, baris }
}

export async function simpanTransaksiDraft(input: InputTransaksiKas) {
  const { nomorBukti, baris } = barisSimpanTransaksi(input, STATUS_DRAFT)
  await sisipkanTransaksiKas(baris)
  return nomorBukti
}

/** Pencatatan langsung Bendahara: sah tanpa tahap Draft. */
export async function simpanTransaksiDisetujui(input: InputTransaksiKas, divalidasiOleh?: string | null) {
  const { nomorBukti, baris } = barisSimpanTransaksi(input, STATUS_DISETUJUI, divalidasiOleh)
  await sisipkanTransaksiKas(baris)
  return nomorBukti
}

export async function muatTransaksiKas(status?: StatusTransaksiKas, unit?: string) {
  const unitKunci = kanonUnitKeuangan(unit)
  const percobaan: Array<{ statusKolom?: 'status_validasi' | 'status'; urut?: string }> = [
    { statusKolom: status ? 'status_validasi' : undefined, urut: 'tanggal_transaksi' },
    { statusKolom: status ? 'status_validasi' : undefined, urut: 'tanggal' },
    { statusKolom: status ? 'status_validasi' : undefined, urut: 'created_at' },
    { statusKolom: status ? 'status_validasi' : undefined },
    { statusKolom: status ? 'status' : undefined, urut: 'tanggal' },
    {},
  ]
  let data: unknown[] | null = null
  let error: { message?: string; code?: string; details?: string; hint?: string } | null = null
  let saringUnitDiKueri = Boolean(unitKunci)
  for (const opsi of percobaan) {
    let permintaan = supabase.from('tabel_transaksi_kas').select('*')
    if (opsi.statusKolom && status) permintaan = permintaan.eq(opsi.statusKolom, status)
    if (saringUnitDiKueri && unitKunci) permintaan = permintaan.ilike('unit', `%${unitKunci}%`)
    if (opsi.urut) permintaan = permintaan.order(opsi.urut, { ascending: false })
    const hasil = await permintaan.limit(2000)
    error = hasil.error
    if (!error) {
      data = hasil.data
      break
    }
    console.error('Gagal memuat tabel_transaksi_kas', {
      code: error.code,
      pesan: error.message,
      details: error.details,
      hint: error.hint,
      filter: opsi,
    })
    const pesan = error.message || ''
    if (saringUnitDiKueri && /unit/i.test(pesan) && /column|schema cache|does not exist|Could not find/i.test(pesan)) {
      return []
    }
    const bisaDiulang = /column|schema cache|does not exist|404|PGRST|Could not find/i.test(pesan) || error.code === 'PGRST204' || error.code === 'PGRST205'
    if (!bisaDiulang) break
  }
  if (error || !data) {
    const pesan = [error?.message, error?.details, error?.hint].filter(Boolean).join(' — ')
    throw new Error(pesan || `Gagal memuat tabel_transaksi_kas${error?.code ? ` (${error.code})` : ''}.`)
  }
  let daftar = kelompokkanTransaksi(data as Record<string, unknown>[])
  daftar = await lengkapiIdentitasTransaksi(daftar)
  if (status) daftar = daftar.filter((item) => item.status === status)
  if (unitKunci) {
    daftar = daftar.filter((item) => unitKeuanganCocok(unitKunci, item.unit))
  }
  return daftar
}

export function adalahUuid(nilai?: string | null) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(nilai || '').trim())
}

export function uuidPengguna(user?: Record<string, unknown> | null) {
  if (!user) return null
  const kandidat = [user.id, user.user_id, user.uuid, user.id_user, user.target_id]
  for (const nilai of kandidat) {
    const teksId = String(nilai || '').trim()
    if (adalahUuid(teksId)) return teksId
  }
  return null
}

export async function validasiTransaksiKas(nomorBukti: string, status: 'Disetujui' | 'Ditolak', oleh?: string | null) {
  const kunci = nomorBukti.trim()
  const uuid = adalahUuid(oleh) ? String(oleh).trim() : null
  let patch: Record<string, unknown> = {
    status_validasi: status,
    divalidasi_oleh: uuid,
  }
  let filterDraft = true
  for (let i = 0; i < 8; i += 1) {
    let permintaan = supabase.from('tabel_transaksi_kas').update(patch).eq('nomor_bukti', kunci)
    if (filterDraft) permintaan = permintaan.eq('status_validasi', STATUS_DRAFT)
    const { error } = await permintaan
    if (!error) return
    console.error('Gagal validasi tabel_transaksi_kas', {
      code: error.code,
      pesan: error.message,
      details: error.details,
      hint: error.hint,
      nomor_bukti: kunci,
      status,
      kolom: Object.keys(patch),
    })
    const pesan = error.message || ''
    const hilang = namaKolomTidakAda(pesan)
    if (hilang && Object.prototype.hasOwnProperty.call(patch, hilang)) {
      const { [hilang]: _buang, ...sisa } = patch
      patch = sisa
      continue
    }
    if (
      Object.prototype.hasOwnProperty.call(patch, 'divalidasi_oleh') &&
      (error.code === '22P02' ||
        error.code === '23503' ||
        /invalid input syntax|foreign key|uuid/i.test(pesan))
    ) {
      if (patch.divalidasi_oleh != null) {
        patch = { ...patch, divalidasi_oleh: null }
      } else {
        const { divalidasi_oleh: _buang, ...sisa } = patch
        patch = sisa
      }
      continue
    }
    if (filterDraft && /status_validasi/i.test(pesan)) {
      filterDraft = false
      continue
    }
    throw new Error(pesan || 'Tidak dapat memvalidasi transaksi kas.')
  }
  throw new Error('Tidak dapat memvalidasi transaksi kas.')
}

export function rupiahKas(nilai: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(nilai || 0)
}

export function angkaIdentitas(nilai?: string | null) {
  return String(nilai || '').replace(/\D/g, '')
}

export function nisTampilSiswa(siswa: Pick<Siswa, 'id_siswa' | 'nis' | 'nama_siswa'> | { id_siswa?: string; nis?: string; nama_siswa?: string }) {
  const nis = angkaIdentitas(siswa.nis)
  if (nis.length >= 3) return nis
  const dariId = angkaIdentitas(siswa.id_siswa)
  return dariId || String(siswa.nis || siswa.id_siswa || '').trim()
}

export function formatLabelSiswa(siswa: Pick<Siswa, 'id_siswa' | 'nis' | 'nama_siswa'>) {
  return `${nisTampilSiswa(siswa) || '-'} - ${siswa.nama_siswa}`
}

export function labelSiswaTransaksi(item: Pick<TransaksiKas, 'id_siswa' | 'nis' | 'nama_siswa'>) {
  if (!item.nama_siswa && !item.nis && !item.id_siswa) return ''
  const nis = nisTampilSiswa({
    id_siswa: item.id_siswa || '',
    nis: item.nis || '',
    nama_siswa: item.nama_siswa || '',
  })
  if (item.nama_siswa) return `${nis || item.id_siswa || '-'} - ${item.nama_siswa}`
  return nis || String(item.id_siswa || '').trim()
}

type IdentitasSiswaKas = {
  id_siswa: string
  nis: string
  nama_siswa: string
  unit?: string | null
}

function kunciPetaSiswa(nilai?: string | null) {
  const mentah = String(nilai || '').trim()
  const angka = angkaIdentitas(mentah)
  return [...new Set([mentah, angka].filter(Boolean))]
}

async function petaIdentitasSiswa(kunci: string[]) {
  const unik = [...new Set(kunci.map((item) => String(item || '').trim()).filter(Boolean))]
  const peta = new Map<string, IdentitasSiswaKas>()
  const simpan = (ident: IdentitasSiswaKas) => {
    for (const kunciItem of [...kunciPetaSiswa(ident.id_siswa), ...kunciPetaSiswa(ident.nis)]) {
      peta.set(kunciItem, ident)
    }
  }
  for (let i = 0; i < unik.length; i += 150) {
    const bagian = unik.slice(i, i + 150)
    const { data: byId } = await supabase.from('siswa').select('id_siswa,nis,nama_siswa,unit').in('id_siswa', bagian)
    for (const baris of byId || []) {
      simpan({
        id_siswa: String((baris as IdentitasSiswaKas).id_siswa || '').trim(),
        nis: String((baris as IdentitasSiswaKas).nis || '').trim(),
        nama_siswa: String((baris as IdentitasSiswaKas).nama_siswa || '').trim(),
        unit: (baris as IdentitasSiswaKas).unit || null,
      })
    }
    const sisa = bagian.filter((item) => !peta.has(item) && !peta.has(angkaIdentitas(item)))
    if (sisa.length === 0) continue
    const { data: byNis } = await supabase.from('siswa').select('id_siswa,nis,nama_siswa,unit').in('nis', sisa)
    for (const baris of byNis || []) {
      simpan({
        id_siswa: String((baris as IdentitasSiswaKas).id_siswa || '').trim(),
        nis: String((baris as IdentitasSiswaKas).nis || '').trim(),
        nama_siswa: String((baris as IdentitasSiswaKas).nama_siswa || '').trim(),
        unit: (baris as IdentitasSiswaKas).unit || null,
      })
    }
  }
  return peta
}

async function lengkapiIdentitasTransaksi(daftar: TransaksiKas[]) {
  const kunci = daftar.flatMap((item) => [item.id_siswa, item.nis]).filter(Boolean) as string[]
  if (kunci.length === 0) return daftar
  const peta = await petaIdentitasSiswa(kunci)
  return daftar.map((item) => {
    const ident =
      peta.get(String(item.id_siswa || '').trim()) ||
      peta.get(String(item.nis || '').trim()) ||
      peta.get(angkaIdentitas(item.id_siswa)) ||
      peta.get(angkaIdentitas(item.nis))
    if (!ident) return item
    return {
      ...item,
      id_siswa: item.id_siswa || ident.id_siswa,
      nis: item.nis || nisTampilSiswa(ident) || ident.nis,
      nama_siswa: item.nama_siswa || ident.nama_siswa,
      unit: item.unit || kanonUnitKeuangan(ident.unit) || null,
    }
  })
}

function normalisasiCari(teks: string) {
  return teks
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function skorCariSiswa(siswa: Pick<Siswa, 'id_siswa' | 'nis' | 'nama_siswa' | 'kelas'>, kueri: string) {
  const mentah = kueri.trim()
  if (!mentah) return 0
  const nis = angkaIdentitas(`${siswa.nis || ''} ${siswa.id_siswa || ''}`)
  const digit = angkaIdentitas(mentah)
  const nama = normalisasiCari(siswa.nama_siswa)
  const kataNama = nama.split(' ').filter(Boolean)
  const haystack = normalisasiCari(`${siswa.nama_siswa} ${siswa.kelas || ''} ${siswa.nis || ''} ${siswa.id_siswa || ''}`)
  const tokenNama = normalisasiCari(mentah.replace(/\d+/g, ' ')).split(' ').filter((kata) => kata.length >= 1)

  let skor = 0
  if (digit.length >= 2 && nis) {
    if (nis === digit) skor += 100
    else if (nis.startsWith(digit) || digit.startsWith(nis)) skor += 80
    else if (nis.includes(digit)) skor += 55
  }
  if (tokenNama.length > 0) {
    const semuaCocok = tokenNama.every(
      (token) => kataNama.some((kata) => kata.startsWith(token) || kata.includes(token)) || haystack.includes(token),
    )
    if (!semuaCocok) return 0
    const prefiks = tokenNama.every((token) => kataNama.some((kata) => kata.startsWith(token)))
    skor += prefiks ? 45 : 25
    if (nama.startsWith(tokenNama[0])) skor += 10
  }
  return skor
}

export function saringSiswaKasir(daftar: Siswa[], kueri: string, batas = 12): Siswa[] {
  const kata = kueri.trim()
  if (kata.length < 1) return []
  return daftar
    .map((siswa) => ({ siswa, skor: skorCariSiswa(siswa, kata) }))
    .filter((item) => item.skor > 0)
    .sort((a, b) => b.skor - a.skor || a.siswa.nama_siswa.localeCompare(b.siswa.nama_siswa, 'id'))
    .slice(0, batas)
    .map((item) => item.siswa)
}

export function akunCocokKodeTagihan(kodeAkun: string, kodeTagihan: string) {
  const akun = String(kodeAkun || '').trim()
  const kode = String(kodeTagihan || '').trim().toUpperCase()
  if (!kode) return false
  if (akun === '4101' || akun.startsWith('11')) return kode.startsWith('SYA')
  if (akun === '4102' || akun.startsWith('12')) return kode.startsWith('KTR')
  if (akun === '4103') return kode.startsWith('PSB')
  if (akun === '4104') return /^E(?!VT)/.test(kode)
  if (akun === '4105' || akun.startsWith('13')) return kode.startsWith('EVT')
  return true
}

async function petaNisSiswa(ids: string[]) {
  const unik = [...new Set(ids.map((id) => String(id || '').trim()).filter(Boolean))]
  const peta = new Map<string, string>()
  for (let i = 0; i < unik.length; i += 200) {
    const bagian = unik.slice(i, i + 200)
    const { data } = await supabase.from('siswa').select('id_siswa,nis').in('id_siswa', bagian)
    for (const baris of data || []) {
      const id = String((baris as { id_siswa?: string }).id_siswa || '').trim()
      const nis = angkaIdentitas((baris as { nis?: string }).nis) || angkaIdentitas(id)
      if (id) peta.set(id, nis)
    }
  }
  return peta
}

export async function muatPembayaranKasTerverifikasi(unit?: string): Promise<PembayaranKas[]> {
  const disetujui = await muatTransaksiKas(STATUS_DISETUJUI, unit)
  const penerimaan = disetujui.filter((item) => item.jenis_transaksi === 'Penerimaan' && item.id_siswa)
  const petaNis = await petaNisSiswa(penerimaan.map((item) => String(item.id_siswa || '')))
  const hasil: PembayaranKas[] = []
  for (const item of penerimaan) {
    const idSiswa = teks(item.id_siswa)
    if (!idSiswa) continue
    for (const det of item.items) {
      if (det.nominal <= 0) continue
      hasil.push({
        nomor_bukti: item.nomor_bukti,
        kode_akun: det.kode_akun,
        nominal: det.nominal,
        id_siswa: idSiswa,
        nis: item.nis || petaNis.get(idSiswa) || angkaIdentitas(idSiswa),
        nama_siswa: item.nama_siswa || null,
        kode_tagihan: det.kode_tagihan || null,
        tapel_tagihan: det.tapel_tagihan || null,
        unit: item.unit || null,
      })
    }
  }
  return hasil
}
