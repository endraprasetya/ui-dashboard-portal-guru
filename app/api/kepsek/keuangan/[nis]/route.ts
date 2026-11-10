import { NextResponse } from 'next/server'
import { muatDetailTunggakan } from '@/lib/ampss'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type Konteks = { params: Promise<{ nis: string }> }

export async function GET(_request: Request, konteks: Konteks) {
  const { nis } = await konteks.params
  try {
    const data = await muatDetailTunggakan(decodeURIComponent(nis))
    if (!data) return NextResponse.json({ pesan: 'Siswa tidak ditemukan pada rekap tunggakan.' }, { status: 404 })
    return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    const pesan = error instanceof Error ? error.message : 'Rincian tagihan belum dapat dimuat.'
    const status = pesan.includes('belum diisi') ? 503 : 502
    return NextResponse.json({ pesan }, { status, headers: { 'Cache-Control': 'no-store' } })
  }
}
