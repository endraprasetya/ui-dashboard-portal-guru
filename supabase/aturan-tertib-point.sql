-- Aturan Tertib Point (pelanggaran & kontribusi positif)
-- Jalankan di Supabase SQL Editor jika tabel belum ada atau perlu disinkronkan ulang.

create table if not exists public.aturan_tertib_point (
  id_aturan uuid primary key default gen_random_uuid(),
  label text not null,
  pts integer not null check (pts > 0),
  type text not null check (type in ('neg', 'pos')),
  urutan integer not null default 0,
  unique (label, type)
);

alter table public.aturan_tertib_point add column if not exists urutan integer not null default 0;

create index if not exists idx_aturan_tertib_type on public.aturan_tertib_point (type);
create index if not exists idx_aturan_tertib_urutan on public.aturan_tertib_point (urutan);

-- Ganti daftar lama dengan aturan terbaru (riwayat tertib_point tetap memakai label tersimpan).
delete from public.aturan_tertib_point;

insert into public.aturan_tertib_point (label, pts, type, urutan) values
  ('Bermain dikasur / bermain kasur', 10, 'neg', 1),
  ('Keluar kelas tanpa ijin', 10, 'neg', 2),
  ('Makan di kelas saat jam pelajaran', 10, 'neg', 3),
  ('Membuang sampah sembarangan', 10, 'neg', 4),
  ('Terlambat masuk sekolah / Terlambat datang', 10, 'neg', 5),
  ('Tidur di kelas saat jam pelajaran', 10, 'neg', 6),
  ('Tidak membawa buku', 10, 'neg', 7),
  ('Mencoret tembok/meja', 20, 'neg', 8),
  ('Membawa mainan', 20, 'neg', 9),
  ('Main lari-larian bukan saat olah raga', 20, 'neg', 10),
  ('Masuk kantor tanpa kepentingan / tanpa ijin', 20, 'neg', 11),
  ('Tidak memperhatikan pelajaran / Tidak mengikuti pelajaran', 20, 'neg', 12),
  ('Tidak piket', 20, 'neg', 13),
  ('Tidak semangat saat menirukan talqin bersama ustadz', 20, 'neg', 14),
  ('Tidak tidur siang', 20, 'neg', 15),
  ('Tidak menirukan talqin bersama ustadz saat hq/qq/hafalan hadits', 25, 'neg', 16),
  ('Tidak seragam lengkap / Tidak berseragam lengkap', 25, 'neg', 17),
  ('Mainan pintu / gedor-gedor pintu kelas / kamar mandi', 30, 'neg', 18),
  ('Merusak barang orang lain', 30, 'neg', 19),
  ('Merusak fasilitas sekolah', 30, 'neg', 20),
  ('Klotekan / main musik / bernyanyi', 30, 'neg', 21),
  ('Bermain bola bukan di jam olah raga', 30, 'neg', 22),
  ('Membully adik kelas / teman sekelas / teman antar kelas', 30, 'neg', 23),
  ('Mendholimi teman', 30, 'neg', 24),
  ('Ramai di masjid saat menunggu sholat / Tidak tertib di masjid', 30, 'neg', 25),
  ('Bicara kotor', 30, 'neg', 26),
  ('Mengejek teman', 30, 'neg', 27),
  ('Tidak menghormati guru', 30, 'neg', 28),
  ('Berbohong', 40, 'neg', 29),
  ('Berkelahi', 50, 'neg', 30),
  ('Membolos', 50, 'neg', 31),
  ('Tidak sholat', 50, 'neg', 32),
  ('Membawa rokok / merokok di sekolah baik elektrik maupun non elektrik', 150, 'neg', 33),
  ('Menolong teman', 10, 'pos', 101),
  ('Berbagi', 10, 'pos', 102),
  ('Membantu ustadz', 10, 'pos', 103);

notify pgrst, 'reload schema';
