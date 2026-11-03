export const LOKASI_SEKOLAH = [
  { key: "putra", nama: "Putra", lat: -7.485467789667755, lon: 110.74850304292272 },
  { key: "putri", nama: "Putri", lat: -7.483121194107743, lon: 110.74276795871846 },
] as const;

export const RADIUS_MAKS_METER = 75;

/** Lewat dari jam ini = Terlambat */
export const BATAS_TERLAMBAT = "07:00:00";

/** Jendela waktu absen (WIB), format HH:mm */
export const JENDELA_MASUK = { mulai: "06:30", selesai: "15:59" };
export const JENDELA_PULANG = { mulai: "07:01", selesai: "16:30" };

export const TABEL_ABSENSI = "absensi_guru_bantu";
export const TABEL_IZIN = "perizinan_guru_bantu";
export const TABEL_USERS = "users";

export const BUCKET_ABSENSI = "absensi-guru-bantu";
export const BUCKET_IZIN = "izin-guru-bantu";

export const STATUS_HADIR = ["Hadir", "Terlambat"];

export const DAFTAR_IZIN: Record<string, string[]> = {
  "Tugas Dinas": ["Dinas Luar", "Tugas Pondok/Sekolah", "Pelatihan/Diklat", "Pendampingan Santri/Siswa"],
  "Izin Keluarga": ["Menikahkan Anak", "Istri Melahirkan", "Keluarga Inti Meninggal Dunia"],
  Kesehatan: ["Sakit", "Suami/Istri/Anak Sakit", "Rawat Inap/Operasi"],
  "Izin Pribadi": [
    "Keperluan Keluarga",
    "Keperluan Mendesak",
    "Urusan Administrasi Pribadi",
    "Izin Setengah Hari",
    "Datang Terlambat",
    "Pulang Awal",
  ],
  Cuti: ["Haji", "Umroh", "Studi (Lanjut Study)", "Menikah", "Melahirkan", "Mengurus Orang Tua"],
};
