import { supabase } from '@/lib/supabase'
import { periodeAjaranSekarang } from '@/lib/rapor-tahfidz-nilai'
import { teacherDisplayName } from '@/lib/qiroah'

export const NAMA_SETTING_KIRIM_RAPOR = 'hq_kirim'
export const KANAL_REVISI_RAPOR_HQ = 'rapor-hq-revisi'

export type StatusKirimRaporHq = 'Terkirim' | 'Revisi'

export type KirimRaporHq = {
  idSiswa: string
  namaSiswa: string
  kelas: string
  asesmen: string
  tahunAjaran: string
  semester: string
  idGuru: string
  namaGuru: string
  status: StatusKirimRaporHq
  catatanRevisi: string
  dikirimPada: string
  diperbaruiPada: string
}

export type UsulanKirimRaporHq = {
  idSiswa: string
  namaSiswa: string
  kelas: string
  asesmen: string
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
  const id = idGuruAktif(user).toLowerCase()
  const nama = teacherDisplayName(user).trim().toLowerCase()
  const idBaris = baris.idGuru.trim().toLowerCase()
  const namaBaris = baris.namaGuru.trim().toLowerCase()
  if (id && idBaris && id === idBaris) return true
  if (nama && namaBaris && nama === namaBaris) return true
  return false
}

function bacaKirim(nilai: unknown): KirimRaporHq | null {
  try {
    const data = typeof nilai === 'string' ? JSON.parse(nilai) : nilai
    if (!data || typeof data !== 'object') return null
    const idSiswa = String(data.idSiswa || '').trim()
    const asesmen = String(data.asesmen || '').trim()
    if (!idSiswa || !asesmen) return null
    const status = data.status === 'Revisi' ? 'Revisi' : 'Terkirim'
    return {
      idSiswa,
      namaSiswa: String(data.namaSiswa || idSiswa),
      kelas: String(data.kelas || ''),
      asesmen,
      tahunAjaran: String(data.tahunAjaran || ''),
      semester: String(data.semester || ''),
      idGuru: String(data.idGuru || ''),
      namaGuru: String(data.namaGuru || ''),
      status,
      catatanRevisi: String(data.catatanRevisi || '').trim(),
      dikirimPada: String(data.dikirimPada || ''),
      diperbaruiPada: String(data.diperbaruiPada || ''),
    }
  } catch {
    return null
  }
}

export async function muatKirimRaporHq() {
  const { data, error } = await supabase
    .from('setting')
    .select('nilai,keterangan')
    .eq('nama_variabel', NAMA_SETTING_KIRIM_RAPOR)
    .limit(2000)
  if (error) return { error: error.message, data: [] as KirimRaporHq[] }
  const hasil = (data || []).map((row) => bacaKirim(row.nilai)).filter((row): row is KirimRaporHq => Boolean(row))
  return { error: null as string | null, data: hasil }
}

export async function kirimRaporKeKepsek(daftar: UsulanKirimRaporHq[]) {
  if (daftar.length === 0) return { error: 'Belum ada rapor untuk dikirim.', jumlah: 0 }
  const { tahunAjaran, semester } = periodeAjaranSekarang()
  const sekarang = new Date().toISOString()
  const sasaran = daftar.map((item) => ({
    ...item,
    tahunAjaran,
    semester,
    kunci: kunciKirimRaporHq({ ...item, tahunAjaran, semester }),
  }))

  const ada = new Map<string, KirimRaporHq>()
  const ukuran = 80
  for (let i = 0; i < sasaran.length; i += ukuran) {
    const bagian = sasaran.slice(i, i + ukuran).map((item) => item.kunci)
    const { data, error } = await supabase
      .from('setting')
      .select('nilai,keterangan')
      .eq('nama_variabel', NAMA_SETTING_KIRIM_RAPOR)
      .in('keterangan', bagian)
    if (error) return { error: error.message, jumlah: 0 }
    for (const row of data || []) {
      const isi = bacaKirim(row.nilai)
      if (isi) ada.set(String(row.keterangan), isi)
    }
  }

  const sisipan: { nama_variabel: string; nilai: string; keterangan: string; niy: string }[] = []
  for (const item of sasaran) {
    const sebelumnya = ada.get(item.kunci)
    const isi: KirimRaporHq = {
      idSiswa: item.idSiswa,
      namaSiswa: item.namaSiswa,
      kelas: item.kelas,
      asesmen: item.asesmen,
      tahunAjaran,
      semester,
      idGuru: item.idGuru,
      namaGuru: item.namaGuru,
      status: 'Terkirim',
      catatanRevisi: sebelumnya?.catatanRevisi || '',
      dikirimPada: sekarang,
      diperbaruiPada: sebelumnya?.diperbaruiPada || sekarang,
    }
    const nilai = JSON.stringify(isi)
    if (sebelumnya) {
      const { error } = await supabase
        .from('setting')
        .update({ nilai, niy: item.idGuru })
        .eq('nama_variabel', NAMA_SETTING_KIRIM_RAPOR)
        .eq('keterangan', item.kunci)
      if (error) return { error: error.message, jumlah: 0 }
    } else {
      sisipan.push({ nama_variabel: NAMA_SETTING_KIRIM_RAPOR, nilai, keterangan: item.kunci, niy: item.idGuru })
    }
  }

  if (sisipan.length) {
    const { error } = await supabase.from('setting').insert(sisipan)
    if (error) return { error: error.message, jumlah: 0 }
  }
  return { error: null as string | null, jumlah: sasaran.length }
}

export async function simpanCatatanRevisiRaporHq(baris: KirimRaporHq, catatan: string) {
  const teks = catatan.trim()
  const isi: KirimRaporHq = {
    ...baris,
    catatanRevisi: teks,
    status: teks ? 'Revisi' : 'Terkirim',
    diperbaruiPada: new Date().toISOString(),
  }
  const { error } = await supabase
    .from('setting')
    .update({ nilai: JSON.stringify(isi) })
    .eq('nama_variabel', NAMA_SETTING_KIRIM_RAPOR)
    .eq('keterangan', kunciKirimRaporHq(baris))
  if (error) return { error: error.message }
  if (teks) await siarkanRevisiRaporHq(baris.idGuru)
  return { error: null as string | null }
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
