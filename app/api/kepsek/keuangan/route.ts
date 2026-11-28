import { NextResponse } from 'next/server'
import { denganAmpssKepsekAktif, muatRekapKeuangan } from '@/lib/ampss'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams
  const segar = params.get('segar') === '1'
  const unit = params.has('unit') ? params.get('unit') || '' : undefined
  try {
    const data = await denganAmpssKepsekAktif(() => muatRekapKeuangan(segar, unit))
    return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    const pesan = error instanceof Error ? error.message : 'Data keuangan AMPSS belum dapat dimuat.'
    const status = pesan.includes('belum diisi') ? 503 : 502
    return NextResponse.json({ pesan }, { status, headers: { 'Cache-Control': 'no-store' } })
  }
}
