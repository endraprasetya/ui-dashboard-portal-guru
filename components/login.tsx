'use client'

import { useState, type FormEvent } from 'react'
import { supabase } from '@/lib/supabase'
import { Lock, User, LogIn, ShieldAlert, Eye, EyeOff } from 'lucide-react'

export function Login({ onLoginSuccess }: { onLoginSuccess: (user: any) => void }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg('')

    const usernameValue = username.trim()
    const passwordValue = password

    if (!usernameValue || !passwordValue) {
      setErrorMsg('Username dan password wajib diisi.')
      setLoading(false)
      return
    }

    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', usernameValue)
        .eq('password', passwordValue)
        .limit(1)

      if (error) {
        const pesan = error.message || ''
        const barisKosong = error.code === 'PGRST116' || /JSON object requested/i.test(pesan)
        setErrorMsg(
          barisKosong
            ? 'Username atau password tidak sesuai. Jika akun baru ditambahkan, pastikan data user sudah tersimpan di database.'
            : /Invalid API key|JWT/i.test(pesan)
              ? 'Koneksi database gagal. Periksa konfigurasi Supabase.'
              : 'Tidak dapat memeriksa akun saat ini. Silakan coba lagi.',
        )
        return
      }

      const baris = Array.isArray(data) ? data[0] : null
      if (!baris || !String(baris.username || '').trim()) {
        setErrorMsg('Username atau password tidak sesuai. Pastikan akun sudah terdaftar dengan benar di database.')
        return
      }

      const { password: _sandi, ...tanpaSandi } = baris
      const userData = {
        ...tanpaSandi,
        target_id: baris.target_id || baris.id_user || baris.username,
        nama_lengkap: baris.nama_lengkap || baris.nama || baris.username,
        unit: baris.unit || 'Semua Unit',
        role: baris.role || 'Ustadz',
      }

      localStorage.setItem('user_session', JSON.stringify(userData))
      onLoginSuccess(userData)
    } catch {
      setErrorMsg('Terjadi kesalahan koneksi sistem.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-xl space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-lg">
            <Lock className="size-7" />
          </div>
          <h1 className="text-2xl font-black text-slate-900">Portal Guru</h1>
          <p className="text-xs text-slate-500">SD Islam Terpadu Al Madinah</p>
        </div>

        {errorMsg && (
          <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm font-semibold leading-relaxed text-red-700">
            <ShieldAlert className="mt-0.5 size-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-bold text-slate-700">Username</label>
            <div className="relative">
              <User className="absolute left-3.5 top-3 size-4 text-slate-400" />
              <input
                type="text"
                required
                autoComplete="username"
                placeholder="Masukkan username persis..."
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-xl border border-slate-300 p-2.5 pl-10 text-xs font-medium text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold text-slate-700">Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3 size-4 text-slate-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                placeholder="Masukkan password..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-300 p-2.5 pl-10 pr-10 text-xs font-medium text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                title={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                className="absolute right-3 top-2.5 rounded-md p-0.5 text-slate-400 transition hover:text-slate-700"
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-xs font-extrabold text-white shadow-md transition hover:bg-emerald-700 disabled:opacity-50"
          >
            {loading ? (
              'Memverifikasi Akun...'
            ) : (
              <>
                <LogIn className="size-4" /> Masuk ke Portal Guru
              </>
            )}
          </button>
        </form>

        <div className="text-center pt-2 border-t border-slate-100">
          <p className="text-[11px] text-slate-400">
            Portal Terintegrasi SD IT Al Madinah (Kartasura, Nogosari, Cepogo)
          </p>
        </div>
      </div>
    </div>
  )
}
