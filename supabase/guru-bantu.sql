-- =====================================================================
-- Pendukung fitur Absensi Guru Bantu (jalankan di Supabase SQL Editor)
-- Tabel sudah Anda punya; file ini hanya menambah index, constraint,
-- bucket storage, dan contoh RLS.
-- =====================================================================

-- 1) Cegah absen ganda per guru per hari.
--    (Jika sudah ada data duplikat, bersihkan dulu sebelum menjalankan.)
alter table public.absensi_guru_bantu
  add constraint absensi_guru_bantu_unik_hari unique (id_induk, tanggal);

create index if not exists idx_absensi_gb_tanggal on public.absensi_guru_bantu (tanggal);
create index if not exists idx_izin_gb_status     on public.perizinan_guru_bantu (status);
create index if not exists idx_izin_gb_induk      on public.perizinan_guru_bantu (id_induk);

-- 2) Storage bucket (public agar foto bisa dibuka lewat link)
insert into storage.buckets (id, name, public)
values ('absensi-guru-bantu', 'absensi-guru-bantu', true),
       ('izin-guru-bantu',    'izin-guru-bantu',    true)
on conflict (id) do nothing;

-- 3) Policy storage: user login boleh upload. Baca publik lewat URL bucket public.
create policy "gb upload foto" on storage.objects
  for insert to authenticated
  with check (bucket_id in ('absensi-guru-bantu', 'izin-guru-bantu'));

-- 4) RLS — CONTOH. Sesuaikan dengan cara login Anda (mis. kolom auth_id di tabel users).
--    Jika aplikasi Anda memakai anon key tanpa Supabase Auth, policy harus
--    disesuaikan (atau pindahkan operasi ke Route Handler + service role).
-- alter table public.absensi_guru_bantu enable row level security;
-- alter table public.perizinan_guru_bantu enable row level security;
--
-- create policy "guru lihat absensi sendiri" on public.absensi_guru_bantu
--   for select using (id_induk = (select target_id from public.users where auth_id = auth.uid()));
-- create policy "guru absen sendiri" on public.absensi_guru_bantu
--   for insert with check (id_induk = (select target_id from public.users where auth_id = auth.uid()));
-- create policy "guru update absensi sendiri" on public.absensi_guru_bantu
--   for update using (id_induk = (select target_id from public.users where auth_id = auth.uid()));
-- (admin: buat policy terpisah berdasarkan role 'Admin')
