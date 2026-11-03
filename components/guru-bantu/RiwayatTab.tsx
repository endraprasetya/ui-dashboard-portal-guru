"use client";
import { useCallback, useEffect, useState } from "react";
import { getRiwayat } from "@/lib/guru-bantu/api";
import type { Absensi, GuruUser } from "@/lib/guru-bantu/types";
import { formatTanggalID, nowJakarta, potongJam } from "@/lib/guru-bantu/utils";
import { Alert, Card, Field, Spinner, StatusBadge, btnPrimary, inputCls } from "./ui";

export default function RiwayatTab({ user }: { user: GuruUser }) {
  const hariIni = nowJakarta().tanggal;
  const [mulai, setMulai] = useState(hariIni.slice(0, 8) + "01");
  const [selesai, setSelesai] = useState(hariIni);
  const [data, setData] = useState<Absensi[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const muat = useCallback(async () => {
    if (!mulai || !selesai) return setError("Tentukan rentang tanggal terlebih dahulu.");
    if (selesai < mulai) return setError("Tanggal akhir tidak boleh sebelum tanggal awal.");
    setLoading(true);
    setError("");
    try {
      setData(await getRiwayat(user.target_id, mulai, selesai));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat riwayat.");
    } finally {
      setLoading(false);
    }
  }, [user.target_id, mulai, selesai]);

  useEffect(() => {
    muat();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Card title="Riwayat presensi saya">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <Field label="Dari">
          <input type="date" className={inputCls} value={mulai} onChange={(e) => setMulai(e.target.value)} />
        </Field>
        <Field label="Sampai">
          <input type="date" className={inputCls} value={selesai} onChange={(e) => setSelesai(e.target.value)} />
        </Field>
        <button type="button" className={`${btnPrimary} col-span-2 sm:col-span-1`} onClick={muat} disabled={loading}>
          {loading ? <Spinner /> : null} Tampilkan
        </button>
      </div>

      {error && <div className="mt-3"><Alert type="error">{error}</Alert></div>}

      <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-medium text-slate-600">
            <tr>
              <th className="px-3 py-2">Tanggal</th>
              <th className="px-3 py-2">Masuk</th>
              <th className="px-3 py-2">Pulang</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Foto</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-slate-500">
                  {loading ? "Memuat…" : "Tidak ada riwayat pada rentang tanggal ini."}
                </td>
              </tr>
            )}
            {data.map((r) => (
              <tr key={r.id_absen} className="hover:bg-slate-50">
                <td className="whitespace-nowrap px-3 py-2">{formatTanggalID(r.tanggal)}</td>
                <td className="px-3 py-2 tabular-nums">{potongJam(r.jam_masuk)}</td>
                <td className="px-3 py-2 tabular-nums">{potongJam(r.jam_pulang)}</td>
                <td className="px-3 py-2"><StatusBadge status={r.status} /></td>
                <td className="whitespace-nowrap px-3 py-2 text-xs">
                  {r.foto_masuk ? <a href={r.foto_masuk} target="_blank" rel="noreferrer" className="text-teal-700 underline">Masuk</a> : null}
                  {r.foto_masuk && r.foto_pulang ? " · " : null}
                  {r.foto_pulang ? <a href={r.foto_pulang} target="_blank" rel="noreferrer" className="text-teal-700 underline">Pulang</a> : null}
                  {!r.foto_masuk && !r.foto_pulang ? <span className="text-slate-400">-</span> : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
