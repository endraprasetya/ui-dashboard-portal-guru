'use client'

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Banknote, ChevronRight, Printer, RefreshCw, Search, Users, Wallet } from 'lucide-react'
import { ModalKerangka } from '@/components/kepsek/modal-kerangka'
import { KartuRekapanTagihan } from '@/components/kepsek/rekapan-tagihan'
import { SuratTunggakan } from '@/components/kepsek/surat-tunggakan'
import { BarisAksiSyaratAsas, PratinjauCetakSyaratAsas, type JenisCetakSyaratAsas } from '@/components/kepsek/cetak-syarat-asas'
import { labelTapel } from '@/lib/ampss-urai'
import { LencanaYatim } from '@/components/lencana-yatim'
import type { DetailTunggakan, RekapKeuangan, SiswaTunggakan, StatusBayar } from '@/lib/keuangan-tipe'
import type { RekapSyaratAsas } from '@/lib/syarat-asas'

const UKURAN_HALAMAN = 20

type PanelRingkas = 'piutang' | 'masuk' | 'menunggak' | 'lunas' | 'subsidi'

const kelasKartu =
  'cursor-pointer rounded-2xl border p-4 text-left shadow-sm transition hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700'

function rupiah(nilai: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(nilai)
}

function waktuLokal(iso: string) {
  const tanggal = new Date(iso)
  if (Number.isNaN(tanggal.getTime())) return ''
  return tanggal.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })
}

function LencanaStatus({ status, yatim }: { status: StatusBayar; yatim?: boolean }) {
  if (yatim || status === 'Ditanggung Yayasan') return <LencanaYatim />
  const kelas = status === 'Lunas' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${kelas}`}>{status}</span>
}

export function ModulKeuangan({ unit }: { unit: string }) {
  const [data, setData] = useState<RekapKeuangan | null>(null)
  const [galat, setGalat] = useState('')
  const [memuat, setMemuat] = useState(true)
  const [cari, setCari] = useState('')
  const [kelas, setKelas] = useState('semua')
  const [status, setStatus] = useState<'semua' | StatusBayar>('Menunggak')
  const [halaman, setHalaman] = useState(0)
  const [detail, setDetail] = useState<DetailTunggakan | null>(null)
  const [detailMuat, setDetailMuat] = useState(false)
  const [detailGalat, setDetailGalat] = useState('')
  const [panel, setPanel] = useState<PanelRingkas | null>(null)
  const [surat, setSurat] = useState<SiswaTunggakan | null>(null)
  const [kelasCetakAsas, setKelasCetakAsas] = useState('semua')
  const [syaratAsas, setSyaratAsas] = useState<RekapSyaratAsas | null>(null)
  const [syaratAsasMuat, setSyaratAsasMuat] = useState(false)
  const [syaratAsasGalat, setSyaratAsasGalat] = useState('')
  const [pratinjauAsas, setPratinjauAsas] = useState<JenisCetakSyaratAsas | null>(null)
  const permintaanDetail = useRef(0)
  const permintaanSyaratAsas = useRef(0)

  const muat = (segar = false) => {
    setMemuat(true)
    setGalat('')
    if (segar) setSyaratAsas(null)
    const params = new URLSearchParams({ unit })
    if (segar) params.set('segar', '1')
    fetch(`/api/kepsek/keuangan?${params}`)
      .then(async (respon) => {
        const json = await respon.json()
        if (!respon.ok) throw new Error(json.pesan || 'Data keuangan belum dapat dimuat.')
        setData(json as RekapKeuangan)
      })
      .catch((error: Error) => setGalat(error.message || 'Data keuangan belum dapat dimuat.'))
      .finally(() => setMemuat(false))
  }

  useEffect(() => {
    setSyaratAsas(null)
    setPratinjauAsas(null)
    setKelasCetakAsas('semua')
    muat(false)
    // unit menentukan sekolah AMPSS yang dimuat
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unit])

  const kelasPilihan = useMemo(() => {
    const daftar = new Set((data?.siswa || []).map((baris) => baris.kelas))
    return [...daftar].sort((a, b) => a.localeCompare(b, 'id', { numeric: true }))
  }, [data])

  const tersaring = useMemo(() => {
    const kata = cari.trim().toLowerCase()
    return (data?.siswa || []).filter((baris) => {
      if (panel === 'subsidi') {
        if (!baris.yatim) return false
      } else if (status === 'Lunas') {
        if (!baris.aktif) return false
        if (baris.status !== 'Lunas' && !baris.yatim) return false
      } else if (status !== 'semua' && baris.status !== status) {
        return false
      }
      if (kelas !== 'semua' && baris.kelas !== kelas) return false
      if (!kata) return true
      return baris.nama.toLowerCase().includes(kata) || baris.nis.includes(kata)
    })
  }, [data, cari, kelas, status, panel])

  const halamanMaks = Math.max(0, Math.ceil(tersaring.length / UKURAN_HALAMAN) - 1)
  const halamanAman = Math.min(halaman, halamanMaks)
  const tampil = tersaring.slice(halamanAman * UKURAN_HALAMAN, halamanAman * UKURAN_HALAMAN + UKURAN_HALAMAN)

  const bukaPanel = (berikutnya: PanelRingkas) => {
    setCari('')
    setKelas('semua')
    setHalaman(0)
    setStatus(berikutnya === 'lunas' ? 'Lunas' : 'Menunggak')
    setPanel(berikutnya)
  }

  const muatSyaratAsas = (segar = false) => {
    const tiket = ++permintaanSyaratAsas.current
    setSyaratAsasMuat(true)
    setSyaratAsasGalat('')
    const params = new URLSearchParams({ unit })
    if (segar) params.set('segar', '1')
    return fetch(`/api/kepsek/keuangan/syarat-asas?${params}`)
      .then(async (respon) => {
        const json = await respon.json()
        if (!respon.ok) throw new Error(json.pesan || 'Rekap syarat ASAS belum dapat dimuat.')
        if (permintaanSyaratAsas.current === tiket) setSyaratAsas(json as RekapSyaratAsas)
        return json as RekapSyaratAsas
      })
      .catch((error: Error) => {
        if (permintaanSyaratAsas.current === tiket) {
          setSyaratAsasGalat(error.message || 'Rekap syarat ASAS belum dapat dimuat.')
        }
        throw error
      })
      .finally(() => {
        if (permintaanSyaratAsas.current === tiket) setSyaratAsasMuat(false)
      })
  }

  const bukaCetakAsas = (jenis: JenisCetakSyaratAsas) => {
    if (syaratAsas) {
      setPratinjauAsas(jenis)
      return
    }
    muatSyaratAsas(false)
      .then(() => setPratinjauAsas(jenis))
      .catch(() => undefined)
  }

  const bukaDetail = (nis: string) => {
    const tiket = ++permintaanDetail.current
    setDetail(null)
    setDetailGalat('')
    setDetailMuat(true)
    const params = new URLSearchParams({ unit })
    fetch(`/api/kepsek/keuangan/${encodeURIComponent(nis)}?${params}`)
      .then(async (respon) => {
        const json = await respon.json()
        if (!respon.ok) throw new Error(json.pesan || 'Rincian tagihan belum dapat dimuat.')
        if (permintaanDetail.current === tiket) setDetail(json as DetailTunggakan)
      })
      .catch((error: Error) => {
        if (permintaanDetail.current === tiket) setDetailGalat(error.message || 'Rincian tagihan belum dapat dimuat.')
      })
      .finally(() => {
        if (permintaanDetail.current === tiket) setDetailMuat(false)
      })
  }

  return (
    <>
    <section id="keuangan-tunggakan" className="no-print space-y-4 rounded-2xl border border-emerald-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-emerald-900">
            <Wallet className="size-4" />
            <h2 className="text-sm font-extrabold">Keuangan & rekap tunggakan</h2>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {data
              ? `${data.sekolah} · tahun pelajaran ${data.tapel || '—'} · tunggakan ${data.periodeTagihan || '—'} · diperbarui ${waktuLokal(data.diambilPada)} · unit ${unit}`
              : `Sumber data admin AMPSS · unit ${unit}`}
          </p>
          {data?.catatan ? <p className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">{data.catatan}</p> : null}
        </div>
        <button
          type="button"
          onClick={() => muat(true)}
          disabled={memuat}
          className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-emerald-900 hover:bg-slate-50 disabled:opacity-60"
        >
          <RefreshCw className={`size-3.5 ${memuat ? 'animate-spin' : ''}`} /> Muat ulang
        </button>
      </div>

      {galat && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{galat}</p>}
      {memuat && !data && <p className="text-sm text-slate-500">Mengambil tagihan dan penerimaan dari AMPSS...</p>}

      {data && (
        <BarisAksiSyaratAsas
          kelas={kelasCetakAsas}
          kelasPilihan={kelasPilihan}
          onKelas={setKelasCetakAsas}
          onCetak={bukaCetakAsas}
          memuat={syaratAsasMuat}
          galat={syaratAsasGalat}
        />
      )}

      {data && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <button type="button" onClick={() => bukaPanel('piutang')} className={`${kelasKartu} border-amber-200 bg-amber-50`}>
            <span className="flex items-center justify-between gap-2 text-amber-900">
              <span className="text-xs font-extrabold uppercase">Dana belum masuk</span>
              <ChevronRight className="size-4 text-amber-700/70" />
            </span>
            <span className="mt-2 block text-xl font-black text-slate-900">{rupiah(data.piutang)}</span>
            <span className="mt-1 block text-xs font-medium text-slate-600">Piutang yang sudah jatuh tempo sampai bulan berjalan.</span>
          </button>
          <button type="button" onClick={() => bukaPanel('masuk')} className={`${kelasKartu} border-emerald-200 bg-emerald-50`}>
            <span className="flex items-center justify-between gap-2 text-emerald-900">
              <span className="inline-flex items-center gap-1 text-xs font-extrabold uppercase">
                <Banknote className="size-3.5" /> Dana masuk hari ini
              </span>
              <ChevronRight className="size-4 text-emerald-700/70" />
            </span>
            <span className="mt-2 block text-xl font-black text-slate-900">{rupiah(data.penerimaanHariIni)}</span>
            <span className="mt-1 block text-xs font-medium text-slate-600">Total penerimaan unit pada laporan bank AMPSS.</span>
          </button>
          <button type="button" onClick={() => bukaPanel('menunggak')} className={`${kelasKartu} border-slate-200 bg-white`}>
            <span className="flex items-center justify-between gap-2 text-amber-800">
              <span className="inline-flex items-center gap-1 text-xs font-extrabold uppercase">
                <Users className="size-3.5" /> Siswa menunggak
              </span>
              <ChevronRight className="size-4 text-slate-400" />
            </span>
            <span className="mt-2 block text-xl font-black text-slate-900">{data.siswaMenunggak}</span>
            <span className="mt-1 block text-xs font-medium text-slate-600">Siswa dengan tagihan jatuh tempo yang masih terbuka.</span>
          </button>
          <button type="button" onClick={() => bukaPanel('lunas')} className={`${kelasKartu} border-slate-200 bg-white`}>
            <span className="flex items-center justify-between gap-2 text-emerald-800">
              <span className="text-xs font-extrabold uppercase">Siswa lunas</span>
              <ChevronRight className="size-4 text-slate-400" />
            </span>
            <span className="mt-2 block text-xl font-black text-slate-900">{data.siswaLunas}</span>
            <span className="mt-1 block text-xs font-medium text-slate-600">Siswa rombel aktif tanpa tagihan jatuh tempo.</span>
          </button>
          <KartuRekapanTagihan baris={data.rekapan} periode={data.periodeTagihan} />
          <button type="button" onClick={() => bukaPanel('subsidi')} className={`${kelasKartu} border-emerald-200 bg-emerald-50`}>
            <span className="flex items-center justify-between gap-2 text-emerald-900">
              <span className="inline-flex items-center gap-1 text-xs font-extrabold uppercase">
                <Wallet className="size-3.5" /> Subsidi anak yatim
              </span>
              <ChevronRight className="size-4 text-emerald-700/70" />
            </span>
            <span className="mt-2 block text-xl font-black text-slate-900">{rupiah(data.subsidiYatim?.nominal || 0)}</span>
            <span className="mt-1 block text-xs font-medium text-slate-600">
              {data.subsidiYatim?.siswa || 0} siswa. Catatan subsidi silang, tidak masuk arus kas, LRA, atau neraca.
            </span>
          </button>
        </div>
      )}

      {data && panel && (
        <ModalKerangka
          judul={judulPanel(panel)}
          keterangan={keteranganPanel(panel, data)}
          onTutup={() => setPanel(null)}
          lebar={panel === 'menunggak' || panel === 'lunas' || panel === 'subsidi' ? 'max-w-5xl' : 'max-w-3xl'}
        >
          {panel === 'piutang' && (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <PanelPos judul="Piutang per jenis" baris={data.piutangPerJenis} />
                <PanelPos judul="Piutang per tahun pelajaran" baris={data.piutangPerTapel} />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] border-collapse text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600">
                      <th className="border-b p-2">Kelas</th>
                      <th className="border-b p-2 text-end">Siswa</th>
                      <th className="border-b p-2 text-end">Lunas</th>
                      <th className="border-b p-2 text-end">Menunggak</th>
                      <th className="border-b p-2 text-end">Piutang</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.perKelas.map((baris) => (
                      <tr key={baris.kelas}>
                        <td className="border-b p-2 font-bold">{baris.kelas}</td>
                        <td className="border-b p-2 text-end">{baris.siswa}</td>
                        <td className="border-b p-2 text-end">{baris.lunas}</td>
                        <td className="border-b p-2 text-end">{baris.menunggak}</td>
                        <td className="border-b p-2 text-end font-bold">{rupiah(baris.piutang)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {panel === 'masuk' && (
            <PanelPos judul="Penerimaan bank hari ini per jenis" baris={data.penerimaanPerItem} kosong="Belum ada penerimaan pada laporan bank hari ini." />
          )}
          {panel === 'subsidi' && (
            <p className="mb-3 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-900">
              Nominal ini adalah tagihan yang ditanggung yayasan. Kasir tidak menagihnya, dan angka ini tidak dicatat sebagai penerimaan atau pengeluaran kas.
            </p>
          )}
          {(panel === 'menunggak' || panel === 'lunas' || panel === 'subsidi') && (
            <DaftarSiswa
              cari={cari}
              kelas={kelas}
              kelasPilihan={kelasPilihan}
              halamanAman={halamanAman}
              halamanMaks={halamanMaks}
              jumlah={tersaring.length}
              tampil={tampil}
              onCari={(nilai) => {
                setCari(nilai)
                setHalaman(0)
              }}
              onKelas={(nilai) => {
                setKelas(nilai)
                setHalaman(0)
              }}
              onHalaman={(arah) => setHalaman((nilai) => Math.max(0, Math.min(halamanMaks, nilai + arah)))}
              onRincian={bukaDetail}
              onCetak={panel === 'menunggak' ? setSurat : undefined}
              labelYatim={panel === 'lunas' ? 'Anak Yatim' : undefined}
              aksiSyaratAsas={
                <BarisAksiSyaratAsas
                  kelas={kelasCetakAsas}
                  kelasPilihan={kelasPilihan}
                  onKelas={setKelasCetakAsas}
                  onCetak={bukaCetakAsas}
                  memuat={syaratAsasMuat}
                  galat={syaratAsasGalat}
                />
              }
            />
          )}
        </ModalKerangka>
      )}

      {(detail || detailMuat || detailGalat) && (
        <ModalKerangka
          judul={detail ? detail.nama : 'Rincian tunggakan'}
          keterangan={detail ? `NIS ${detail.nis} · Kelas ${detail.kelas} · ${detail.status}` : 'Tagihan yang belum dibayar'}
          onTutup={() => {
            permintaanDetail.current += 1
            setDetail(null)
            setDetailGalat('')
            setDetailMuat(false)
          }}
          lebar="max-w-2xl"
        >
          {detailMuat && <p className="text-sm text-slate-500">Menyiapkan rincian tagihan...</p>}
          {detailGalat && <p className="text-sm text-red-700">{detailGalat}</p>}
          {detail && (
            <>
              {detail.yatim ? (
                <p className="mb-3 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-900">
                  Ditanggung Yayasan (Gratis). Tagihan aktif untuk kasir {rupiah(0)}. Nilai subsidi {rupiah(detail.subsidi || 0)}.
                </p>
              ) : null}
              {detail.rincian.length === 0 ? (
                <p className="text-sm text-slate-600">
                  {detail.yatim ? 'Tidak ada tagihan yang ditagihkan kepada wali.' : 'Tidak ada tagihan yang belum dibayar.'}
                </p>
              ) : (
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600">
                      <th className="border-b p-2">Tahun</th>
                      <th className="border-b p-2">Tagihan</th>
                      <th className="border-b p-2 text-end">Jumlah</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.rincian.map((item, indeks) => (
                      <tr key={`${item.tapel}-${item.kode}-${item.jumlah}-${indeks}`}>
                        <td className="border-b p-2">{labelTapel(item.tapel)}</td>
                        <td className="border-b p-2">
                          <p>{item.item}</p>
                          {item.tagihanAwal != null && item.terbayar != null && (
                            <p className="text-[11px] font-medium text-slate-500">
                              Tagihan {rupiah(item.tagihanAwal)} · terbayar {rupiah(item.terbayar)}
                            </p>
                          )}
                        </td>
                        <td className="border-b p-2 text-end font-bold">{rupiah(item.jumlah)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={2} className="p-2 font-extrabold">Total tunggakan</td>
                      <td className="p-2 text-end font-extrabold text-amber-900">{rupiah(detail.tunggakan)}</td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </>
          )}
        </ModalKerangka>
      )}
    </section>
    {surat && <SuratTunggakan siswa={surat} onTutup={() => setSurat(null)} />}
    {pratinjauAsas && syaratAsas && (
      <PratinjauCetakSyaratAsas
        data={syaratAsas}
        jenis={pratinjauAsas}
        kelas={kelasCetakAsas}
        unit={unit}
        onTutup={() => setPratinjauAsas(null)}
      />
    )}
    </>
  )
}

function judulPanel(panel: PanelRingkas) {
  if (panel === 'piutang') return 'Dana belum masuk'
  if (panel === 'masuk') return 'Dana masuk hari ini'
  if (panel === 'menunggak') return 'Siswa menunggak'
  if (panel === 'subsidi') return 'Subsidi anak yatim'
  return 'Siswa lunas'
}

function keteranganPanel(panel: PanelRingkas, data: RekapKeuangan) {
  if (panel === 'piutang') return `${rupiah(data.piutang)} · tagihan terbuka ${data.sekolah}`
  if (panel === 'masuk') return `${rupiah(data.penerimaanHariIni)} · laporan bank AMPSS`
  if (panel === 'menunggak') return `${data.siswaMenunggak} siswa · ${data.diLuarRombel} di luar rombel ${data.tapel}`
  if (panel === 'subsidi') return `${data.subsidiYatim?.siswa || 0} siswa · ${rupiah(data.subsidiYatim?.nominal || 0)} ditanggung yayasan`
  return `${data.siswaLunas} dari ${data.siswaAktif} siswa rombel aktif`
}

function DaftarSiswa({
  cari,
  kelas,
  kelasPilihan,
  halamanAman,
  halamanMaks,
  jumlah,
  tampil,
  onCari,
  onKelas,
  onHalaman,
  onRincian,
  onCetak,
  labelYatim,
  aksiSyaratAsas,
}: {
  cari: string
  kelas: string
  kelasPilihan: string[]
  halamanAman: number
  halamanMaks: number
  jumlah: number
  tampil: SiswaTunggakan[]
  onCari: (nilai: string) => void
  onKelas: (nilai: string) => void
  onHalaman: (arah: number) => void
  onRincian: (nis: string) => void
  onCetak?: (siswa: SiswaTunggakan) => void
  labelYatim?: string
  aksiSyaratAsas?: ReactNode
}) {
  return (
    <div className="space-y-3">
      {aksiSyaratAsas}
      <div className="flex flex-wrap items-end gap-2">
        <label className="text-xs font-bold">
          Kelas
          <select value={kelas} onChange={(event) => onKelas(event.target.value)} className="mt-1 block rounded-lg border px-2 py-1.5 font-semibold">
            <option value="semua">Semua kelas</option>
            {kelasPilihan.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </label>
        <label className="min-w-[220px] flex-1 text-xs font-bold">
          Cari siswa
          <span className="relative mt-1 block">
            <Search className="pointer-events-none absolute left-2 top-2 size-3.5 text-slate-400" />
            <input
              value={cari}
              onChange={(event) => onCari(event.target.value)}
              placeholder="Nama atau NIS"
              className="w-full rounded-lg border py-1.5 pl-7 pr-2 font-semibold"
            />
          </span>
        </label>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] border-collapse text-left text-xs">
          <thead>
            <tr className="bg-slate-50 text-slate-600">
              <th className="border-b p-2">Siswa</th>
              <th className="border-b p-2">Kelas</th>
              <th className="border-b p-2 text-end">Tagihan terbuka</th>
              <th className="border-b p-2 text-end">Tunggakan</th>
              <th className="border-b p-2">Status</th>
              <th className="border-b p-2" />
            </tr>
          </thead>
          <tbody>
            {tampil.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-4 text-center text-slate-400">Tidak ada siswa pada saringan ini.</td>
              </tr>
            ) : tampil.map((baris) => (
              <tr key={baris.nis}>
                <td className="border-b p-2">
                  <button type="button" onClick={() => onRincian(baris.nis)} className="inline-flex flex-wrap items-center gap-1.5 text-left font-bold text-emerald-950 underline-offset-2 hover:underline">
                    {baris.nama}
                    {baris.yatim ? <LencanaYatim label={labelYatim} /> : null}
                  </button>
                  <p className="text-[11px] text-slate-500">NIS {baris.nis}{baris.aktif ? '' : ' · di luar rombel aktif'}</p>
                </td>
                <td className="border-b p-2">{baris.kelas}</td>
                <td className="border-b p-2 text-end">{baris.jumlahTagihan}</td>
                <td className="border-b p-2 text-end font-bold">
                  {baris.yatim ? (
                    <span>
                      {rupiah(0)}
                      <span className="mt-0.5 block text-[10px] font-semibold text-emerald-800">Ditanggung {rupiah(baris.subsidi || 0)}</span>
                    </span>
                  ) : (
                    rupiah(baris.tunggakan)
                  )}
                </td>
                <td className="border-b p-2">
                  <LencanaStatus
                    status={labelYatim && baris.yatim ? 'Lunas' : baris.status}
                    yatim={labelYatim ? false : baris.yatim}
                  />
                </td>
                <td className="border-b p-2 text-end">
                  <div className="flex flex-wrap justify-end gap-1">
                    {onCetak && !baris.yatim && (
                      <button
                        type="button"
                        onClick={() => onCetak(baris)}
                        className="inline-flex items-center gap-1 rounded-lg border border-emerald-800 px-2.5 py-1.5 text-[11px] font-bold text-emerald-900 hover:bg-emerald-50"
                      >
                        <Printer className="size-3" /> Cetak Surat
                      </button>
                    )}
                    <button type="button" onClick={() => onRincian(baris.nis)} className="rounded-lg bg-[#143d32] px-3 py-1.5 text-[11px] font-bold text-white">
                      Rincian
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between gap-2 text-xs">
        <p className="text-slate-500">{jumlah} siswa</p>
        <div className="flex items-center gap-2">
          <button type="button" disabled={halamanAman === 0} onClick={() => onHalaman(-1)} className="rounded-lg border px-2 py-1 font-bold disabled:opacity-40">
            Sebelumnya
          </button>
          <span className="font-bold">{halamanAman + 1} / {halamanMaks + 1}</span>
          <button type="button" disabled={halamanAman >= halamanMaks} onClick={() => onHalaman(1)} className="rounded-lg border px-2 py-1 font-bold disabled:opacity-40">
            Berikutnya
          </button>
        </div>
      </div>
    </div>
  )
}

function PanelPos({ judul, baris, kosong = 'Belum ada tagihan terbuka.' }: { judul: string; baris: { nama: string; jumlah: number }[]; kosong?: string }) {
  return (
    <article className="rounded-2xl border border-slate-200 p-3">
      <h3 className="text-xs font-extrabold text-slate-900">{judul}</h3>
      {baris.length === 0 ? (
        <p className="mt-2 text-xs text-slate-400">{kosong}</p>
      ) : (
        <ul className="mt-2 space-y-1">
          {baris.map((item) => (
            <li key={item.nama} className="flex items-start justify-between gap-3 text-xs">
              <span className="text-slate-700">{item.nama}</span>
              <span className="shrink-0 font-bold">{rupiah(item.jumlah)}</span>
            </li>
          ))}
        </ul>
      )}
    </article>
  )
}
