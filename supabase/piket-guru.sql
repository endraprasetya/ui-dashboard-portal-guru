-- Absensi piket memakai tabel yang sudah ada: public.tabel_piket_guru
-- Portal tidak membuat jadwal_piket / absensi_piket.
--
-- Kolom yang dibaca dan ditulis portal:
--   id, unit, jenis_piket, hari, tanggal, id_guru, nama_guru,
--   status_kehadiran, waktu_absen, waktu_absen_pagi, waktu_absen_sore, created_at
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
  waktu_absen_pagi timestamptz,
  waktu_absen_sore timestamptz,
  created_at timestamptz not null default now()
);

alter table public.tabel_piket_guru add column if not exists waktu_absen_pagi timestamptz;
alter table public.tabel_piket_guru add column if not exists waktu_absen_sore timestamptz;

-- Portal menulis status ringkas (contoh: Pagi:Hadir|Sore:Belum) dan timestamp di kolom waktu_absen_*.
alter table public.tabel_piket_guru alter column status_kehadiran type text using status_kehadiran::text;

alter table public.tabel_piket_guru enable row level security;
drop policy if exists "anon all tabel_piket_guru" on public.tabel_piket_guru;
create policy "anon all tabel_piket_guru" on public.tabel_piket_guru
  for all to anon, authenticated using (true) with check (true);
grant select, insert, update, delete on public.tabel_piket_guru to anon, authenticated;

notify pgrst, 'reload schema';
