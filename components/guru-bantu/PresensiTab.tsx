"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { absenMasuk, absenPulang, getAbsensiHariIni } from "@/lib/guru-bantu/api";
import { RADIUS_MAKS_METER } from "@/lib/guru-bantu/constants";
import type { Absensi, GuruUser, Posisi } from "@/lib/guru-bantu/types";
import { ambilPosisi, cekRadius, formatTanggalID, nowJakarta, potongJam } from "@/lib/guru-bantu/utils";
import CameraCapture from "./CameraCapture";
import { Alert, Card, Spinner, StatusBadge, btnAmber, btnPrimary } from "./ui";

const INTERVAL_LOKASI_MS = 120_000;
const BATAS_USIA_LOKASI_MS = 45_000;
const AKURASI_KURANG_BAIK_M = 75;
const RETRY_GAGAL_MS = 5_000;
const MAKS_RETRY_AWAL = 4;

export default function PresensiTab({ user }: { user: GuruUser }) {
  const [now, setNow] = useState(nowJakarta());
  const [posisi, setPosisi] = useState<Posisi | null>(null);
  const [lokAwal, setLokAwal] = useState(true);
  const [memperbaruiDiam, setMemperbaruiDiam] = useState(false);
  const [lokError, setLokError] = useState("");
  const [foto, setFoto] = useState<Blob | null>(null);
  const [cameraKey, setCameraKey] = useState(0);
  const [hariIni, setHariIni] = useState<Absensi | null>(null);
  const [busy, setBusy] = useState<"Masuk" | "Pulang" | null>(null);
  const [pesan, setPesan] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const waktuPosisi = useRef(0);
  const retryGagal = useRef(0);
  const posisiRef = useRef<Posisi | null>(null);
  posisiRef.current = posisi;

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

  /** Ambil GPS; mode diam = tanpa indikator utama (retry / interval / saat absen). */
  const muatLokasi = useCallback(async (diam = false): Promise<Posisi | null> => {
    if (diam) setMemperbaruiDiam(true);
    else setLokAwal(true);

    try {
      const p = await ambilPosisi();
      setPosisi(p);
      setLokError("");
      waktuPosisi.current = Date.now();
      retryGagal.current = 0;
      return p;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Gagal mengambil lokasi.";
      if (!diam || !posisiRef.current) setLokError(msg);
      return null;
    } finally {
      setLokAwal(false);
      setMemperbaruiDiam(false);
    }
  }, []);

  /* Auto GPS saat mount + retry diam + refresh berkala */
  useEffect(() => {
    let batal = false;
    let timeoutRetry: ReturnType<typeof setTimeout> | undefined;
    let timeoutAkurasi: ReturnType<typeof setTimeout> | undefined;

    const jadwalkanRetryGagal = () => {
      if (batal || retryGagal.current >= MAKS_RETRY_AWAL) return;
      retryGagal.current += 1;
      timeoutRetry = setTimeout(() => {
        if (!batal) void muatLokasi(true).then((p) => p && jadwalkanAkurasiBuruk(p));
      }, RETRY_GAGAL_MS);
    };

    const jadwalkanAkurasiBuruk = (p: Posisi) => {
      if (batal || p.akurasi <= AKURASI_KURANG_BAIK_M) return;
      timeoutAkurasi = setTimeout(() => {
        if (!batal) void muatLokasi(true);
      }, 6_000);
    };

    void muatLokasi(false).then((p) => {
      if (batal) return;
      if (!p) jadwalkanRetryGagal();
      else jadwalkanAkurasiBuruk(p);
    });

    const interval = setInterval(() => {
      if (batal || document.visibilityState !== "visible") return;
      void muatLokasi(true);
    }, INTERVAL_LOKASI_MS);

    return () => {
      batal = true;
      clearInterval(interval);
      clearTimeout(timeoutRetry);
      clearTimeout(timeoutAkurasi);
    };
  }, [muatLokasi]);

  const radius = posisi ? cekRadius(posisi.lat, posisi.lon) : null;
  const sudahMasuk = !!hariIni?.jam_masuk;
  const sudahPulang = !!hariIni?.jam_pulang;
  const tercatatIzin = !!hariIni && !hariIni.jam_masuk;
  const lokBelumSiap = !posisi && (lokAwal || lokError === "");
  const tombolAbsenNonaktif = !foto || !!busy || lokBelumSiap;

  async function kirim(tipe: "Masuk" | "Pulang") {
    if (!foto) {
      setPesan({ type: "error", text: "Ambil foto selfie terlebih dahulu." });
      return;
    }
    setBusy(tipe);
    setPesan(null);

    const usia = Date.now() - waktuPosisi.current;
    let pos: Posisi | null =
      posisi && usia <= BATAS_USIA_LOKASI_MS ? posisi : null;
    if (!pos) {
      pos = await muatLokasi(true);
    } else {
      const segar = await muatLokasi(true);
      if (segar) pos = segar;
    }

    if (!pos) {
      setPesan({
        type: "error",
        text: lokError || "Lokasi belum tersedia. Aktifkan GPS dan izin lokasi, lalu tunggu beberapa detik.",
      });
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

        <Card title="Lokasi" subtitle={`Absen hanya dalam ${RADIUS_MAKS_METER} m dari lokasi sekolah. GPS diperbarui otomatis.`}>
          <div className="space-y-3">
            {lokAwal && !posisi && (
              <p className="flex items-center gap-2 text-sm text-slate-600">
                <Spinner />
                Mendeteksi lokasi otomatis…
              </p>
            )}

            {posisi && radius && (
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
                    radius.dalamRadius ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                  }`}
                >
                  {radius.dalamRadius ? "Dalam radius sekolah" : "Di luar radius"}
                </span>
                {memperbaruiDiam && (
                  <span className="flex items-center gap-1.5 text-xs text-slate-500">
                    <Spinner className="h-3.5 w-3.5" />
                    Memperbarui…
                  </span>
                )}
              </div>
            )}

            {!lokAwal && !posisi && lokError && (
              <Alert type="error">{lokError}</Alert>
            )}

            {radius && posisi && (
              <div className="space-y-2 text-sm">
                <p className="text-slate-600">
                  Terdekat: <b>{radius.terdekat.nama}</b> · {radius.terdekat.jarak.toFixed(0)} m
                </p>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100" aria-hidden>
                  <div
                    className={`h-full rounded-full transition-all ${radius.dalamRadius ? "bg-emerald-500" : "bg-rose-500"}`}
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
          </div>
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
                disabled={tombolAbsenNonaktif || sudahMasuk}
                onClick={() => kirim("Masuk")}
              >
                {busy === "Masuk" ? <><Spinner /> Mengunggah…</> : sudahMasuk ? "Sudah masuk" : "Absen masuk"}
              </button>
              <button
                type="button"
                className={btnAmber}
                disabled={tombolAbsenNonaktif || !sudahMasuk || sudahPulang}
                onClick={() => kirim("Pulang")}
              >
                {busy === "Pulang" ? <><Spinner /> Mengunggah…</> : sudahPulang ? "Sudah pulang" : "Absen pulang"}
              </button>
            </div>
            <p className="text-xs text-slate-500">
              Ambil selfie, lalu tekan absen — lokasi sudah dicek otomatis di latar belakang.
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}
