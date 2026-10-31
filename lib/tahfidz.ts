export type BagianAyat = {
  surah: string
  mulai: string
  selesai: string
  catatan: string
}

function teks(value: unknown) {
  const hasil = String(value ?? '').trim()
  if (!hasil || hasil === '-' || hasil.toLowerCase() === 'null') return ''
  return hasil
}

function angka(value: unknown) {
  const hasil = teks(value)
  return /^\d+$/.test(hasil) ? hasil : ''
}

export function formatLabelAyat(surah: string, mulai: string, selesai: string) {
  const sumber = String(surah || '').trim()
  const tertanam = sumber.match(/^(.*?)\s*\(Ayat\s+(\d+)(?:\s*-\s*(\d+))?\)\s*$/i)
  const legacy = sumber.match(/^(.*?)\s+(\d+)\s*[-–]\s*(\d+)\s*$/)
  let nama = sumber
  let awal = angka(mulai)
  let akhir = angka(selesai)

  if (tertanam) {
    nama = tertanam[1].trim()
    if (!awal) awal = tertanam[2]
    if (!akhir) akhir = tertanam[3] || ''
  } else if (legacy) {
    nama = legacy[1].trim()
    if (!awal) awal = legacy[2]
    if (!akhir) akhir = legacy[3]
  } else {
    nama = sumber.replace(/\s+-\s*$/, '').trim()
  }

  nama = nama.replace(/\s*\(\s*\d+(?:\s*[-–]\s*\d+)?\s*\)\s*$/, '').trim()

  if (!nama && !awal && !akhir) return ''
  const ayat = awal && akhir ? (awal === akhir ? `Ayat ${awal}` : `Ayat ${awal}-${akhir}`) : awal || akhir ? `Ayat ${awal || akhir}` : ''
  if (nama && ayat) return `${nama} (${ayat})`
  return nama || ayat
}

export function parseBagianAyat(nilai: string): BagianAyat | null {
  const raw = String(nilai || '')
    .trim()
    .replace(/^[ZM]\s*:\s*/i, '')
    .trim()
  if (!raw || raw === '-') return null

  const label = raw.match(/^(.*?)\s*\(Ayat\s+(\d+)(?:\s*-\s*(\d+))?\)(?:\s*·\s*(.*))?$/i)
  if (label) {
    return {
      surah: label[1].trim(),
      mulai: label[2],
      selesai: label[3] || label[2],
      catatan: (label[4] || '').trim(),
    }
  }

  const kurung = raw.match(/^(.*?)\s*\(\s*(\d+)\s*[-–]\s*(\d+)\s*\)\s*$/)
  if (kurung) {
    return { surah: kurung[1].trim(), mulai: kurung[2], selesai: kurung[3], catatan: '' }
  }

  const rentang = raw.match(/^(.*?)\s+(\d+)\s*[-–]\s*(\d+)\s*$/)
  if (rentang) {
    return { surah: rentang[1].trim(), mulai: rentang[2], selesai: rentang[3], catatan: '' }
  }

  const satu = raw.match(/^(.*?)\s+(\d+)\s*$/)
  if (satu) {
    return { surah: satu[1].trim(), mulai: satu[2], selesai: satu[2], catatan: '' }
  }

  const nama = raw.replace(/\s+-\s*$/, '').trim()
  if (!nama || nama === '-') return null
  return { surah: nama, mulai: '', selesai: '', catatan: '' }
}

export function parseMurojaahTeks(nilai: unknown) {
  const raw = teks(nilai)
  if (!raw) return null
  const [kiri, ...sisa] = raw.split(/\s+s\.d\s+/i)
  return {
    awal: parseBagianAyat(kiri),
    akhir: sisa.length ? parseBagianAyat(sisa.join(' s.d ')) : null,
  }
}

export function parseTugasTeks(nilai: unknown) {
  const raw = teks(nilai)
  if (!raw || /^(\[?\s*(ziyadah|murojaah)\s+aktif\s*\]?\s*)+$/i.test(raw)) {
    return { ziyadah: null as BagianAyat | null, murojaah: null as BagianAyat | null }
  }
  const parts = raw
    .split('|')
    .map((bagian) => bagian.trim())
    .filter(Boolean)
  if (parts.length >= 2) {
    return {
      ziyadah: parseBagianAyat(parts[0]),
      murojaah: parseBagianAyat(parts.slice(1).join(' | ')),
    }
  }
  if (/^M\s*:/i.test(parts[0] || '')) return { ziyadah: null, murojaah: parseBagianAyat(parts[0]) }
  return { ziyadah: parseBagianAyat(parts[0] || ''), murojaah: null }
}

export function formatZiyadahRecord(record: any) {
  const surah = teks(record?.surah_ziyadah) || teks(record?.hafalan_baru) || teks(record?.surah)
  const label = formatLabelAyat(surah, teks(record?.ayat_mulai), teks(record?.ayat_selesai))
  if (label) return label
  const ayat = teks(record?.ayat_ziyadah)
  const rentang = ayat.match(/^(\d+)\s*[-–]\s*(\d+)$/)
  if (rentang) return formatLabelAyat(surah, rentang[1], rentang[2])
  return '-'
}

export function formatMurojaahRecord(record: any) {
  const tersimpan = teks(record?.murojaah)
  if (tersimpan && /\(Ayat\s+\d+/i.test(tersimpan)) return tersimpan.split(' · ')[0].trim()

  const surah = teks(record?.surah_murojaah)
  const ayat = teks(record?.ayat_murojaah)
  if (surah && !/s\.d/i.test(surah)) {
    const rentang = ayat.match(/(\d+)\s*[-–]\s*(\d+)/)
    if (rentang) return formatLabelAyat(surah, rentang[1], rentang[2])
    const satu = ayat.match(/(\d+)/)
    if (satu) return formatLabelAyat(surah, satu[1], '')
  }
  if (tersimpan) return formatLabelAyat(tersimpan, '', '') || tersimpan
  if (surah) return formatLabelAyat(surah, '', '') || surah
  return teks(record?.keterangan_pesan_murojaah) || '-'
}

function formatBagianTugas(bagian: string) {
  const raw = bagian.trim().replace(/^[ZM]\s*:\s*/i, '').trim()
  if (!raw || raw === '-') return ''
  if (/\(Ayat\s+\d+/i.test(raw)) return raw
  return formatLabelAyat(raw, '', '')
}

export function formatTugasRecord(record: any) {
  const dariKolom = teks(record?.surah_tugas)
    ? formatLabelAyat(teks(record?.surah_tugas), teks(record?.ayat_mulai_tugas), teks(record?.ayat_selesai_tugas))
    : ''
  const tugas = teks(record?.tugas_rumah)
  if (!tugas) return dariKolom || '-'
  if (/^(\[?\s*(ziyadah|murojaah)\s+aktif\s*\]?\s*)+$/i.test(tugas)) return dariKolom || '-'
  const parts = tugas.split('|').map((bagian) => formatBagianTugas(bagian)).filter(Boolean)
  if (parts.length) return parts.join(' | ')
  return dariKolom || tugas
}

export function kunciHariJakarta(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

export function tanggalTermasukHariIni(dateStr: unknown, hari = kunciHariJakarta()) {
  const raw = String(dateStr ?? '').trim()
  if (!raw) return false
  if (!raw.includes('T') && raw.slice(0, 10) === hari) return true
  const parsed = new Date(raw.includes('/') ? raw.replace(/(\d{1,2})\/(\d{1,2})\/(\d{4})/, '$3-$2-$1') : raw)
  if (Number.isNaN(parsed.getTime())) return false
  return kunciHariJakarta(parsed) === hari
}
