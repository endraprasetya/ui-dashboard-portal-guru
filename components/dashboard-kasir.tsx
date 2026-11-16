'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { LogOut, Plus, Save, Trash2, Wallet } from 'lucide-react'
import { todayInputValue } from '@/lib/jurnal'
import { fetchDaftarSiswa, type Siswa } from '@/lib/siswa'
import { tujuanSetelahLogin, type AkunSesi } from '@/lib/bendahara'
import { CariSiswaKasir } from '@/components/cari-siswa-kasir'
import { StrukKasir, TombolCetakStruk } from '@/components/struk-kasir'
import {
  akunCocokKodeTagihan,
  kanonUnitKeuangan,
  KODE_AKUN_KAS,
  labelAkunKas,
  labelSiswaTransaksi,
  muatDaftarAkun,
  muatTransaksiKas,
  nisTampilSiswa,
  rupiahKas,
  simpanTransaksiDraft,
  unitKeuanganCocok,
  validasiSesiKasir,
  type BarisAkun,
  type JenisTransaksiKas,
  type TransaksiKas,
} from '@/lib/kasir'
import type { RincianTagihan } from '@/lib/keuangan-tipe'

export function DashboardKasir() {
  const [siap, setSiap] = useState<'memuat' | 'siap' | 'tolak' | 'galat'>('memuat')
  const [user, setUser] = useState<AkunSesi | null>(null)
  const [galat, setGalat] = useState('')
  const [tujuan, setTujuan] = useState('/')

  useEffect(() => {
    let batal = false
    ;(async () => {
      try {
        const raw = localStorage.getItem('user_session')
        const sesi = raw ? (JSON.parse(raw) as AkunSesi) : null
        const hasil = await validasiSesiKasir(sesi)
        if (batal) return
        if (hasil.status !== 'ok') {
          setTujuan(hasil.status === 'bukan' ? tujuanSetelahLogin(hasil.user) : '/')
          setSiap('tolak')
          return
        }
        setUser(hasil.user)
        setSiap('siap')
      } catch (error) {
        if (batal) return
        setGalat(error instanceof Error ? error.message : 'Tidak dapat memvalidasi sesi Kasir.')
        setSiap('galat')
      }
    })()
    return () => {
      batal = true
    }
  }, [])

  useEffect(() => {
    if (siap === 'tolak') window.location.replace(tujuan)
  }, [siap, tujuan])

  const keluar = () => {
    localStorage.removeItem('user_session')
    window.location.assign('/')
  }

  if (siap === 'galat') {
    return (
      <main className="grid min-h-screen place-items-center px-4">
        <div className="max-w-md space-y-3 text-center">
          <p className="text-sm font-semibold text-red-700">{galat || 'Sesi Kasir belum dapat diverifikasi.'}</p>
          <button type="button" onClick={keluar} className="text-xs font-bold text-emerald-800 underline">
            Kembali ke halaman masuk
          </button>
        </div>
      </main>
    )
  }

  if (siap !== 'siap' || !user) {
    return <main className="grid min-h-screen place-items-center text-sm text-slate-500">Memeriksa sesi Kasir...</main>
  }

  const nama = String(user.nama_lengkap || user.nama || user.username || 'Kasir')
  const unit = String(user.unit || '').trim()
  const peran = String(user.role || 'Kasir').trim()

  return (
    <div className="min-h-screen bg-[#f4f7f5] text-slate-800">
      <header className="border-b border-emerald-900/10 bg-[#143d32] text-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-100">Modul Keuangan</p>
            <h1 className="text-lg font-black">Dashboard Kasir</h1>
            <p className="text-xs text-emerald-50/80">
              {nama} · {peran}
              {unit && unit !== 'Semua Unit' ? ` · Unit ${unit}` : ''}
            </p>
          </div>
          <button type="button" onClick={keluar} className="inline-flex items-center gap-1 rounded-xl bg-white/10 px-3 py-2 text-xs font-bold">
            <LogOut className="size-3.5" /> Keluar
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-5xl space-y-6 px-4 py-6">
        <FormTransaksiKasir user={user} unit={unit} />
      </main>
    </div>
  )
}

type BarisItemKasir = {
  kunci: string
  kode_akun: string
  nominal: string
  kunci_tagihan: string
}

function barisItemBaru(kodeAkun = ''): BarisItemKasir {
  return {
    kunci: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    kode_akun: kodeAkun,
    nominal: '',
    kunci_tagihan: '',
  }
}

function FormTransaksiKasir({ user, unit }: { user: AkunSesi; unit: string }) {
  const [akun, setAkun] = useState<BarisAkun[]>([])
  const [siswa, setSiswa] = useState<Siswa[]>([])
  const [drafSaya, setDrafSaya] = useState<TransaksiKas[]>([])
  const [tanggal, setTanggal] = useState(todayInputValue())
  const [jenis, setJenis] = useState<JenisTransaksiKas>('Penerimaan')
  const [akunKas, setAkunKas] = useState<(typeof KODE_AKUN_KAS)[number]>('3101')
  const [item, setItem] = useState<BarisItemKasir[]>([barisItemBaru()])
  const [siswaTerpilih, setSiswaTerpilih] = useState<Siswa | null>(null)
  const [resetCariSiswa, setResetCariSiswa] = useState(0)
  const [tagihan, setTagihan] = useState<RincianTagihan[]>([])
  const [memuatTagihan, setMemuatTagihan] = useState(false)
  const [galatTagihan, setGalatTagihan] = useState('')
  const [uraian, setUraian] = useState('')
  const [pesan, setPesan] = useState('')
  const [galat, setGalat] = useState('')
  const [menyimpan, setMenyimpan] = useState(false)
  const [struk, setStruk] = useState<TransaksiKas | null>(null)

  const muatDraf = async () => {
    try {
      const semua = await muatTransaksiKas('Draft', unit)
      const nama = String(user.nama_lengkap || user.username || '')
      setDrafSaya(semua.filter((baris) => !nama || String(baris.dicatat_oleh || '') === nama).slice(0, 8))
    } catch {
      setDrafSaya([])
    }
  }

  useEffect(() => {
    let batal = false
    Promise.all([muatDaftarAkun(), fetchDaftarSiswa()])
      .then(([daftarAkun, daftarSiswa]) => {
        if (batal) return
        setAkun(daftarAkun)
        setSiswa(daftarSiswa.filter((item) => unitKeuanganCocok(unit, item.unit)))
      })
      .catch((error: Error) => {
        if (!batal) setGalat(error.message || 'Gagal memuat master akun. Jalankan supabase/keuangan-kas.sql.')
      })
    void muatDraf()
    return () => {
      batal = true
    }
  }, [user])

  const akunJenis = useMemo(
    () => akun.filter((baris) => baris.kategori === jenis),
    [akun, jenis],
  )
  const akunKasMaster = useMemo(() => {
    const dariTabel = akun.filter((baris) => KODE_AKUN_KAS.includes(baris.kode_akun as (typeof KODE_AKUN_KAS)[number]))
    if (dariTabel.length > 0) return dariTabel
    return KODE_AKUN_KAS.map((kode) => ({ kode_akun: kode, nama_akun: labelAkunKas(kode), kategori: 'Kas' as const }))
  }, [akun])

  const totalNominal = useMemo(
    () => item.reduce((jumlah, baris) => jumlah + (Number(baris.nominal.replace(/\D/g, '')) || 0), 0),
    [item],
  )

  useEffect(() => {
    setItem((sekarang) => {
      const berikutnya = sekarang.map((baris) =>
        !baris.kode_akun || akunJenis.some((akunBaris) => akunBaris.kode_akun === baris.kode_akun)
          ? baris
          : { ...baris, kode_akun: '', kunci_tagihan: '' },
      )
      const sama = berikutnya.every((baris, indeks) => baris.kode_akun === sekarang[indeks]?.kode_akun)
      return sama ? sekarang : berikutnya
    })
  }, [akunJenis])

  useEffect(() => {
    const nis = siswaTerpilih ? nisTampilSiswa(siswaTerpilih) : ''
    if (jenis !== 'Penerimaan' || !nis || siswaTerpilih?.is_yatim) {
      setTagihan([])
      setGalatTagihan('')
      setMemuatTagihan(false)
      return
    }
    let batal = false
    setMemuatTagihan(true)
    setGalatTagihan('')
    fetch(`/api/kasir/tagihan?nis=${encodeURIComponent(nis)}`)
      .then(async (respon) => {
        const json = await respon.json()
        if (!respon.ok) throw new Error(json.pesan || 'Tagihan siswa belum dapat dimuat.')
        return (json.rincian || []) as RincianTagihan[]
      })
      .then((rincian) => {
        if (!batal) setTagihan(rincian.filter((baris) => baris.jumlah > 0))
      })
      .catch((error: Error) => {
        if (!batal) {
          setTagihan([])
          setGalatTagihan(error.message || 'Tagihan siswa belum dapat dimuat.')
        }
      })
      .finally(() => {
        if (!batal) setMemuatTagihan(false)
      })
    return () => {
      batal = true
    }
  }, [jenis, siswaTerpilih])

  const ubahItem = (kunci: string, patch: Partial<BarisItemKasir>) => {
    setItem((sekarang) => sekarang.map((baris) => (baris.kunci === kunci ? { ...baris, ...patch } : baris)))
  }

  const tagihanUntuk = (kodeAkun: string) =>
    tagihan.filter((baris) => baris.jumlah > 0 && (!kodeAkun || akunCocokKodeTagihan(kodeAkun, baris.kode)))

  const kirim = async (event: FormEvent) => {
    event.preventDefault()
    setGalat('')
    setPesan('')
    const daftar = item
      .map((baris) => {
        const terkait = tagihan.find((t) => `${t.tapel}|${t.kode}` === baris.kunci_tagihan)
        return {
          kode_akun: baris.kode_akun,
          nominal: Number(baris.nominal.replace(/\D/g, '')) || 0,
          kode_tagihan: terkait?.kode,
          tapel_tagihan: terkait?.tapel,
          nama_tagihan: terkait?.item,
          nama_akun: akun.find((akunBaris) => akunBaris.kode_akun === baris.kode_akun)?.nama_akun,
        }
      })
      .filter((baris) => baris.kode_akun && baris.nominal > 0)
    if (jenis === 'Penerimaan' && siswaTerpilih?.is_yatim) {
      setGalat('Ananda berstatus yatim. Tagihan ditanggung yayasan (gratis) dan tidak ditagihkan.')
      return
    }
    if (daftar.length === 0) {
      setGalat('Isi minimal satu baris kode akun dan nominal.')
      return
    }
    setMenyimpan(true)
    try {
      const uraianOtomatis =
        uraian.trim() ||
        (siswaTerpilih
          ? `Terima pembayaran ananda ${siswaTerpilih.nama_siswa}`
          : '')
      const nomor = await simpanTransaksiDraft({
        tanggal,
        jenis_transaksi: jenis,
        akun_kas_bank: akunKas,
        items: daftar,
        id_siswa: siswaTerpilih?.id_siswa || undefined,
        nis: siswaTerpilih ? nisTampilSiswa(siswaTerpilih) : undefined,
        nama_siswa: siswaTerpilih?.nama_siswa,
        uraian: uraianOtomatis,
        dicatat_oleh: String(user.nama_lengkap || user.username || 'Kasir'),
        unit: kanonUnitKeuangan(unit) || unit,
      })
      const bukti: TransaksiKas = {
        nomor_bukti: nomor,
        tanggal,
        jenis_transaksi: jenis,
        kode_akun: daftar[0].kode_akun,
        akun_kas_bank: akunKas,
        nominal: daftar.reduce((jumlah, baris) => jumlah + baris.nominal, 0),
        items: daftar,
        id_siswa: siswaTerpilih?.id_siswa || null,
        nis: siswaTerpilih ? nisTampilSiswa(siswaTerpilih) : null,
        nama_siswa: siswaTerpilih?.nama_siswa || null,
        uraian: uraianOtomatis,
        status: 'Draft',
        unit: kanonUnitKeuangan(unit) || null,
        dicatat_oleh: String(user.nama_lengkap || user.username || 'Kasir'),
      }
      setStruk(bukti)
      setPesan(`Bukti ${nomor} tersimpan sebagai Draft (${daftar.length} item, ${rupiahKas(totalNominal)}). Menunggu validasi Bendahara.`)
      setItem([barisItemBaru()])
      setUraian('')
      setSiswaTerpilih(null)
      setTagihan([])
      setResetCariSiswa((nilai) => nilai + 1)
      await muatDraf()
    } catch (error) {
      console.error('Simpan Draft kasir gagal', error)
      setGalat(error instanceof Error ? error.message : 'Gagal menyimpan transaksi.')
    } finally {
      setMenyimpan(false)
    }
  }

  return (
    <section className="space-y-5">
      <div className="rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2 text-emerald-900">
          <Wallet className="size-5" />
          <div>
            <h2 className="text-sm font-extrabold">Catat transaksi harian</h2>
            <p className="text-[11px] font-medium text-slate-500">Satu nomor bukti dapat berisi beberapa item akun, seperti struk kasir.</p>
          </div>
        </div>
        <form onSubmit={kirim} className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-bold text-slate-600">
            Tanggal
            <input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 p-2.5 text-sm font-semibold" required />
          </label>
          <label className="text-xs font-bold text-slate-600">
            Jenis Transaksi
            <select value={jenis} onChange={(e) => setJenis(e.target.value as JenisTransaksiKas)} className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-sm font-semibold">
              <option value="Penerimaan">Penerimaan</option>
              <option value="Pengeluaran">Pengeluaran</option>
            </select>
          </label>
          <CariSiswaKasir
            key={resetCariSiswa}
            daftar={siswa}
            terpilih={siswaTerpilih}
            onPilih={(pilihan) => setSiswaTerpilih(pilihan)}
          />
          <label className="text-xs font-bold text-slate-600">
            Akun Kas/Bank
            <select value={akunKas} onChange={(e) => setAkunKas(e.target.value as (typeof KODE_AKUN_KAS)[number])} className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-2.5 text-sm font-semibold">
              {akunKasMaster.map((baris) => (
                <option key={baris.kode_akun} value={baris.kode_akun}>
                  {baris.kode_akun} · {baris.nama_akun}
                </option>
              ))}
            </select>
          </label>

          <div className="sm:col-span-2 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-slate-700">Rincian item</p>
              <button
                type="button"
                onClick={() => setItem((sekarang) => [...sekarang, barisItemBaru()])}
                className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-[11px] font-bold text-emerald-800"
              >
                <Plus className="size-3.5" /> Tambah baris
              </button>
            </div>
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full min-w-[640px] border-collapse text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-600">
                    <th className="border-b p-2 w-10">No</th>
                    <th className="border-b p-2">Kode akun</th>
                    <th className="border-b p-2 w-40">Nominal</th>
                    {jenis === 'Penerimaan' && siswaTerpilih && !siswaTerpilih.is_yatim ? <th className="border-b p-2">Tagihan terkait</th> : null}
                    <th className="border-b p-2 w-12" />
                  </tr>
                </thead>
                <tbody>
                  {item.map((baris, indeks) => {
                    const opsiTagihan = tagihanUntuk(baris.kode_akun)
                    return (
                      <tr key={baris.kunci}>
                        <td className="border-b p-2 font-semibold text-slate-500">{indeks + 1}</td>
                        <td className="border-b p-2">
                          <select
                            value={baris.kode_akun}
                            onChange={(event) => ubahItem(baris.kunci, { kode_akun: event.target.value, kunci_tagihan: '' })}
                            className="w-full rounded-lg border border-slate-300 bg-white p-2 text-sm font-semibold"
                            required
                          >
                            <option value="">{akunJenis.length ? '-- Pilih Akun --' : 'Master akun belum tersedia'}</option>
                            {akunJenis.map((akunBaris) => (
                              <option key={akunBaris.kode_akun} value={akunBaris.kode_akun}>
                                {akunBaris.kode_akun} · {akunBaris.nama_akun}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="border-b p-2">
                          <input
                            inputMode="numeric"
                            value={baris.nominal}
                            onChange={(event) => ubahItem(baris.kunci, { nominal: event.target.value.replace(/[^\d]/g, '') })}
                            placeholder="0"
                            className="w-full rounded-lg border border-slate-300 p-2 text-sm font-semibold"
                            required
                          />
                        </td>
                        {jenis === 'Penerimaan' && siswaTerpilih && !siswaTerpilih.is_yatim ? (
                          <td className="border-b p-2">
                            <select
                              value={baris.kunci_tagihan}
                              onChange={(event) => {
                                const kunci = event.target.value
                                const pilih = opsiTagihan.find((t) => `${t.tapel}|${t.kode}` === kunci)
                                ubahItem(baris.kunci, {
                                  kunci_tagihan: kunci,
                                  nominal: !baris.nominal && pilih ? String(pilih.jumlah) : baris.nominal,
                                })
                              }}
                              className="w-full rounded-lg border border-slate-300 bg-white p-2 text-sm font-semibold"
                            >
                              <option value="">
                                {memuatTagihan
                                  ? 'Memuat...'
                                  : !baris.kode_akun && opsiTagihan.length > 0
                                    ? `-- Semua tagihan (${opsiTagihan.length}) --`
                                    : '-- Opsional --'}
                              </option>
                              {opsiTagihan.map((t) => (
                                <option key={`${t.tapel}|${t.kode}`} value={`${t.tapel}|${t.kode}`}>
                                  {t.item} · {rupiahKas(t.jumlah)}
                                </option>
                              ))}
                            </select>
                          </td>
                        ) : null}
                        <td className="border-b p-2 text-center">
                          <button
                            type="button"
                            disabled={item.length === 1}
                            onClick={() => setItem((sekarang) => sekarang.filter((x) => x.kunci !== baris.kunci))}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-700 disabled:opacity-30"
                            aria-label="Hapus baris"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {jenis === 'Penerimaan' && siswaTerpilih?.is_yatim ? (
              <p className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-900">
                Ditanggung Yayasan (Gratis). Tagihan aktif disembunyikan agar tidak ditagihkan. Nilai subsidi tetap tercatat di rekap bendahara, terpisah dari arus kas.
              </p>
            ) : null}
            {galatTagihan ? <p className="text-[11px] font-medium text-amber-800">{galatTagihan}</p> : null}
            <p className="text-right text-sm font-black text-emerald-900">Total {rupiahKas(totalNominal)}</p>
          </div>

          <label className="sm:col-span-2 text-xs font-bold text-slate-600">
            Uraian / Keterangan
            <textarea value={uraian} onChange={(e) => setUraian(e.target.value)} rows={3} className="mt-1 w-full rounded-xl border border-slate-300 p-2.5 text-sm font-semibold" placeholder="Contoh: Terima SPP dan ujian ananda..." />
          </label>
          {galat ? <p className="sm:col-span-2 rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{galat}</p> : null}
          {pesan ? <p className="sm:col-span-2 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">{pesan}</p> : null}
          <div className="sm:col-span-2">
            <button type="submit" disabled={menyimpan} className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">
              <Save className="size-4" /> {menyimpan ? 'Menyimpan...' : 'Simpan Draft'}
            </button>
          </div>
        </form>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-extrabold text-slate-900">Draft terakhir Anda</h3>
        <p className="mb-3 text-[11px] text-slate-500">Menunggu persetujuan Bendahara.</p>
        {drafSaya.length === 0 ? (
          <p className="text-sm text-slate-500">Belum ada draft transaksi.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-left text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-600">
                  <th className="border-b p-2">Bukti</th>
                  <th className="border-b p-2">Tanggal</th>
                  <th className="border-b p-2">Jenis</th>
                  <th className="border-b p-2">Item</th>
                  <th className="border-b p-2">Kas/Bank</th>
                  <th className="border-b p-2">Siswa</th>
                  <th className="border-b p-2 text-end">Total</th>
                  <th className="border-b p-2">Status</th>
                  <th className="border-b p-2" />
                </tr>
              </thead>
              <tbody>
                {drafSaya.map((baris) => (
                  <tr key={baris.nomor_bukti}>
                    <td className="border-b p-2 font-bold">{baris.nomor_bukti}</td>
                    <td className="border-b p-2">{baris.tanggal}</td>
                    <td className="border-b p-2">{baris.jenis_transaksi}</td>
                    <td className="border-b p-2">
                      {(baris.items.length > 0 ? baris.items : [{ kode_akun: baris.kode_akun, nominal: baris.nominal }]).map((det) => (
                        <p key={`${det.kode_akun}-${det.nominal}`}>{det.kode_akun} · {rupiahKas(det.nominal)}</p>
                      ))}
                    </td>
                    <td className="border-b p-2">{labelAkunKas(baris.akun_kas_bank)}</td>
                    <td className="border-b p-2">{labelSiswaTransaksi(baris) || '—'}</td>
                    <td className="border-b p-2 text-end font-bold">{rupiahKas(Number(baris.nominal))}</td>
                    <td className="border-b p-2 font-semibold text-amber-800">{baris.status}</td>
                    <td className="border-b p-2"><TombolCetakStruk onKlik={() => setStruk(baris)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {struk ? (
        <StrukKasir
          transaksi={struk}
          daftarAkun={akun}
          namaKasir={String(user.nama_lengkap || user.username || 'Kasir')}
          onTutup={() => setStruk(null)}
        />
      ) : null}
    </section>
  )
}
