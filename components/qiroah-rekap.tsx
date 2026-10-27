'use client'



import { useEffect, useMemo, useRef, useState } from 'react'

import { ArrowLeft, ChevronDown, ChevronUp, Printer, Search, Target, Users } from 'lucide-react'

import { supabase } from '@/lib/supabase'

import { fetchAllSiswa, isKelasAlumni } from '@/lib/siswa'

import {

  TARGET_QIROAH,

  cekTargetQiroahSiswa,

  formatCapaianQiroah,

  formatDateString,

  parseCustomDate,

} from '@/lib/qiroah'



export function QiroahRekap({ onBack, currentUser }: { onBack: () => void; currentUser?: any }) {

  const [students, setStudents] = useState<any[]>([])

  const [selectedClass, setSelectedClass] = useState('')

  const [searchQuery, setSearchQuery] = useState('')

  const [isSearchOpen, setIsSearchOpen] = useState(false)

  const [startDate, setStartDate] = useState('')

  const [endDate, setEndDate] = useState('')

  const [reportType, setReportType] = useState<'kelas' | 'siswa' | null>(null)

  const [reportData, setReportData] = useState<any[]>([])

  const [loading, setLoading] = useState(false)

  const [showTarget, setShowTarget] = useState(false)

  const [selectedStudent, setSelectedStudent] = useState<any>(null)

  const searchRef = useRef<HTMLDivElement>(null)



  useEffect(() => {

    fetchAllSiswa(currentUser).then(setStudents)

  }, [currentUser])



  const filteredStudents = useMemo(() => {

    return students.filter((s) => {

      const name = String(s.nama_siswa || '').toLowerCase()

      const query = searchQuery.trim().toLowerCase()

      if (!query) return true

      return name.includes(query)

    })

  }, [students, searchQuery])



  const uniqueClasses = useMemo(() => {

    return Array.from(new Set(students.map((s) => s.kelas)))

      .filter((kelas) => kelas && !isKelasAlumni(kelas))

      .sort()

  }, [students])



  useEffect(() => {

    function handleClickOutside(event: MouseEvent) {

      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {

        setIsSearchOpen(false)

      }

    }

    document.addEventListener('mousedown', handleClickOutside)

    return () => document.removeEventListener('mousedown', handleClickOutside)

  }, [])



  const findNearestDate = (records: any[], targetDate: Date, direction: 'after' | 'before') => {

    const filtered = records.filter((r) => {

      const itemDate = parseCustomDate(r.tanggal)

      if (!itemDate || isNaN(itemDate.getTime())) return false

      return direction === 'after' ? itemDate >= targetDate : itemDate <= targetDate

    })

    if (filtered.length === 0) return null

    filtered.sort((a, b) => {

      const dateA = parseCustomDate(a.tanggal) || new Date(0)

      const dateB = parseCustomDate(b.tanggal) || new Date(0)

      return Math.abs(dateA.getTime() - targetDate.getTime()) - Math.abs(dateB.getTime() - targetDate.getTime())

    })

    return filtered[0]

  }



  const handleLoadClassReport = async () => {

    if (!selectedClass) {

      alert('Silakan pilih kelas terlebih dahulu!')

      return

    }

    setLoading(true)

    setReportType('kelas')



    const classStudents = students.filter((s) => String(s.kelas).trim() === selectedClass.trim())

    const startObj = startDate ? new Date(`${startDate}T00:00:00`) : null

    const endObj = endDate ? new Date(`${endDate}T23:59:59`) : null



    const results = await Promise.all(

      classStudents.map(async (student) => {

        const { data } = await supabase

          .from('setoran_qiroah')

          .select('id_qiroah, tanggal, id_siswa, jilid, halaman, status, catatan, tugas_rumah, ustadz')

          .eq('id_siswa', String(student.id_siswa))



        const setoranList = [...(data || [])].sort((a, b) => {

          const dateA = parseCustomDate(a.tanggal) || new Date(0)

          const dateB = parseCustomDate(b.tanggal) || new Date(0)

          return dateA.getTime() - dateB.getTime()

        })



        let firstSetoran = startObj ? findNearestDate(setoranList, startObj, 'after') : setoranList[0] || null

        let lastSetoran = endObj

          ? findNearestDate(setoranList, endObj, 'before')

          : setoranList[setoranList.length - 1] || null



        return { student, firstSetoran, lastSetoran }

      }),

    )



    setReportData(results)

    setLoading(false)

  }



  const handleSelectStudentFast = async (student: any) => {

    setSelectedStudent(student)

    setSearchQuery(student.nama_siswa)

    setIsSearchOpen(false)

    setLoading(true)

    setReportType('siswa')



    const { data } = await supabase

      .from('setoran_qiroah')

      .select('id_qiroah, tanggal, id_siswa, jilid, halaman, status, catatan, tugas_rumah, ustadz')

      .eq('id_siswa', String(student.id_siswa))



    let setoranList = data || []

    const startObj = startDate ? new Date(`${startDate}T00:00:00`) : null

    const endObj = endDate ? new Date(`${endDate}T23:59:59`) : null



    if (startObj || endObj) {

      setoranList = setoranList.filter((s) => {

        const itemDate = parseCustomDate(s.tanggal)

        if (!itemDate || isNaN(itemDate.getTime())) return false

        if (startObj && itemDate < startObj) return false

        if (endObj && itemDate > endObj) return false

        return true

      })

    }



    setoranList.sort((a, b) => {

      const dateA = parseCustomDate(a.tanggal) || new Date(0)

      const dateB = parseCustomDate(b.tanggal) || new Date(0)

      return dateB.getTime() - dateA.getTime()

    })



    setReportData(setoranList)

    setLoading(false)

  }



  const targetStats = useMemo(() => {

    if (reportType !== 'kelas' || reportData.length === 0) return null

    let capai = 0

    reportData.forEach((item) => {

      const capaian = formatCapaianQiroah(item.lastSetoran) || ''

      if (cekTargetQiroahSiswa(item.student.kelas, capaian)) capai += 1

    })

    return { total: reportData.length, capai, belum: reportData.length - capai }

  }, [reportType, reportData])



  return (

    <div className="mx-auto max-w-5xl space-y-5">

      <style

        dangerouslySetInnerHTML={{

          __html: `

        @media print {

          body * { visibility: hidden; }

          #printAreaQiroah, #printAreaQiroah * { visibility: visible; }

          #printAreaQiroah { position: absolute; left: 0; top: 0; width: 100%; background: white !important; }

          .no-print { display: none !important; }

        }

      `,

        }}

      />



      <div className="no-print flex items-center justify-between">

        <button

          type="button"

          onClick={onBack}

          className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-white shadow transition hover:bg-amber-600"

        >

          <ArrowLeft className="size-4" /> Kembali ke Menu Qiroah

        </button>

        {reportType && (

          <button

            type="button"

            onClick={() => window.print()}

            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow hover:bg-slate-800"

          >

            <Printer className="size-4" /> Cetak Laporan

          </button>

        )}

      </div>



      <div className="no-print space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

        <h2 className="border-b border-slate-100 pb-3 text-lg font-extrabold text-slate-900">

          Laporan Perkembangan Qiroah

        </h2>



        <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-12">

          <div className="sm:col-span-4">

            <label className="mb-1 block text-xs font-bold text-slate-600">Rentang Tanggal</label>

            <div className="flex items-center gap-1.5">

              <input

                type="date"

                value={startDate}

                onChange={(e) => setStartDate(e.target.value)}

                className="w-full rounded-lg border border-slate-300 bg-slate-50 p-2 text-xs focus:bg-white"

              />

              <span className="text-xs font-bold text-slate-400">s/d</span>

              <input

                type="date"

                value={endDate}

                onChange={(e) => setEndDate(e.target.value)}

                className="w-full rounded-lg border border-slate-300 bg-slate-50 p-2 text-xs focus:bg-white"

              />

            </div>

          </div>



          <div className="sm:col-span-3">

            <label className="mb-1 block text-xs font-bold text-slate-600">Pilih Kelas</label>

            <select

              value={selectedClass}

              onChange={(e) => {

                setSelectedClass(e.target.value)

                setSearchQuery('')

              }}

              className="w-full rounded-lg border border-slate-300 bg-slate-50 p-2 text-xs font-medium focus:bg-white"

            >

              <option value="">-- Pilih Kelas --</option>

              {uniqueClasses.map((k) => (

                <option key={k} value={k}>

                  Kelas {k}

                </option>

              ))}

            </select>

          </div>



          <div className="relative sm:col-span-5" ref={searchRef}>

            <label className="mb-1 block text-xs font-bold text-slate-600">Cari Santri / Laporan Per Siswa</label>

            <div className="relative">

              <Search className="absolute left-3 top-2.5 size-4 text-sky-500" />

              <input

                type="text"

                placeholder="Ketik nama siswa..."

                value={searchQuery}

                onFocus={() => setIsSearchOpen(true)}

                onChange={(e) => {

                  setSearchQuery(e.target.value)

                  setIsSearchOpen(true)

                }}

                className="w-full rounded-lg border border-sky-300 bg-sky-50/50 p-2 pl-9 pr-3 text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none"

              />

            </div>

            {isSearchOpen && (

              <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl">

                {filteredStudents.length > 0 ? (

                  filteredStudents.slice(0, 80).map((student) => (

                    <button

                      key={student.id_siswa}

                      type="button"

                      onClick={() => handleSelectStudentFast(student)}

                      className="flex w-full items-center justify-between border-b border-slate-50 px-3 py-2 text-left text-xs transition hover:bg-sky-50"

                    >

                      <span className="font-bold text-slate-800">{student.nama_siswa}</span>

                      <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">

                        Kelas {student.kelas}

                      </span>

                    </button>

                  ))

                ) : (

                  <div className="p-3 text-center text-xs text-slate-400">Santri tidak ditemukan</div>

                )}

              </div>

            )}

          </div>

        </div>



        <button

          type="button"

          onClick={handleLoadClassReport}

          className="flex w-full items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-xs font-bold text-white shadow transition hover:bg-sky-700"

        >

          <Users className="size-4" /> Tampilkan Rekap {selectedClass ? `Kelas ${selectedClass}` : 'Kelas'}

        </button>



        <div>

          <button

            type="button"

            onClick={() => setShowTarget(!showTarget)}

            className="flex w-full items-center justify-between rounded-xl border border-sky-200 bg-sky-50 px-4 py-2 text-xs font-bold text-sky-800 hover:bg-sky-100"

          >

            <span className="flex items-center gap-2">

              <Target className="size-4 text-sky-600" /> Standar Target Qiroah

            </span>

            {showTarget ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}

          </button>

          {showTarget && (

            <div className="mt-2 space-y-2 rounded-xl border border-sky-200 bg-white p-4 text-xs text-slate-700 shadow-inner">

              {TARGET_QIROAH.map((item) => (

                <p key={item.kelas}>

                  <strong>{item.kelas}:</strong> {item.target}

                </p>

              ))}

            </div>

          )}

        </div>

      </div>



      <div id="printAreaQiroah">

        {loading ? (

          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-xs font-semibold text-slate-500">

            Sedang menarik data dari Supabase...

          </div>

        ) : (

          <>

            {reportType === 'kelas' && targetStats && (

              <div className="mb-4 space-y-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">

                <h4 className="text-sm font-extrabold text-slate-800">Grafik Target Qiroah</h4>

                <p className="text-xs font-semibold text-red-600">

                  {targetStats.belum} murid belum mencapai target (

                  {targetStats.total ? Math.round((targetStats.belum / targetStats.total) * 100) : 0}%)

                </p>

                <div className="h-2 overflow-hidden rounded-full bg-red-100">

                  <div

                    className="h-full bg-red-500"

                    style={{ width: `${targetStats.total ? (targetStats.belum / targetStats.total) * 100 : 0}%` }}

                  />

                </div>

                <p className="text-xs font-semibold text-emerald-700">

                  {targetStats.capai} murid mencapai target (

                  {targetStats.total ? Math.round((targetStats.capai / targetStats.total) * 100) : 0}%)

                </p>

                <div className="h-2 overflow-hidden rounded-full bg-emerald-100">

                  <div

                    className="h-full bg-emerald-600"

                    style={{ width: `${targetStats.total ? (targetStats.capai / targetStats.total) * 100 : 0}%` }}

                  />

                </div>

              </div>

            )}



            {reportType === 'kelas' && (

              <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

                <div className="flex items-center justify-between border-b border-slate-200 pb-3">

                  <div>

                    <h3 className="text-base font-extrabold text-sky-700">Laporan Capaian Kelas {selectedClass}</h3>

                    <p className="text-xs text-slate-500">

                      SD Al Madinah · Periode: {startDate ? new Date(startDate).toLocaleDateString('id-ID') : '-'} s/d{' '}

                      {endDate ? new Date(endDate).toLocaleDateString('id-ID') : '-'}

                    </p>

                  </div>

                  <span className="no-print rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">

                    Total Santri: {reportData.length}

                  </span>

                </div>

                <div className="overflow-x-auto">

                  <table className="w-full border-collapse text-left text-xs">

                    <thead>

                      <tr className="bg-slate-800 text-center font-bold text-white">

                        <th className="w-12 border border-slate-700 p-3">No</th>

                        <th className="border border-slate-700 p-3 text-left">Nama Siswa</th>

                        <th className="w-32 border border-slate-700 p-3">Tgl Awal</th>

                        <th className="border border-slate-700 p-3 text-sky-300">Capaian Awal</th>

                        <th className="w-32 border border-slate-700 p-3">Tgl Akhir</th>

                        <th className="border border-slate-700 p-3 text-emerald-300">Capaian Akhir</th>

                        <th className="border border-slate-700 p-3">Target</th>

                      </tr>

                    </thead>

                    <tbody>

                      {reportData.map((item, idx) => {

                        const akhir = formatCapaianQiroah(item.lastSetoran) || ''

                        const lulus = cekTargetQiroahSiswa(item.student.kelas, akhir)

                        return (

                          <tr key={item.student.id_siswa} className="hover:bg-slate-50">

                            <td className="border p-2.5 text-center font-semibold text-slate-500">{idx + 1}</td>

                            <td className="border p-2.5 font-bold text-slate-800">{item.student.nama_siswa}</td>

                            <td className="border p-2.5 text-center">

                              {item.firstSetoran ? formatDateString(item.firstSetoran.tanggal) : '-'}

                            </td>

                            <td className="border p-2.5 text-center font-bold text-sky-600">

                              {formatCapaianQiroah(item.firstSetoran) || <span className="italic text-slate-400">Belum ada</span>}

                            </td>

                            <td className="border p-2.5 text-center">

                              {item.lastSetoran ? formatDateString(item.lastSetoran.tanggal) : '-'}

                            </td>

                            <td className="border p-2.5 text-center font-bold text-emerald-600">

                              {formatCapaianQiroah(item.lastSetoran) || <span className="italic text-slate-400">Belum ada</span>}

                            </td>

                            <td className={`border p-2.5 text-center text-[10px] font-bold ${lulus ? 'text-emerald-700' : 'text-red-600'}`}>

                              {lulus ? '✓ Capai Target' : '✗ Belum Target'}

                            </td>

                          </tr>

                        )

                      })}

                    </tbody>

                  </table>

                </div>

              </div>

            )}



            {reportType === 'siswa' && selectedStudent && (

              <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

                <div className="flex items-center justify-between border-b border-slate-200 pb-3">

                  <div>

                    <h3 className="text-base font-extrabold text-slate-900">{selectedStudent.nama_siswa}</h3>

                    <p className="text-xs text-slate-500">

                      Kelas {selectedStudent.kelas} · ID: {selectedStudent.id_siswa}

                    </p>

                  </div>

                  <span className="no-print rounded-lg bg-sky-100 px-3 py-1 text-xs font-bold text-sky-800">

                    {reportData.length} Total Setoran

                  </span>

                </div>

                <div className="overflow-x-auto">

                  <table className="w-full border-collapse text-left text-xs">

                    <thead>

                      <tr className="bg-slate-900 font-bold uppercase tracking-wider text-white">

                        <th className="border border-slate-800 p-2.5">Tanggal</th>

                        <th className="border border-slate-800 p-2.5">Jilid / Halaman</th>

                        <th className="border border-slate-800 p-2.5 text-center">Status</th>

                        <th className="border border-slate-800 p-2.5">Catatan</th>

                      </tr>

                    </thead>

                    <tbody>

                      {reportData.map((row) => (

                        <tr key={row.id_qiroah} className="hover:bg-slate-50">

                          <td className="whitespace-nowrap border p-2.5 font-semibold">{formatDateString(row.tanggal)}</td>

                          <td className="border p-2.5 font-bold text-slate-800">

                            {row.jilid} · {row.halaman}

                          </td>

                          <td className="border p-2.5 text-center font-bold text-emerald-700">{row.status}</td>

                          <td className="border p-2.5 text-slate-600">{row.catatan && row.catatan !== '-' ? row.catatan : '-'}</td>

                        </tr>

                      ))}

                    </tbody>

                  </table>

                </div>

              </div>

            )}

          </>

        )}

      </div>

    </div>

  )

} 