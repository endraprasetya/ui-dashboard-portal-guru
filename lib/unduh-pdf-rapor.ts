import type { DataCetakRaporTahfidz } from '@/lib/cetak-rapor-tahfidz'
import { formatAngkaRapor } from '@/lib/rapor-tahfidz-nilai'

export function namaBerkasRaporTahfidz(nama: string, asesmen: string) {
  const aman = String(nama || 'Siswa')
    .normalize('NFKD')
    .replace(/[^\w\s.-]+/g, '')
    .trim()
    .replace(/\s+/g, '_')
  const as = String(asesmen || 'Rapor')
    .replace(/[^\w\s.-]+/g, '')
    .trim()
    .replace(/\s+/g, '_')
  return `Rapor_Tahfidz_${aman || 'Siswa'}_${as || 'Rapor'}.pdf`
}

function angka(n: number | null | undefined) {
  return formatAngkaRapor(n)
}

function bungkus(teks: string, lebar: number) {
  const kata = String(teks || '-').split(/\s+/)
  const baris: string[] = []
  let sekarang = ''
  for (const k of kata) {
    const gabung = sekarang ? `${sekarang} ${k}` : k
    if (gabung.length > lebar) {
      if (sekarang) baris.push(sekarang)
      sekarang = k
    } else {
      sekarang = gabung
    }
  }
  if (sekarang) baris.push(sekarang)
  return baris.length ? baris : ['-']
}

export async function buatPdfRaporTahfidz(data: DataCetakRaporTahfidz): Promise<Blob> {
  const { jsPDF } = await import('jspdf')
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [210, 330] })
  const { siswa } = data
  const namaSekolah = siswa.unit
    ? `SD ISLAM TERPADU AL MADINAH ${siswa.unit.toUpperCase()}`
    : 'SD ISLAM TERPADU AL MADINAH'
  const nisNisn = [siswa.nis, siswa.nisn].filter(Boolean).join('/') || '-'

  pdf.setFont('times', 'bold')
  pdf.setFontSize(14)
  const tengah = (teks: string, y: number) => pdf.text(teks, 105, y, { align: 'center' })
  tengah('RAPOR TAHFIZHUL QUR\'AN', 18)
  tengah(data.judulAsesmen || data.asesmen || '-', 25)
  tengah(namaSekolah, 32)
  tengah(data.judulTahunAjaran || '-', 39)

  pdf.setFont('times', 'normal')
  pdf.setFontSize(11)
  pdf.text(`Nama : ${siswa.nama || '-'}`, 14, 50)
  pdf.text(`No. Absen : ${siswa.noAbsen || '-'}`, 120, 50)
  pdf.text(`Kelas : ${siswa.kelasTampil || siswa.kelas || '-'}`, 14, 56)
  pdf.text(`NIS/NISN : ${nisNisn}`, 120, 56)

  const kiri = 14
  const kanan = 196
  const col = [12, 16, 52, 28, 22, 16, 16, 14, 16]
  const headers1 = ['Juz', 'No.', 'Nama Surat', 'Surah', 'Kesalahan', 'Nilai', 'Tajwid', 'Adab', 'NA']
  let y = 64

  const xCol = (i: number) => col.slice(0, i).reduce((a, b) => a + b, kiri)
  pdf.setFillColor(217, 217, 217)
  pdf.rect(kiri, y, kanan - kiri, 8, 'F')
  pdf.setFont('times', 'bold')
  pdf.setFontSize(8)
  headers1.forEach((h, i) => {
    pdf.text(h, xCol(i) + 1, y + 5.2)
  })
  y += 8

  pdf.setFont('times', 'normal')
  const baris = data.detail.length ? data.detail : [{
    juz: '-',
    nomorSurat: '-',
    namaSurat: 'Nilai ujian belum diisi.',
    namaArab: '',
    rentangAyat: '',
    kesalahanKelancaran: 0,
    nilaiKelancaran: 0,
    nilaiTajwid: 0,
    nilaiAdab: 0,
    nilaiSurat: null as number | null,
  }]

  for (const row of baris) {
    const nama = row.rentangAyat ? `${row.namaSurat} (${row.rentangAyat})` : row.namaSurat
    const tinggi = 8
    pdf.rect(kiri, y, kanan - kiri, tinggi)
    for (let i = 1; i < col.length; i++) {
      pdf.line(xCol(i), y, xCol(i), y + tinggi)
    }
    const isi = [
      row.juz || '-',
      row.nomorSurat || '-',
      nama,
      row.namaArab || '-',
      String(row.kesalahanKelancaran ?? '-'),
      angka(row.nilaiKelancaran),
      angka(row.nilaiTajwid),
      angka(row.nilaiAdab),
      angka(row.nilaiSurat),
    ]
    isi.forEach((teks, i) => {
      const potong = teks.length > 28 ? `${teks.slice(0, 26)}…` : teks
      pdf.text(potong, xCol(i) + 1, y + 5.2)
    })
    y += tinggi
    if (y > 250) {
      pdf.addPage()
      y = 18
    }
  }

  pdf.setFont('times', 'bold')
  pdf.setFillColor(30, 64, 175)
  pdf.setTextColor(255, 255, 255)
  pdf.rect(kiri, y, 80, 8, 'F')
  pdf.text('NILAI RATA-RATA', kiri + 4, y + 5.4)
  pdf.setFillColor(239, 68, 68)
  pdf.rect(kiri + 80, y, 22, 8, 'F')
  pdf.text(angka(data.nilaiRataRata), kiri + 91, y + 5.4, { align: 'center' })
  pdf.setFillColor(30, 64, 175)
  pdf.rect(kiri + 102, y, 58, 8, 'F')
  pdf.text('NILAI TARGET', kiri + 106, y + 5.4)
  pdf.setFillColor(239, 68, 68)
  pdf.rect(kiri + 160, y, 22, 8, 'F')
  pdf.text(angka(data.nilaiTarget), kiri + 171, y + 5.4, { align: 'center' })
  y += 8

  pdf.setFillColor(255, 255, 255)
  pdf.setTextColor(0, 0, 0)
  pdf.rect(kiri, y, 138, 10)
  pdf.text('NILAI RAPOR : ((2 x Nilai Rata-Rata) + Nilai Target) / 3', kiri + 4, y + 6.5)
  pdf.setFillColor(34, 197, 94)
  pdf.rect(kiri + 138, y, 44, 10, 'F')
  pdf.setFontSize(14)
  pdf.text(angka(data.nilaiRapor), kiri + 160, y + 7, { align: 'center' })
  y += 16

  pdf.setFontSize(10)
  pdf.setFont('times', 'bold')
  pdf.setTextColor(0, 0, 0)
  const catatan = [
    ['Catatan Kompetensi HQ', data.capaianKompetensi],
    ['Capaian Target Hafalan', data.capaianTarget],
    ['Motivasi', data.motivasi],
  ]
  for (const [judul, isi] of catatan) {
    const barisTeks = bungkus(isi || '-', 78)
    const tinggi = Math.max(12, 6 + barisTeks.length * 5)
    pdf.rect(kiri, y, 52, tinggi)
    pdf.rect(kiri + 52, y, 130, tinggi)
    pdf.text(judul, kiri + 2, y + 6)
    pdf.setFont('times', 'normal')
    barisTeks.forEach((b, i) => pdf.text(b, kiri + 54, y + 6 + i * 5))
    pdf.setFont('times', 'bold')
    y += tinggi
  }

  y += 14
  pdf.setFont('times', 'normal')
  pdf.setFontSize(10)
  pdf.text(`${data.lokasi}, ${data.tanggalCetak}`, 160, y, { align: 'center' })
  y += 8
  pdf.text('Orang Tua / Wali Siswa', 40, y, { align: 'center' })
  pdf.text('Ustadz Pembimbing / Wali Kelas', 105, y, { align: 'center' })
  pdf.text('Kepala Sekolah', 165, y, { align: 'center' })
  y += 28
  pdf.setFont('times', 'bold')
  pdf.text('........................', 40, y, { align: 'center' })
  pdf.text(siswa.pembimbing || '........................', 105, y, { align: 'center' })
  pdf.text(data.kepsek.nama || '........................', 165, y, { align: 'center' })
  if (data.kepsek.niy) {
    pdf.setFont('times', 'normal')
    pdf.text(`NIY. ${data.kepsek.niy}`, 165, y + 5, { align: 'center' })
  }

  return pdf.output('blob')
}

export function unduhBlob(blob: Blob, namaFile: string) {
  const url = URL.createObjectURL(blob)
  const tautan = document.createElement('a')
  tautan.href = url
  tautan.download = namaFile
  document.body.appendChild(tautan)
  tautan.click()
  tautan.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1500)
}

export async function unduhSemuaPdfRapor(daftar: DataCetakRaporTahfidz[], onProgres?: (index: number, nama: string) => void) {
  for (let i = 0; i < daftar.length; i++) {
    const data = daftar[i]
    onProgres?.(i + 1, data.siswa.nama)
    const blob = await buatPdfRaporTahfidz(data)
    unduhBlob(blob, namaBerkasRaporTahfidz(data.siswa.nama, data.asesmen || data.judulAsesmen))
    await new Promise((r) => window.setTimeout(r, 450))
  }
}
