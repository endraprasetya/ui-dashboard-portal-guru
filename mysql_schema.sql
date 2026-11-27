-- =============================================================================
-- mysql_schema.sql — Portal Guru SD IT Al Madinah
-- Target: MySQL 8.0 / MariaDB 10.6+ (Hostinger)
-- Sumber: supabase/*.sql + referensi query di lib/ dan components/
-- Konversi: uuid → CHAR(36), timestamptz → DATETIME, jsonb → JSON,
--           boolean → TINYINT(1), text → TEXT/VARCHAR
-- Tidak menyertakan RLS, trigger PostgreSQL, storage.objects, atau publication.
-- =============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------------------------------------------------------- 
-- Pengguna & referensi
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `users` (
  `target_id` VARCHAR(64) NOT NULL COMMENT 'ID induk guru, contoh U089',
  `id_user` VARCHAR(64) DEFAULT NULL,
  `username` VARCHAR(120) NOT NULL,
  `password` VARCHAR(255) NOT NULL COMMENT 'Login plain/hash sesuai implementasi saat ini',
  `nama_lengkap` VARCHAR(200) DEFAULT NULL,
  `nama` VARCHAR(200) DEFAULT NULL,
  `role` TEXT DEFAULT NULL COMMENT 'Bisa teks atau JSON peran',
  `unit` VARCHAR(80) DEFAULT NULL,
  `sekolah` VARCHAR(120) DEFAULT NULL,
  `nip` VARCHAR(64) DEFAULT NULL,
  `is_pemeriksa_hq` TINYINT(1) NOT NULL DEFAULT 0,
  `auth_id` CHAR(36) DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`target_id`),
  UNIQUE KEY `uq_users_username` (`username`),
  KEY `idx_users_unit` (`unit`),
  KEY `idx_users_role` (`role`(64))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `kelas` (
  `nama` VARCHAR(16) NOT NULL,
  `unit` VARCHAR(80) DEFAULT NULL,
  PRIMARY KEY (`nama`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------- 
-- Siswa
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `siswa` (
  `id_siswa` VARCHAR(64) NOT NULL,
  `nama_siswa` VARCHAR(200) NOT NULL,
  `kelas` VARCHAR(16) DEFAULT NULL,
  `unit` VARCHAR(80) DEFAULT NULL,
  `nis` VARCHAR(32) DEFAULT NULL,
  `id_pembimbing` TEXT DEFAULT NULL COMMENT 'Bisa beberapa ID guru, dipisah koma',
  `id_ortu` VARCHAR(64) DEFAULT NULL COMMENT 'Kode ortu / no absen',
  `jenis_kelamin` ENUM('Putra','Putri','L','P') DEFAULT NULL,
  `is_yatim` TINYINT(1) DEFAULT NULL,
  `yatim` TINYINT(1) DEFAULT NULL,
  `status_yatim` VARCHAR(20) DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_siswa`),
  KEY `idx_siswa_kelas` (`kelas`),
  KEY `idx_siswa_unit` (`unit`),
  KEY `idx_siswa_nis` (`nis`),
  KEY `idx_siswa_id_ortu` (`id_ortu`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `data_diri_siswa` (
  `nomor_induk_sekolah` VARCHAR(32) NOT NULL COMMENT 'NIS / nomor induk, kunci ke siswa.nis',
  `nama_lengkap` VARCHAR(200) DEFAULT NULL,
  `kelas` VARCHAR(16) DEFAULT NULL,
  `nisn` VARCHAR(32) DEFAULT NULL,
  `nik` VARCHAR(32) DEFAULT NULL,
  `jenis_kelamin` VARCHAR(20) DEFAULT NULL,
  `tempat_tanggal_lahir` VARCHAR(120) DEFAULT NULL,
  `agama` VARCHAR(40) DEFAULT NULL,
  `anak_ke` VARCHAR(20) DEFAULT NULL,
  `telepon` VARCHAR(40) DEFAULT NULL,
  `pendidikan_sebelumnya` VARCHAR(120) DEFAULT NULL,
  `diterima_di_sekolah_ini_di_kelas` VARCHAR(16) DEFAULT NULL,
  `diterima_di_sekolah_ini_pada_tanggal` VARCHAR(40) DEFAULT NULL,
  `nama_ayah` VARCHAR(200) DEFAULT NULL,
  `pekerjaan_ayah` VARCHAR(120) DEFAULT NULL,
  `nama_ibu` VARCHAR(200) DEFAULT NULL,
  `nik_ibu` VARCHAR(32) DEFAULT NULL,
  `pekerjaan_ibu` VARCHAR(120) DEFAULT NULL,
  `jalan` VARCHAR(255) DEFAULT NULL,
  `desa_kelurahan` VARCHAR(120) DEFAULT NULL,
  `kecamatan` VARCHAR(120) DEFAULT NULL,
  `kabupaten` VARCHAR(120) DEFAULT NULL,
  `propinsi` VARCHAR(120) DEFAULT NULL,
  `nama_wali` VARCHAR(200) DEFAULT NULL,
  `alamat_wali` TEXT DEFAULT NULL,
  `pekerjaan_wali` VARCHAR(120) DEFAULT NULL,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`nomor_induk_sekolah`),
  KEY `idx_diri_nama` (`nama_lengkap`),
  KEY `idx_diri_kelas` (`kelas`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `surah` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `nomor_surat` INT NOT NULL,
  `nama_surat` VARCHAR(120) NOT NULL,
  `jumlah_ayat` INT NOT NULL DEFAULT 0,
  `juz` TINYINT NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_surah_nomor` (`nomor_surat`),
  KEY `idx_surah_juz` (`juz`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------- 
-- Setting aplikasi (termasuk hq_kirim JSON)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `setting` (
  `nama_variabel` VARCHAR(120) NOT NULL,
  `nilai` JSON DEFAULT NULL,
  `keterangan` TEXT DEFAULT NULL,
  `niy` VARCHAR(64) DEFAULT NULL,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`nama_variabel`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------- 
-- Tahfidz: setoran harian
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `setoran_tahfidz` (
  `id_setoran` VARCHAR(64) NOT NULL,
  `tanggal` DATETIME NOT NULL,
  `id_siswa` VARCHAR(64) NOT NULL,
  `hafalan_baru` VARCHAR(200) DEFAULT NULL,
  `ayat_mulai` VARCHAR(32) DEFAULT NULL,
  `ayat_selesai` VARCHAR(32) DEFAULT NULL,
  `surah_ziyadah` VARCHAR(200) DEFAULT NULL,
  `ayat_ziyadah` VARCHAR(64) DEFAULT NULL,
  `status` VARCHAR(40) DEFAULT NULL,
  `keterangan_pesan_hafalan` TEXT DEFAULT NULL,
  `nama_ustadz` VARCHAR(200) DEFAULT NULL,
  `murojaah` TEXT DEFAULT NULL,
  `surah_murojaah` VARCHAR(200) DEFAULT NULL,
  `ayat_murojaah` VARCHAR(120) DEFAULT NULL,
  `keterangan_pesan_murojaah` TEXT DEFAULT NULL,
  `tugas_rumah` TEXT DEFAULT NULL,
  `surah_tugas` VARCHAR(200) DEFAULT NULL,
  `ayat_mulai_tugas` VARCHAR(32) DEFAULT NULL,
  `ayat_selesai_tugas` VARCHAR(32) DEFAULT NULL,
  `tipe_tugas` VARCHAR(80) DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_setoran`),
  KEY `idx_setoran_tahfidz_siswa` (`id_siswa`),
  KEY `idx_setoran_tahfidz_tanggal` (`tanggal`),
  CONSTRAINT `fk_setoran_tahfidz_siswa` FOREIGN KEY (`id_siswa`) REFERENCES `siswa` (`id_siswa`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------- 
-- Qiroah: setoran
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `setoran_qiroah` (
  `id_qiroah` VARCHAR(64) NOT NULL,
  `tanggal` DATETIME NOT NULL,
  `id_siswa` VARCHAR(64) NOT NULL,
  `nama_siswa` VARCHAR(200) DEFAULT NULL,
  `unit` VARCHAR(80) DEFAULT NULL,
  `ustadz` VARCHAR(200) DEFAULT NULL,
  `jilid` VARCHAR(20) DEFAULT NULL,
  `halaman` VARCHAR(255) DEFAULT NULL,
  `status` VARCHAR(40) DEFAULT NULL,
  `catatan` TEXT DEFAULT NULL,
  `tugas_rumah` TEXT DEFAULT NULL,
  `murojaah_di_rumah` VARCHAR(20) DEFAULT NULL,
  `membaca_di_sekolah` VARCHAR(20) DEFAULT NULL,
  `murojaah_bersama_teman` VARCHAR(20) DEFAULT NULL,
  `id_audio` VARCHAR(64) DEFAULT NULL,
  `status_setoran` VARCHAR(40) DEFAULT NULL,
  `nilai` VARCHAR(40) DEFAULT NULL,
  `catatan_audio` TEXT DEFAULT NULL,
  `nilai_audio` VARCHAR(40) DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_qiroah`),
  KEY `idx_setoran_qiroah_siswa` (`id_siswa`),
  KEY `idx_setoran_qiroah_tanggal` (`tanggal`),
  KEY `idx_setoran_qiroah_ustadz` (`ustadz`(64)),
  CONSTRAINT `fk_setoran_qiroah_siswa` FOREIGN KEY (`id_siswa`) REFERENCES `siswa` (`id_siswa`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------- 
-- Qiroah: pengajuan & hasil ujian (rekapan)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `pengajuan` (
  `id_pengajuan` VARCHAR(64) NOT NULL,
  `tanggal_diajukan` DATETIME NOT NULL,
  `tanggal_pelaksanaan` DATE DEFAULT NULL,
  `id_siswa` VARCHAR(64) NOT NULL,
  `nama_siswa` VARCHAR(200) DEFAULT NULL,
  `kelas` VARCHAR(16) DEFAULT NULL,
  `unit` VARCHAR(80) DEFAULT NULL,
  `jilid_diujikan` VARCHAR(20) DEFAULT NULL,
  `diajukan_oleh` VARCHAR(200) DEFAULT NULL,
  `nama_penguji` VARCHAR(200) DEFAULT NULL,
  `status` VARCHAR(40) NOT NULL DEFAULT 'menunggu_jadwal',
  PRIMARY KEY (`id_pengajuan`),
  KEY `idx_pengajuan_siswa` (`id_siswa`),
  KEY `idx_pengajuan_status` (`status`),
  KEY `idx_pengajuan_tgl_diajukan` (`tanggal_diajukan`),
  CONSTRAINT `fk_pengajuan_siswa` FOREIGN KEY (`id_siswa`) REFERENCES `siswa` (`id_siswa`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `rekapan` (
  `id_ujian` VARCHAR(64) NOT NULL,
  `tanggal_ujian` DATE NOT NULL,
  `id_siswa` VARCHAR(64) NOT NULL,
  `nama` VARCHAR(200) DEFAULT NULL,
  `kelas` VARCHAR(16) DEFAULT NULL,
  `guru_pengampu` VARCHAR(200) DEFAULT NULL,
  `jilid_asal` VARCHAR(20) DEFAULT NULL,
  `jilid_tujuan` VARCHAR(20) DEFAULT NULL,
  `ujian_ke` INT DEFAULT NULL,
  `penguji` VARCHAR(200) DEFAULT NULL,
  `kelancaran` DECIMAL(6,2) DEFAULT NULL,
  `makhraj` DECIMAL(6,2) DEFAULT NULL,
  `harakat` DECIMAL(6,2) DEFAULT NULL,
  `tajwid` DECIMAL(6,2) DEFAULT NULL,
  `adab` DECIMAL(6,2) DEFAULT NULL,
  `keterangan` TEXT DEFAULT NULL,
  `kelebihan_siswa` TEXT DEFAULT NULL,
  `rekomendasi_tindak_lanjut` TEXT DEFAULT NULL,
  `predikat` VARCHAR(40) DEFAULT NULL,
  `keputusan` VARCHAR(80) DEFAULT NULL,
  `nilai_akhir` DECIMAL(6,2) DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_ujian`),
  KEY `idx_rekapan_siswa` (`id_siswa`),
  KEY `idx_rekapan_tanggal` (`tanggal_ujian`),
  CONSTRAINT `fk_rekapan_siswa` FOREIGN KEY (`id_siswa`) REFERENCES `siswa` (`id_siswa`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------- 
-- Materi & rapor ujian tahfidz HQ
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `materi_ujian_tahfidz` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `id_siswa` VARCHAR(64) NOT NULL,
  `kelas` VARCHAR(16) DEFAULT NULL,
  `asesmen` VARCHAR(40) NOT NULL,
  `surah` VARCHAR(200) NOT NULL,
  `ayat` VARCHAR(64) DEFAULT NULL,
  `keterangan` TEXT DEFAULT NULL,
  `guru` VARCHAR(200) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_materi_ujian` (`id_siswa`,`asesmen`,`surah`(100)),
  KEY `idx_materi_asesmen` (`asesmen`),
  CONSTRAINT `fk_materi_ujian_siswa` FOREIGN KEY (`id_siswa`) REFERENCES `siswa` (`id_siswa`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `rapor_tahfidz_header` (
  `id_ujian_tahfidz` CHAR(36) NOT NULL DEFAULT (UUID()),
  `id_siswa` VARCHAR(64) NOT NULL,
  `jenis_asesmen` VARCHAR(40) NOT NULL,
  `tahun_ajaran` VARCHAR(16) NOT NULL,
  `semester` VARCHAR(16) NOT NULL,
  `nilai_akhir` DECIMAL(6,2) DEFAULT NULL,
  `predikat` VARCHAR(20) DEFAULT NULL,
  `nilai_target` DECIMAL(6,2) DEFAULT NULL,
  `capaian_kompetensi` TEXT DEFAULT NULL,
  `capaian_target` TEXT DEFAULT NULL,
  `motivasi` TEXT DEFAULT NULL,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_ujian_tahfidz`),
  UNIQUE KEY `uq_rapor_tahfidz_header` (`id_siswa`,`jenis_asesmen`,`tahun_ajaran`,`semester`),
  KEY `idx_rapor_tahfidz_header_siswa` (`id_siswa`),
  CONSTRAINT `fk_rapor_tahfidz_header_siswa` FOREIGN KEY (`id_siswa`) REFERENCES `siswa` (`id_siswa`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `rapor_tahfidz_detail` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `header_id` CHAR(36) NOT NULL,
  `id_siswa` VARCHAR(64) NOT NULL,
  `nama_surat` VARCHAR(200) NOT NULL,
  `rentang_ayat` VARCHAR(64) DEFAULT NULL,
  `kesalahan_kelancaran` INT DEFAULT 0,
  `nilai_kelancaran` DECIMAL(6,2) DEFAULT NULL,
  `kesalahan_mad` INT DEFAULT 0,
  `kesalahan_dengung` INT DEFAULT 0,
  `kesalahan_makhraj` INT DEFAULT 0,
  `nilai_tajwid` DECIMAL(6,2) DEFAULT NULL,
  `nilai_adab` DECIMAL(6,2) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_rapor_tahfidz_detail_header` (`header_id`),
  KEY `idx_rapor_tahfidz_detail_surat` (`nama_surat`(64)),
  CONSTRAINT `fk_rapor_tahfidz_detail_header` FOREIGN KEY (`header_id`) REFERENCES `rapor_tahfidz_header` (`id_ujian_tahfidz`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------- 
-- Rapor Kurikulum Merdeka (skema aktif di lib/rapor-kurmer.ts)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `rapor_kurmer_setelan` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `kelas` VARCHAR(16) NOT NULL,
  `kode_mapel` VARCHAR(32) NOT NULL,
  `tahun_ajaran` VARCHAR(16) NOT NULL,
  `semester` VARCHAR(16) NOT NULL,
  `jumlah_tp` INT NOT NULL DEFAULT 10,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_rapor_kurmer_setelan` (`kelas`,`kode_mapel`,`tahun_ajaran`,`semester`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `rapor_kurmer_nilai` (
  `id_kurmer_nilai` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `id_siswa` VARCHAR(64) NOT NULL,
  `nis` VARCHAR(32) DEFAULT NULL,
  `kelas` VARCHAR(16) NOT NULL,
  `mata_pelajaran` VARCHAR(120) NOT NULL,
  `jenis_asesmen` VARCHAR(20) NOT NULL DEFAULT 'ASTS',
  `tahun_ajaran` VARCHAR(16) NOT NULL,
  `semester` VARCHAR(16) NOT NULL,
  `tp1` DECIMAL(6,2) DEFAULT NULL,
  `tp2` DECIMAL(6,2) DEFAULT NULL,
  `tp3` DECIMAL(6,2) DEFAULT NULL,
  `tp4` DECIMAL(6,2) DEFAULT NULL,
  `tp5` DECIMAL(6,2) DEFAULT NULL,
  `tp6` DECIMAL(6,2) DEFAULT NULL,
  `tp7` DECIMAL(6,2) DEFAULT NULL,
  `tp8` DECIMAL(6,2) DEFAULT NULL,
  `tp9` DECIMAL(6,2) DEFAULT NULL,
  `tp10` DECIMAL(6,2) DEFAULT NULL,
  `nilai_formatif` DECIMAL(6,2) DEFAULT NULL,
  `asts` DECIMAL(6,2) DEFAULT NULL,
  `asas` DECIMAL(6,2) DEFAULT NULL,
  `nilai_akhir` DECIMAL(6,2) DEFAULT NULL,
  `predikat` VARCHAR(8) DEFAULT NULL,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_kurmer_nilai`),
  UNIQUE KEY `uq_rapor_kurmer_nilai` (`id_siswa`,`mata_pelajaran`,`jenis_asesmen`,`tahun_ajaran`,`semester`),
  KEY `idx_rapor_kurmer_nilai_kelas` (`kelas`,`tahun_ajaran`,`semester`),
  KEY `idx_rapor_kurmer_nilai_mapel` (`mata_pelajaran`(64)),
  CONSTRAINT `fk_rapor_kurmer_nilai_siswa` FOREIGN KEY (`id_siswa`) REFERENCES `siswa` (`id_siswa`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `rapor_kurmer_catatan` (
  `id_catatan_kurmer` CHAR(36) NOT NULL DEFAULT (UUID()),
  `id_siswa` VARCHAR(64) NOT NULL,
  `nis` VARCHAR(32) DEFAULT NULL,
  `kelas` VARCHAR(16) DEFAULT NULL,
  `tahun_ajaran` VARCHAR(16) NOT NULL,
  `semester` VARCHAR(16) NOT NULL,
  `jenis_asesmen` VARCHAR(20) DEFAULT NULL,
  `catatan_wali_kelas` TEXT DEFAULT NULL,
  `nama_wali` VARCHAR(200) DEFAULT NULL,
  `nama_kepsek` VARCHAR(200) DEFAULT NULL,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_catatan_kurmer`),
  UNIQUE KEY `uq_rapor_kurmer_catatan` (`id_siswa`,`tahun_ajaran`,`semester`),
  KEY `idx_rapor_kurmer_catatan_siswa` (`id_siswa`),
  CONSTRAINT `fk_rapor_kurmer_catatan_siswa` FOREIGN KEY (`id_siswa`) REFERENCES `siswa` (`id_siswa`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------- 
-- Jurnal pembelajaran
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `jurnal_pembelajaran` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `kelas` VARCHAR(32) NOT NULL,
  `tanggal` DATE NOT NULL,
  `jam` TINYINT UNSIGNED NOT NULL,
  `semester` VARCHAR(16) DEFAULT NULL,
  `mapel` VARCHAR(120) DEFAULT NULL,
  `materi` TEXT DEFAULT NULL,
  `kegiatan` TEXT DEFAULT NULL,
  `links` JSON DEFAULT NULL,
  `hadir` INT DEFAULT NULL,
  `tidak_hadir` INT DEFAULT NULL,
  `siswa_tidak_hadir` JSON DEFAULT NULL,
  `ttd` TEXT DEFAULT NULL,
  `tugas` TEXT DEFAULT NULL,
  `guru` VARCHAR(200) DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_jurnal_kelas_tgl_jam` (`kelas`,`tanggal`,`jam`),
  KEY `idx_jurnal_tanggal` (`tanggal`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------- 
-- Tertib poin
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `aturan_tertib_point` (
  `id_aturan` CHAR(36) NOT NULL DEFAULT (UUID()),
  `label` VARCHAR(255) NOT NULL,
  `pts` INT NOT NULL,
  `type` ENUM('neg','pos') NOT NULL,
  `urutan` INT NOT NULL DEFAULT 0,
  PRIMARY KEY (`id_aturan`),
  UNIQUE KEY `uq_aturan_label_type` (`label`(191),`type`),
  KEY `idx_aturan_type` (`type`),
  KEY `idx_aturan_urutan` (`urutan`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `tertib_point` (
  `id_tertib_point` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `id_siswa` VARCHAR(64) NOT NULL,
  `label` VARCHAR(255) NOT NULL,
  `pts` INT NOT NULL,
  `guru` VARCHAR(200) DEFAULT NULL,
  `bulan` VARCHAR(16) DEFAULT NULL,
  `unit` VARCHAR(80) DEFAULT NULL,
  `keterangan` TEXT DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_tertib_point`),
  KEY `idx_tertib_point_siswa` (`id_siswa`),
  KEY `idx_tertib_point_bulan` (`bulan`),
  KEY `idx_tertib_point_unit` (`unit`),
  CONSTRAINT `fk_tertib_point_siswa` FOREIGN KEY (`id_siswa`) REFERENCES `siswa` (`id_siswa`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------- 
-- Absensi piket guru (supabase/piket-guru.sql)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `tabel_piket_guru` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `unit` VARCHAR(80) NOT NULL,
  `jenis_piket` VARCHAR(40) DEFAULT NULL,
  `id_guru` VARCHAR(64) DEFAULT NULL,
  `nama_guru` VARCHAR(200) DEFAULT NULL,
  `hari` VARCHAR(20) DEFAULT NULL,
  `tanggal` DATE NOT NULL,
  `status_kehadiran` TEXT DEFAULT 'Belum',
  `waktu_absen` DATETIME DEFAULT NULL,
  `waktu_absen_pagi` DATETIME DEFAULT NULL,
  `waktu_absen_sore` DATETIME DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_piket_unit_tanggal` (`unit`,`tanggal`),
  KEY `idx_piket_guru` (`id_guru`),
  KEY `idx_piket_tanggal` (`tanggal`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------- 
-- Guru bantu: absensi & izin (supabase/guru-bantu.sql — hanya tabel, bukan storage)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `absensi_guru_bantu` (
  `id_absen` CHAR(36) NOT NULL,
  `id_induk` VARCHAR(64) NOT NULL,
  `tanggal` DATE NOT NULL,
  `jam_masuk` TIME DEFAULT NULL,
  `jam_pulang` TIME DEFAULT NULL,
  `foto_masuk` TEXT DEFAULT NULL,
  `foto_pulang` TEXT DEFAULT NULL,
  `latlong_masuk` VARCHAR(64) DEFAULT NULL,
  `latlong_pulang` VARCHAR(64) DEFAULT NULL,
  `status` VARCHAR(40) DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_absen`),
  UNIQUE KEY `uq_absensi_gb_hari` (`id_induk`,`tanggal`),
  KEY `idx_absensi_gb_tanggal` (`tanggal`),
  CONSTRAINT `fk_absensi_gb_user` FOREIGN KEY (`id_induk`) REFERENCES `users` (`target_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `perizinan_guru_bantu` (
  `id_izin` CHAR(36) NOT NULL,
  `id_induk` VARCHAR(64) NOT NULL,
  `tgl_pengajuan` DATE NOT NULL,
  `jenis_izin` VARCHAR(80) NOT NULL,
  `detail_izin` VARCHAR(120) DEFAULT NULL,
  `tgl_mulai` DATE NOT NULL,
  `tgl_selesai` DATE NOT NULL,
  `keterangan` TEXT DEFAULT NULL,
  `link_dokumen` TEXT DEFAULT NULL,
  `status` ENUM('Pending','Disetujui','Ditolak') NOT NULL DEFAULT 'Pending',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_izin`),
  KEY `idx_izin_gb_induk` (`id_induk`),
  KEY `idx_izin_gb_status` (`status`),
  CONSTRAINT `fk_izin_gb_user` FOREIGN KEY (`id_induk`) REFERENCES `users` (`target_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------- 
-- Kasir & bendahara (supabase/keuangan-kas.sql)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `tabel_akun` (
  `kode_akun` VARCHAR(16) NOT NULL,
  `nama_akun` VARCHAR(120) NOT NULL,
  `kategori` ENUM('Penerimaan','Pengeluaran','Kas') NOT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`kode_akun`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `tabel_transaksi_kas` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `nomor_bukti` VARCHAR(64) NOT NULL,
  `urutan` INT NOT NULL DEFAULT 1,
  `tanggal` DATE NOT NULL,
  `tanggal_transaksi` DATE DEFAULT NULL,
  `jenis_transaksi` ENUM('Penerimaan','Pengeluaran') NOT NULL,
  `kode_akun` VARCHAR(16) NOT NULL,
  `akun_kas_bank` VARCHAR(120) DEFAULT NULL,
  `nominal` DECIMAL(18,2) NOT NULL,
  `id_siswa` VARCHAR(64) DEFAULT NULL,
  `nama_siswa` VARCHAR(200) DEFAULT NULL,
  `nis` VARCHAR(32) DEFAULT NULL,
  `uraian` TEXT DEFAULT NULL,
  `rincian` JSON DEFAULT NULL,
  `kode_tagihan` VARCHAR(64) DEFAULT NULL,
  `tapel_tagihan` VARCHAR(16) DEFAULT NULL,
  `status_validasi` ENUM('Draft','Disetujui','Ditolak') NOT NULL DEFAULT 'Draft',
  `unit` VARCHAR(80) DEFAULT NULL,
  `dicatat_oleh` VARCHAR(200) DEFAULT NULL,
  `divalidasi_oleh` VARCHAR(200) DEFAULT NULL,
  `catatan_validasi` TEXT DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_transaksi_kas_status` (`status_validasi`,`tanggal` DESC),
  KEY `idx_transaksi_kas_tanggal` (`tanggal` DESC),
  KEY `idx_transaksi_kas_siswa` (`id_siswa`,`status_validasi`),
  KEY `idx_transaksi_kas_bukti` (`nomor_bukti`),
  KEY `idx_transaksi_kas_unit` (`unit`,`status_validasi`),
  CONSTRAINT `fk_transaksi_kas_akun` FOREIGN KEY (`kode_akun`) REFERENCES `tabel_akun` (`kode_akun`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `tabel_anggaran` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `unit` VARCHAR(80) NOT NULL,
  `tahun` VARCHAR(16) NOT NULL,
  `kode_akun` VARCHAR(16) NOT NULL,
  `nominal` DECIMAL(18,2) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_anggaran_unit_tahun_akun` (`unit`,`tahun`,`kode_akun`),
  CONSTRAINT `fk_anggaran_akun` FOREIGN KEY (`kode_akun`) REFERENCES `tabel_akun` (`kode_akun`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------- 
-- Pengajuan keringanan keuangan (supabase/pengajuan-keringanan.sql)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `tabel_pengajuan_keringanan` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `nis` VARCHAR(32) NOT NULL,
  `nama_siswa` VARCHAR(200) NOT NULL,
  `kelas` VARCHAR(16) NOT NULL DEFAULT '',
  `unit` VARCHAR(80) NOT NULL DEFAULT '',
  `nominal_tunggakan` DECIMAL(18,2) NOT NULL DEFAULT 0,
  `nomor_surat` VARCHAR(120) DEFAULT NULL,
  `kesanggupan_bayar` TEXT DEFAULT NULL,
  `alasan_pengajuan` TEXT NOT NULL DEFAULT '',
  `jenis_kegiatan` VARCHAR(120) NOT NULL DEFAULT '',
  `mekanisme_pelunasan` TEXT NOT NULL DEFAULT '',
  `nominal_angsuran` DECIMAL(18,2) DEFAULT NULL,
  `tanggal_rencana_lunas` DATETIME DEFAULT NULL,
  `status_persetujuan` ENUM('Pending','Disetujui','Ditolak') NOT NULL DEFAULT 'Pending',
  `nomor_surat_rekomendasi` VARCHAR(120) DEFAULT NULL,
  `catatan_keputusan` TEXT DEFAULT NULL,
  `catatan_kepsek` TEXT DEFAULT NULL,
  `tanggal_persetujuan` DATETIME DEFAULT NULL,
  `surat_resmi_isi` LONGTEXT DEFAULT NULL,
  `surat_resmi_dikirim_pada` DATETIME DEFAULT NULL,
  `dibuat_pada` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `diperbarui_pada` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `diputuskan_pada` DATETIME DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_pengajuan_keringanan_nis` (`nis`,`dibuat_pada` DESC),
  KEY `idx_pengajuan_keringanan_status` (`status_persetujuan`,`dibuat_pada` DESC),
  KEY `idx_pengajuan_keringanan_unit` (`unit`,`dibuat_pada` DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- =============================================================================
-- Catatan migrasi dari PostgreSQL / Supabase
-- =============================================================================
-- 1. Bucket foto guru bantu (absensi-guru-bantu, izin-guru-bantu) tidak dimodelkan
--    di MySQL; simpan URL di kolom foto_* / link_dokumen atau gunakan storage Hostinger.
-- 2. Baris `setting` dengan nama_variabel = 'hq_kirim' menyimpan JSON array kiriman
--    rapor HQ (lihat lib/rapor-hq-kirim.ts).
-- 3. Versi lama `rapor_kurmer_nilai` di supabase/rapor-kurmer.sql memakai kolom tp JSON;
--    aplikasi saat ini memakai tp1–tp10 (skema di atas mengikuti lib/rapor-kurmer.ts).
-- 4. Untuk data awal `tabel_akun` dan `aturan_tertib_point`, lihat INSERT di
--    supabase/keuangan-kas.sql dan supabase/aturan-tertib-point.sql.