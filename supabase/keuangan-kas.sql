-- Modul Kasir & Bendahara: akun dan transaksi kas harian.
-- Jalankan di Supabase SQL Editor.

create table if not exists public.tabel_akun (
  kode_akun text primary key,
  nama_akun text not null,
  kategori text not null check (kategori in ('Penerimaan', 'Pengeluaran', 'Kas')),
  is_active boolean not null default true
);

create table if not exists public.tabel_transaksi_kas (
  id uuid primary key default gen_random_uuid(),
  nomor_bukti text not null,
  urutan integer not null default 1,
  tanggal date not null default current_date,
  jenis_transaksi text not null check (jenis_transaksi in ('Penerimaan', 'Pengeluaran')),
  kode_akun text not null references public.tabel_akun (kode_akun),
  akun_kas_bank text not null,
  nominal numeric not null check (nominal > 0),
  id_siswa text,
  nama_siswa text,
  uraian text,
  rincian jsonb,
  kode_tagihan text,
  tapel_tagihan text,
  status_validasi text not null default 'Draft' check (status_validasi in ('Draft', 'Disetujui', 'Ditolak')),
  unit text,
  nis text,
  dicatat_oleh text,
  divalidasi_oleh text,
  catatan_validasi text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_transaksi_kas_status on public.tabel_transaksi_kas (status_validasi, tanggal desc);
create index if not exists idx_transaksi_kas_tanggal on public.tabel_transaksi_kas (tanggal desc);
create index if not exists idx_transaksi_kas_siswa on public.tabel_transaksi_kas (id_siswa, status_validasi);
create index if not exists idx_transaksi_kas_bukti on public.tabel_transaksi_kas (nomor_bukti);
create index if not exists idx_transaksi_kas_unit on public.tabel_transaksi_kas (unit, status_validasi);

-- Penyesuaian tabel yang sudah ada (aman dijalankan berulang).
alter table public.tabel_transaksi_kas add column if not exists akun_kas_bank text;
alter table public.tabel_transaksi_kas add column if not exists kode_tagihan text;
alter table public.tabel_transaksi_kas add column if not exists tapel_tagihan text;
alter table public.tabel_transaksi_kas add column if not exists nomor_bukti text;
alter table public.tabel_transaksi_kas add column if not exists urutan integer default 1;
alter table public.tabel_transaksi_kas add column if not exists rincian jsonb;
alter table public.tabel_transaksi_kas add column if not exists status_validasi text default 'Draft';
alter table public.tabel_transaksi_kas add column if not exists unit text;
alter table public.tabel_transaksi_kas add column if not exists nis text;
alter table public.tabel_transaksi_kas add column if not exists tanggal_transaksi date;

create table if not exists public.tabel_anggaran (
  id uuid primary key default gen_random_uuid(),
  unit text not null,
  tahun text not null,
  kode_akun text not null,
  nominal numeric not null default 0,
  unique (unit, tahun, kode_akun)
);
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'tabel_transaksi_kas' and column_name = 'akun_kas'
  ) and exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'tabel_transaksi_kas' and column_name = 'akun_kas_bank'
  ) then
    update public.tabel_transaksi_kas
      set akun_kas_bank = akun_kas
      where akun_kas_bank is null or akun_kas_bank = '';
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'tabel_transaksi_kas' and column_name = 'id_transaksi'
  ) then
    update public.tabel_transaksi_kas
      set nomor_bukti = regexp_replace(id_transaksi, '-[0-9]{1,2}$', '')
      where nomor_bukti is null or nomor_bukti = '';
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'tabel_transaksi_kas' and column_name = 'status'
  ) then
    update public.tabel_transaksi_kas
      set status_validasi = status
      where status_validasi is null or status_validasi = '';
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'tabel_transaksi_kas' and column_name = 'tanggal'
  ) and exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'tabel_transaksi_kas' and column_name = 'tanggal_transaksi'
  ) then
    update public.tabel_transaksi_kas
      set tanggal_transaksi = tanggal
      where tanggal_transaksi is null;
  end if;
end $$;

insert into public.tabel_akun (kode_akun, nama_akun, kategori) values
  ('3101', 'Kas Tunai', 'Kas'),
  ('3102', 'Bank BRI', 'Kas'),
  ('3103', 'Bank BSI', 'Kas'),
  ('4101', 'SPP / Syahriah', 'Penerimaan'),
  ('4102', 'Katering', 'Penerimaan'),
  ('4103', 'PSB / Daftar ulang', 'Penerimaan'),
  ('4104', 'Ekstrakurikuler', 'Penerimaan'),
  ('4105', 'ASAS / Ujian', 'Penerimaan'),
  ('4106', 'Infaq', 'Penerimaan'),
  ('4107', 'Penerimaan lain-lain', 'Penerimaan'),
  ('5101', 'ATK & perlengkapan', 'Pengeluaran'),
  ('5102', 'Utilitas (listrik, air, internet)', 'Pengeluaran'),
  ('5103', 'Konsumsi & rapat', 'Pengeluaran'),
  ('5104', 'Transport & operasional', 'Pengeluaran'),
  ('5105', 'Honor & jasa', 'Pengeluaran'),
  ('5106', 'Pemeliharaan', 'Pengeluaran'),
  ('5107', 'Pengeluaran lain-lain', 'Pengeluaran')
on conflict (kode_akun) do update
  set nama_akun = excluded.nama_akun,
      kategori = excluded.kategori,
      is_active = true;

-- Satu nomor bukti boleh punya beberapa baris item (bukan unique di nomor_bukti saja).
do $$
declare
  r record;
begin
  for r in
    select c.conname
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'tabel_transaksi_kas'
      and c.contype = 'u'
      and pg_get_constraintdef(c.oid) ~* 'nomor_bukti'
      and pg_get_constraintdef(c.oid) !~* 'urutan'
  loop
    execute format('alter table public.tabel_transaksi_kas drop constraint if exists %I', r.conname);
  end loop;
  for r in
    select i.relname as idx
    from pg_index x
    join pg_class t on t.oid = x.indrelid
    join pg_class i on i.oid = x.indexrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'tabel_transaksi_kas'
      and x.indisunique
      and not x.indisprimary
      and pg_get_indexdef(i.oid) ~* 'nomor_bukti'
      and pg_get_indexdef(i.oid) !~* 'urutan'
  loop
    execute format('drop index if exists public.%I', r.idx);
  end loop;
end $$;
