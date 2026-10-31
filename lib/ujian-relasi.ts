import { supabase } from '@/lib/supabase'
import { statusInti } from '@/lib/qiroah'

export type RekapanRingkas = {
  id_ujian?: string
  id_siswa?: string
  jilid_asal?: string
  jilid_tujuan?: string
  keputusan?: string
  predikat?: string
  nilai_akhir?: number | string | null
  tanggal_ujian?: string
  penguji?: string
  nama?: string
}

type BarisPengajuan = {
  id_pengajuan?: string
  id_siswa?: string
  jilid_diujikan?: string
  status?: string
  tanggal_pelaksanaan?: string
  nama_penguji?: string
}

export function kunciJilid(value?: string) {
  const teks = String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
  if (!teks) return ''
  if (teks.includes('quran') || teks.includes('qur') || teks.includes('talaqqi')) return 'quran'
  const jilid = teks.match(/jilid(\d)/)
  if (jilid) return `jilid${jilid[1]}`
  return teks
}

export function cariRekapan<T extends RekapanRingkas>(pengajuan: { id_siswa?: string; jilid_diujikan?: string }, daftar: T[]) {
  const id = String(pengajuan.id_siswa || '')
  const jilid = kunciJilid(pengajuan.jilid_diujikan)
  if (!id || !jilid) return null
  const cocok = daftar.filter((row) => String(row.id_siswa || '') === id && kunciJilid(row.jilid_asal) === jilid)
  if (cocok.length === 0) return null
  return [...cocok].sort((a, b) => String(b.tanggal_ujian || '').localeCompare(String(a.tanggal_ujian || '')))[0]
}

export function ujianSudahSelesai(status?: string, rekap?: RekapanRingkas | null) {
  if (rekap) return true
  const inti = statusInti(status)
  return inti.includes('selesai') || inti.includes('lulus')
}

export function ringkasHasil(rekap?: RekapanRingkas | null) {
  if (!rekap) return ''
  const keputusan = String(rekap.keputusan || 'Selesai').trim()
  const predikat = String(rekap.predikat || '').trim()
  const nilai = rekap.nilai_akhir != null && String(rekap.nilai_akhir).trim() !== '' ? `nilai ${rekap.nilai_akhir}` : ''
  return [keputusan, predikat, nilai].filter(Boolean).join(' · ')
}

export function unikPerJilid<T extends { id_siswa?: string; jilid_diujikan?: string; status?: string }>(baris: T[]) {
  const peta = new Map<string, T>()
  for (const row of baris) {
    const kunci = `${row.id_siswa || ''}|${kunciJilid(row.jilid_diujikan)}`
    const ada = peta.get(kunci)
    if (!ada) {
      peta.set(kunci, row)
      continue
    }
    const adaSelesai = statusInti(ada.status).includes('selesai')
    const baruSelesai = statusInti(row.status).includes('selesai')
    if (baruSelesai && !adaSelesai) peta.set(kunci, row)
  }
  return [...peta.values()]
}

export async function selaraskanStatusPengajuan(baris: BarisPengajuan[], rekapan: RekapanRingkas[]) {
  const perlu = baris.filter((row) => {
    const rekap = cariRekapan(row, rekapan)
    return Boolean(rekap && row.id_pengajuan && !statusInti(row.status).includes('selesai'))
  })
  if (perlu.length === 0) return

  await Promise.all(
    perlu.map((row) => {
      const rekap = cariRekapan(row, rekapan)
      const patch: Record<string, string> = { status: 'Selesai' }
      if (!row.tanggal_pelaksanaan && rekap?.tanggal_ujian) {
        patch.tanggal_pelaksanaan = String(rekap.tanggal_ujian).slice(0, 10)
      }
      if (!String(row.nama_penguji || '').trim() && rekap?.penguji) patch.nama_penguji = String(rekap.penguji)
      return supabase.from('pengajuan').update(patch).eq('id_pengajuan', row.id_pengajuan)
    }),
  )
}
