import { FOTO_PRESENSI_MAKS_BYTES, LOKASI_SEKOLAH, RADIUS_MAKS_METER, STATUS_HADIR } from "./constants";
import type { GuruUser, Posisi } from "./types";

/* ---------- Waktu (selalu WIB / Asia/Jakarta) ---------- */
export function nowJakarta() {
  const d = new Date();
  const tanggal = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(d); // YYYY-MM-DD
  const jam = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).format(d); // HH:mm:ss
  return { tanggal, jam, hhmm: jam.slice(0, 5) };
}

export function dalamJendela(hhmm: string, j: { mulai: string; selesai: string }) {
  return hhmm >= j.mulai && hhmm <= j.selesai;
}

export function formatTanggalID(iso: string | null | undefined) {
  if (!iso) return "-";
  const [y, m, d] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(y, m - 1, d))
  );
}

export const potongJam = (j: string | null | undefined) => (j ? j.slice(0, 8) : "-");

/** Daftar tanggal YYYY-MM-DD dari start s/d end (inklusif), maks 366 hari */
export function eachDate(start: string, end: string): string[] {
  const [sy, sm, sd] = start.split("-").map(Number);
  const [ey, em, ed] = end.split("-").map(Number);
  const cur = new Date(Date.UTC(sy, sm - 1, sd));
  const last = new Date(Date.UTC(ey, em - 1, ed));
  const out: string[] = [];
  while (cur <= last && out.length < 366) {
    out.push(cur.toISOString().slice(0, 10));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return out;
}

/* ---------- Lokasi ---------- */
export function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000;
  const rad = (x: number) => (x * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLon = rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function cekRadius(lat: number, lon: number) {
  const jarak = LOKASI_SEKOLAH.map((l) => ({ nama: l.nama, jarak: haversine(lat, lon, l.lat, l.lon) }));
  const terdekat = jarak.reduce((a, b) => (a.jarak <= b.jarak ? a : b));
  return { jarak, terdekat, dalamRadius: terdekat.jarak <= RADIUS_MAKS_METER };
}

export function ambilPosisi(): Promise<Posisi> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error("Browser tidak mendukung GPS."));
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lon: p.coords.longitude, akurasi: p.coords.accuracy }),
      (e) =>
        reject(
          new Error(
            e.code === e.PERMISSION_DENIED
              ? "Izin lokasi ditolak. Aktifkan izin lokasi di pengaturan browser."
              : "Gagal mengambil lokasi. Pastikan GPS aktif."
          )
        ),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  });
}

/* ---------- Gambar (kompresi client-side untuk selfie presensi) ---------- */

const LEBAR_FOTO_AWAL = 1280;
const LEBAR_FOTO_MIN = 720;
const KUALITAS_AWAL = 0.8;
const KUALITAS_MIN = 0.65;
const LANGKAH_KUALITAS = 0.05;

let webpDidukung: boolean | null = null;

function dukungWebp(): Promise<boolean> {
  if (webpDidukung !== null) return Promise.resolve(webpDidukung);
  if (typeof document === "undefined") return Promise.resolve(false);
  return new Promise((resolve) => {
    const c = document.createElement("canvas");
    c.width = 2;
    c.height = 2;
    c.toBlob(
      (b) => {
        webpDidukung = b?.type === "image/webp";
        resolve(webpDidukung);
      },
      "image/webp",
      KUALITAS_AWAL
    );
  });
}

function muatGambarKeCanvas(file: Blob, lebarMaks: number): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width > lebarMaks) {
        height = Math.round(height * (lebarMaks / width));
        width = lebarMaks;
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error("Gagal memproses foto."));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);
      resolve(canvas);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("File gambar tidak valid."));
    };
    img.src = url;
  });
}

function canvasKeBlob(canvas: HTMLCanvasElement, mime: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b), mime, quality);
  });
}

async function terkecilDiBawahBatas(canvas: HTMLCanvasElement, mime: string, batas: number): Promise<Blob> {
  let terbaik: Blob | null = null;
  for (let q = KUALITAS_AWAL; q >= KUALITAS_MIN - 0.001; q -= LANGKAH_KUALITAS) {
    const b = await canvasKeBlob(canvas, mime, q);
    if (!b) continue;
    if (!terbaik || b.size < terbaik.size) terbaik = b;
    if (b.size <= batas) return b;
  }
  if (terbaik) return terbaik;
  throw new Error("Gagal memproses foto.");
}

/**
 * Kompres foto selfie agar < 200 KB (WebP jika didukung, fallback JPEG, quality ~0.7–0.8).
 * Aman dipanggil ulang: file yang sudah memenuhi batas dikembalikan apa adanya.
 */
export async function kompresGambar(
  file: Blob,
  batasBytes: number = FOTO_PRESENSI_MAKS_BYTES
): Promise<Blob> {
  if (typeof document === "undefined") {
    throw new Error("Kompresi foto hanya bisa di browser.");
  }
  if (
    file.size <= batasBytes &&
    (file.type === "image/webp" || file.type === "image/jpeg")
  ) {
    return file;
  }

  const pakaiWebp = await dukungWebp();
  const urutanMime: ("image/webp" | "image/jpeg")[] = pakaiWebp
    ? ["image/webp", "image/jpeg"]
    : ["image/jpeg", "image/webp"];

  let terkecil: Blob | null = null;
  const catat = (b: Blob) => {
    if (!terkecil || b.size < terkecil.size) terkecil = b;
  };

  for (let lebar = LEBAR_FOTO_AWAL; lebar >= LEBAR_FOTO_MIN; lebar -= 160) {
    const canvas = await muatGambarKeCanvas(file, lebar);
    for (const mime of urutanMime) {
      const hasil = await terkecilDiBawahBatas(canvas, mime, batasBytes);
      catat(hasil);
      if (hasil.size <= batasBytes) return hasil;
    }
  }

  if (terkecil) return terkecil;
  throw new Error("Gagal memproses foto.");
}

/* ---------- Status ---------- */
export const isHadir = (status: string) => STATUS_HADIR.includes(status);
/** Selain Hadir/Terlambat/Alpa dianggap izin (Izin Pribadi, Sakit, Kesehatan, Cuti, dst.) */
export const isIzin = (status: string) => !isHadir(status) && status.toLowerCase() !== "alpa";
export const isAdminRole = (role: string) => /admin/i.test(role);
export const isGuruBantuRole = (role: string) => /guru\s*bantu/i.test(role);

/** Normalisasi baris `users` / sesi login Portal Guru ke bentuk GuruUser. */
export function userDariSesi(sesi: unknown): GuruUser | null {
  if (!sesi || typeof sesi !== "object") return null;
  const baris = sesi as Record<string, unknown>;
  const target_id = String(baris.target_id || baris.id_user || baris.username || "").trim();
  if (!target_id) return null;
  return {
    target_id,
    nama_lengkap: String(baris.nama_lengkap || baris.nama || baris.username || target_id).trim(),
    role: String(baris.role || "").trim(),
  };
}
