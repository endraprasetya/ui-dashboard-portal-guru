-- Rapor Kurikulum Merdeka (Rapor Kurmer)
-- Jalankan di Supabase SQL Editor agar input nilai, ledger, dan catatan wali tersimpan di database.

create table if not exists public.rapor_kurmer_nilai (
  id uuid primary key default gen_random_uuid(),
  id_siswa text not null,
  kelas text not null,
  kode_mapel text not null,
  tahun_ajaran text not null,
  semester text not null,
  tp jsonb not null default '[]'::jsonb,
  nh numeric,
  asts numeric,
  asas numeric,
  jumlah_tp integer not null default 10,
  diperbarui_oleh text,
  updated_at timestamptz not null default now(),
  constraint rapor_kurmer_nilai_unik unique (id_siswa, kode_mapel, tahun_ajaran, semester)
);

create table if not exists public.rapor_kurmer_catatan (
  id uuid primary key default gen_random_uuid(),
  id_siswa text not null,
  kelas text not null,
  tahun_ajaran text not null,
  semester text not null,
  jenis_asesmen text not null,
  catatan_wali text not null default '',
  nama_wali text,
  nama_kepsek text,
  updated_at timestamptz not null default now(),
  constraint rapor_kurmer_catatan_unik unique (id_siswa, tahun_ajaran, semester, jenis_asesmen)
);

create table if not exists public.rapor_kurmer_setelan (
  id uuid primary key default gen_random_uuid(),
  kelas text not null,
  kode_mapel text not null,
  tahun_ajaran text not null,
  semester text not null,
  jumlah_tp integer not null default 10,
  updated_at timestamptz not null default now(),
  constraint rapor_kurmer_setelan_unik unique (kelas, kode_mapel, tahun_ajaran, semester)
);

create index if not exists idx_rapor_kurmer_nilai_kelas on public.rapor_kurmer_nilai (kelas, tahun_ajaran, semester);
create index if not exists idx_rapor_kurmer_nilai_mapel on public.rapor_kurmer_nilai (kode_mapel);
create index if not exists idx_rapor_kurmer_catatan_siswa on public.rapor_kurmer_catatan (id_siswa);

alter table public.rapor_kurmer_nilai enable row level security;
alter table public.rapor_kurmer_catatan enable row level security;
alter table public.rapor_kurmer_setelan enable row level security;

drop policy if exists "anon all rapor_kurmer_nilai" on public.rapor_kurmer_nilai;
drop policy if exists "anon all rapor_kurmer_catatan" on public.rapor_kurmer_catatan;
drop policy if exists "anon all rapor_kurmer_setelan" on public.rapor_kurmer_setelan;

create policy "anon all rapor_kurmer_nilai" on public.rapor_kurmer_nilai
  for all to anon, authenticated using (true) with check (true);
create policy "anon all rapor_kurmer_catatan" on public.rapor_kurmer_catatan
  for all to anon, authenticated using (true) with check (true);
create policy "anon all rapor_kurmer_setelan" on public.rapor_kurmer_setelan
  for all to anon, authenticated using (true) with check (true);

grant select, insert, update, delete on public.rapor_kurmer_nilai to anon, authenticated;
grant select, insert, update, delete on public.rapor_kurmer_catatan to anon, authenticated;
grant select, insert, update, delete on public.rapor_kurmer_setelan to anon, authenticated;

-- Aktifkan realtime (Dashboard Supabase → Database → Publications → supabase_realtime)
alter publication supabase_realtime add table public.rapor_kurmer_nilai;
alter publication supabase_realtime add table public.rapor_kurmer_catatan;

notify pgrst, 'reload schema';
