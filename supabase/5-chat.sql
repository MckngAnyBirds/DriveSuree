-- =====================================================================
-- DriveSure Auto Solutions: live chat (chat bubble for visitors, inbox for owners)
-- Run ONCE in Supabase: SQL Editor > New query > paste all > Run.
-- Safe to run again later (it will not delete your data).
-- =====================================================================

create table if not exists public.chats (
  id          uuid primary key default gen_random_uuid(),
  token       uuid not null unique,          -- secret random id kept in the visitor's browser
  name        text,
  contact     text,
  car         text,                          -- the car the visitor was looking at (optional)
  user_id     uuid references auth.users(id) on delete set null,
  created     timestamptz not null default now(),
  last_at     timestamptz not null default now(),
  last_body   text,
  last_sender text
);

create table if not exists public.chat_messages (
  id            bigint generated always as identity primary key,
  chat_id       uuid not null references public.chats(id) on delete cascade,
  sender        text not null check (sender in ('visitor', 'owner')),
  body          text not null check (char_length(body) between 1 and 2000),
  created       timestamptz not null default now(),
  read_by_owner boolean not null default false
);
create index if not exists chat_messages_chat_idx on public.chat_messages (chat_id, id);

alter table public.chats         enable row level security;
alter table public.chat_messages enable row level security;

-- Only owners can read, reply to or delete chats directly.
drop policy if exists "chats: owner all"         on public.chats;
drop policy if exists "chat_messages: owner all" on public.chat_messages;
create policy "chats: owner all"         on public.chats         for all to authenticated using (public.is_owner()) with check (public.is_owner());
create policy "chat_messages: owner all" on public.chat_messages for all to authenticated using (public.is_owner()) with check (public.is_owner());

-- Keep the "last message" shown in the owner's list up to date.
create or replace function public.chat_touch() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.chats set last_at = new.created, last_body = left(new.body, 120), last_sender = new.sender where id = new.chat_id;
  return new;
end $$;
drop trigger if exists chat_touch on public.chat_messages;
create trigger chat_touch after insert on public.chat_messages for each row execute function public.chat_touch();

-- Visitors talk to the chat only through these two functions (they need the secret token).
create or replace function public.chat_send(p_token uuid, p_name text, p_contact text, p_car text, p_body text)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_chat uuid;
  v_body text := btrim(coalesce(p_body, ''));
begin
  if p_token is null then raise exception 'missing token'; end if;
  if char_length(v_body) < 1 or char_length(v_body) > 2000 then raise exception 'message must be 1 to 2000 characters'; end if;

  select id into v_chat from public.chats where token = p_token;
  if v_chat is null then
    insert into public.chats (token, name, contact, car, user_id)
    values (p_token, left(btrim(coalesce(p_name, '')), 120), left(btrim(coalesce(p_contact, '')), 160), left(btrim(coalesce(p_car, '')), 160), auth.uid())
    returning id into v_chat;
  else
    update public.chats set
      name    = coalesce(nullif(left(btrim(coalesce(p_name, '')), 120), ''), name),
      contact = coalesce(nullif(left(btrim(coalesce(p_contact, '')), 160), ''), contact),
      car     = coalesce(nullif(left(btrim(coalesce(p_car, '')), 160), ''), car)
    where id = v_chat;
  end if;

  -- simple spam brake: at most 20 messages a minute per chat
  if (select count(*) from public.chat_messages where chat_id = v_chat and sender = 'visitor' and created > now() - interval '1 minute') >= 20 then
    raise exception 'too many messages, please wait a moment';
  end if;

  insert into public.chat_messages (chat_id, sender, body) values (v_chat, 'visitor', v_body);
end $$;

create or replace function public.chat_fetch(p_token uuid)
returns table (id bigint, sender text, body text, created timestamptz)
language sql security definer set search_path = public stable as $$
  select m.id, m.sender, m.body, m.created
  from public.chat_messages m join public.chats c on c.id = m.chat_id
  where c.token = p_token
  order by m.id
  limit 500
$$;

grant execute on function public.chat_send(uuid, text, text, text, text) to anon, authenticated;
grant execute on function public.chat_fetch(uuid) to anon, authenticated;
