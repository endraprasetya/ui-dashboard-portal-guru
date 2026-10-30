'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Mic } from 'lucide-react'

function getSpeechRecognitionCtor(): (new () => any) | null {
  if (typeof window === 'undefined') return null
  const host = window as Window & {
    SpeechRecognition?: new () => any
    webkitSpeechRecognition?: new () => any
  }
  return host.SpeechRecognition || host.webkitSpeechRecognition || null
}

function gabungTeks(base: string, spoken: string) {
  const left = base.replace(/\s+$/g, '')
  const right = spoken.replace(/^\s+/g, '').replace(/\s+$/g, '')
  if (!left) return right
  if (!right) return left
  return `${left} ${right}`
}

let pelepasAktif: (() => void) | null = null

export function useDikte() {
  const recognitionRef = useRef<any>(null)
  const sessionRef = useRef(0)
  const [aktif, setAktif] = useState<string | null>(null)
  const [galat, setGalat] = useState('')

  const hentikan = useCallback(() => {
    sessionRef.current += 1
    const recognition = recognitionRef.current
    recognitionRef.current = null
    try {
      recognition?.abort?.()
    } catch {
      /* sesi suara sudah berhenti */
    }
    if (pelepasAktif === hentikan) pelepasAktif = null
    setAktif(null)
  }, [])

  const toggle = useCallback(
    (kunci: string, baca: () => string, tulis: (nilai: string) => void) => {
      if (aktif === kunci) {
        hentikan()
        return
      }

      if (pelepasAktif && pelepasAktif !== hentikan) pelepasAktif()
      hentikan()
      pelepasAktif = hentikan

      const Ctor = getSpeechRecognitionCtor()
      if (!Ctor) {
        setGalat('Browser ini belum mendukung input suara. Gunakan Chrome atau Edge.')
        return
      }
      if (!window.isSecureContext) {
        setGalat('Input suara hanya dapat dipakai lewat localhost atau HTTPS.')
        return
      }

      const session = ++sessionRef.current
      const meta = { base: baca() || '', spoken: '' }
      const recognition = new Ctor()
      recognition.lang = 'id-ID'
      recognition.continuous = true
      recognition.interimResults = true
      recognition.maxAlternatives = 1
      let lastStart = 0
      let quickEnds = 0

      recognition.onstart = () => {
        lastStart = Date.now()
      }

      recognition.onresult = (event: any) => {
        if (sessionRef.current !== session) return
        let spoken = ''
        for (let i = 0; i < event.results.length; i += 1) {
          const piece = String(event.results[i][0]?.transcript || '')
          if (!piece) continue
          if (spoken && !/\s$/.test(spoken) && !/^\s/.test(piece)) spoken += ' '
          spoken += piece
        }
        meta.spoken = spoken.trim()
        tulis(gabungTeks(meta.base, meta.spoken))
      }

      recognition.onerror = (event: any) => {
        const code = String(event?.error || '')
        if (code === 'no-speech' || code === 'aborted') return
        if (sessionRef.current !== session) return
        sessionRef.current += 1
        recognitionRef.current = null
        if (pelepasAktif === hentikan) pelepasAktif = null
        setAktif(null)
        if (code === 'not-allowed' || code === 'service-not-allowed') {
          setGalat('Izin mikrofon ditolak. Izinkan mikrofon untuk situs ini, lalu coba lagi.')
        } else if (code === 'audio-capture') {
          setGalat('Mikrofon tidak ditemukan atau sedang dipakai aplikasi lain.')
        } else {
          setGalat('Rekaman suara terhenti. Coba lagi.')
        }
      }

      recognition.onend = () => {
        if (sessionRef.current !== session) return
        if (meta.spoken) {
          meta.base = gabungTeks(meta.base, meta.spoken)
          meta.spoken = ''
        }
        if (Date.now() - lastStart < 400) {
          quickEnds += 1
          if (quickEnds >= 4) {
            sessionRef.current += 1
            recognitionRef.current = null
            if (pelepasAktif === hentikan) pelepasAktif = null
            setAktif(null)
            setGalat('Mikrofon berhenti terlalu cepat. Periksa izin mikrofon di browser, lalu coba lagi.')
            return
          }
        } else {
          quickEnds = 0
        }
        window.setTimeout(() => {
          if (sessionRef.current !== session) return
          try {
            recognition.start()
          } catch {
            sessionRef.current += 1
            recognitionRef.current = null
            if (pelepasAktif === hentikan) pelepasAktif = null
            setAktif(null)
            setGalat('Mikrofon tidak dapat dilanjutkan. Periksa izin mikrofon di browser, lalu coba lagi.')
          }
        }, 250)
      }

      recognitionRef.current = recognition
      setGalat('')
      setAktif(kunci)
      try {
        recognition.start()
      } catch {
        sessionRef.current += 1
        recognitionRef.current = null
        if (pelepasAktif === hentikan) pelepasAktif = null
        setAktif(null)
        setGalat('Tidak dapat memulai mikrofon.')
      }
    },
    [aktif, hentikan],
  )

  useEffect(() => {
    return () => {
      sessionRef.current += 1
      try {
        recognitionRef.current?.abort?.()
      } catch {
        /* komponen sudah ditutup */
      }
      recognitionRef.current = null
      if (pelepasAktif === hentikan) pelepasAktif = null
    }
  }, [hentikan])

  return { aktif, galat, toggle, hentikan }
}

export function BidangSuara({
  value,
  onChange,
  mendengarkan,
  onToggle,
  placeholder,
  rows = 2,
  satuBaris = false,
  className = '',
}: {
  value: string
  onChange: (value: string) => void
  mendengarkan: boolean
  onToggle: () => void
  placeholder?: string
  rows?: number
  satuBaris?: boolean
  className?: string
}) {
  const kelas = `${className || (satuBaris ? 'w-full rounded-xl border border-slate-300 p-3 text-sm' : 'min-h-14 w-full resize-y rounded border px-2 py-1.5')} pr-10 ${
    mendengarkan ? 'border-red-400 bg-red-50' : className ? '' : 'border-slate-200'
  }`

  return (
    <div>
      <div className="relative">
        {satuBaris ? (
          <input
            type="text"
            value={value}
            placeholder={placeholder}
            onChange={(event) => onChange(event.target.value)}
            className={kelas}
          />
        ) : (
          <textarea
            value={value}
            rows={rows}
            placeholder={placeholder}
            onChange={(event) => onChange(event.target.value)}
            className={kelas}
          />
        )}
        <button
          type="button"
          onClick={onToggle}
          aria-pressed={mendengarkan}
          aria-label={mendengarkan ? 'Berhenti mendengarkan' : 'Rekam suara menjadi teks'}
          title={mendengarkan ? 'Berhenti mendengarkan' : 'Rekam suara (Bahasa Indonesia)'}
          className={`no-print absolute top-1.5 right-1.5 rounded p-1 ${
            mendengarkan ? 'bg-red-600 text-white' : 'text-slate-500 hover:bg-slate-100'
          }`}
        >
          <Mic className={`size-3.5 ${mendengarkan ? 'animate-pulse' : ''}`} />
        </button>
      </div>
      {mendengarkan && (
        <p className="no-print mt-1 flex items-center gap-1 text-[10px] font-bold text-red-600" aria-live="polite">
          <span className="size-1.5 animate-pulse rounded-full bg-red-500" />
          Mendengarkan...
        </p>
      )}
    </div>
  )
}

export function BidangSuaraMandiri({
  value,
  onChange,
  placeholder,
  rows = 2,
  satuBaris = false,
  className = '',
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  rows?: number
  satuBaris?: boolean
  className?: string
}) {
  const dikte = useDikte()
  return (
    <div>
      <BidangSuara
        value={value}
        onChange={onChange}
        mendengarkan={dikte.aktif === 'bidang'}
        onToggle={() => dikte.toggle('bidang', () => value, onChange)}
        placeholder={placeholder}
        rows={rows}
        satuBaris={satuBaris}
        className={className}
      />
      {dikte.galat && <p className="no-print mt-1 text-xs font-bold text-red-600">{dikte.galat}</p>}
    </div>
  )
}
