"use client";
import { useCallback, useEffect, useState } from "react";
import { getDaftarIzin, getMonitoring, putuskanIzin } from "@/lib/guru-bantu/api";
import type { BarisMonitor, PerizinanDenganNama, RekapHarian } from "@/lib/guru-bantu/types";
import { formatTanggalID, nowJakarta, potongJam } from "@/lib/guru-bantu/utils";
import { Alert, Card, Field, Spinner, StatCard, StatusBadge, btnOutline, inputCls } from "./ui";

export default function AdminTab() {
  const [sub, setSub] = useState<"monitor" | "izin">("monitor");
  return (
    <div className="space-y-4">
      <div className="inline-flex rounded-lg bg-slate-100 p-1 text-sm">
        {(
          [
            ["monitor", "Monitoring harian"],
            ["izin", "Verifikasi izin"],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => setSub(k)}
            className={`rounded-md px-3 py-1.5 font-medium transition ${
              sub === k ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      {sub === "monitor" ? <Monitoring /> : <VerifikasiIzin />}
    </div>
  );
}

/* ---------------- Monitoring ---------------- */
function Monitoring() {
  const [tanggal, setTanggal] = useState(nowJakarta().tanggal);
  const [baris, setBaris] = useState<BarisMonitor[]>([]);
  const [rekap, setRekap] = useState<RekapHarian>({ hadir: 0, izin: 0, belum: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const muat = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const r = await getMonitoring(tanggal);
      setBaris(r.baris);
      setRekap(r.rekap);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat data.");
    } finally {
      setLoading(false);
    }
  }, [tanggal]);

  useEffect(() => {
    muat();
  }, [muat]);

  return (
    <Card title="Monitoring presensi guru bantu">
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Tanggal">
          <input type="date" className={inputCls} value={tanggal} onChange={(e) => setTanggal(e.target.value)} />
        </Field>
        <button type="button" className={btnOutline} onClick={muat} disabled={loading}>
          {loading ? <Spinner /> : null} Muat ulang
        </button>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <StatCard label="Hadir" value={rekap.hadir} tone="emerald" />
        <StatCard label="Izin / sakit" value={rekap.izin} tone="amber" />
        <StatCard label="Belum absen" value={rekap.belum} tone="slate" />
      </div>

      {error && <div className="mt-3"><Alert type="error">{error}</Alert></div>}

      <div className="mt-4 max-h-[28rem] overflow-auto rounded-lg border border-slate-200">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="sticky top-0 bg-slate-50 text-left text-xs font-medium text-slate-600">
            <tr>
              <th className="px-3 py-2">Nama</th>
              <th className="px-3 py-2">Masuk</th>
              <th className="px-3 py-2">Pulang</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Foto</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {baris.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-slate-500">
                  {loading ? "Memuat…" : "Tidak ada data guru bantu."}
                </td>
              </tr>
            )}
            {baris.map((b) => (
              <tr key={b.id_induk} className="hover:bg-slate-50">
                <td className="px-3 py-2">
                  <p className="font-medium text-slate-900">{b.nama}</p>
                  <p className="text-xs text-slate-500">{b.id_induk}</p>
                </td>
                <td className="px-3 py-2 tabular-nums">{potongJam(b.jam_masuk)}</td>
                <td className="px-3 py-2 tabular-nums">{potongJam(b.jam_pulang)}</td>
                <td className="px-3 py-2"><StatusBadge status={b.status} /></td>
                <td className="whitespace-nowrap px-3 py-2 text-xs">
                  {b.foto_masuk ? <a href={b.foto_masuk} target="_blank" rel="noreferrer" className="text-teal-700 underline">Masuk</a> : null}
                  {b.foto_masuk && b.foto_pulang ? " · " : null}
                  {b.foto_pulang ? <a href={b.foto_pulang} target="_blank" rel="noreferrer" className="text-teal-700 underline">Pulang</a> : null}
                  {!b.foto_masuk && !b.foto_pulang ? <span className="text-slate-400">-</span> : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

/* ---------------- Verifikasi izin ---------------- */
function VerifikasiIzin() {
  const [filter, setFilter] = useState<"Pending" | "Semua">("Pending");
  const [list, setList] = useState<PerizinanDenganNama[]>([]);
  const [loading, setLoading] = useState(false);
  const [prosesId, setProsesId] = useState<string | null>(null);
  const [pesan, setPesan] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const muat = useCallback(async () => {
    setLoading(true);
    try {
      setList(await getDaftarIzin(filter));
    } catch (e) {
      setPesan({ type: "error", text: e instanceof Error ? e.message : "Gagal memuat pengajuan." });
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    muat();
  }, [muat]);

  async function putuskan(i: PerizinanDenganNama, k: "Disetujui" | "Ditolak") {
    const aksi = k === "Disetujui" ? "menyetujui" : "menolak";
    if (!window.confirm(`Yakin ${aksi} izin ${i.nama_lengkap} (${formatTanggalID(i.tgl_mulai)} s/d ${formatTanggalID(i.tgl_selesai)})?`)) return;
    setProsesId(i.id_izin);
    setPesan(null);
    const res = await putuskanIzin(i, k);
    setPesan({ type: res.ok ? "success" : "error", text: res.message });
    setProsesId(null);
    muat();
  }

  return (
    <Card title="Verifikasi izin guru bantu">
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Tampilkan">
          <select className={inputCls} value={filter} onChange={(e) => setFilter(e.target.value as "Pending" | "Semua")}>
            <option value="Pending">Menunggu persetujuan</option>
            <option value="Semua">Semua (100 terakhir)</option>
          </select>
        </Field>
        {loading && <Spinner className="mb-2 h-5 w-5 text-slate-400" />}
      </div>

      {pesan && <div className="mt-3"><Alert type={pesan.type}>{pesan.text}</Alert></div>}

      <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-medium text-slate-600">
            <tr>
              <th className="px-3 py-2">Guru</th>
              <th className="px-3 py-2">Izin</th>
              <th className="px-3 py-2">Periode</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {list.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-slate-500">
                  {loading ? "Memuat…" : filter === "Pending" ? "Tidak ada pengajuan yang menunggu." : "Belum ada pengajuan."}
                </td>
              </tr>
            )}
            {list.map((i) => (
              <tr key={i.id_izin} className="align-top hover:bg-slate-50">
                <td className="px-3 py-2">
                  <p className="font-medium text-slate-900">{i.nama_lengkap}</p>
                  <p className="text-xs text-slate-500">Diajukan {formatTanggalID(i.tgl_pengajuan)}</p>
                </td>
                <td className="max-w-[16rem] px-3 py-2">
                  <p className="font-medium">{i.jenis_izin}</p>
                  {i.detail_izin && <p className="text-xs text-slate-500">{i.detail_izin}</p>}
                  {i.keterangan && <p className="mt-1 text-xs text-slate-600">{i.keterangan}</p>}
                  {i.link_dokumen && (
                    <a href={i.link_dokumen} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs text-teal-700 underline">
                      Lihat lampiran
                    </a>
                  )}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-xs">
                  {formatTanggalID(i.tgl_mulai)}
                  <br />s/d {formatTanggalID(i.tgl_selesai)}
                </td>
                <td className="px-3 py-2"><StatusBadge status={i.status} /></td>
                <td className="px-3 py-2 text-right">
                  {i.status === "Pending" ? (
                    <div className="flex justify-end gap-1.5">
                      <button
                        type="button"
                        disabled={prosesId === i.id_izin}
                        onClick={() => putuskan(i, "Disetujui")}
                        className="rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                      >
                        Setujui
                      </button>
                      <button
                        type="button"
                        disabled={prosesId === i.id_izin}
                        onClick={() => putuskan(i, "Ditolak")}
                        className="rounded-md bg-rose-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-rose-700 disabled:opacity-50"
                      >
                        Tolak
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400">Selesai</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
