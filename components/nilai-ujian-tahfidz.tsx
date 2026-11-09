'use client'

import { useEffect, useMemo, useState } from 'react'
import { Save, X } from 'lucide-react'
import {
  barisKosong,
  fetchNilaiUjianTahfidz,
  formatAngkaRapor,
  clampNilaiAdab,
  clampNilaiKelancaran,
  clampNilaiTajwid,
  MAKS_NILAI_ADAB,
  MAKS_NILAI_KELANCAN,
  MAKS_NILAI_AKHIR,
  MAKS_NILAI_TAJWID,
  MIN_NILAI_KELANCAN,
  MIN_NILAI_TAJWID,
  PEMBAGI_NILAI_AKHIR,
  nilaiKelancaranDariKesalahan,
  nilaiRaporTahfidz,
  nilaiSurah,
  nilaiTajwidOtomatis,
  ringkasanBobotKelancaran,
  ringkasanBobotTajwid,
  uraianKelancaran,
  uraianTajwid,
  uraianNilaiSurah,
  predikatNilai,
  simpanNilaiUjianTahfidz,
  type MateriNilaiUjian,
  type NilaiSurahUjian,
} from '@/lib/rapor-tahfidz-nilai'
import { hitungSaranTargetTahfidz } from '@/lib/saran-target-rapor-tahfidz'

export type TargetNilaiUjian = {
  idSiswa: string
  nama: string
  kelas: string
  asesmen: string
  surahs: MateriNilaiUjian[]
}

function gabungBaris(materi: MateriNilaiUjian[], tersimpan: NilaiSurahUjian[]) {
  return materi.map((item) => {
    const lama = tersimpan.find((row) => row.namaSurat.toLowerCase() === item.nama.toLowerCase())
    if (!lama) return barisKosong(item)
    return { ...lama, namaSurat: item.nama, rentangAyat: item.ayat || lama.rentangAyat }
  })
}

export function NilaiUjianTahfidz({
  target,
  onClose,
  targetTahfidzAktif = true,
}: {
  target: TargetNilaiUjian
  onClose: () => void
  targetTahfidzAktif?: boolean
}) {
  const [baris, setBaris] = useState<NilaiSurahUjian[]>(target.surahs.map(barisKosong))
  const [capaianKompetensi, setCapaianKompetensi] = useState('')
  const [capaianTarget, setCapaianTarget] = useState('')
  const [motivasi, setMotivasi] = useState('')
  const [nilaiTarget, setNilaiTarget] = useState<number | ''>('')
  const [memuat, setMemuat] = useState(true)
  const [menyimpan, setMenyimpan] = useState(false)
  const [pesan, setPesan] = useState('')
  const [galat, setGalat] = useState(false)
  const [menghitungTarget, setMenghitungTarget] = useState(false)

  useEffect(() => {
    let batal = false
    setMemuat(true)
    fetchNilaiUjianTahfidz(target.idSiswa, target.asesmen).then((hasil) => {
      if (batal) return
      if (hasil.error) {
        setPesan(`Gagal memuat nilai tersimpan: ${hasil.error}`)
        setGalat(true)
      }
      setBaris(gabungBaris(target.surahs, hasil.detail))
      setCapaianKompetensi(hasil.header?.capaianKompetensi || '')
      setCapaianTarget(hasil.header?.capaianTarget || '')
      setMotivasi(hasil.header?.motivasi || '')
      const targetTersimpan = hasil.header?.nilaiTarget === '' || hasil.header?.nilaiTarget == null ? '' : Number(hasil.header.nilaiTarget)
      setNilaiTarget(targetTersimpan)
      setMemuat(false)
      if (
        targetTahfidzAktif &&
        targetTersimpan === '' &&
        !hasil.header?.capaianTarget &&
        target.surahs.length > 0
      ) {
        hitungSaranTargetTahfidz(target.idSiswa, target.kelas, target.asesmen, target.surahs).then((saran) => {
          if (!saran || batal) return
          setNilaiTarget(saran.nilaiTarget)
          setCapaianTarget(saran.capaianTarget)
          setMotivasi(saran.motivasi)
        })
      }
    })
    return () => {
      batal = true
    }
  }, [target, targetTahfidzAktif])

  const terapkanTargetManual = async () => {
    setMenghitungTarget(true)
    const saran = await hitungSaranTargetTahfidz(target.idSiswa, target.kelas, target.asesmen, target.surahs)
    setMenghitungTarget(false)
    if (!saran) {
      setPesan('Capaian setoran belum cukup untuk menghitung target otomatis.')
      setGalat(true)
      return
    }
    setNilaiTarget(saran.nilaiTarget)
    setCapaianTarget(saran.capaianTarget)
    setMotivasi(saran.motivasi)
    setGalat(false)
    setPesan('Target tahfidz diperbarui dari capaian setoran.')
  }

  const ringkasan = useMemo(() => {
    const nilai = baris.map(nilaiSurah)
    if (nilai.some((item) => item == null)) return null
    const akhir = Math.round(((nilai as number[]).reduce((a, b) => a + b, 0) / nilai.length) * 100) / 100
    const target = nilaiTarget === '' ? null : Number(nilaiTarget)
    return {
      akhir,
      predikat: predikatNilai(akhir),
      rapor: nilaiRaporTahfidz(akhir, target),
    }
  }, [baris, nilaiTarget])

  const ubah = (index: number, patch: Partial<NilaiSurahUjian>) => {
    setBaris((current) => current.map((row, i) => (i === index ? { ...row, ...patch } : row)))
  }

  const handleSimpan = async () => {
    setMenyimpan(true)
    setPesan('')
    const hasil = await simpanNilaiUjianTahfidz({
      idSiswa: target.idSiswa,
      jenisAsesmen: target.asesmen,
      baris,
      narasi: {
        capaianKompetensi,
        capaianTarget: targetTahfidzAktif ? capaianTarget : '',
        motivasi,
        nilaiTarget: targetTahfidzAktif ? nilaiTarget : '',
      },
    })
    setMenyimpan(false)
    if (hasil.error) {
      setPesan(hasil.error)
      setGalat(true)
      return
    }
    setGalat(false)
    setPesan(`Nilai ujian ${target.nama} tersimpan. Nilai akhir ${hasil.nilaiAkhir} (${hasil.predikat}).`)
  }

  return (
    <div className="fixed inset-0 z-[70] overflow-auto bg-slate-900/50 p-4">
      <div className="mx-auto max-w-4xl rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-3 rounded-t-2xl bg-[#2563eb] px-5 py-4 text-white">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-sky-100">Nilai ujian tahfidz</p>
            <h2 className="text-base font-black">{target.nama}</h2>
            <p className="text-xs text-sky-100">
              {target.kelas} · {target.asesmen} · ID {target.idSiswa}
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg bg-white/20 p-2 hover:bg-white/30">
            <X className="size-4" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <p className="text-xs text-slate-500">
            NA = (Kelancaran + Tajwid + Adab) ÷ {PEMBAGI_NILAI_AKHIR}. Kelancaran {MIN_NILAI_KELANCAN}–{MAKS_NILAI_KELANCAN}
            (contoh At-Tiin −13, An-Naba −4). Tajwid {MIN_NILAI_TAJWID}–{MAKS_NILAI_TAJWID} = 100 − (Mad+Dengung+Makhraj) ×
            bobot surat. Adab 0–10 diisi manual.
          </p>

          {memuat && <p className="text-sm text-slate-500">Memuat nilai tersimpan…</p>}

          {baris.map((row, index) => {
            const nilai = nilaiSurah(row)
            return (
              <section key={`${row.namaSurat}-${index}`} className="rounded-2xl border border-slate-200 p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h3 className="text-sm font-extrabold text-slate-800">
                    {row.namaSurat}
                    {row.rentangAyat ? ` · Ayat ${row.rentangAyat}` : ''}
                  </h3>
                  <span className="text-right text-xs font-bold text-sky-800">
                    <span className="block">NA: {nilai ?? '—'}</span>
                    {nilai != null ? <span className="block font-medium text-sky-700">{uraianNilaiSurah(row)}</span> : null}
                  </span>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <fieldset className="rounded-xl bg-emerald-50/70 p-3">
                    <legend className="px-1 text-xs font-black uppercase tracking-wide text-emerald-800">Kelancaran</legend>
                    <p className="mt-1 text-[10px] font-medium leading-snug text-emerald-950/80">
                      {ringkasanBobotKelancaran(row.namaSurat)}
                    </p>
                    <label className="mt-1 block text-[11px] font-bold text-slate-600">
                      Jumlah kesalahan
                      <input
                        type="number"
                        min={0}
                        value={row.kesalahanKelancaran}
                        onChange={(event) => {
                          const salah = event.target.value === '' ? '' : Number(event.target.value)
                          ubah(index, {
                            kesalahanKelancaran: salah,
                            nilaiKelancaran: nilaiKelancaranDariKesalahan(row.namaSurat, salah),
                          })
                        }}
                        className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                      />
                    </label>
                    {uraianKelancaran(row.namaSurat, row.kesalahanKelancaran, row.nilaiKelancaran) ? (
                      <p className="mt-1 text-[10px] font-semibold text-emerald-800">
                        {uraianKelancaran(row.namaSurat, row.kesalahanKelancaran, row.nilaiKelancaran)}
                      </p>
                    ) : null}
                    <label className="mt-2 block text-[11px] font-bold text-slate-600">
                      Nilai kelancaran
                      <input
                        type="number"
                        min={MIN_NILAI_KELANCAN}
                        max={MAKS_NILAI_KELANCAN}
                        value={row.nilaiKelancaran}
                        onChange={(event) =>
                          ubah(index, {
                            nilaiKelancaran:
                              event.target.value === '' ? '' : clampNilaiKelancaran(Number(event.target.value)),
                          })
                        }
                        className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                      />
                    </label>
                  </fieldset>

                  <fieldset className="rounded-xl bg-amber-50/70 p-3">
                    <legend className="px-1 text-xs font-black uppercase tracking-wide text-amber-900">Tajwid</legend>
                    <p className="mt-1 text-[10px] font-medium leading-snug text-amber-950/80">
                      {ringkasanBobotTajwid(row.namaSurat)}
                    </p>
                    <div className="mt-1 grid grid-cols-3 gap-2">
                      {(
                        [
                          ['Mad', 'kesalahanMad'],
                          ['Dengung', 'kesalahanDengung'],
                          ['Makhraj', 'kesalahanMakhraj'],
                        ] as const
                      ).map(([label, field]) => (
                        <label key={field} className="block text-[11px] font-bold text-slate-600">
                          {label}
                          <input
                            type="number"
                            min={0}
                            value={row[field]}
                            onChange={(event) => {
                              const salah = event.target.value === '' ? '' : Number(event.target.value)
                              const berikutnya = { ...row, [field]: salah }
                              ubah(index, {
                                [field]: salah,
                                nilaiTajwid: nilaiTajwidOtomatis(
                                  row.namaSurat,
                                  berikutnya.kesalahanMad,
                                  berikutnya.kesalahanDengung,
                                  berikutnya.kesalahanMakhraj,
                                ),
                              })
                            }}
                            className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                          />
                        </label>
                      ))}
                    </div>
                    <label className="mt-2 block text-[11px] font-bold text-slate-600">
                      Nilai tajwid
                      <input
                        type="number"
                        min={MIN_NILAI_TAJWID}
                        max={MAKS_NILAI_TAJWID}
                        value={row.nilaiTajwid}
                        onChange={(event) =>
                          ubah(index, {
                            nilaiTajwid: event.target.value === '' ? '' : clampNilaiTajwid(Number(event.target.value)),
                          })
                        }
                        className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                      />
                    </label>
                    {uraianTajwid(
                      row.namaSurat,
                      row.kesalahanMad,
                      row.kesalahanDengung,
                      row.kesalahanMakhraj,
                      row.nilaiTajwid,
                    ) ? (
                      <p className="mt-1 text-[10px] font-semibold text-amber-900">
                        {uraianTajwid(
                          row.namaSurat,
                          row.kesalahanMad,
                          row.kesalahanDengung,
                          row.kesalahanMakhraj,
                          row.nilaiTajwid,
                        )}
                      </p>
                    ) : null}
                  </fieldset>

                  <fieldset className="rounded-xl bg-sky-50/70 p-3">
                    <legend className="px-1 text-xs font-black uppercase tracking-wide text-sky-900">Adab</legend>
                    <label className="mt-1 block text-[11px] font-bold text-slate-600">
                      Nilai adab
                      <input
                        type="number"
                        min={0}
                        max={MAKS_NILAI_ADAB}
                        value={row.nilaiAdab}
                        onChange={(event) =>
                          ubah(index, {
                            nilaiAdab: event.target.value === '' ? '' : clampNilaiAdab(Number(event.target.value)),
                          })
                        }
                        className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                      />
                    </label>
                  </fieldset>
                </div>
              </section>
            )
          })}

          <section className="space-y-3 rounded-2xl border border-slate-200 p-4">
            <h3 className="text-sm font-extrabold text-slate-800">Catatan capaian rapor</h3>
            {targetTahfidzAktif ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-emerald-50 px-3 py-2">
                  <p className="text-[11px] font-bold text-emerald-900">Target tahfidz aktif</p>
                  <button
                    type="button"
                    onClick={terapkanTargetManual}
                    disabled={menghitungTarget}
                    className="rounded-lg bg-emerald-700 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-emerald-800 disabled:opacity-50"
                  >
                    {menghitungTarget ? 'Menghitung…' : 'Hitung ulang target'}
                  </button>
                </div>
                <label className="block text-[11px] font-bold text-slate-600">
                  Nilai target
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={nilaiTarget}
                    onChange={(event) => setNilaiTarget(event.target.value === '' ? '' : Number(event.target.value))}
                    placeholder="0–100"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                  <span className="mt-1 block font-medium text-slate-500">
                    Dipakai rumus rapor: ((2 × nilai rata-rata) + nilai target) / 3
                  </span>
                </label>
                <label className="block text-[11px] font-bold text-slate-600">
                  Capaian target
                  <textarea
                    value={capaianTarget}
                    onChange={(event) => setCapaianTarget(event.target.value)}
                    rows={3}
                    placeholder="Deskripsi capaian terhadap target hafalan..."
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </label>
              </>
            ) : (
              <p className="text-xs text-slate-500">
                Target tahfidz nonaktif. Aktifkan sakelar &quot;Target Tahfidz&quot; di halaman Input Rapor untuk mengisi nilai target
                dan narasi capaian.
              </p>
            )}
            <label className="block text-[11px] font-bold text-slate-600">
              Capaian kompetensi
              <textarea
                value={capaianKompetensi}
                onChange={(event) => setCapaianKompetensi(event.target.value)}
                rows={2}
                placeholder="Deskripsi capaian kompetensi siswa..."
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-[11px] font-bold text-slate-600">
              Motivasi / catatan ustadz
              <textarea
                value={motivasi}
                onChange={(event) => setMotivasi(event.target.value)}
                rows={2}
                placeholder="Motivasi atau catatan pembimbing..."
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
          </section>

          <div className="rounded-xl bg-slate-50 px-4 py-3 text-center text-sm">
            {ringkasan ? (
              <p>
                Nilai rata-rata: <strong className="text-sky-800">{ringkasan.akhir}</strong> · Predikat:{' '}
                <strong>{ringkasan.predikat}</strong>
                {ringkasan.rapor != null ? (
                  <>
                    {' '}
                    · Nilai rapor: <strong className="text-emerald-700">{formatAngkaRapor(ringkasan.rapor)}</strong>
                  </>
                ) : null}
              </p>
            ) : (
              <p className="text-slate-500">Lengkapi nilai setiap surah untuk melihat nilai akhir.</p>
            )}
            <p className="mt-1 text-[11px] text-slate-500">
              Predikat: Mumtaz (90–100), Jayyid Jiddan (80–89), Jayyid (70–79), Mengulang (di bawah 70).
            </p>
          </div>

          {pesan && (
            <p className={`rounded-xl px-3 py-2 text-sm font-semibold ${galat ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-800'}`}>
              {pesan}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700">
              Tutup
            </button>
            <button
              type="button"
              onClick={handleSimpan}
              disabled={menyimpan || memuat}
              className="inline-flex items-center gap-2 rounded-xl bg-sky-700 px-4 py-2 text-sm font-bold text-white hover:bg-sky-800 disabled:opacity-50"
            >
              <Save className="size-4" /> {menyimpan ? 'Menyimpan…' : 'Simpan Nilai'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
