'use client'

import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Save, Settings } from 'lucide-react'
import {
  adalahBinaan,
  cariSiswaUntukBinaan,
  fetchSiswaBinaan,
  idGuru,
  kunciUserGuru,
  simpanSiswaBinaan,
  susunPembimbing,
  type Siswa,
} from '@/lib/siswa'

export function SettingSiswaBinaan({
  onBack,
  currentUser,
  warna,
}: {
  onBack: () => void
  currentUser?: any
  warna: 'tahfidz' | 'qiroah'
}) {
  const guruId = idGuru(currentUser)
  const header = warna === 'tahfidz' ? 'bg-[#2563eb]' : 'bg-[#0284c7]'
  const [binaan, setBinaan] = useState<Siswa[]>([])
  const [carian, setCarian] = useState<Siswa[]>([])
  const [kelas, setKelas] = useState('')
  const [terpilih, setTerpilih] = useState<string[]>([])
  const [cari, setCari] = useState('')
  const [kata, setKata] = useState('')
  const [memuat, setMemuat] = useState(true)
  const [menyimpan, setMenyimpan] = useState(false)
  const [status, setStatus] = useState('')
  const [galat, setGalat] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => setKata(cari.trim().toLowerCase()), 200)
    return () => window.clearTimeout(timer)
  }, [cari])

  useEffect(() => {
    let batal = false
    if (!currentUser) {
      setBinaan([])
      setMemuat(false)
      return
    }
    setMemuat(true)
    fetchSiswaBinaan(currentUser).then((data) => {
      if (batal) return
      setBinaan(data)
      setMemuat(false)
    })
    return () => {
      batal = true
    }
  }, [kunciUserGuru(currentUser)])

  useEffect(() => {
    if (kata.length < 2 || !currentUser) {
      setCarian([])
      return
    }
    let batal = false
    cariSiswaUntukBinaan(kata, currentUser).then((data) => {
      if (!batal) setCarian(data)
    })
    return () => {
      batal = true
    }
  }, [kata, kunciUserGuru(currentUser)])

  const daftarKelas = useMemo(() => {
    return Array.from(new Set(binaan.map((item) => item.kelas.trim()).filter(Boolean))).sort((a, b) =>
      a.localeCompare(b, 'id', { numeric: true }),
    )
  }, [binaan])

  const tampil = useMemo(() => {
    const binaanKelas = binaan
      .filter((item) => !kelas || item.kelas.trim() === kelas)
      .sort((a, b) => a.nama_siswa.localeCompare(b.nama_siswa, 'id'))
    if (kata.length < 2) return binaanKelas
    const ids = new Set(carian.map((item) => item.id_siswa))
    const tambahan = binaanKelas.filter((item) => !ids.has(item.id_siswa) && item.nama_siswa.toLowerCase().includes(kata))
    return [...carian.filter((item) => !kelas || item.kelas.trim() === kelas), ...tambahan]
  }, [binaan, carian, kelas, kata])

  useEffect(() => {
    const sumber = kelas ? binaan.filter((item) => item.kelas.trim() === kelas) : binaan
    setTerpilih(sumber.map((item) => item.id_siswa))
  }, [binaan, kelas])

  const pilihKelas = (nilai: string) => {
    setKelas(nilai)
    setCari('')
    setKata('')
    setStatus('')
    setGalat(false)
  }

  const ubahPilihan = (id: string, aktif: boolean) => {
    setTerpilih((current) => (aktif ? Array.from(new Set([...current, id])) : current.filter((item) => item !== id)))
  }

  const handleSimpan = async () => {
    if (!guruId) {
      setStatus('Akun ini belum memiliki identitas guru, jadi siswa binaan tidak dapat disimpan.')
      setGalat(true)
      return
    }
    const perubahan = tampil
      .filter((item) => adalahBinaan(item.id_pembimbing, currentUser) !== terpilih.includes(item.id_siswa))
      .map((item) => ({
        id_siswa: item.id_siswa,
        id_pembimbing: susunPembimbing(item.id_pembimbing, guruId, terpilih.includes(item.id_siswa)),
      }))
    if (perubahan.length === 0) {
      setStatus('Tidak ada perubahan siswa binaan pada kelas ini.')
      setGalat(false)
      return
    }
    setMenyimpan(true)
    setStatus('')
    const gagal = await simpanSiswaBinaan(perubahan)
    const segar = await fetchSiswaBinaan(currentUser)
    setBinaan(segar)
    setCarian([])
    setMenyimpan(false)
    if (gagal.length > 0) {
      setStatus(`${gagal.length} siswa gagal disimpan. Periksa kembali, lalu simpan ulang.`)
      setGalat(true)
      return
    }
    setStatus(`${perubahan.length} siswa binaan tersimpan. Daftar ini langsung dipakai di setoran dan laporan.`)
    setGalat(false)
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className={`flex items-center justify-between rounded-2xl ${header} px-6 py-4 text-white shadow-md`}>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 rounded-xl bg-white/20 px-4 py-2 text-xs font-bold hover:bg-white/30"
        >
          <ArrowLeft className="size-4" /> Kembali
        </button>
        <h2 className="text-base font-black tracking-wide">Setting Siswa Binaan</h2>
        <Settings className="size-5" />
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-sm text-slate-600">
          Daftar ini hanya menampilkan siswa binaan akun Anda. Ketik minimal dua huruf nama untuk mencari dan menambah binaan baru — seluruh siswa kelas 1–6 tidak ditampilkan secara global.
        </p>
        <label className="mt-4 block text-xs font-bold text-slate-600">
          Filter kelas binaan
          <select
            value={kelas}
            onChange={(event) => pilihKelas(event.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold"
          >
            <option value="">{memuat ? 'Memuat kelas...' : 'Semua kelas binaan'}</option>
            {daftarKelas.map((item) => (
              <option key={item} value={item}>
                Kelas {item}
              </option>
            ))}
          </select>
        </label>

        <>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <input
                value={cari}
                onChange={(event) => setCari(event.target.value)}
                placeholder="Cari nama untuk menambah binaan"
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm sm:max-w-xs"
              />
              <p className="text-xs font-semibold text-slate-500">
                {terpilih.length} siswa binaan dipilih
              </p>
            </div>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => setTerpilih(tampil.map((item) => item.id_siswa))}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700"
              >
                Pilih semua
              </button>
              <button
                type="button"
                onClick={() => setTerpilih([])}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700"
              >
                Kosongkan
              </button>
            </div>
            <div className="mt-3 max-h-[28rem] space-y-2 overflow-y-auto pr-1">
              {tampil.length === 0 ? (
                <p className="rounded-xl bg-slate-50 px-3 py-6 text-center text-sm text-slate-400">
                  {memuat
                    ? 'Memuat siswa binaan...'
                    : kata.length < 2
                      ? 'Tidak ada siswa binaan.'
                      : 'Tidak ada siswa yang cocok.'}
                </p>
              ) : (
                tampil.map((item) => {
                  const aktif = terpilih.includes(item.id_siswa)
                  return (
                    <label
                      key={item.id_siswa}
                      className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl border px-3 py-2.5 ${
                        aktif ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 bg-white'
                      }`}
                    >
                      <span>
                        <span className="block text-sm font-bold text-slate-800">{item.nama_siswa}</span>
                        <span className="text-[11px] text-slate-500">Kelas {item.kelas}</span>
                      </span>
                      <input
                        type="checkbox"
                        checked={aktif}
                        onChange={(event) => ubahPilihan(item.id_siswa, event.target.checked)}
                        className="size-4 accent-emerald-700"
                      />
                    </label>
                  )
                })
              )}
            </div>
            <button
              type="button"
              disabled={menyimpan || !guruId}
              onClick={handleSimpan}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-extrabold text-white disabled:opacity-50"
            >
              <Save className="size-4" /> {menyimpan ? 'Menyimpan...' : 'Simpan siswa binaan'}
            </button>
        </>
        {status && (
          <p className={`mt-3 text-sm font-semibold ${galat ? 'text-red-700' : 'text-emerald-700'}`} role="status">
            {status}
          </p>
        )}
      </section>
    </div>
  )
}

