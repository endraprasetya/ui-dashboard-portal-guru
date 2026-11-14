import { NextResponse } from 'next/server'
import { muatTunggakanWali } from '@/lib/ampss'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: Request) {
  const nis = new URL(request.url).searchParams.getAll('nis').flatMap((nilai) => nilai.split(',')).map((nilai) => nilai.trim()).filter(Boolean)
  if (nis.length === 0) {
    return NextResponse.json({ pesan: 'NIS ananda belum dikirim.' }, { status: 400, headers: { 'Cache-Control': 'no-store' } })
  }
  try {
    const data = await muatTunggakanWali(nis)
    return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    const pesan = error instanceof Error ? error.message : 'Data keuangan AMPSS belum dapat dimuat.'
    const status = pesan.includes('belum diisi') ? 503 : 502
    return NextResponse.json({ pesan }, { status, headers: { 'Cache-Control': 'no-store' } })
  }
}
