-- =====================================================================
-- DriveSure Auto Solutions: customer accounts + car condition
-- Run ONCE in Supabase: SQL Editor > New query > paste all > Run.
-- Safe to run again later (it will not delete your data).
-- Run 1-setup.sql first (you already did).
-- =====================================================================

-- ---------- 1. Car condition: brand new or second hand ----------
-- Existing cars become "second_hand". Change any of them in the owner page.
alter table public.cars
  add column if not exists car_condition text not null default 'second_hand';

alter table public.cars drop constraint if exists cars_car_condition_check;
alter table public.cars
  add constraint cars_car_condition_check check (car_condition in ('new', 'second_hand'));

-- ---------- 2. Link inquiries to the customer who sent them ----------
alter table public.inquiries
  add column if not exists user_id uuid references auth.users(id) on delete set null default auth.uid();

-- Anyone can send an inquiry. A logged-in customer's inquiry is tagged with their own id only.
drop policy if exists "inquiries: anyone sends" on public.inquiries;
create policy "inquiries: anyone sends" on public.inquiries
  for insert to anon, authenticated
  with check (user_id is null or user_id = auth.uid());

-- A customer can read only their own inquiries (the owner policy from 1-setup.sql still lets you read all).
drop policy if exists "inquiries: customer reads own" on public.inquiries;
create policy "inquiries: customer reads own" on public.inquiries
  for select to authenticated using (user_id = auth.uid());

-- ---------- 3. Saved (favorite) cars ----------
create table if not exists public.favorites (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  car_id  uuid not null references public.cars(id) on delete cascade,
  created timestamptz not null default now(),
  primary key (user_id, car_id)
);

alter table public.favorites enable row level security;

drop policy if exists "favorites: own read"   on public.favorites;
drop policy if exists "favorites: own insert" on public.favorites;
drop policy if exists "favorites: own delete" on public.favorites;
create policy "favorites: own read"   on public.favorites for select to authenticated using (user_id = auth.uid());
create policy "favorites: own insert" on public.favorites for insert to authenticated with check (user_id = auth.uid());
create policy "favorites: own delete" on public.favorites for delete to authenticated using (user_id = auth.uid());

-- Customers can NOT change cars, settings, receipts or read other people's inquiries:
-- all of those rules require public.is_owner() (set up in 1-setup.sql).
