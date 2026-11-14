import { supabase } from '@/lib/supabase'
import { cocokAnandaWali, kunciAkunWali, type SantriWali } from '@/lib/portal-wali'
import { unitSama } from '@/lib/siswa'

function mapSiswa(row: Record<string, unknown>): SantriWali {
  return {
    id: String(row.id_siswa ?? ''),
    name: String(row.nama_siswa ?? ''),
    kelas: String(row.kelas ?? ''),
    unit: String(row.unit ?? '').trim() || undefined,
    idOrtu: String(row.id_ortu ?? ''),
    nis: String(row.nis ?? '').trim() || undefined,
  }
}

function siswaRowSelect() {
  return 'id_siswa,nama_siswa,kelas,id_ortu,unit,nis' as const
}

/** Santri yang tertaut ke akun wali (id siswa, id ortu, atau username). */
export async function muatAnandaUntukWali(user?: Record<string, unknown> | null): Promise<SantriWali[]> {
  const kunci = kunciAkunWali(user)
  const idPrioritas = String(user?.id_siswa || user?.target_id || '').trim()
  const hasil = new Map<string, SantriWali>()

  const tambah = (rows: Record<string, unknown>[] | null) => {
    for (const row of rows || []) {
      const s = mapSiswa(row)
      if (!s.id) continue
      hasil.set(s.id, s)
    }
  }

  if (idPrioritas) {
    const { data } = await supabase
      .from('siswa')
      .select(siswaRowSelect())
      .eq('id_siswa', idPrioritas)
      .not('kelas', 'ilike', '%Alumni%')
    tambah(data as Record<string, unknown>[] | null)
  }

  for (const key of kunci.slice(0, 6)) {
    const { data: byOrtu } = await supabase
      .from('siswa')
      .select(siswaRowSelect())
      .eq('id_ortu', key)
      .not('kelas', 'ilike', '%Alumni%')
    tambah(byOrtu as Record<string, unknown>[] | null)

    const { data: byId } = await supabase
      .from('siswa')
      .select(siswaRowSelect())
      .eq('id_siswa', key)
      .not('kelas', 'ilike', '%Alumni%')
    tambah(byId as Record<string, unknown>[] | null)
  }

  const daftar = Array.from(hasil.values()).filter((s) => cocokAnandaWali(s, user) || idPrioritas === s.id)
  const unitAnanda = daftar.find((s) => s.unit)?.unit
  if (unitAnanda) {
    return daftar.filter((s) => !s.unit || unitSama(s.unit, unitAnanda))
  }
  return daftar
}
