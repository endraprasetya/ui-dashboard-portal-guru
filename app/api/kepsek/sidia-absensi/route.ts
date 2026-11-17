import { NextResponse } from 'next/server'
import { muatRekapAbsensiSidia } from '@/lib/sidia-absensi'
import { todayInputValue } from '@/lib/jurnal'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams
  const tanggal = (params.get('tanggal') || todayInputValue()).slice(0, 10)
  try {
    const data = await muatRekapAbsensiSidia(tanggal)
    return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    const pesan = error instanceof Error ? error.message : 'Data absensi SIDIA belum dapat dimuat.'
    const status = /belum diisi|ditolak/i.test(pesan) ? 503 : 502
    return NextResponse.json({ pesan }, { status, headers: { 'Cache-Control': 'no-store' } })
  }
}