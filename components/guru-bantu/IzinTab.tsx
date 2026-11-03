"use client";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { ajukanIzin, getIzinSaya } from "@/lib/guru-bantu/api";
import { DAFTAR_IZIN } from "@/lib/guru-bantu/constants";
import type { GuruUser, Perizinan } from "@/lib/guru-bantu/types";
import { formatTanggalID, nowJakarta } from "@/lib/guru-bantu/utils";
import { Alert, Card, Field, Spinner, StatusBadge, btnAmber, inputCls } from "./ui";

export default function IzinTab({ user }: { user: GuruUser }) {
  const hariIni = nowJakarta().tanggal;
  const [kategori, setKategori] = useState("");
  const [detail, setDetail] = useState("");
  const [mulai, setMulai] = useState(hariIni);
  const [selesai, setSelesai] = useState(hariIni);
  const [ket, setKet] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fileKey, setFileKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [pesan, setPesan] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [riwayat, setRiwayat] = useState<Perizinan[]>([]);

  const muat = useCallback(async () => {
    try {
      setRiwayat(await getIzinSaya(user.target_id));
    } catch {
      /* abaikan */
    }
  }, [user.target_id]);

  useEffect(() => {
    muat();
  }, [muat]);

  async function kirim(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setPesan(null);
    const res = await ajukanIzin(user, {
      jenis_izin: kategori,
      detail_izin: detail,
      tgl_mulai: mulai,
      tgl_selesai: selesai,
      keterangan: ket,
      lampiran: file,
    });
    setPesan({ type: res.ok ? "success" : "error", text: res.message });
    if (res.ok) {
      setKategori("");
      setDetail("");
      setKet("");
      setFile(null);
      setFileKey((k) => k + 1);
      await muat();
    }
    setBusy(false);
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card title="Pengajuan izin">
        <form onSubmit={kirim} className="space-y-4">
          <Field label="Kategori izin">
            <select
              className={inputCls}
              value={kategori}
              onChange={(e) => {
                setKategori(e.target.value);
                setDetail("");
              }}
              required
            >
              <option value="">Pilih kategori</option>
              {Object.keys(DAFTAR_IZIN).map((k) => (
                <option key={k} value={k}>{k}</option>
              ))}
            </select>
          </Field>

          <Field label="Detail izin">
            <select className={inputCls} value={detail} onChange={(e) => setDetail(e.target.value)} disabled={!kategori} required>
              <option value="">Pilih detail izin</option>
              {(DAFTAR_IZIN[kategori] ?? []).map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Tanggal mulai">
              <input type="date" className={inputCls} value={mulai} onChange={(e) => setMulai(e.target.value)} required />
            </Field>
            <Field label="Tanggal selesai">
              <input type="date" className={inputCls} value={selesai} min={mulai} onChange={(e) => setSelesai(e.target.value)} required />
            </Field>
          </div>

          <Field label="Keterangan / alasan">
            <textarea className={inputCls} rows={3} value={ket} onChange={(e) => setKet(e.target.value)} placeholder="Jelaskan alasan izin Anda" required />
          </Field>

          <Field label="Lampiran (opsional)" hint="Foto surat dokter atau bukti pendukung lainnya.">
            <input
              key={fileKey}
              type="file"
              accept="image/*"
              className={`${inputCls} file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1 file:text-sm`}
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </Field>

          {pesan && <Alert type={pesan.type}>{pesan.text}</Alert>}

          <button type="submit" className={`${btnAmber} w-full`} disabled={busy}>
            {busy ? <><Spinner /> Mengirim…</> : "Kirim pengajuan"}
          </button>
        </form>
      </Card>

      <Card title="Pengajuan saya" subtitle="30 pengajuan terakhir">
        {riwayat.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">Belum ada pengajuan izin.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {riwayat.map((i) => (
              <li key={i.id_izin} className="flex items-start justify-between gap-3 py-3">
                <div className="min-w-0 text-sm">
                  <p className="font-medium text-slate-900">
                    {i.jenis_izin}
                    {i.detail_izin ? <span className="font-normal text-slate-500"> — {i.detail_izin}</span> : null}
                  </p>
                  <p className="text-xs text-slate-500">
                    {formatTanggalID(i.tgl_mulai)} s/d {formatTanggalID(i.tgl_selesai)}
                  </p>
                  {i.keterangan && <p className="mt-1 truncate text-xs text-slate-600">{i.keterangan}</p>}
                </div>
                <StatusBadge status={i.status} />
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
