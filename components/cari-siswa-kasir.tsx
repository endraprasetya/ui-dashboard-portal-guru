'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Search, X } from 'lucide-react'
import { formatLabelSiswa, saringSiswaKasir } from '@/lib/kasir'
import type { Siswa } from '@/lib/siswa'

export function CariSiswaKasir({
  daftar,
  terpilih,
  onPilih,
}: {
  daftar: Siswa[]
  terpilih: Siswa | null
  onPilih: (siswa: Siswa | null) => void
}) {
  const bungkus = useRef<HTMLDivElement>(null)
  const [kueri, setKueri] = useState('')
  const [terbuka, setTerbuka] = useState(false)
  const [aktif, setAktif] = useState(0)

  useEffect(() => {
    if (terpilih) setKueri(formatLabelSiswa(terpilih))
  }, [terpilih])

  useEffect(() => {
    const tutup = (event: MouseEvent) => {
      if (!bungkus.current?.contains(event.target as Node)) setTerbuka(false)
    }
    document.addEventListener('mousedown', tutup)
    return () => document.removeEventListener('mousedown', tutup)
  }, [])

  const hasil = useMemo(() => saringSiswaKasir(daftar, kueri), [daftar, kueri])
  const menampilkanHasil = terbuka && !terpilih && kueri.trim().length > 0

  const pilih = (siswa: Siswa) => {
    onPilih(siswa)
    setKueri(formatLabelSiswa(siswa))
    setTerbuka(false)
  }

  const bersihkan = () => {
    onPilih(null)
    setKueri('')
    setAktif(0)
    setTerbuka(false)
  }

  return (
    <div className="relative text-xs font-bold text-slate-600" ref={bungkus}>
      Siswa (opsional)
      <div className="relative mt-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-emerald-700" />
        <input
          value={kueri}
          onFocus={() => {
            if (!terpilih) setTerbuka(true)
          }}
          onChange={(event) => {
            const nilai = event.target.value
            setKueri(nilai)
            setAktif(0)
            if (terpilih) onPilih(null)
            setTerbuka(true)
          }}
          onKeyDown={(event) => {
            if (!menampilkanHasil) {
              if (event.key === 'Escape') setTerbuka(false)
              return
            }
            if (event.key === 'ArrowDown') {
              event.preventDefault()
              setAktif((nilai) => Math.min(nilai + 1, Math.max(hasil.length - 1, 0)))
            } else if (event.key === 'ArrowUp') {
              event.preventDefault()
              setAktif((nilai) => Math.max(nilai - 1, 0))
            } else if (event.key === 'Enter' && hasil[aktif]) {
              event.preventDefault()
              pilih(hasil[aktif])
            } else if (event.key === 'Escape') {
              setTerbuka(false)
            }
          }}
          placeholder="Ketik NIS atau potongan nama"
          className="w-full rounded-xl border border-slate-300 p-2.5 pl-9 pr-9 text-sm font-semibold"
          autoComplete="off"
          role="combobox"
          aria-expanded={menampilkanHasil}
          aria-autocomplete="list"
        />
        {kueri ? (
          <button
            type="button"
            onClick={bersihkan}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Hapus pilihan siswa"
          >
            <X className="size-4" />
          </button>
        ) : null}
      </div>
      {menampilkanHasil ? (
        <div className="absolute left-0 right-0 z-50 mt-1 max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl" role="listbox">
          {hasil.length > 0 ? (
            hasil.map((siswa, indeks) => (
              <button
                key={siswa.id_siswa}
                type="button"
                role="option"
                aria-selected={indeks === aktif}
                onMouseEnter={() => setAktif(indeks)}
                onClick={() => pilih(siswa)}
                className={`flex w-full flex-col items-start border-b border-slate-50 px-3 py-2.5 text-left ${indeks === aktif ? 'bg-emerald-50' : 'hover:bg-slate-50'}`}
              >
                <span className="text-sm font-bold text-slate-800">{formatLabelSiswa(siswa)}</span>
                <span className="text-[11px] font-semibold text-slate-500">Kelas {siswa.kelas || '-'}</span>
              </button>
            ))
          ) : (
            <p className="p-3 text-center text-xs font-semibold text-slate-400">Siswa tidak ditemukan untuk “{kueri.trim()}”.</p>
          )}
        </div>
      ) : null}
      <p className="mt-1 text-[11px] font-medium text-slate-500">
        {terpilih ? 'Siswa tertaut. Transaksi penerimaan dapat menandai tagihan lunas setelah divalidasi Bendahara.' : 'Cari dengan NIS, nama depan, nama tengah, atau nama akhir.'}
      </p>
    </div>
  )
}
