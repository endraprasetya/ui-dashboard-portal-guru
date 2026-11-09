'use client'

import { usePathname } from 'next/navigation'

type ItemNav = {
  id: string
  label: string
  href?: string
  view?: string
}

const DAFTAR_NAV: ItemNav[] = [
  { id: 'dashboard', label: 'Dashboard', href: '/', view: 'dashboard' },
  { id: 'tahfidz', label: "Tahfidzul Qur'an", href: '/?view=tahfidz_menu', view: 'tahfidz_menu' },
  { id: 'qiroah', label: "Qiroatul Qur'an", href: '/?view=qiroah_menu', view: 'qiroah_menu' },
  { id: 'jurnal', label: 'Jurnal Pembelajaran', href: '/?view=jurnal', view: 'jurnal' },
  { id: 'absensi', label: 'Absensi', href: '/?view=absensi_menu', view: 'absensi_menu' },
  { id: 'data_siswa', label: 'Data Siswa', href: '/data-siswa' },
  { id: 'tertib_point', label: 'Tertib Point', href: '/?view=tertib_point', view: 'tertib_point' },
  { id: 'pengumuman', label: 'Pengumuman', href: '/?view=pengumuman', view: 'pengumuman' },
  { id: 'rapor_kurmer', label: 'Rapor Kurmer', href: '/rapor-kurmer' },
]

function aktif(item: ItemNav, pathname: string, currentView?: string) {
  if (item.href === '/rapor-kurmer') {
    return pathname === '/rapor-kurmer' || pathname.startsWith('/rapor-kurmer/')
  }
  if (item.href === '/data-siswa') return pathname.startsWith('/data-siswa')
  if (item.view && pathname === '/') return currentView === item.view
  if (item.id === 'dashboard') return pathname === '/' && (!currentView || currentView === 'dashboard')
  return false
}

export function PortalGuruNav({
  currentView,
  className = '',
}: {
  currentView?: string
  className?: string
}) {
  const pathname = usePathname()

  return (
    <nav
      className={`mx-auto flex max-w-6xl gap-6 overflow-x-auto border-t border-slate-100 px-4 pt-2 text-xs font-semibold ${className}`}
      aria-label="Navigasi utama Portal Guru"
    >
      {DAFTAR_NAV.map((item) => {
        const highlight = aktif(item, pathname, currentView)
        const href = item.href || '/'
        return (
          <a
            key={item.id}
            href={href}
            className={`whitespace-nowrap pb-2.5 transition ${
              highlight ? 'border-b-2 border-emerald-600 font-extrabold text-emerald-700' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {item.label}
          </a>
        )
      })}
    </nav>
  )
}
