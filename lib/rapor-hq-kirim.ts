import { supabase } from '@/lib/supabase'
import { TABEL_HEADER_RAPOR, periodeAjaranSekarang } from '@/lib/rapor-tahfidz-nilai'
import { teacherDisplayName } from '@/lib/qiroah'

export const NAMA_SETTING_KIRIM_RAPOR = 'hq_kirim'
export const KANAL_REVISI_RAPOR_HQ = 'rapor-hq-revisi'

export type StatusKirimRaporHq = 'Terkirim' | 'Revisi'
export type StatusPemeriksaHq = 'Belum' | 'Diperiksa'

export type KirimRaporHq = {
  idSiswa: string
  namaSiswa: string
  kelas: string
  asesmen: string
  tahunAjaran: string
  semester: string
  idGuru: string
  namaGuru: string
  materi: string
  nilaiAkhir: number | null
  predikat: string
  status: StatusKirimRaporHq
  catatanRevisi: string
  dikirimPada: string
  diperbaruiPada: string
  statusPemeriksa: StatusPemeriksaHq
  pemeriksaId: string
  pemeriksaNama: string
  diperiksaPada: string
  catatanOleh: string
  catatanOlehId: string
  catatanPada: string
}

export type UsulanKirimRaporHq = {
  idSiswa: string
  namaSiswa: string
  kelas: string
  asesmen: string
  materi?: string
  idGuru: string
  namaGuru: string
}

export function kunciKirimRaporHq(baris: Pick<KirimRaporHq, 'idSiswa' | 'asesmen' | 'tahunAjaran' | 'semester'>) {
  return [baris.idSiswa, baris.asesmen, baris.tahunAjaran, baris.semester].join('|')
}

export function idGuruAktif(user?: { target_id?: string; username?: string } | null) {
  return String(user?.target_id || user?.username || '').trim()
}

export function guruPenerimaRevisi(baris: Pick<KirimRaporHq, 'idGuru' | 'namaGuru'>, user?: any) {
  const idBaris = baris.idGuru.trim().toLowerCase()
  const identitas = [user?.target_id, user?.id_user, user?.username, user?.nip, user?.NIP]
    .map((nilai) => String(nilai || '').trim().toLowerCase())
    .filter((nilai) => nilai.length >= 2)
  if (idBaris && identitas.includes(idBaris)) return true
  const namaBaris = intiNamaOrang(baris.namaGuru)
  const namaUser = intiNamaOrang(teacherDisplayName(user))
  if (!namaBaris || !namaUser || namaUser === 'guru' || namaUser.length < 3) return false
  return namaBaris === namaUser
}

function intiNamaOrang(nilai?: string | null) {
  return String(nilai || '')
    .toLowerCase()
    .replace(/,/g, ' ')
    .replace(/\bs\.?\s*pd\.?\s*i?\b/g, ' ')
    .replace(/\ba\.?\s*ma\.?\b/g, ' ')
    .replace(/[^a-z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function angkaAtauNull(nilai: unknown) {
  if (nilai == null || nilai === '') return null
  const n = Number(nilai)
  return Number.isFinite(n) ? n : null
}

function bacaKirim(nilai: unknown): KirimRaporHq | null {
  try {
    const data = typeof nilai === 'string' ? JSON.parse(nilai) : nilai
    if (!data || typeof data !== 'object') return null
    const idSiswa = String(data.idSiswa || '').trim()
    const asesmen = String(data.asesmen || '').trim()
    if (!idSiswa || !asesmen) return null
    const status = data.status === 'Revisi' ? 'Revisi' : 'Terkirim'
    const statusPemeriksa = data.statusPemeriksa === 'Diperiksa' || data.diperiksaPada ? 'Diperiksa' : 'Belum'
    return {
      idSiswa,
      namaSiswa: String(data.namaSiswa || idSiswa),
      kelas: String(data.kelas || ''),
      asesmen,
      tahunAjaran: String(data.tahunAjaran || ''),
      semester: String(data.semester || ''),
      idGuru: String(data.idGuru || ''),
      namaGuru: String(data.namaGuru || ''),
      materi: String(data.materi || ''),
      nilaiAkhir: angkaAtauNull(data.nilaiAkhir),
      predikat: String(data.predikat || ''),
      status,
      catatanRevisi: String(data.catatanRevisi || '').trim(),
      dikirimPada: String(data.dikirimPada || ''),
      diperbaruiPada: String(data.diperbaruiPada || ''),
      statusPemeriksa,
      pemeriksaId: String(data.pemeriksaId || ''),
      pemeriksaNama: String(data.pemeriksaNama || ''),
      diperiksaPada: String(data.diperiksaPada || ''),
      catatanOleh: String(data.catatanOleh || ''),
      catatanOlehId: String(data.catatanOlehId || ''),
      catatanPada: String(data.catatanPada || ''),
    }
  } catch {
    return null
  }
}

async function muatPetaNilai(daftar: Pick<KirimRaporHq, 'idSiswa' | 'asesmen' | 'tahunAjaran' | 'semester'>[]) {
  const peta = new Map<string, { nilaiAkhir: number | null; predikat: string }>()
  const ids = Array.from(new Set(daftar.map((item) => item.idSiswa).filter(Boolean)))
  const ukuran = 80
  for (let i = 0; i < ids.length; i += ukuran) {
    const bagian = ids.slice(i, i + ukuran)
    const { data, error } = await supabase
      .from(TABEL_HEADER_RAPOR)
      .select('id_siswa,jenis_asesmen,tahun_ajaran,semester,nilai_akhir,predikat')
      .in('id_siswa', bagian)
    if (error) return peta
    for (const row of data || []) {
      peta.set([row.id_siswa, row.jenis_asesmen, row.tahun_ajaran, row.semester].join('|'), {
        nilaiAkhir: angkaAtauNull(row.nilai_akhir),
        predikat: String(row.predikat || ''),
      })
    }
  }
  return peta
}

async function muatPetaMateri(idSiswa: string[]) {
  const peta = new Map<string, string>()
  const ids = Array.from(new Set(idSiswa.filter(Boolean)))
  const ukuran = 80
  for (let i = 0; i < ids.length; i += ukuran) {
    const bagian = ids.slice(i, i + ukuran)
    const { data, error } = await supabase
      .from('materi_ujian_tahfidz')
      .select('id_siswa,asesmen,surah,ayat')
      .in('id_siswa', bagian)
    if (error) return peta
    for (const row of data || []) {
      const kunci = `${row.id_siswa}|${row.asesmen}`
      const label = row.ayat ? `${row.surah} (Ayat ${row.ayat})` : String(row.surah || '')
      if (!label) continue
      const lama = peta.get(kunci)
      peta.set(kunci, lama ? `${lama}; ${label}` : label)
    }
  }
  return peta
}

export async function lengkapiTampilanKirim(daftar: KirimRaporHq[]) {
  if (daftar.length === 0) return []
  const [materi, nilai] = await Promise.all([muatPetaMateri(daftar.map((row) => row.idSiswa)), muatPetaNilai(daftar)])
  return daftar.map((row) => {
    const hidup = nilai.get([row.idSiswa, row.asesmen, row.tahunAjaran, row.semester].join('|'))
    return {
      ...row,
      materi: materi.get(`${row.idSiswa}|${row.asesmen}`) || row.materi,
      nilaiAkhir: hidup ? hidup.nilaiAkhir : row.nilaiAkhir,
      predikat: hidup ? hidup.predikat : row.predikat,
    }
  })
}

function bacaDaftarKirim(nilai: unknown) {
  try {
    const data = typeof nilai === 'string' ? JSON.parse(nilai) : nilai
    const sumber = Array.isArray(data) ? data : [data]
    const peta = new Map<string, KirimRaporHq>()
    for (const item of sumber) {
      const baris = bacaKirim(item)
      if (!baris) continue
      const kunci = kunciKirimRaporHq(baris)
      const lama = peta.get(kunci)
      if (!lama || baris.diperbaruiPada >= lama.diperbaruiPada) peta.set(kunci, baris)
    }
    return [...peta.values()]
  } catch {
    return [] as KirimRaporHq[]
  }
}

async function muatDokumenKirim() {
  const { data, error } = await supabase
    .from('setting')
    .select('nilai')
    .eq('nama_variabel', NAMA_SETTING_KIRIM_RAPOR)
    .limit(20)
  if (error) return { error: error.message, daftar: [] as KirimRaporHq[], ada: false }
  const daftar = (data || []).flatMap((row) => bacaDaftarKirim(row.nilai))
  const peta = new Map<string, KirimRaporHq>()
  for (const baris of daftar) {
    const kunci = kunciKirimRaporHq(baris)
    const lama = peta.get(kunci)
    if (!lama || baris.diperbaruiPada >= lama.diperbaruiPada) peta.set(kunci, baris)
  }
  return { error: null as string | null, daftar: [...peta.values()], ada: (data || []).length > 0 }
}

async function simpanDokumenKirim(daftar: KirimRaporHq[], niy: string) {
  const nilai = JSON.stringify(daftar)
  const ada = await supabase.from('setting').select('nama_variabel').eq('nama_variabel', NAMA_SETTING_KIRIM_RAPOR).limit(1)
  if (ada.error) return ada.error.message
  if ((ada.data || []).length > 0) {
    const { error } = await supabase
      .from('setting')
      .update({ nilai, keterangan: 'daftar', niy })
      .eq('nama_variabel', NAMA_SETTING_KIRIM_RAPOR)
    return error?.message || null
  }
  const { error } = await supabase
    .from('setting')
    .insert({ nama_variabel: NAMA_SETTING_KIRIM_RAPOR, nilai, keterangan: 'daftar', niy })
  return error?.message || null
}

export async function muatKirimRaporHq() {
  const hasil = await muatDokumenKirim()
  return { error: hasil.error, data: hasil.daftar }
}

export async function kirimRaporKeKepsek(daftar: UsulanKirimRaporHq[]) {
  if (daftar.length === 0) return { error: 'Belum ada siswa yang dicentang. Centang siswa yang hasil penilaiannya akan dikirim ke Kepala Sekolah.', jumlah: 0 }
  const { tahunAjaran, semester } = periodeAjaranSekarang()
  const sekarang = new Date().toISOString()
  const sasaran = daftar.map((item) => ({
    ...item,
    tahunAjaran,
    semester,
    kunci: kunciKirimRaporHq({ ...item, tahunAjaran, semester }),
  }))
  const nilaiHidup = await muatPetaNilai(sasaran)
  const dokumen = await muatDokumenKirim()
  if (dokumen.error) return { error: dokumen.error, jumlah: 0 }
  const peta = new Map(dokumen.daftar.map((row) => [kunciKirimRaporHq(row), row]))

  for (const item of sasaran) {
    const sebelumnya = peta.get(item.kunci)
    const nilai = nilaiHidup.get(item.kunci)
    const isi: KirimRaporHq = {
      idSiswa: item.idSiswa,
      namaSiswa: item.namaSiswa,
      kelas: item.kelas,
      asesmen: item.asesmen,
      tahunAjaran,
      semester,
      idGuru: item.idGuru,
      namaGuru: item.namaGuru,
      materi: item.materi || sebelumnya?.materi || '',
      nilaiAkhir: nilai ? nilai.nilaiAkhir : (sebelumnya?.nilaiAkhir ?? null),
      predikat: nilai ? nilai.predikat : sebelumnya?.predikat || '',
      status: 'Terkirim',
      catatanRevisi: sebelumnya?.catatanRevisi || '',
      dikirimPada: sekarang,
      diperbaruiPada: sebelumnya?.diperbaruiPada || sekarang,
      statusPemeriksa: 'Belum',
      pemeriksaId: '',
      pemeriksaNama: '',
      diperiksaPada: '',
      catatanOleh: sebelumnya?.catatanOleh || '',
      catatanOlehId: sebelumnya?.catatanOlehId || '',
      catatanPada: sebelumnya?.catatanPada || '',
    }
    peta.set(item.kunci, isi)
  }

  const galat = await simpanDokumenKirim([...peta.values()], sasaran[0]?.idGuru || '')
  if (galat) return { error: galat, jumlah: 0 }
  return { error: null as string | null, jumlah: sasaran.length }
}

export async function cabutKirimRaporHq(idSiswa: string, asesmen: string) {
  const { tahunAjaran, semester } = periodeAjaranSekarang()
  const dokumen = await muatDokumenKirim()
  if (dokumen.error) return { error: dokumen.error }
  const kunci = kunciKirimRaporHq({ idSiswa, asesmen, tahunAjaran, semester })
  const peta = new Map(dokumen.daftar.map((row) => [kunciKirimRaporHq(row), row]))
  const lama = peta.get(kunci)
  if (!lama) return { error: null as string | null }
  peta.delete(kunci)
  const galat = await simpanDokumenKirim([...peta.values()], lama.idGuru)
  if (galat) return { error: galat }
  return { error: null as string | null }
}

export async function simpanCatatanRevisiRaporHq(
  baris: KirimRaporHq,
  catatan: string,
  penulis?: { id?: string; nama?: string },
) {
  const teks = catatan.trim()
  const dokumen = await muatDokumenKirim()
  if (dokumen.error) return { error: dokumen.error }
  const kunci = kunciKirimRaporHq(baris)
  const peta = new Map(dokumen.daftar.map((row) => [kunciKirimRaporHq(row), row]))
  const lama = peta.get(kunci)
  if (!lama) return { error: 'Data kiriman tidak ditemukan.' }
  const sekarang = new Date().toISOString()
  const isi: KirimRaporHq = {
    ...lama,
    materi: baris.materi || lama.materi,
    nilaiAkhir: baris.nilaiAkhir ?? lama.nilaiAkhir,
    predikat: baris.predikat || lama.predikat,
    catatanRevisi: teks,
    catatanOleh: teks ? penulis?.nama?.trim() || lama.catatanOleh || 'Pemeriksa' : '',
    catatanOlehId: teks ? penulis?.id?.trim() || lama.catatanOlehId || '' : '',
    catatanPada: teks ? sekarang : '',
    status: teks ? 'Revisi' : 'Terkirim',
    diperbaruiPada: sekarang,
  }
  peta.set(kunci, isi)
  const galat = await simpanDokumenKirim([...peta.values()], lama.idGuru)
  if (galat) return { error: galat }
  const segar = await muatDokumenKirim()
  const tersimpan = segar.daftar.find((row) => kunciKirimRaporHq(row) === kunci)
  if (segar.error) return { error: segar.error }
  if (!tersimpan || tersimpan.catatanRevisi !== teks) {
    return { error: 'Catatan belum tersimpan. Muat ulang, lalu simpan sekali lagi.' }
  }
  if (teks) await siarkanRevisiRaporHq(isi.idGuru)
  return { error: null as string | null, data: tersimpan }
}

export async function tandaiDiperiksaHq(
  baris: KirimRaporHq,
  pemeriksa: { id: string; nama: string },
) {
  const dokumen = await muatDokumenKirim()
  if (dokumen.error) return { error: dokumen.error }
  const kunci = kunciKirimRaporHq(baris)
  const peta = new Map(dokumen.daftar.map((row) => [kunciKirimRaporHq(row), row]))
  const lama = peta.get(kunci)
  if (!lama) return { error: 'Data kiriman tidak ditemukan.' }
  const sekarang = new Date().toISOString()
  const isi: KirimRaporHq = {
    ...lama,
    materi: baris.materi || lama.materi,
    nilaiAkhir: baris.nilaiAkhir ?? lama.nilaiAkhir,
    predikat: baris.predikat || lama.predikat,
    statusPemeriksa: 'Diperiksa',
    pemeriksaId: pemeriksa.id,
    pemeriksaNama: pemeriksa.nama,
    diperiksaPada: sekarang,
    diperbaruiPada: sekarang,
  }
  peta.set(kunci, isi)
  const galat = await simpanDokumenKirim([...peta.values()], lama.idGuru)
  if (galat) return { error: galat }
  await siarkanPemeriksaHq(isi)
  return { error: null as string | null, data: isi }
}

export async function siarkanPemeriksaHq(baris: Pick<KirimRaporHq, 'idSiswa' | 'namaSiswa' | 'kelas' | 'asesmen' | 'pemeriksaNama'>) {
  const kanal = supabase.channel(KANAL_REVISI_RAPOR_HQ)
  await new Promise<void>((selesai) => {
    const batas = setTimeout(() => {
      void supabase.removeChannel(kanal)
      selesai()
    }, 2500)
    kanal.subscribe((status) => {
      if (status !== 'SUBSCRIBED' && status !== 'CHANNEL_ERROR' && status !== 'TIMED_OUT') return
      clearTimeout(batas)
      if (status !== 'SUBSCRIBED') {
        void supabase.removeChannel(kanal)
        selesai()
        return
      }
      void kanal
        .send({
          type: 'broadcast',
          event: 'pemeriksa',
          payload: {
            idSiswa: baris.idSiswa,
            namaSiswa: baris.namaSiswa,
            kelas: baris.kelas,
            asesmen: baris.asesmen,
            pemeriksaNama: baris.pemeriksaNama,
          },
        })
        .finally(() => {
          void supabase.removeChannel(kanal)
          selesai()
        })
    })
  })
}

export async function siarkanRevisiRaporHq(idGuru: string) {
  const kanal = supabase.channel(KANAL_REVISI_RAPOR_HQ)
  await new Promise<void>((selesai) => {
    const batas = setTimeout(() => {
      void supabase.removeChannel(kanal)
      selesai()
    }, 2500)
    kanal.subscribe((status) => {
      if (status !== 'SUBSCRIBED' && status !== 'CHANNEL_ERROR' && status !== 'TIMED_OUT') return
      clearTimeout(batas)
      if (status !== 'SUBSCRIBED') {
        void supabase.removeChannel(kanal)
        selesai()
        return
      }
      void kanal.send({ type: 'broadcast', event: 'revisi', payload: { idGuru } }).finally(() => {
        void supabase.removeChannel(kanal)
        selesai()
      })
    })
  })
}
