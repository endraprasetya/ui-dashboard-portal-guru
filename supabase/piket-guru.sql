-- Absensi piket memakai tabel yang sudah ada: public.tabel_piket_guru
-- Portal tidak membuat jadwal_piket / absensi_piket.
--
-- Kolom yang dibaca dan ditulis portal:
--   id, unit, jenis_piket, hari, tanggal, id_guru, nama_guru,
--   status_kehadiran, waktu_absen, created_at
--
-- Satu baris = satu petugas pada satu tanggal.
-- hari berisi nama hari (Ahad–Sabtu), tanggal wajib terisi.
-- status_kehadiran menyimpan dua sesi: "Pagi:Hadir|Sore:Belum".
-- Nilai tiap sesi: Belum, Hadir, atau Izin. waktu_absen terisi saat guru mencatat.

create table if not exists public.tabel_piket_guru (
  id uuid primary key default gen_random_uuid(),
  unit text not null,
  jenis_piket text,
  id_guru text,
  nama_guru text,
  hari text,
  tanggal date not null,
  status_kehadiran text default 'Belum',
  waktu_absen timestamptz,
  created_at timestamptz not null default now()
);
