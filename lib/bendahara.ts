import { supabase } from '@/lib/supabase'
import { adalahKepalaSekolah, teksPeran } from '@/lib/kepala-sekolah'
import { isPortalWali } from '@/lib/portal-wali'

export type AkunSesi = Record<string, unknown> & {
  username?: string
  role?: string
  nama_lengkap?: string
  nama?: string
  unit?: string
  target_id?: string
  id_user?: string
}

export function adalahPeranBendahara(role?: string | null) {
  const peran = teksPeran(role)
  return Boolean(peran) && peran.includes('bendahara')
}

export function adalahBendahara(user?: { role?: string } | null) {
  return adalahPeranBendahara(user?.role)
}

export function tujuanSetelahLogin(user?: { role?: string } | null) {
  if (adalahKepalaSekolah(user)) return '/dashboard/kepala-sekolah'
  if (adalahBendahara(user)) return '/dashboard/bendahara'
  if (isPortalWali(user)) return '/portal-wali'
  return '/'
}

function simpanSesi(user: AkunSesi) {
  const { password: _sandi, ...aman } = user
  localStorage.setItem('user_session', JSON.stringify(aman))
}

export type HasilValidasiBendahara =
  | { status: 'ok'; user: AkunSesi }
  | { status: 'bukan'; user: AkunSesi }
  | { status: 'kosong' }

/** Memastikan sesi lokal masih Bendahara di tabel `users` Supabase. */
export async function validasiSesiBendahara(sesi?: AkunSesi | null): Promise<HasilValidasiBendahara> {
  if (!sesi) return { status: 'kosong' }
  if (!adalahBendahara(sesi)) return { status: 'bukan', user: sesi }

  const username = String(sesi.username || '').trim()
  const target = String(sesi.target_id || sesi.id_user || '').trim()
  if (!username && !target) return { status: 'kosong' }

  let permintaan = supabase
    .from('users')
    .select('username,role,nama_lengkap,unit,target_id')
    .limit(1)

  permintaan = username ? permintaan.eq('username', username) : permintaan.eq('target_id', target)

  const { data, error } = await permintaan
  if (error) {
    throw new Error(error.message || 'Tidak dapat memvalidasi sesi Bendahara.')
  }

  const baris = (Array.isArray(data) ? data[0] : data) as AkunSesi | undefined
  if (!baris || !String(baris.username || baris.target_id || '').trim()) {
    localStorage.removeItem('user_session')
    return { status: 'kosong' }
  }

  const user: AkunSesi = {
    ...sesi,
    ...baris,
    target_id: baris.target_id || sesi.target_id || baris.username,
    nama_lengkap: baris.nama_lengkap || sesi.nama_lengkap || baris.username,
    unit: baris.unit || sesi.unit || 'Semua Unit',
    role: String(baris.role || '').trim(),
  }
  simpanSesi(user)

  if (!adalahPeranBendahara(user.role)) return { status: 'bukan', user }
  return { status: 'ok', user }
}
