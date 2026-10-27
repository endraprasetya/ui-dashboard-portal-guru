import { CalendarCheck } from 'lucide-react'
import { attendance } from '@/lib/dashboard-data'
import { DashboardCard } from './dashboard-card'

const segments = [
  { key: 'present', label: 'Hadir', color: 'var(--chart-1)' },
  { key: 'sick', label: 'Sakit', color: 'var(--chart-2)' },
  { key: 'permission', label: 'Izin', color: 'var(--chart-4)' },
  { key: 'absent', label: 'Alpa', color: 'var(--chart-3)' },
] as const

const RADIUS = 52
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

export function AttendanceCard() {
  const percentage = Math.round((attendance.present / attendance.totalDays) * 100)

  let offset = 0
  const arcs = segments.map((segment) => {
    const value = attendance[segment.key]
    const length = (value / attendance.totalDays) * CIRCUMFERENCE
    const arc = { ...segment, value, length, offset }
    offset += length
    return arc
  })

  return (
    <DashboardCard title="Presensi" subtitle={attendance.month} icon={CalendarCheck}>
      <div className="flex flex-1 flex-col items-center gap-5 sm:flex-row lg:flex-col xl:flex-row">
        <div className="relative size-36 shrink-0">
          <svg
            viewBox="0 0 128 128"
            className="size-full -rotate-90"
            role="img"
            aria-label={`Kehadiran ${percentage} persen`}
          >
            <circle cx="64" cy="64" r={RADIUS} fill="none" stroke="var(--muted)" strokeWidth="14" />
            {arcs
              .filter((arc) => arc.value > 0)
              .map((arc) => (
                <circle
                  key={arc.key}
                  cx="64"
                  cy="64"
                  r={RADIUS}
                  fill="none"
                  stroke={arc.color}
                  strokeWidth="14"
                  strokeDasharray={`${arc.length} ${CIRCUMFERENCE - arc.length}`}
                  strokeDashoffset={-arc.offset}
                />
              ))}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold text-foreground">{percentage}%</span>
            <span className="text-xs text-muted-foreground">Kehadiran</span>
          </div>
        </div>

        <ul className="grid w-full grid-cols-2 gap-2">
          {arcs.map((arc) => (
            <li key={arc.key} className="flex items-center justify-between rounded-lg bg-muted px-3 py-2">
              <span className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="size-2.5 rounded-full" style={{ backgroundColor: arc.color }} aria-hidden="true" />
                {arc.label}
              </span>
              <span className="text-sm font-semibold text-foreground">{arc.value}</span>
            </li>
          ))}
        </ul>
      </div>
      <p className="mt-4 text-xs text-muted-foreground">
        {attendance.present} dari {attendance.totalDays} hari efektif bulan ini.
      </p>
    </DashboardCard>
  )
}
