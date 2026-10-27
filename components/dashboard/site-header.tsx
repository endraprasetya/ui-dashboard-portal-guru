import { Bell, BookOpenText, ChevronDown } from 'lucide-react'
import { student } from '@/lib/dashboard-data'

const navItems = ['Beranda', 'Akademik', 'Keuangan', 'Pengumuman']

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b bg-card/85 backdrop-blur supports-[backdrop-filter]:bg-card/70">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <BookOpenText className="size-5" aria-hidden="true" />
          </span>
          <div className="leading-tight">
            <p className="text-sm font-bold text-foreground">Al-Hikmah</p>
            <p className="text-[11px] text-muted-foreground">Portal Wali Murid</p>
          </div>
        </div>

        <nav aria-label="Navigasi utama" className="hidden md:block">
          <ul className="flex items-center gap-1">
            {navItems.map((item, i) => (
              <li key={item}>
                <a
                  href="#"
                  aria-current={i === 0 ? 'page' : undefined}
                  className={
                    i === 0
                      ? 'rounded-lg bg-secondary px-3 py-2 text-sm font-medium text-primary'
                      : 'rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground'
                  }
                >
                  {item}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="relative flex size-9 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Bell className="size-5" aria-hidden="true" />
            <span className="absolute right-2 top-2 size-2 rounded-full bg-destructive ring-2 ring-card" />
            <span className="sr-only">Notifikasi (3 baru)</span>
          </button>
          <button
            type="button"
            className="flex items-center gap-2 rounded-xl py-1 pl-1 pr-2 transition-colors hover:bg-muted"
          >
            <span className="flex size-8 items-center justify-center rounded-full bg-gold text-xs font-bold text-gold-foreground">
              AF
            </span>
            <span className="hidden text-left leading-tight sm:block">
              <span className="block text-xs font-semibold text-foreground">{student.parentName}</span>
              <span className="block text-[11px] text-muted-foreground">Wali Santri</span>
            </span>
            <ChevronDown className="hidden size-4 text-muted-foreground sm:block" aria-hidden="true" />
            <span className="sr-only">Menu akun</span>
          </button>
        </div>
      </div>
    </header>
  )
}
