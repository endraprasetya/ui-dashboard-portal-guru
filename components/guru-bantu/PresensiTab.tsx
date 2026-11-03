"use client";
import { useCallback, useEffect, useState } from "react";
import { absenMasuk, absenPulang, getAbsensiHariIni } from "@/lib/guru-bantu/api";
import { RADIUS_MAKS_METER } from "@/lib/guru-bantu/constants";
import type { Absensi, GuruUser, Posisi } from "@/lib/guru-bantu/types";
import { ambilPosisi, cekRadius, formatTanggalID, nowJakarta, potongJam } from "@/lib/guru-bantu/utils";
import CameraCapture from "./CameraCapture";
import { Alert, Card, Spinner, StatusBadge, btnAmber, btnOutline, btnPrimary } from "./ui";

export default function PresensiTab({ user }: { user: GuruUser }) {
  const [now, setNow] = useState(nowJakarta());
  const [posisi, setPosisi] = useState<Posisi | null>(null);
  const [lokLoading, setLokLoading] = useState(false);
  const [lokError, setLokError] = useState("");
  const [foto, setFoto] = useState<Blob | null>(null);
  const [cameraKey, setCameraKey] = useState(0);
  const [hariIni, setHariIni] = useState<Absensi | null>(null);
  const [busy, setBusy] = useState<"Masuk" | "Pulang" | null>(null);
  const [pesan, setPesan] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    const t = setInterval(() => setNow(nowJakarta()), 1000);
    return () => clearInterval(t);
  }, []);

  const muatHariIni = useCallback(async () => {
    try {
      setHariIni(await getAbsensiHariIni(user.target_id, nowJakarta().tanggal));
    } catch {
      /* diamkan; tombol tetap bisa dipakai */
    }
  }, [user.target_id]);

  useEffect(() => {
    muatHariIni();
  }, [muatHariIni]);

  const dapatkanLokasi = useCallback(async (): Promise<Posisi | null> => {
    setLokLoading(true);
    setLokError("");
    try {
      const p = await ambilPosisi();
      setPosisi(p);
      return p;
    } catch (e) {
      setLokError(e instanceof Error ? e.message : "Gagal mengambil lokasi.");
      return null;
    } finally {
      setLokLoading(false);
    }
  }, []);

  const radius = posisi ? cekRadius(posisi.lat, posisi.lon) : null;
  const sudahMasuk = !!hariIni?.jam_masuk;
  const sudahPulang = !!hariIni?.jam_pulang;
  const tercatatIzin = !!hariIni && !hariIni.jam_masuk;

  async function kirim(tipe: "Masuk" | "Pulang") {
    if (!foto) {
      setPesan({ type: "error", text: "Ambil foto selfie terlebih dahulu." });
      return;
    }
    setBusy(tipe);
    setPesan(null);
    const pos = await dapatkanLokasi(); // selalu ambil lokasi terbaru saat kirim
    if (!pos) {
      setBusy(null);
      return;
    }
    const res = tipe === "Masuk" ? await absenMasuk(user, pos, foto) : await absenPulang(user, pos, foto);
    setPesan({ type: res.ok ? "success" : "error", text: res.message });
    if (res.ok) {
      setFoto(null);
      setCameraKey((k) => k + 1);
      await muatHariIni();
    }
    setBusy(null);
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="space-y-4">
        <Card>
          <p className="text-sm text-slate-500">{formatTanggalID(now.tanggal)} · WIB</p>
          <p className="mt-1 text-4xl font-semibold tabular-nums tracking-tight text-slate-900">{now.jam}</p>

          <dl className="mt-4 grid grid-cols-3 gap-3 border-t border-slate-100 pt-4 text-sm">
            <div>
              <dt className="text-slate-500">Masuk</dt>
              <dd className="mt-0.5 font-medium tabular-nums">{potongJam(hariIni?.jam_masuk)}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Pulang</dt>
              <dd className="mt-0.5 font-medium tabular-nums">{potongJam(hariIni?.jam_pulang)}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Status</dt>
              <dd className="mt-0.5">{hariIni ? <StatusBadge status={hariIni.status} /> : <span className="text-slate-400">Belum absen</span>}</dd>
            </div>
          </dl>
        </Card>

        <Card title="Lokasi" subtitle={`Anda harus berada dalam ${RADIUS_MAKS_METER} meter dari lokasi sekolah.`}>
          <button type="button" className={`${btnOutline} w-full`} onClick={dapatkanLokasi} disabled={lokLoading || !!busy}>
            {lokLoading ? <><Spinner /> Mencari lokasi…</> : posisi ? "Perbarui lokasi" : "Dapatkan lokasi"}
          </button>

          {lokError && <div className="mt-3"><Alert type="error">{lokError}</Alert></div>}

          {radius && posisi && (
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-600">
                  Terdekat: <b>{radius.terdekat.nama}</b> · {radius.terdekat.jarak.toFixed(0)} m
                </span>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    radius.dalamRadius ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                  }`}
                >
                  {radius.dalamRadius ? "Dalam radius" : "Di luar radius"}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100" aria-hidden>
                <div
                  className={`h-full rounded-full ${radius.dalamRadius ? "bg-emerald-500" : "bg-rose-500"}`}
                  style={{ width: `${Math.min(100, (RADIUS_MAKS_METER / Math.max(radius.terdekat.jarak, 1)) * 100)}%` }}
                />
              </div>
              <ul className="text-xs text-slate-500">
                {radius.jarak.map((j) => (
                  <li key={j.nama}>
                    Lokasi {j.nama}: {j.jarak.toFixed(0)} m
                  </li>
                ))}
                <li>Akurasi GPS ±{posisi.akurasi.toFixed(0)} m</li>
              </ul>
            </div>
          )}
        </Card>
      </div>

      <Card title="Presensi selfie">
        {tercatatIzin ? (
          <Alert type="info">Hari ini Anda tercatat <b>{hariIni?.status}</b>. Tidak perlu absen.</Alert>
        ) : (
          <div className="space-y-4">
            <CameraCapture key={cameraKey} onChange={setFoto} disabled={!!busy} />

            {pesan && <Alert type={pesan.type}>{pesan.text}</Alert>}

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                className={btnPrimary}
                disabled={!foto || !!busy || sudahMasuk}
                onClick={() => kirim("Masuk")}
              >
                {busy === "Masuk" ? <><Spinner /> Mengirim…</> : sudahMasuk ? "Sudah masuk" : "Absen masuk"}
              </button>
              <button
                type="button"
                className={btnAmber}
                disabled={!foto || !!busy || !sudahMasuk || sudahPulang}
                onClick={() => kirim("Pulang")}
              >
                {busy === "Pulang" ? <><Spinner /> Mengirim…</> : sudahPulang ? "Sudah pulang" : "Absen pulang"}
              </button>
            </div>
            <p className="text-xs text-slate-500">
              Lokasi diambil otomatis saat Anda menekan tombol absen.
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}
