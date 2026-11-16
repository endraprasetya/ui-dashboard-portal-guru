export function LencanaYatim({ className = '', label = 'Yatim - Gratis' }: { className?: string; label?: string }) {
  return (
    <span className={`inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800 ${className}`}>
      {label}
    </span>
  )
}
