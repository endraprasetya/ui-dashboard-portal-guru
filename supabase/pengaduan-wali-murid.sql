-- Salinan skrip Portal Wali: public.pengaduan_wali_murid + bucket Storage.
-- Jalankan di Supabase → SQL Editor (seluruh skrip sekaligus).

create table if not exists public.pengaduan_wali_murid (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  id_siswa text not null default '',
  nis text not null default '',
  unit text not null default '',
  nama_wali_murid text not null,
  no_wa text not null,
  nama_anak text not null,
  kelas_anak text not null default '',
  kategori text not null,
  isi_pengaduan text not null,
  lampiran_url text,
  lampiran_tipe text check (lampiran_tipe is null or lampiran_tipe in ('image', 'video', 'document')),
  status_alur text not null default 'masuk'
    check (status_alur in ('masuk', 'ditangani_ks', 'diteruskan', 'selesai')),
  klasifikasi_penanganan text check (
    klasifikasi_penanganan is null or klasifikasi_penanganan in ('ditangani_ks', 'diteruskan')
  ),
  tujuan_penerusan text,
  penerima_nama text,
  penerima_jenis text,
  penerima_kelas text,
  catatan_ks text,
  respon_penerima text,
  direspon_pada timestamptz,
  tindak_lanjut_jawaban text,
  ditindaklanjuti_pada timestamptz
);

-- Migrasi dari skema lama (aman dijalankan berulang)
alter table public.pengaduan_wali_murid add column if not exists penerima_nama text;
alter table public.pengaduan_wali_murid add column if not exists penerima_jenis text;
alter table public.pengaduan_wali_murid add column if not exists penerima_kelas text;
alter table public.pengaduan_wali_murid add column if not exists respon_penerima text;
alter table public.pengaduan_wali_murid add column if not exists direspon_pada timestamptz;

create index if not exists idx_pengaduan_wali_murid_unit
  on public.pengaduan_wali_murid (unit, created_at desc);

create index if not exists idx_pengaduan_wali_murid_siswa
  on public.pengaduan_wali_murid (id_siswa, created_at desc);

alter table public.pengaduan_wali_murid enable row level security;
drop policy if exists "anon all pengaduan wali murid" on public.pengaduan_wali_murid;
create policy "anon all pengaduan wali murid" on public.pengaduan_wali_murid
  for all to anon, authenticated using (true) with check (true);

grant select, insert, update, delete on public.pengaduan_wali_murid to anon, authenticated;

insert into storage.buckets (id, name, public)
values ('pengaduan-wali-murid', 'pengaduan-wali-murid', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "pengaduan wali select" on storage.objects;
drop policy if exists "pengaduan wali insert" on storage.objects;

create policy "pengaduan wali select" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'pengaduan-wali-murid');

create policy "pengaduan wali insert" on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'pengaduan-wali-murid');

notify pgrst, 'reload schema';