-- =====================================================================
-- Hanya Storage: bucket + RLS untuk upload foto Absensi Guru Bantu
-- Jalankan di Supabase → SQL Editor (seluruh skrip sekaligus).
-- Nama bucket HARUS: absensi-guru-bantu (dan izin-guru-bantu untuk lampiran).
-- =====================================================================

insert into storage.buckets (id, name, public)
values ('absensi-guru-bantu', 'absensi-guru-bantu', true),
       ('izin-guru-bantu',    'izin-guru-bantu',    true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "gb upload foto" on storage.objects;
drop policy if exists "gb baca foto publik" on storage.objects;
drop policy if exists "gb upload foto anon" on storage.objects;
drop policy if exists "gb select absensi guru bantu" on storage.objects;
drop policy if exists "gb insert absensi guru bantu" on storage.objects;

create policy "gb select absensi guru bantu" on storage.objects
  for select
  to anon, authenticated
  using (bucket_id in ('absensi-guru-bantu', 'izin-guru-bantu'));

create policy "gb insert absensi guru bantu" on storage.objects
  for insert
  to anon, authenticated
  with check (bucket_id in ('absensi-guru-bantu', 'izin-guru-bantu'));
