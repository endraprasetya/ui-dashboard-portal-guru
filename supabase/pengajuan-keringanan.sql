-- Pengajuan keringanan / penundaan pembayaran dari Portal Wali.
-- Jalankan di Supabase SQL Editor. Aman dijalankan berulang.

create table if not exists public.tabel_pengajuan_keringanan (
  id uuid primary key default gen_random_uuid(),
  nis text not null,
  nama_siswa text not null,
  kelas text not null default '',
  unit text not null default '',
  nominal_tunggakan numeric not null default 0,
  nomor_surat text not null,
  kesanggupan_bayar text not null,
  tanggal_rencana_lunas timestamptz not null,
  status_persetujuan text not null default 'Pending',
  nomor_surat_rekomendasi text,
  catatan_keputusan text,
  dibuat_pada timestamptz not null default now(),
  diperbarui_pada timestamptz not null default now(),
  diputuskan_pada timestamptz
);

alter table public.tabel_pengajuan_keringanan add column if not exists kelas text not null default '';
alter table public.tabel_pengajuan_keringanan add column if not exists unit text not null default '';
alter table public.tabel_pengajuan_keringanan add column if not exists nominal_tunggakan numeric not null default 0;
alter table public.tabel_pengajuan_keringanan add column if not exists nomor_surat text;
alter table public.tabel_pengajuan_keringanan add column if not exists kesanggupan_bayar text;
alter table public.tabel_pengajuan_keringanan add column if not exists tanggal_rencana_lunas timestamptz;
alter table public.tabel_pengajuan_keringanan add column if not exists status_persetujuan text not null default 'Pending';
alter table public.tabel_pengajuan_keringanan add column if not exists nomor_surat_rekomendasi text;
alter table public.tabel_pengajuan_keringanan add column if not exists alasan_pengajuan text not null default '';
alter table public.tabel_pengajuan_keringanan add column if not exists catatan_keputusan text;
alter table public.tabel_pengajuan_keringanan add column if not exists catatan_kepsek text;
alter table public.tabel_pengajuan_keringanan add column if not exists tanggal_persetujuan timestamptz;
alter table public.tabel_pengajuan_keringanan add column if not exists surat_resmi_isi text;
alter table public.tabel_pengajuan_keringanan add column if not exists surat_resmi_dikirim_pada timestamptz;
alter table public.tabel_pengajuan_keringanan add column if not exists dibuat_pada timestamptz not null default now();
alter table public.tabel_pengajuan_keringanan add column if not exists diperbarui_pada timestamptz not null default now();
alter table public.tabel_pengajuan_keringanan add column if not exists diputuskan_pada timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'tabel_pengajuan_keringanan_status_chk'
  ) then
    alter table public.tabel_pengajuan_keringanan
      add constraint tabel_pengajuan_keringanan_status_chk
      check (status_persetujuan in ('Pending', 'Disetujui', 'Ditolak'));
  end if;
end $$;

create index if not exists idx_pengajuan_keringanan_nis
  on public.tabel_pengajuan_keringanan (nis, dibuat_pada desc);
create index if not exists idx_pengajuan_keringanan_status
  on public.tabel_pengajuan_keringanan (status_persetujuan, dibuat_pada desc);
create index if not exists idx_pengajuan_keringanan_unit
  on public.tabel_pengajuan_keringanan (unit, dibuat_pada desc);

alter table public.tabel_pengajuan_keringanan enable row level security;

drop policy if exists "anon all pengajuan keringanan" on public.tabel_pengajuan_keringanan;
create policy "anon all pengajuan keringanan" on public.tabel_pengajuan_keringanan
  for all to anon, authenticated using (true) with check (true);

grant select, insert, update, delete on public.tabel_pengajuan_keringanan to anon, authenticated;

notify pgrst, 'reload schema';
