-- =====================================================================
-- DriveSure Auto Solutions: application form ("Apply here")
-- Run ONCE in Supabase: SQL Editor > New query > paste all > Run.
-- Safe to run again later (it will not delete your data).
-- =====================================================================

create table if not exists public.applications (
  id         uuid primary key default gen_random_uuid(),
  created    timestamptz not null default now(),
  full_name  text not null,
  mobile     text,
  email      text,
  car        text,                      -- car the person is applying for (optional)
  status     text not null default 'new' check (status in ('new', 'reviewed')),
  data       jsonb not null,            -- the whole form, section by section
  user_id    uuid references auth.users(id) on delete set null default auth.uid()
);

alter table public.applications enable row level security;

-- Anyone can SEND an application. Nobody except the owner can read, change or delete them.
drop policy if exists "applications: anyone sends"  on public.applications;
drop policy if exists "applications: owner read"    on public.applications;
drop policy if exists "applications: owner update"  on public.applications;
drop policy if exists "applications: owner delete"  on public.applications;
create policy "applications: anyone sends" on public.applications
  for insert to anon, authenticated with check (user_id is null or user_id = auth.uid());
create policy "applications: owner read"   on public.applications for select to authenticated using (public.is_owner());
create policy "applications: owner update" on public.applications for update to authenticated using (public.is_owner()) with check (public.is_owner());
create policy "applications: owner delete" on public.applications for delete to authenticated using (public.is_owner());
