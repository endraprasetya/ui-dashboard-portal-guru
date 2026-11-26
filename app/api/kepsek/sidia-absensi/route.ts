import { NextResponse } from 'next/server'
import { muatRekapAbsensiSidia, muatRekapBulananSidia } from '@/lib/sidia-absensi'
import { todayInputValue } from '@/lib/jurnal'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function gagal(error: unknown, cadangan: string) {
  const pesan = error instanceof Error ? error.message : cadangan
  const status = /tidak valid/i.test(pesan) ? 400 : /belum diisi|ditolak/i.test(pesan) ? 503 : 502
  return NextResponse.json({ pesan }, { status, headers: { 'Cache-Control': 'no-store' } })
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams
  if (params.get('mode') === 'bulanan') {
    const tahun = Number(params.get('tahun'))
    const bulan = Number(params.get('bulan'))
    try {
      const data = await muatRekapBulananSidia(tahun, bulan)
      return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } })
    } catch (error) {
      return gagal(error, 'Rekap bulanan presensi SIDIA belum dapat dimuat.')
    }
  }

  const tanggal = (params.get('tanggal') || todayInputValue()).slice(0, 10)
  try {
    const data = await muatRekapAbsensiSidia(tanggal)
    return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    return gagal(error, 'Data absensi SIDIA belum dapat dimuat.')
  }
}