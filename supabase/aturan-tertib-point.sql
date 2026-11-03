-- Aturan Tertib Point (pelanggaran & kontribusi positif)
-- Jalankan di Supabase SQL Editor jika tabel belum ada atau perlu disinkronkan ulang.

create table if not exists public.aturan_tertib_point (
  id_aturan uuid primary key default gen_random_uuid(),
  label text not null,
  pts integer not null check (pts > 0),
  type text not null check (type in ('neg', 'pos')),
  unique (label, type)
);

create index if not exists idx_aturan_tertib_type on public.aturan_tertib_point (type);

-- Ganti daftar lama dengan aturan terbaru (riwayat tertib_point tetap memakai label tersimpan).
delete from public.aturan_tertib_point;

insert into public.aturan_tertib_point (label, pts, type) values
  ('Berkelahi', 50, 'neg'),
  ('Mengejek teman', 25, 'neg'),
  ('Mencoret tembok/meja', 20, 'neg'),
  ('Merusak fasilitas sekolah', 30, 'neg'),
  ('Terlambat masuk sekolah', 25, 'neg'),
  ('Tidak memperhatikan pelajaran', 20, 'neg'),
  ('Bermain dikasur', 10, 'neg'),
  ('Membawa mainan', 20, 'neg'),
  ('Mendholimi teman', 30, 'neg'),
  ('Tidak tidur siang', 20, 'neg'),
  ('Membuang sampah sembarangan', 20, 'neg'),
  ('Tidak menirukan talqin bersama ustadz saat hq/qq/hafalan hadits', 25, 'neg'),
  ('Tidak semangat saat menirukan talqin bersama ustadz', 20, 'neg'),
  ('Naik meja', 20, 'neg'),
  ('Merusak barang orang lain', 30, 'neg'),
  ('Mainan pintu/gedor-gedor pintu kelas/kamar mandi', 30, 'neg'),
  ('Tidak piket', 20, 'neg'),
  ('Main lari-larian bukan saat olah raga', 20, 'neg'),
  ('Ramai dimasjid saat menunggu sholat', 30, 'neg'),
  ('Tidak sholat', 50, 'neg'),
  ('Berbohong', 40, 'neg'),
  ('Tidak seragam lengkap', 25, 'neg'),
  ('Masuk kantor tanpa kepentingan/tanpa ijin', 20, 'neg'),
  ('Klotekan/main musik/bernyanyi', 30, 'neg'),
  ('Bermain bola bukan di jam olah raga', 30, 'neg'),
  ('Membully adik kelas/teman sekelas/teman antar kelas', 30, 'neg'),
  ('Membawa rokok/merokok disekolah baik elektrik maupun non elektrik', 150, 'neg'),
  ('Menolong teman', 10, 'pos'),
  ('Berbagi', 10, 'pos'),
  ('Membantu ustadz', 10, 'pos');

notify pgrst, 'reload schema';
