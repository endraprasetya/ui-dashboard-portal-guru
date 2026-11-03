import type { ReactNode } from "react";

export const inputCls =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/25 disabled:bg-slate-100 disabled:text-slate-400";

export const btnPrimary =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 disabled:cursor-not-allowed disabled:opacity-50";

export const btnAmber =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600 disabled:cursor-not-allowed disabled:opacity-50";

export const btnOutline =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400 disabled:cursor-not-allowed disabled:opacity-50";

export function Card({
  title,
  subtitle,
  children,
  className = "",
}: {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 ${className}`}>
      {title && (
        <header className="mb-4">
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
        </header>
      )}
      {children}
    </section>
  );
}

const warna: Record<string, string> = {
  Hadir: "bg-emerald-100 text-emerald-800 ring-emerald-600/20",
  Disetujui: "bg-emerald-100 text-emerald-800 ring-emerald-600/20",
  Terlambat: "bg-amber-100 text-amber-800 ring-amber-600/20",
  Pending: "bg-amber-100 text-amber-800 ring-amber-600/20",
  Ditolak: "bg-rose-100 text-rose-800 ring-rose-600/20",
  Alpa: "bg-rose-100 text-rose-800 ring-rose-600/20",
  "Belum absen": "bg-slate-100 text-slate-600 ring-slate-500/20",
};

export function StatusBadge({ status }: { status: string }) {
  const cls = warna[status] ?? (status.includes("Pending") ? warna.Pending : "bg-sky-100 text-sky-800 ring-sky-600/20");
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${cls}`}>
      {status}
    </span>
  );
}

export function Alert({ type, children }: { type: "success" | "error" | "info"; children: ReactNode }) {
  const cls = {
    success: "border-emerald-200 bg-emerald-50 text-emerald-900",
    error: "border-rose-200 bg-rose-50 text-rose-900",
    info: "border-sky-200 bg-sky-50 text-sky-900",
  }[type];
  return (
    <div role={type === "error" ? "alert" : "status"} className={`rounded-lg border px-3 py-2.5 text-sm ${cls}`}>
      {children}
    </div>
  );
}

export function Spinner({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
      <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="4" strokeLinecap="round" className="opacity-90" />
    </svg>
  );
}

export function StatCard({ label, value, tone }: { label: string; value: number; tone: "emerald" | "amber" | "slate" }) {
  const t = { emerald: "text-emerald-700", amber: "text-amber-700", slate: "text-slate-700" }[tone];
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-center">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`mt-1 text-3xl font-semibold tabular-nums ${t}`}>{value}</p>
    </div>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    </label>
  );
}
