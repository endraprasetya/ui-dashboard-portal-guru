import {
  predikatNilai,
  simpanNilaiTargetUjian,
  simpanNilaiUjianTahfidz,
  nilaiSurah,
  type NarasiRaporTahfidz,
  type NilaiSurahUjian,
} from '@/lib/rapor-tahfidz-nilai'

export const STATUS_DRAF_HQ = 'Menunggu sinyal / Tersimpan lokal'
export const PERISTIWA_DRAF_HQ = 'draf-hq-berubah'
export const PERISTIWA_SINKRON_HQ = 'draf-hq-tersinkron'

const KUNCI_LOKAL = 'portal_guru_draf_hq_v1'
const NAMA_DB = 'portal-guru-draf-hq'
const NAMA_TOKO = 'antrean'

export type JenisDrafHq = 'nilai' | 'target'

export type PayloadNilaiHq = {
  idSiswa: string
  jenisAsesmen: string
  baris: NilaiSurahUjian[]
  narasi?: NarasiRaporTahfidz
}

export type PayloadTargetHq = {
  idSiswa: string
  jenisAsesmen: string
  nilaiTarget: number
  capaianTarget: string
}

export type DrafHq = {
  id: string
  jenis: JenisDrafHq
  status: typeof STATUS_DRAF_HQ
  idSiswa: string
  namaSiswa: string
  kelas: string
  jenisAsesmen: string
  idGuru: string
  dibuatPada: string
  diperbaruiPada: string
  payloadNilai?: PayloadNilaiHq
  payloadTarget?: PayloadTargetHq
}

export type HasilSimpanHq =
  | { error: string | null; lokal?: false; nilaiAkhir?: number; predikat?: string }
  | { error: null; lokal: true; nilaiAkhir?: number; predikat?: string }

type HasilSinkronHq = {
  sukses: number
  gagal: number
  sisa: number
  nama: string[]
}

let sedangSinkron = false
let idbSiap = false

function idGuruSesi() {
  if (typeof window === 'undefined') return ''
  try {
    const mentah = window.localStorage.getItem('user_session')
    const user = mentah ? JSON.parse(mentah) : null
    return String(user?.target_id || user?.username || user?.id_user || '').trim()
  } catch {
    return ''
  }
}

export function kunciDrafHq(idSiswa: string, jenisAsesmen: string) {
  return `${String(idSiswa || '').trim()}|${String(jenisAsesmen || '').trim()}`
}

export function adalahGalatJaringan(galat: unknown) {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true
  const pesan = typeof galat === 'string' ? galat : String((galat as { message?: string } | null)?.message || galat || '')
  return /failed to fetch|networkerror|network request failed|load failed|err_internet|err_name_not_resolved|err_connection|timed?\s*out|offline|econnreset|enotfound|internet disconnected|the internet connection appears|fetch failed/i.test(
    pesan,
  )
}

function siaran(nama = PERISTIWA_DRAF_HQ, detail?: unknown) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(nama, { detail }))
}

function bacaLokal(): DrafHq[] {
  if (typeof window === 'undefined') return []
  try {
    const mentah = window.localStorage.getItem(KUNCI_LOKAL)
    const data = mentah ? JSON.parse(mentah) : null
    const item = Array.isArray(data?.item) ? data.item : Array.isArray(data) ? data : []
    return item.filter((baris: DrafHq) => baris && baris.id && baris.idSiswa)
  } catch {
    return []
  }
}

function tulisLokal(daftar: DrafHq[]) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(KUNCI_LOKAL, JSON.stringify({ versi: 1, item: daftar }))
  void tulisIndexedDb(daftar)
  siaran()
}

function bukaIndexedDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null)
  return new Promise((selesai) => {
    try {
      const permintaan = indexedDB.open(NAMA_DB, 1)
      permintaan.onupgradeneeded = () => {
        const db = permintaan.result
        if (!db.objectStoreNames.contains(NAMA_TOKO)) db.createObjectStore(NAMA_TOKO)
      }
      permintaan.onsuccess = () => selesai(permintaan.result)
      permintaan.onerror = () => selesai(null)
    } catch {
      selesai(null)
    }
  })
}

async function tulisIndexedDb(daftar: DrafHq[]) {
  const db = await bukaIndexedDb()
  if (!db) return
  await new Promise<void>((selesai) => {
    try {
      const tx = db.transaction(NAMA_TOKO, 'readwrite')
      tx.objectStore(NAMA_TOKO).put(daftar, 'item')
      tx.oncomplete = () => selesai()
      tx.onerror = () => selesai()
    } catch {
      selesai()
    }
  })
  db.close()
}

async function bacaIndexedDb(): Promise<DrafHq[]> {
  const db = await bukaIndexedDb()
  if (!db) return []
  const daftar = await new Promise<DrafHq[]>((selesai) => {
    try {
      const tx = db.transaction(NAMA_TOKO, 'readonly')
      const permintaan = tx.objectStore(NAMA_TOKO).get('item')
      permintaan.onsuccess = () => {
        const nilai = permintaan.result
        selesai(Array.isArray(nilai) ? nilai : [])
      }
      permintaan.onerror = () => selesai([])
    } catch {
      selesai([])
    }
  })
  db.close()
  return daftar.filter((baris) => baris && baris.id && baris.idSiswa)
}

export function daftarDrafHq(idGuru?: string) {
  const guru = idGuru ?? idGuruSesi()
  return bacaLokal().filter((item) => !guru || !item.idGuru || item.idGuru === guru)
}

export function cariDrafHq(idSiswa: string, jenisAsesmen: string, idGuru?: string) {
  const kunci = kunciDrafHq(idSiswa, jenisAsesmen)
  return daftarDrafHq(idGuru).find((item) => item.id === kunci) || null
}

function simpanDaftar(daftar: DrafHq[]) {
  tulisLokal(daftar)
}

export function antriDrafHq(masuk: Omit<DrafHq, 'id' | 'status' | 'dibuatPada' | 'diperbaruiPada'> & { id?: string }) {
  const sekarang = new Date().toISOString()
  const id = masuk.id || kunciDrafHq(masuk.idSiswa, masuk.jenisAsesmen)
  const daftar = bacaLokal()
  const lama = daftar.find((item) => item.id === id)
  const berikutnya: DrafHq = {
    id,
    jenis: masuk.jenis,
    status: STATUS_DRAF_HQ,
    idSiswa: masuk.idSiswa,
    namaSiswa: masuk.namaSiswa,
    kelas: masuk.kelas,
    jenisAsesmen: masuk.jenisAsesmen,
    idGuru: masuk.idGuru || idGuruSesi(),
    dibuatPada: lama?.dibuatPada || sekarang,
    diperbaruiPada: sekarang,
    payloadNilai: masuk.payloadNilai ?? (masuk.jenis === 'nilai' ? lama?.payloadNilai : undefined),
    payloadTarget: masuk.payloadTarget ?? lama?.payloadTarget,
  }
  if (berikutnya.jenis === 'nilai' && berikutnya.payloadNilai && berikutnya.payloadTarget) {
    berikutnya.payloadNilai = {
      ...berikutnya.payloadNilai,
      narasi: {
        ...(berikutnya.payloadNilai.narasi || { capaianKompetensi: '', capaianTarget: '', motivasi: '' }),
        capaianTarget: berikutnya.payloadTarget.capaianTarget,
        nilaiTarget: berikutnya.payloadTarget.nilaiTarget,
      },
    }
  }
  simpanDaftar([...daftar.filter((item) => item.id !== id), berikutnya])
  return berikutnya
}

export function hapusDrafHq(id: string) {
  simpanDaftar(bacaLokal().filter((item) => item.id !== id))
}

function ringkasNilai(baris: NilaiSurahUjian[]) {
  const nilai = baris.map(nilaiSurah)
  if (nilai.some((item) => item == null) || nilai.length === 0) return { nilaiAkhir: undefined, predikat: undefined }
  const nilaiAkhir = Math.round(((nilai as number[]).reduce((a, b) => a + b, 0) / nilai.length) * 100) / 100
  return { nilaiAkhir, predikat: predikatNilai(nilaiAkhir) }
}

export async function simpanNilaiUjianTahfidzAman(
  payload: PayloadNilaiHq,
  meta: { namaSiswa: string; kelas: string },
): Promise<HasilSimpanHq> {
  const ringkas = ringkasNilai(payload.baris)
  const offline = typeof navigator !== 'undefined' && navigator.onLine === false
  if (offline) {
    antriDrafHq({
      jenis: 'nilai',
      idSiswa: payload.idSiswa,
      namaSiswa: meta.namaSiswa,
      kelas: meta.kelas,
      jenisAsesmen: payload.jenisAsesmen,
      idGuru: idGuruSesi(),
      payloadNilai: payload,
    })
    return { error: null, lokal: true, ...ringkas }
  }

  try {
    const hasil = await simpanNilaiUjianTahfidz(payload)
    if (hasil.error && adalahGalatJaringan(hasil.error)) {
      antriDrafHq({
        jenis: 'nilai',
        idSiswa: payload.idSiswa,
        namaSiswa: meta.namaSiswa,
        kelas: meta.kelas,
        jenisAsesmen: payload.jenisAsesmen,
        idGuru: idGuruSesi(),
        payloadNilai: payload,
      })
      return { error: null, lokal: true, ...ringkas }
    }
    if (!hasil.error) hapusDrafHq(kunciDrafHq(payload.idSiswa, payload.jenisAsesmen))
    return hasil
  } catch (error) {
    if (adalahGalatJaringan(error)) {
      antriDrafHq({
        jenis: 'nilai',
        idSiswa: payload.idSiswa,
        namaSiswa: meta.namaSiswa,
        kelas: meta.kelas,
        jenisAsesmen: payload.jenisAsesmen,
        idGuru: idGuruSesi(),
        payloadNilai: payload,
      })
      return { error: null, lokal: true, ...ringkas }
    }
    return { error: error instanceof Error ? error.message : 'Penilaian gagal disimpan.' }
  }
}

export async function simpanNilaiTargetUjianAman(
  payload: PayloadTargetHq,
  meta: { namaSiswa: string; kelas: string },
): Promise<HasilSimpanHq> {
  const offline = typeof navigator !== 'undefined' && navigator.onLine === false
  if (offline) {
    antriDrafHq({
      jenis: cariDrafHq(payload.idSiswa, payload.jenisAsesmen)?.jenis || 'target',
      idSiswa: payload.idSiswa,
      namaSiswa: meta.namaSiswa,
      kelas: meta.kelas,
      jenisAsesmen: payload.jenisAsesmen,
      idGuru: idGuruSesi(),
      payloadTarget: payload,
    })
    return { error: null, lokal: true }
  }

  try {
    const hasil = await simpanNilaiTargetUjian(payload)
    if (hasil.error && adalahGalatJaringan(hasil.error)) {
      antriDrafHq({
        jenis: cariDrafHq(payload.idSiswa, payload.jenisAsesmen)?.jenis || 'target',
        idSiswa: payload.idSiswa,
        namaSiswa: meta.namaSiswa,
        kelas: meta.kelas,
        jenisAsesmen: payload.jenisAsesmen,
        idGuru: idGuruSesi(),
        payloadTarget: payload,
      })
      return { error: null, lokal: true }
    }
    return { error: hasil.error }
  } catch (error) {
    if (adalahGalatJaringan(error)) {
      antriDrafHq({
        jenis: cariDrafHq(payload.idSiswa, payload.jenisAsesmen)?.jenis || 'target',
        idSiswa: payload.idSiswa,
        namaSiswa: meta.namaSiswa,
        kelas: meta.kelas,
        jenisAsesmen: payload.jenisAsesmen,
        idGuru: idGuruSesi(),
        payloadTarget: payload,
      })
      return { error: null, lokal: true }
    }
    return { error: error instanceof Error ? error.message : 'Nilai target gagal disimpan.' }
  }
}

async function kirimSatuDraf(item: DrafHq): Promise<string | null> {
  if (item.payloadNilai) {
    const hasil = await simpanNilaiUjianTahfidz(item.payloadNilai)
    if (hasil.error) return hasil.error
    if (item.payloadTarget && !item.payloadNilai.narasi?.nilaiTarget) {
      const target = await simpanNilaiTargetUjian(item.payloadTarget)
      if (target.error) return target.error
    }
    return null
  }
  if (item.payloadTarget) {
    const hasil = await simpanNilaiTargetUjian(item.payloadTarget)
    return hasil.error
  }
  return 'Draf lokal tidak memiliki data penilaian.'
}

export async function sinkronkanDrafHq(): Promise<HasilSinkronHq> {
  const kosong: HasilSinkronHq = { sukses: 0, gagal: 0, sisa: daftarDrafHq().length, nama: [] }
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return kosong
  if (sedangSinkron) return kosong
  sedangSinkron = true
  const nama: string[] = []
  let sukses = 0
  let gagal = 0
  try {
    const antrian = daftarDrafHq()
    for (const item of antrian) {
      try {
        const galat = await kirimSatuDraf(item)
        if (galat && adalahGalatJaringan(galat)) {
          gagal += 1
          break
        }
        if (galat) {
          gagal += 1
          continue
        }
        hapusDrafHq(item.id)
        sukses += 1
        if (item.namaSiswa) nama.push(item.namaSiswa)
      } catch (error) {
        gagal += 1
        if (adalahGalatJaringan(error)) break
      }
    }
  } finally {
    sedangSinkron = false
  }
  const hasil = { sukses, gagal, sisa: daftarDrafHq().length, nama }
  if (sukses > 0) siaran(PERISTIWA_SINKRON_HQ, hasil)
  return hasil
}

export async function pulihkanDrafHqDariIndexedDb() {
  if (idbSiap || typeof window === 'undefined') return
  idbSiap = true
  if (bacaLokal().length > 0) return
  const cadangan = await bacaIndexedDb()
  if (cadangan.length > 0) tulisLokal(cadangan)
}

export function pasangPenjagaDrafHq() {
  if (typeof window === 'undefined') return () => undefined
  void pulihkanDrafHqDariIndexedDb().then(() => {
    if (navigator.onLine) void sinkronkanDrafHq()
  })
  const online = () => {
    void sinkronkanDrafHq()
  }
  const tampak = () => {
    if (document.visibilityState === 'visible' && navigator.onLine) void sinkronkanDrafHq()
  }
  window.addEventListener('online', online)
  document.addEventListener('visibilitychange', tampak)
  return () => {
    window.removeEventListener('online', online)
    document.removeEventListener('visibilitychange', tampak)
  }
}
