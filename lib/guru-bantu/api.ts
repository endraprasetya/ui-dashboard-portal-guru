import { supabase } from "@/lib/supabase";

import {
  BATAS_TERLAMBAT,
  BUCKET_ABSENSI,
  BUCKET_IZIN,
  JENDELA_MASUK,
  JENDELA_PULANG,
  RADIUS_MAKS_METER,
  TABEL_ABSENSI,
  TABEL_IZIN,
  TABEL_USERS,
} from "./constants";
import type {
  Absensi,
  BarisMonitor,
  GuruUser,
  Perizinan,
  PerizinanDenganNama,
  Posisi,
  RekapHarian,
  Result,
} from "./types";
import { cekRadius, dalamJendela, eachDate, isHadir, isIzin, kompresGambar, nowJakarta } from "./utils";

const gagal = (message: string): Result => ({ ok: false, message });
const sukses = (message: string): Result => ({ ok: true, message });
const pesanError = (e: unknown) => (e instanceof Error ? e.message : (e as { message?: string })?.message ?? String(e));

/* ================= Storage ================= */
async function uploadFoto(bucket: string, idInduk: string, prefix: string, blob: Blob) {
  const path = `${idInduk}/${prefix}_${Date.now()}.jpg`;
  const { error } = await supabase.storage.from(bucket).upload(path, blob, {
    contentType: "image/jpeg",
    upsert: false,
  });
  if (error) throw error;
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

/* ================= Presensi ================= */
export async function getAbsensiHariIni(idInduk: string, tanggal: string): Promise<Absensi | null> {
  const { data, error } = await supabase
    .from(TABEL_ABSENSI)
    .select("*")
    .eq("id_induk", idInduk)
    .eq("tanggal", tanggal)
    .maybeSingle();
  if (error) throw error;
  return data as Absensi | null;
}

export async function absenMasuk(user: GuruUser, posisi: Posisi, foto: Blob): Promise<Result> {
  try {
    const now = nowJakarta();
    if (!dalamJendela(now.hhmm, JENDELA_MASUK))
      return gagal(`Absen MASUK hanya bisa dilakukan pukul ${JENDELA_MASUK.mulai} - ${JENDELA_MASUK.selesai} WIB.`);

    const radius = cekRadius(posisi.lat, posisi.lon);
    if (!radius.dalamRadius)
      return gagal(
        `Gagal: Lokasi terlalu jauh (${radius.terdekat.jarak.toFixed(0)}m). Batas aman ${RADIUS_MAKS_METER}m.`
      );

    const ada = await getAbsensiHariIni(user.target_id, now.tanggal);
    if (ada) {
      return gagal(
        ada.jam_masuk ? "Anda sudah absen masuk hari ini." : `Hari ini Anda tercatat "${ada.status}", tidak perlu absen.`
      );
    }

    const kecil = await kompresGambar(foto);
    const urlFoto = await uploadFoto(BUCKET_ABSENSI, user.target_id, "masuk", kecil);
    const status = now.jam > BATAS_TERLAMBAT ? "Terlambat" : "Hadir";

    const { error } = await supabase.from(TABEL_ABSENSI).insert({
      id_absen: crypto.randomUUID(),
      id_induk: user.target_id,
      tanggal: now.tanggal,
      jam_masuk: now.jam,
      foto_masuk: urlFoto,
      latlong_masuk: `${posisi.lat},${posisi.lon}`,
      status,
    });
    if (error) throw error;
    return sukses(
      status === "Terlambat" ? "Absen MASUK tercatat (Terlambat)." : "Alhamdulillah, absen MASUK berhasil!"
    );
  } catch (e) {
    return gagal("Gagal sistem: " + pesanError(e));
  }
}

export async function absenPulang(user: GuruUser, posisi: Posisi, foto: Blob): Promise<Result> {
  try {
    const now = nowJakarta();
    if (!dalamJendela(now.hhmm, JENDELA_PULANG))
      return gagal(`Absen PULANG hanya bisa dilakukan pukul ${JENDELA_PULANG.mulai} - ${JENDELA_PULANG.selesai} WIB.`);

    const radius = cekRadius(posisi.lat, posisi.lon);
    if (!radius.dalamRadius)
      return gagal(
        `Gagal: Lokasi terlalu jauh (${radius.terdekat.jarak.toFixed(0)}m). Batas aman ${RADIUS_MAKS_METER}m.`
      );

    const ada = await getAbsensiHariIni(user.target_id, now.tanggal);
    if (!ada || !ada.jam_masuk) return gagal("Gagal: Data absen MASUK tidak ditemukan hari ini.");
    if (ada.jam_pulang) return gagal("Anda sudah absen pulang hari ini.");

    const kecil = await kompresGambar(foto);
    const urlFoto = await uploadFoto(BUCKET_ABSENSI, user.target_id, "pulang", kecil);

    const { error } = await supabase
      .from(TABEL_ABSENSI)
      .update({ jam_pulang: now.jam, foto_pulang: urlFoto, latlong_pulang: `${posisi.lat},${posisi.lon}` })
      .eq("id_absen", ada.id_absen);
    if (error) throw error;
    return sukses("Alhamdulillah, absen PULANG berhasil! Hati-hati di jalan.");
  } catch (e) {
    return gagal("Gagal sistem: " + pesanError(e));
  }
}

export async function getRiwayat(idInduk: string, mulai: string, selesai: string): Promise<Absensi[]> {
  const { data, error } = await supabase
    .from(TABEL_ABSENSI)
    .select("*")
    .eq("id_induk", idInduk)
    .gte("tanggal", mulai)
    .lte("tanggal", selesai)
    .order("tanggal", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Absensi[];
}

/* ================= Perizinan (guru) ================= */
export type FormIzin = {
  jenis_izin: string;
  detail_izin: string;
  tgl_mulai: string;
  tgl_selesai: string;
  keterangan: string;
  lampiran?: Blob | null;
};

export async function ajukanIzin(user: GuruUser, f: FormIzin): Promise<Result> {
  try {
    if (!f.jenis_izin || !f.detail_izin) return gagal("Pilih kategori dan detail izin.");
    if (!f.tgl_mulai || !f.tgl_selesai || !f.keterangan.trim()) return gagal("Harap lengkapi semua kolom wajib.");
    if (f.tgl_selesai < f.tgl_mulai) return gagal("Tanggal selesai tidak boleh sebelum tanggal mulai.");

    let link: string | null = null;
    if (f.lampiran) {
      const kecil = await kompresGambar(f.lampiran);
      link = await uploadFoto(BUCKET_IZIN, user.target_id, "izin", kecil);
    }

    const { error } = await supabase.from(TABEL_IZIN).insert({
      id_izin: crypto.randomUUID(),
      id_induk: user.target_id,
      tgl_pengajuan: nowJakarta().tanggal,
      jenis_izin: f.jenis_izin,
      detail_izin: f.detail_izin,
      tgl_mulai: f.tgl_mulai,
      tgl_selesai: f.tgl_selesai,
      keterangan: f.keterangan.trim(),
      link_dokumen: link,
      status: "Pending",
    });
    if (error) throw error;
    return sukses("Pengajuan izin berhasil dikirim dan menunggu persetujuan admin.");
  } catch (e) {
    return gagal("Gagal mengirim izin: " + pesanError(e));
  }
}

export async function getIzinSaya(idInduk: string): Promise<Perizinan[]> {
  const { data, error } = await supabase
    .from(TABEL_IZIN)
    .select("*")
    .eq("id_induk", idInduk)
    .order("tgl_pengajuan", { ascending: false })
    .limit(30);
  if (error) throw error;
  return (data ?? []) as Perizinan[];
}

/* ================= Admin ================= */
async function getDaftarGuruBantu(): Promise<{ target_id: string; nama_lengkap: string }[]> {
  const { data, error } = await supabase
    .from(TABEL_USERS)
    .select("target_id, nama_lengkap, role")
    .or("role.ilike.%guru bantu%,role.ilike.%guru_bantu%,role.ilike.%gurubantu%")
    .order("nama_lengkap");
  if (error) throw error;
  return (data ?? []).map((row) => ({
    target_id: String(row.target_id || "").trim(),
    nama_lengkap: String(row.nama_lengkap || row.target_id || "").trim(),
  })).filter((row) => row.target_id);
}

export async function getMonitoring(tanggal: string): Promise<{ baris: BarisMonitor[]; rekap: RekapHarian }> {
  const [guru, absRes, izinRes] = await Promise.all([
    getDaftarGuruBantu(),
    supabase.from(TABEL_ABSENSI).select("*").eq("tanggal", tanggal),
    supabase
      .from(TABEL_IZIN)
      .select("id_induk, jenis_izin")
      .eq("status", "Pending")
      .lte("tgl_mulai", tanggal)
      .gte("tgl_selesai", tanggal),
  ]);
  if (absRes.error) throw absRes.error;
  if (izinRes.error) throw izinRes.error;

  const absMap = new Map((absRes.data as Absensi[]).map((a) => [a.id_induk, a]));
  const izinPending = new Map((izinRes.data ?? []).map((i) => [i.id_induk as string, i.jenis_izin as string]));
  const rekap: RekapHarian = { hadir: 0, izin: 0, belum: 0 };

  const baris: BarisMonitor[] = guru.map((g) => {
    const a = absMap.get(g.target_id);
    if (a) {
      if (isHadir(a.status)) rekap.hadir++;
      else if (isIzin(a.status)) rekap.izin++;
      return {
        id_induk: g.target_id,
        nama: g.nama_lengkap,
        jam_masuk: a.jam_masuk,
        jam_pulang: a.jam_pulang,
        status: a.status,
        foto_masuk: a.foto_masuk,
        foto_pulang: a.foto_pulang,
      };
    }
    const pending = izinPending.get(g.target_id);
    if (!pending) rekap.belum++;
    return {
      id_induk: g.target_id,
      nama: g.nama_lengkap,
      jam_masuk: null,
      jam_pulang: null,
      status: pending ? `Izin ${pending} (Pending)` : "Belum absen",
      foto_masuk: null,
      foto_pulang: null,
    };
  });

  return { baris, rekap };
}

export async function getDaftarIzin(filter: "Pending" | "Semua"): Promise<PerizinanDenganNama[]> {
  let q = supabase.from(TABEL_IZIN).select("*").order("tgl_pengajuan", { ascending: false }).limit(100);
  if (filter === "Pending") q = q.eq("status", "Pending");
  const { data, error } = await q;
  if (error) throw error;
  const list = (data ?? []) as Perizinan[];

  const ids = [...new Set(list.map((i) => i.id_induk))];
  const nama = new Map<string, string>();
  if (ids.length) {
    const { data: users, error: e2 } = await supabase.from(TABEL_USERS).select("target_id, nama_lengkap").in("target_id", ids);
    if (e2) throw e2;
    users?.forEach((u) => nama.set(u.target_id, u.nama_lengkap));
  }
  return list.map((i) => ({ ...i, nama_lengkap: nama.get(i.id_induk) ?? i.id_induk }));
}

/**
 * Setujui / tolak izin. Jika disetujui, setiap tanggal dalam rentang
 * tgl_mulai..tgl_selesai di-INSERT ke absensi_guru_bantu dengan status = jenis_izin
 * (tanggal yang sudah punya data absensi dilewati, tidak ditimpa).
 */
export async function putuskanIzin(izin: Perizinan, keputusan: "Disetujui" | "Ditolak"): Promise<Result> {
  try {
    // Hanya memproses yang masih Pending (mencegah double-approve)
    const { data: upd, error } = await supabase
      .from(TABEL_IZIN)
      .update({ status: keputusan })
      .eq("id_izin", izin.id_izin)
      .eq("status", "Pending")
      .select("id_izin");
    if (error) throw error;
    if (!upd?.length) return gagal("Pengajuan ini sudah diproses sebelumnya.");

    if (keputusan === "Ditolak") return sukses("Pengajuan izin ditolak.");

    const semua = eachDate(izin.tgl_mulai, izin.tgl_selesai);
    const { data: ada, error: e2 } = await supabase
      .from(TABEL_ABSENSI)
      .select("tanggal")
      .eq("id_induk", izin.id_induk)
      .in("tanggal", semua);
    if (e2) throw e2;

    const sudah = new Set((ada ?? []).map((r) => r.tanggal as string));
    const baru = semua
      .filter((t) => !sudah.has(t))
      .map((t) => ({
        id_absen: crypto.randomUUID(),
        id_induk: izin.id_induk,
        tanggal: t,
        jam_masuk: null,
        jam_pulang: null,
        foto_masuk: null,
        foto_pulang: null,
        latlong_masuk: null,
        latlong_pulang: null,
        status: izin.jenis_izin,
      }));

    if (baru.length) {
      const { error: e3 } = await supabase.from(TABEL_ABSENSI).insert(baru);
      if (e3) {
        // rollback status agar bisa diproses ulang
        await supabase.from(TABEL_IZIN).update({ status: "Pending" }).eq("id_izin", izin.id_izin);
        throw e3;
      }
    }
    const lewat = semua.length - baru.length;
    return sukses(
      `Izin disetujui. ${baru.length} hari dicatat di absensi` + (lewat ? `, ${lewat} hari dilewati (sudah ada data).` : ".")
    );
  } catch (e) {
    return gagal("Gagal memproses izin: " + pesanError(e));
  }
}
