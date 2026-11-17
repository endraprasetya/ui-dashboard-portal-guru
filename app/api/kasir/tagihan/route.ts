import { NextResponse } from 'next/server'
import { muatDetailTunggakan, muatTunggakanWali } from '@/lib/ampss'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams
  const nis = params.get('nis')?.trim() || ''
  const unit = params.get('unit')?.trim() || undefined
  if (!/^\d{3,12}$/.test(nis)) {
    return NextResponse.json({ pesan: 'NIS siswa belum valid.' }, { status: 400, headers: { 'Cache-Control': 'no-store' } })
  }
  try {
    const langsung = await muatDetailTunggakan(nis, unit)
    if (langsung) return NextResponse.json(langsung, { headers: { 'Cache-Control': 'no-store' } })
    const cadangan = await muatTunggakanWali([nis], unit)
    if (cadangan[0]) return NextResponse.json(cadangan[0], { headers: { 'Cache-Control': 'no-store' } })
    return NextResponse.json({ pesan: 'Tagihan siswa tidak ditemukan.' }, { status: 404, headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    const pesan = error instanceof Error ? error.message : 'Rincian tagihan belum dapat dimuat.'
    const status = pesan.includes('belum diisi') ? 503 : 502
    return NextResponse.json({ pesan }, { status, headers: { 'Cache-Control': 'no-store' } })
  }
}
