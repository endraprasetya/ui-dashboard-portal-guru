import { NextResponse } from 'next/server'
import { muatRekapKeuangan } from '@/lib/ampss'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: Request) {
  const segar = new URL(request.url).searchParams.get('segar') === '1'
  try {
    const data = await muatRekapKeuangan(segar)
    return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    const pesan = error instanceof Error ? error.message : 'Data keuangan AMPSS belum dapat dimuat.'
    const status = pesan.includes('belum diisi') ? 503 : 502
    return NextResponse.json({ pesan }, { status, headers: { 'Cache-Control': 'no-store' } })
  }
}
