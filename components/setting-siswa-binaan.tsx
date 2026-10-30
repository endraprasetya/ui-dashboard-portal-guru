'use client'

import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Save, Settings } from 'lucide-react'
import {
  adalahBinaan,
  fetchDaftarSiswa,
  idGuru,
  simpanSiswaBinaan,
  susunPembimbing,
  unitCocok,
  type Siswa,
} from '@/lib/siswa'
import { teacherUnit } from '@/lib/jurnal'

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
  const unit = teacherUnit(currentUser)
  const header = warna === 'tahfidz' ? 'bg-[#2563eb]' : 'bg-[#0284c7]'
  const [semua, setSemua] = useState<Siswa[]>([])
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
    setMemuat(true)
    fetchDaftarSiswa().then((data) => {
      if (batal) return
      setSemua(data)
      setMemuat(false)
    })
    return () => {
      batal = true
    }
  }, [])

  const siswaUnit = useMemo(
    () => semua.filter((item) => unitCocok(unit, item.unit) && !isKosong(item.kelas)),
    [semua, unit],
  )

  const daftarKelas = useMemo(() => {
    return Array.from(new Set(siswaUnit.map((item) => item.kelas.trim()))).sort((a, b) =>
      a.localeCompare(b, 'id', { numeric: true }),
    )
  }, [siswaUnit])

  const siswaKelas = useMemo(() => {
    return siswaUnit
      .filter((item) => item.kelas.trim() === kelas)
      .sort((a, b) => a.nama_siswa.localeCompare(b.nama_siswa, 'id'))
  }, [siswaUnit, kelas])

  const tampil = useMemo(() => {
    if (!kata) return siswaKelas
    return siswaKelas.filter((item) => item.nama_siswa.toLowerCase().includes(kata))
  }, [siswaKelas, kata])

  const pilihKelas = (nilai: string) => {
    setKelas(nilai)
    setCari('')
    setKata('')
    setStatus('')
    setGalat(false)
    const ids = siswaUnit
      .filter((item) => item.kelas.trim() === nilai && adalahBinaan(item.id_pembimbing, guruId))
      .map((item) => item.id_siswa)
    setTerpilih(ids)
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
    if (!kelas) return
    const perubahan = siswaKelas
      .filter((item) => adalahBinaan(item.id_pembimbing, guruId) !== terpilih.includes(item.id_siswa))
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
    const segar = await fetchDaftarSiswa()
    setSemua(segar)
    setMenyimpan(false)
    if (gagal.length > 0) {
      setStatus(`${gagal.length} siswa gagal disimpan. Periksa kembali, lalu simpan ulang.`)
      setGalat(true)
      return
    }
    setStatus(`${perubahan.length} siswa binaan kelas ${kelas} tersimpan. Daftar ini langsung dipakai di setoran dan laporan.`)
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
          Pilih kelas, lalu centang siswa yang menjadi binaan akun ini. Pilihan tersimpan di data siswa dan dimuat kembali saat setoran maupun laporan dibuka.
        </p>
        <label className="mt-4 block text-xs font-bold text-slate-600">
          Pilih kelas
          <select
            value={kelas}
            onChange={(event) => pilihKelas(event.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold"
          >
            <option value="">{memuat ? 'Memuat kelas...' : 'Pilih kelas'}</option>
            {daftarKelas.map((item) => (
              <option key={item} value={item}>
                Kelas {item}
              </option>
            ))}
          </select>
        </label>

        {kelas && (
          <>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <input
                value={cari}
                onChange={(event) => setCari(event.target.value)}
                placeholder="Cari nama siswa di kelas ini"
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm sm:max-w-xs"
              />
              <p className="text-xs font-semibold text-slate-500">
                {terpilih.length} dari {siswaKelas.length} siswa dipilih
              </p>
            </div>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => setTerpilih(siswaKelas.map((item) => item.id_siswa))}
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
                  Tidak ada siswa yang cocok.
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
        )}
        {status && (
          <p className={`mt-3 text-sm font-semibold ${galat ? 'text-red-700' : 'text-emerald-700'}`} role="status">
            {status}
          </p>
        )}
      </section>
    </div>
  )
}

function isKosong(kelas?: string) {
  return !String(kelas || '').trim()
}
