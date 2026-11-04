import { supabase } from '@/lib/supabase'
import { teacherDisplayName } from '@/lib/qiroah'
import { fetchAllSiswa } from '@/lib/siswa'

export type BarisAktivitasGuru = {
  id: string
  student: string
  activity: string
  type: string
  time: string
}

type BarisAktivitasInternal = BarisAktivitasGuru & { sortMs: number }

function normNama(value: unknown) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

function guruCocok(barGuru: unknown, user?: { nama_lengkap?: string; nama?: string; username?: string } | null) {
  const pencatat = normNama(barGuru)
  if (!pencatat || pencatat === '-') return false
  const kandidat = [user?.nama_lengkap, user?.nama, user?.username, teacherDisplayName(user)]
    .map((item) => normNama(item))
    .filter(Boolean)
  return kandidat.some((item) => item === pencatat || pencatat.includes(item) || item.includes(pencatat))
}

function parseWaktu(value: unknown): Date | null {
  if (!value) return null
  const raw = String(value).trim()
  if (!raw) return null
  if (raw.includes('/')) {
    const [datePart, timePart] = raw.split(/\s+/)
    const [day, month, year] = datePart.split('/')
    if (day && month && year) {
      const iso = timePart ? `${year}-${month}-${day}T${timePart}` : `${year}-${month}-${day}T12:00:00`
      const d = new Date(iso)
      return Number.isNaN(d.getTime()) ? null : d
    }
  }
  const d = new Date(raw)
  return Number.isNaN(d.getTime()) ? null : d
}

function waktuRelatif(d: Date) {
  const detik = Math.floor((Date.now() - d.getTime()) / 1000)
  if (detik < 45) return 'Baru saja'
  const menit = Math.floor(detik / 60)
  if (menit < 60) return `${menit} menit lalu`
  const jam = Math.floor(menit / 60)
  if (jam < 36) return `${jam} jam lalu`
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function pushAktivitas(
  daftar: BarisAktivitasInternal[],
  item: Omit<BarisAktivitasGuru, 'time'> & { waktu: Date | null },
) {
  if (!item.waktu) return
  daftar.push({
    id: item.id,
    student: item.student,
    activity: item.activity,
    type: item.type,
    sortMs: item.waktu.getTime(),
    time: waktuRelatif(item.waktu),
  })
}

export async function muatAktivitasGuruTerbaru(
  currentUser?: { nama_lengkap?: string; nama?: string; username?: string } | null,
  batas = 15,
): Promise<BarisAktivitasGuru[]> {
  if (!currentUser) return []

  const siswa = await fetchAllSiswa(currentUser)
  const namaMap = new Map(siswa.map((row) => [String(row.id_siswa), row]))
  const labelSiswa = (id: unknown, fallback?: unknown) => {
    const baris = namaMap.get(String(id || ''))
    return baris ? `${baris.nama_siswa} · ${baris.kelas}` : String(fallback || id || 'Siswa')
  }

  const hasil: BarisAktivitasInternal[] = []

  const [tahfidz, qiroah, tertib, jurnal] = await Promise.all([
    supabase
      .from('setoran_tahfidz')
      .select('id_setoran,tanggal,id_siswa,hafalan_baru,ayat_mulai,ayat_selesai,status,nama_ustadz')
      .order('tanggal', { ascending: false })
      .limit(80),
    supabase
      .from('setoran_qiroah')
      .select('id_qiroah,tanggal,id_siswa,nama_siswa,kelas,jilid,halaman,status,ustadz')
      .order('tanggal', { ascending: false })
      .limit(80),
    supabase
      .from('tertib_point')
      .select('id_tertib_point,created_at,id_siswa,label,pts,guru')
      .order('created_at', { ascending: false })
      .limit(80),
    supabase
      .from('jurnal_pembelajaran')
      .select('id,kelas,tanggal,jam,mapel,materi,guru')
      .order('tanggal', { ascending: false })
      .limit(80),
  ])

  for (const row of tahfidz.data || []) {
    if (!guruCocok(row.nama_ustadz, currentUser)) continue
    const surah = String(row.hafalan_baru || '').trim() || 'Hafalan'
    const ayat =
      row.ayat_mulai && row.ayat_selesai && row.ayat_mulai !== row.ayat_selesai
        ? `${row.ayat_mulai}-${row.ayat_selesai}`
        : String(row.ayat_mulai || row.ayat_selesai || '')
    const status = String(row.status || '').trim() || 'Setoran'
    const detail = ayat ? `Ayat ${ayat} · ${status}` : status
    pushAktivitas(hasil, {
      id: `tahfidz:${row.id_setoran}`,
      student: labelSiswa(row.id_siswa),
      activity: `Setoran ${surah} (${detail})`,
      type: 'Tahfidz',
      waktu: parseWaktu(row.tanggal),
    })
  }

  for (const row of qiroah.data || []) {
    if (!guruCocok(row.ustadz, currentUser)) continue
    const capaian = [row.jilid, row.halaman ? `Hal ${row.halaman}` : ''].filter(Boolean).join(' ')
    const status = String(row.status || '').trim()
    pushAktivitas(hasil, {
      id: `qiroah:${row.id_qiroah}`,
      student: row.nama_siswa
        ? `${row.nama_siswa}${row.kelas ? ` · ${row.kelas}` : ''}`
        : labelSiswa(row.id_siswa),
      activity: `Qiroah ${capaian || 'setoran'}${status ? ` (${status})` : ''}`,
      type: 'Qiroah',
      waktu: parseWaktu(row.tanggal),
    })
  }

  for (const row of tertib.data || []) {
    if (!guruCocok(row.guru, currentUser)) continue
    const pts = Number(row.pts) || 0
    pushAktivitas(hasil, {
      id: `tertib:${row.id_tertib_point}`,
      student: labelSiswa(row.id_siswa),
      activity: `${row.label}${pts ? ` (${pts > 0 ? '+' : ''}${pts} poin)` : ''}`,
      type: 'Tertib Point',
      waktu: parseWaktu(row.created_at),
    })
  }

  for (const row of jurnal.data || []) {
    if (!guruCocok(row.guru, currentUser)) continue
    const waktu = parseWaktu(row.tanggal ? `${row.tanggal}T12:00:00` : null)
    pushAktivitas(hasil, {
      id: `jurnal:${row.id}:${row.jam}`,
      student: row.kelas ? `Kelas ${row.kelas}` : 'Kelas',
      activity: `Jurnal ${row.mapel || 'mapel'} jam ${row.jam || '-'}${row.materi ? `: ${String(row.materi).slice(0, 60)}` : ''}`,
      type: 'Jurnal',
      waktu,
    })
  }

  return hasil
    .sort((a, b) => b.sortMs - a.sortMs)
    .slice(0, batas)
    .map(({ sortMs: _sortMs, ...rest }) => rest)
}
