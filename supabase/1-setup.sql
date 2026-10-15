-- =====================================================================
-- DriveSure Auto Solutions: database setup
-- Run ONCE in Supabase: SQL Editor > New query > paste all > Run.
-- Safe to run again later (it will not delete your data).
-- =====================================================================

-- ---------- TABLES ----------
create table if not exists public.cars (
  id           uuid primary key default gen_random_uuid(),
  brand        text not null check (char_length(brand) <= 60),
  model        text not null check (char_length(model) <= 100),
  year         int  not null,
  type         text not null,
  price        numeric not null check (price >= 0),
  mileage      int  default 0,
  transmission text,
  fuel         text,
  color        text,
  description  text,
  img          text,                              -- link to the photo in Storage
  featured     boolean default false,
  status       text not null default 'available' check (status in ('available','sold')),
  created      timestamptz not null default now()
);

create table if not exists public.settings (
  id            int primary key default 1 check (id = 1),   -- one row only
  name          text, currency text, phone text, email text, address text, hours text,
  promo_title   text, promo_badge text, promo_text text
);

create table if not exists public.inquiries (
  id       uuid primary key default gen_random_uuid(),
  created  timestamptz not null default now(),
  name     text not null check (char_length(name) <= 120),
  contact  text not null check (char_length(contact) <= 160),
  topic    text not null check (char_length(topic) <= 60),
  msg      text not null check (char_length(msg) <= 2000)
);

create table if not exists public.sales (
  no        text primary key,
  created   timestamptz not null default now(),
  date      date not null,
  car_id    uuid references public.cars(id) on delete set null,
  car_name  text not null,
  details   text,
  buyer     text not null,
  phone     text,
  address   text,
  amount    numeric not null,
  pay       text,
  note      text
);

-- who is the owner (filled in by 2-make-owner.sql)
create table if not exists public.owners (
  user_id uuid primary key references auth.users(id) on delete cascade
);

create or replace function public.is_owner() returns boolean
language sql security definer set search_path = public stable as
$$ select exists (select 1 from public.owners where user_id = auth.uid()); $$;
grant execute on function public.is_owner() to anon, authenticated;

-- ---------- SECURITY RULES (Row Level Security) ----------
alter table public.cars      enable row level security;
alter table public.settings  enable row level security;
alter table public.inquiries enable row level security;
alter table public.sales     enable row level security;
alter table public.owners    enable row level security;   -- no policies = nobody can read it through the API

-- cars: everyone can see; only the owner can change
drop policy if exists "cars: public read"   on public.cars;
drop policy if exists "cars: owner insert"  on public.cars;
drop policy if exists "cars: owner update"  on public.cars;
drop policy if exists "cars: owner delete"  on public.cars;
create policy "cars: public read"  on public.cars for select to anon, authenticated using (true);
create policy "cars: owner insert" on public.cars for insert to authenticated with check (public.is_owner());
create policy "cars: owner update" on public.cars for update to authenticated using (public.is_owner()) with check (public.is_owner());
create policy "cars: owner delete" on public.cars for delete to authenticated using (public.is_owner());

-- settings (business info, promo banner): everyone can see; only the owner can change
drop policy if exists "settings: public read"  on public.settings;
drop policy if exists "settings: owner insert" on public.settings;
drop policy if exists "settings: owner update" on public.settings;
create policy "settings: public read"  on public.settings for select to anon, authenticated using (true);
create policy "settings: owner insert" on public.settings for insert to authenticated with check (public.is_owner());
create policy "settings: owner update" on public.settings for update to authenticated using (public.is_owner()) with check (public.is_owner());

-- inquiries: visitors can send one; only the owner can read or delete
drop policy if exists "inquiries: anyone sends" on public.inquiries;
drop policy if exists "inquiries: owner read"   on public.inquiries;
drop policy if exists "inquiries: owner delete" on public.inquiries;
create policy "inquiries: anyone sends" on public.inquiries for insert to anon, authenticated with check (true);
create policy "inquiries: owner read"   on public.inquiries for select to authenticated using (public.is_owner());
create policy "inquiries: owner delete" on public.inquiries for delete to authenticated using (public.is_owner());

-- sales / receipts: owner only
drop policy if exists "sales: owner all" on public.sales;
create policy "sales: owner all" on public.sales for all to authenticated using (public.is_owner()) with check (public.is_owner());

-- ---------- PHOTO STORAGE ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('car-photos', 'car-photos', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

drop policy if exists "photos: owner upload" on storage.objects;
drop policy if exists "photos: owner update" on storage.objects;
drop policy if exists "photos: owner delete" on storage.objects;
create policy "photos: owner upload" on storage.objects for insert to authenticated with check (bucket_id = 'car-photos' and public.is_owner());
create policy "photos: owner update" on storage.objects for update to authenticated using (bucket_id = 'car-photos' and public.is_owner());
create policy "photos: owner delete" on storage.objects for delete to authenticated using (bucket_id = 'car-photos' and public.is_owner());
-- (the bucket is public, so anyone can view a photo by its link)
