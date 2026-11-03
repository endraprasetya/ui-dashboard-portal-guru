"use client";
import { useMemo, useState } from "react";
import type { GuruUser } from "@/lib/guru-bantu/types";
import { isAdminRole } from "@/lib/guru-bantu/utils";
import AdminTab from "./AdminTab";
import IzinTab from "./IzinTab";
import PresensiTab from "./PresensiTab";
import RiwayatTab from "./RiwayatTab";

type TabKey = "presensi" | "riwayat" | "izin" | "admin";

export default function AbsensiGuruBantu({ user, isAdmin }: { user: GuruUser; isAdmin?: boolean }) {
  const admin = isAdmin ?? isAdminRole(user.role);
  const [tab, setTab] = useState<TabKey>("presensi");

  const tabs = useMemo(() => {
    const t: { key: TabKey; label: string }[] = [
      { key: "presensi", label: "Presensi" },
      { key: "riwayat", label: "Riwayat" },
      { key: "izin", label: "Izin" },
    ];
    if (admin) t.push({ key: "admin", label: "Admin" });
    return t;
  }, [admin]);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4">
      <header>
        <p className="text-sm text-slate-500">Assalamu&rsquo;alaikum,</p>
        <h1 className="text-xl font-semibold text-slate-900">{user.nama_lengkap}</h1>
        <p className="text-xs text-slate-500">{user.target_id} · {user.role}</p>
      </header>

      <nav className="flex gap-1 overflow-x-auto border-b border-slate-200" aria-label="Menu absensi guru bantu">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            aria-current={tab === t.key ? "page" : undefined}
            className={`-mb-px whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition ${
              tab === t.key
                ? "border-teal-700 text-teal-800"
                : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800"
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {tab === "presensi" && <PresensiTab user={user} />}
      {tab === "riwayat" && <RiwayatTab user={user} />}
      {tab === "izin" && <IzinTab user={user} />}
      {tab === "admin" && admin && <AdminTab />}
    </div>
  );
}
