'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowLeft, BookOpen, ClipboardList, Printer, Table2 } from 'lucide-react'
import { PortalGuruNav } from '@/components/portal-guru-nav'
import { RaporKurmerCetakPanel } from '@/components/rapor-kurmer-cetak'
import { RaporKurmerDaftar } from '@/components/rapor-kurmer-daftar'
import { RaporKurmerLedger } from '@/components/rapor-kurmer-ledger'
import {
  barisNilaiKosong,
  clampJumlahTp,
  DAFTAR_MAPEL_KURMER,
  fetchKelasKurmer,
  fetchNilaiKurmerKelas,
  fetchSetelanTpKurmer,
  fetchSiswaKelasKurmer,
  gabungRosterNilai,
  JENIS_ASESMEN_KURMER,
  JUMLAH_TP_BAWAAN,
  MAPEL_DINIYYAH_KURMER,
  MAPEL_UMUM_KURMER,
  normalisasiBarisNilai,
  fetchDataCetakKurmer,
  pasangLanggananRealtimeKurmer,
  periodeKurmer,
  simpanCatatanKurmer,
  simpanNilaiKurmer,
  simpanSetelanTpKurmer,
  susunLedgerKelas,
  terapkanNilaiKeBaris,
  type BarisNilaiKurmer,
  type DataCetakKurmer,
  type FilterKurmer,
  type JenisAsesmenKurmer,
  type SiswaKurmer,
} from '@/lib/rapor-kurmer'
import { teacherName } from '@/lib/jurnal'

export type TabKurmer = 'nilai' | 'ledger' | 'cetak'

const TAB_KURMER: { id: TabKurmer; label: string; ikon: typeof ClipboardList }[] = [
  { id: 'nilai', label: 'Daftar Nilai & TP', ikon: ClipboardList },
  { id: 'ledger', label: 'Ledger & Rekap', ikon: Table2 },
  { id: 'cetak', label: 'Pratinjau Rapor', ikon: Printer },
]

function filterAwal(): FilterKurmer {
  const periode = periodeKurmer()
  return {
    kelas: '',
    kodeMapel: MAPEL_UMUM_KURMER[0]?.kode || 'bind',
    jenisAsesmen: 'ASTS',
    tahunAjaran: periode.tahunAjaran,
    semester: periode.semester,
  }
}

export function RaporKurmerHalaman({ tabAwal = 'nilai' }: { tabAwal?: TabKurmer }) {
  const [user, setUser] = useState<any>(null)
  const [siap, setSiap] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem('user_session')
      const sesi = raw ? JSON.parse(raw) : null
      if (!sesi) {
        window.location.replace('/')
        return
      }
      setUser(sesi)
      setSiap(true)
    } catch {
      window.location.replace('/')
    }
  }, [])

  if (!siap || !user) {
    return <main className="grid min-h-screen place-items-center text-sm text-slate-500">Memeriksa sesi…</main>
  }

  const nama = String(user.nama_lengkap || user.username || 'Guru')
  const unit = String(user.unit && user.unit !== 'Semua Unit' ? user.unit : '')

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800">
      <header className="print:hidden no-print sticky top-0 z-40 border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-[#4f46e5] text-sm font-black text-white shadow">
              PG
            </div>
            <div>
              <h1 className="text-sm font-extrabold text-slate-900">Portal Guru</h1>
              <p className="text-[11px] font-medium text-slate-500">
                SD Al Madinah {unit ? unit : ''}
              </p>
            </div>
          </div>
          <p className="hidden text-right text-xs font-bold text-slate-700 sm:block">{nama}</p>
        </div>
        <PortalGuruNav />
      </header>
      <main className="mx-auto max-w-[96rem] p-4 sm:p-6 print:m-0 print:p-0">
        <RaporKurmer currentUser={user} tabAwal={tabAwal} onBack={() => window.location.assign('/')} />
      </main>
    </div>
  )
}

export function RaporKurmer({
  currentUser,
  onBack,
  tabAwal = 'nilai',
}: {
  currentUser?: any
  onBack: () => void
  tabAwal?: TabKurmer
}) {
  const guru = teacherName(currentUser)
  const [tab, setTab] = useState<TabKurmer>(tabAwal)
  const [filter, setFilter] = useState<FilterKurmer>(filterAwal)
  const [kelasList, setKelasList] = useState<string[]>([])
  const [jumlahSiswa, setJumlahSiswa] = useState<Record<string, number>>({})
  const [siswa, setSiswa] = useState<SiswaKurmer[]>([])
  const [nilaiKelas, setNilaiKelas] = useState<BarisNilaiKurmer[]>([])
  const [jumlahTp, setJumlahTp] = useState(JUMLAH_TP_BAWAAN)
  const [memuatKelas, setMemuatKelas] = useState(true)
  const [memuat, setMemuat] = useState(false)
  const [menyimpan, setMenyimpan] = useState(false)
  const [status, setStatus] = useState('')
  const [galat, setGalat] = useState(false)
  const [idSiswaCetak, setIdSiswaCetak] = useState('')
  const [dataCetak, setDataCetak] = useState<DataCetakKurmer | null>(null)
  const [memuatCetak, setMemuatCetak] = useState(false)
  const [catatan, setCatatan] = useState('')
  const [namaWali, setNamaWali] = useState(guru)
  const [niyWali, setNiyWali] = useState('')
  const [namaKepsek, setNamaKepsek] = useState('')
  const [menyimpanCatatan, setMenyimpanCatatan] = useState(false)
  const [statusCatatan, setStatusCatatan] = useState('')

  useEffect(() => {
    setTab(tabAwal)
  }, [tabAwal])

  useEffect(() => {
    if (tab !== 'cetak') return
    document.body.classList.add('cetak-rapor-kurmer-saja')
    return () => {
      document.body.classList.remove('cetak-rapor-kurmer-saja')
    }
  }, [tab])

  const muatNilaiKelas = useCallback(async () => {
    if (!filter.kelas) {
      setSiswa([])
      setNilaiKelas([])
      return
    }
    setMemuat(true)
    const [roster, nilai] = await Promise.all([
      fetchSiswaKelasKurmer(filter.kelas, currentUser),
      fetchNilaiKurmerKelas(filter),
    ])
    setSiswa(roster)
    setNilaiKelas(nilai.data)
    if (nilai.error) console.error(nilai.error)
    setMemuat(false)
  }, [currentUser, filter])

  useEffect(() => {
    let batal = false
    muatNilaiKelas().then(() => {
      if (batal) return
    })
    return () => {
      batal = true
    }
  }, [muatNilaiKelas])

  useEffect(() => {
    if (!filter.kelas) return
    return pasangLanggananRealtimeKurmer(filter, () => {
      void muatNilaiKelas()
    })
  }, [filter.kelas, filter.tahunAjaran, filter.semester, muatNilaiKelas])

  useEffect(() => {
    let batal = false
    fetchKelasKurmer(currentUser).then((hasil) => {
      if (batal) return
      setKelasList(hasil.classes)
      setJumlahSiswa(hasil.counts)
      setFilter((current) => {
        if (current.kelas) return current
        return { ...current, kelas: hasil.classes[0] || '' }
      })
      setMemuatKelas(false)
    })
    return () => {
      batal = true
    }
  }, [currentUser])

  useEffect(() => {
    if (!filter.kelas || !filter.kodeMapel) return
    let batal = false
    fetchSetelanTpKurmer(filter).then((setelan) => {
      if (batal) return
      setJumlahTp(setelan.jumlah)
      if (setelan.error) console.error(setelan.error)
    })
    return () => {
      batal = true
    }
  }, [filter.kelas, filter.kodeMapel, filter.tahunAjaran, filter.semester])

  const barisNilai = useMemo(
    () => gabungRosterNilai(siswa, nilaiKelas, filter, jumlahTp),
    [siswa, nilaiKelas, filter, jumlahTp],
  )

  const ledger = useMemo(
    () => susunLedgerKelas(siswa, nilaiKelas, filter.jenisAsesmen),
    [siswa, nilaiKelas, filter.jenisAsesmen],
  )

  const dataCetakTampil = useMemo(() => {
    if (!dataCetak) return null
    return {
      ...dataCetak,
      catatan: {
        ...dataCetak.catatan,
        catatan_wali: catatan,
        nama_wali: namaWali,
        nama_kepsek: namaKepsek,
        niy_wali: niyWali,
      },
      kepsek: { ...dataCetak.kepsek, nama: namaKepsek || dataCetak.kepsek.nama },
    }
  }, [dataCetak, catatan, namaWali, niyWali, namaKepsek])

  useEffect(() => {
    if (tab !== 'cetak' || !idSiswaCetak || !filter.kelas) {
      setDataCetak(null)
      return
    }
    let batal = false
    setMemuatCetak(true)
    fetchDataCetakKurmer(idSiswaCetak, filter, currentUser).then((hasil) => {
      if (batal) return
      setDataCetak(hasil)
      if (hasil) {
        setCatatan(hasil.catatan.catatan_wali || '')
        setNamaWali(hasil.catatan.nama_wali || guru)
        setNamaKepsek(hasil.catatan.nama_kepsek || hasil.kepsek.nama)
      }
      setMemuatCetak(false)
    })
    return () => {
      batal = true
    }
  }, [tab, idSiswaCetak, filter, currentUser, guru, nilaiKelas])

  useEffect(() => {
    if (!idSiswaCetak && siswa.length > 0) setIdSiswaCetak(siswa[0].id_siswa)
    if (idSiswaCetak && siswa.every((item) => item.id_siswa !== idSiswaCetak)) {
      setIdSiswaCetak(siswa[0]?.id_siswa || '')
    }
  }, [siswa, idSiswaCetak])

  const ubahFilter = (patch: Partial<FilterKurmer>) => {
    setFilter((current) => ({ ...current, ...patch }))
    setStatus('')
  }

  const ubahBaris = (idSiswa: string, patch: Partial<Pick<BarisNilaiKurmer, 'tp' | 'asts' | 'asas'>>) => {
    setNilaiKelas((current) => {
      const kunci = (row: BarisNilaiKurmer) =>
        row.id_siswa === idSiswa &&
        row.kode_mapel === filter.kodeMapel &&
        row.tahun_ajaran === filter.tahunAjaran &&
        row.semester === filter.semester
      const ada = current.some(kunci)
      if (!ada) {
        const siswaBaris = siswa.find((item) => item.id_siswa === idSiswa)
        if (!siswaBaris) return current
        return [...current, terapkanNilaiKeBaris(barisNilaiKosong(siswaBaris, filter, jumlahTp), patch)]
      }
      return current.map((row) => (kunci(row) ? terapkanNilaiKeBaris(row, patch) : row))
    })
  }

  const ubahJumlahTp = async (n: number) => {
    const jumlah = clampJumlahTp(n)
    setJumlahTp(jumlah)
    setNilaiKelas((current) =>
      current.map((row) =>
        row.kode_mapel === filter.kodeMapel ? normalisasiBarisNilai(row, jumlah) : row,
      ),
    )
    if (filter.kelas && filter.kodeMapel) {
      const hasil = await simpanSetelanTpKurmer(filter, jumlah)
      if (!hasil.ok) console.error(hasil.error)
    }
  }

  const simpan = async () => {
    setMenyimpan(true)
    const barisSimpan = barisNilai.map((row) => {
      const profil = siswa.find((item) => item.id_siswa === row.id_siswa)
      return { ...row, kelas: profil?.kelas || row.kelas }
    })
    const hasil = await simpanNilaiKurmer(barisSimpan, guru, {
      jenisAsesmen: filter.jenisAsesmen,
      nisMenurutSiswa: Object.fromEntries(siswa.map((item) => [item.id_siswa, item.nis])),
    })
    if (!hasil.ok) {
      setGalat(true)
      setStatus(hasil.error)
    } else {
      setGalat(false)
      setStatus(`Nilai ${barisSimpan.length} siswa tersimpan (Supabase · kelas ${filter.kelas}).`)
      void muatNilaiKelas()
    }
    setMenyimpan(false)
  }

  const simpanCatatan = async () => {
    if (!idSiswaCetak) return
    setMenyimpanCatatan(true)
    const profil = siswa.find((item) => item.id_siswa === idSiswaCetak)
    const hasil = await simpanCatatanKurmer(
      {
        id_siswa: idSiswaCetak,
        kelas: filter.kelas,
        tahun_ajaran: filter.tahunAjaran,
        semester: filter.semester,
        jenis_asesmen: filter.jenisAsesmen,
        catatan_wali: catatan,
        nama_wali: namaWali,
        nama_kepsek: namaKepsek,
      },
      profil?.nis,
    )
    if (!hasil.ok) {
      setStatusCatatan(hasil.error)
    } else {
      setStatusCatatan('Catatan wali kelas tersimpan.')
      if (dataCetak && idSiswaCetak) {
        setDataCetak({
          ...dataCetak,
          catatan: { ...dataCetak.catatan, catatan_wali: catatan, nama_wali: namaWali, nama_kepsek: namaKepsek },
        })
      }
    }
    setMenyimpanCatatan(false)
  }

  return (
    <div className="space-y-4">
      <div className="print:hidden flex items-center justify-between rounded-2xl bg-[#4f46e5] px-4 py-4 text-white shadow-md sm:px-6">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 rounded-xl bg-white/20 px-4 py-2 text-xs font-bold hover:bg-white/30"
        >
          <ArrowLeft className="size-4" /> Kembali
        </button>
        <div className="text-center">
          <h2 className="text-base font-black tracking-wide">Rapor Kurikulum Merdeka</h2>
          <p className="text-[11px] text-indigo-100">Daftar nilai TP · Ledger kelas · Pratinjau cetak rapor</p>
        </div>
        <div className="hidden w-16 sm:block" />
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm print:hidden">
        <div className="mb-3 flex items-center gap-2 text-indigo-700">
          <BookOpen className="size-4" />
          <p className="text-xs font-extrabold uppercase tracking-wide">Filter rapor kurmer</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <label className="text-xs font-bold text-slate-600">
            Pilih Kelas
            <select
              value={filter.kelas}
              onChange={(event) => ubahFilter({ kelas: event.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-semibold"
            >
              <option value="">{memuatKelas ? 'Memuat kelas…' : 'Pilih kelas'}</option>
              {kelasList.map((item) => (
                <option key={item} value={item}>
                  {item}
                  {jumlahSiswa[item] ? ` · ${jumlahSiswa[item]} siswa` : ''}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-bold text-slate-600">
            Pilih Mata Pelajaran
            <select
              value={filter.kodeMapel}
              onChange={(event) => ubahFilter({ kodeMapel: event.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-semibold"
            >
              <optgroup label="Mapel Umum">
                {MAPEL_UMUM_KURMER.map((item) => (
                  <option key={item.kode} value={item.kode}>
                    {item.nama}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Mapel Diniyyah">
                {MAPEL_DINIYYAH_KURMER.map((item) => (
                  <option key={item.kode} value={item.kode}>
                    {item.nama}
                  </option>
                ))}
              </optgroup>
            </select>
          </label>
          <label className="text-xs font-bold text-slate-600">
            Pilih Jenis Asesmen
            <select
              value={filter.jenisAsesmen}
              onChange={(event) => ubahFilter({ jenisAsesmen: event.target.value as JenisAsesmenKurmer })}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-semibold"
            >
              {JENIS_ASESMEN_KURMER.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-bold text-slate-600">
            Tahun Ajaran
            <input
              value={filter.tahunAjaran}
              onChange={(event) => ubahFilter({ tahunAjaran: event.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-semibold"
            />
          </label>
          <label className="text-xs font-bold text-slate-600">
            Semester
            <select
              value={filter.semester}
              onChange={(event) => ubahFilter({ semester: event.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-semibold"
            >
              <option value="1">1 · Gasal</option>
              <option value="2">2 · Genap</option>
            </select>
          </label>
        </div>
        <p className="mt-3 text-[11px] leading-5 text-slate-500">
          NH = rata-rata TP terisi. NA ASTS = (NH + ASTS) / 2. NA ASAS = (2×NH + ASTS + ASAS) / bobot yang terisi.
          Predikat: SB ≥ 90, B ≥ 80, C ≥ 70, PB &lt; 70.
        </p>
      </section>

      <nav className="flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1 shadow-sm print:hidden">
        {TAB_KURMER.map((item) => {
          const Ikon = item.ikon
          const aktif = tab === item.id
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold whitespace-nowrap ${
                aktif ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Ikon className="size-3.5" /> {item.label}
            </button>
          )
        })}
      </nav>

      {tab === 'nilai' ? (
        <RaporKurmerDaftar
          siswa={siswa}
          baris={barisNilai}
          filter={filter}
          jumlahTp={jumlahTp}
          memuat={memuat}
          menyimpan={menyimpan}
          status={status}
          galat={galat}
          onJumlahTp={ubahJumlahTp}
          onUbah={ubahBaris}
          onSimpan={simpan}
        />
      ) : null}

      {tab === 'ledger' ? (
        <RaporKurmerLedger filter={filter} baris={ledger.baris} rekap={ledger.rekap} memuat={memuat} />
      ) : null}

      {tab === 'cetak' ? (
        <RaporKurmerCetakPanel
          siswaOptions={siswa}
          idSiswa={idSiswaCetak}
          onPilihSiswa={setIdSiswaCetak}
          data={dataCetakTampil}
          memuat={memuatCetak}
          catatan={catatan}
          namaWali={namaWali}
          niyWali={niyWali}
          namaKepsek={namaKepsek}
          onNiyWali={setNiyWali}
          menyimpan={menyimpanCatatan}
          status={statusCatatan}
          onCatatan={setCatatan}
          onNamaWali={setNamaWali}
          onNamaKepsek={setNamaKepsek}
          onSimpanCatatan={simpanCatatan}
        />
      ) : null}

      <p className="print:hidden text-[11px] text-slate-400">
        {DAFTAR_MAPEL_KURMER.length} muatan pelajaran · kerangka awal Rapor Kurmer Portal Guru
      </p>
    </div>
  )
}
