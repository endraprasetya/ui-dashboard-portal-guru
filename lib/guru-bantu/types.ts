export type GuruUser = {
  target_id: string; // ID Induk, contoh: "U089"
  nama_lengkap: string;
  role: string; // contoh: "Ustadz, Guru Bantu"
};

export type Absensi = {
  id_absen: string;
  id_induk: string;
  tanggal: string; // YYYY-MM-DD
  jam_masuk: string | null; // HH:mm:ss
  jam_pulang: string | null;
  foto_masuk: string | null;
  foto_pulang: string | null;
  latlong_masuk: string | null;
  latlong_pulang: string | null;
  status: string;
};

export type StatusIzin = "Pending" | "Disetujui" | "Ditolak";

export type Perizinan = {
  id_izin: string;
  id_induk: string;
  tgl_pengajuan: string;
  jenis_izin: string;
  detail_izin: string | null;
  tgl_mulai: string;
  tgl_selesai: string;
  keterangan: string | null;
  link_dokumen: string | null;
  status: StatusIzin;
};

export type PerizinanDenganNama = Perizinan & { nama_lengkap: string };

export type Posisi = { lat: number; lon: number; akurasi: number };

export type Result<T = undefined> = { ok: boolean; message: string; data?: T };

export type BarisMonitor = {
  id_induk: string;
  nama: string;
  jam_masuk: string | null;
  jam_pulang: string | null;
  status: string; // Hadir / Terlambat / Izin... / "Belum absen" / "Izin (Pending)"
  foto_masuk: string | null;
  foto_pulang: string | null;
};

export type RekapHarian = { hadir: number; izin: number; belum: number };
