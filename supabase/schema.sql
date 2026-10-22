-- My Day: database setup for Supabase.
-- Run once: Supabase dashboard -> SQL Editor -> New query -> paste this file -> Run.
-- Safe to run again (it drops and recreates the policies).

-- Only people signed in with a company Google account count.
create or replace function public.is_company_user() returns boolean
language sql stable as $$
  select coalesce(lower(auth.jwt() ->> 'email') like '%@contactout.io', false)
$$;

-- Everything the app stores, keyed by collection path + document id.
--   data/users/<uid>  each person's private pipeline (account buckets b1..bN + "state")
--   team              one row per teammate (id = their user id)
--   handoffs          accounts passed between teammates
create table if not exists public.docs (
  coll       text not null,
  id         text not null,
  data       jsonb not null default '{}'::jsonb,
  owner      uuid not null default auth.uid(),
  updated_at timestamptz not null default now(),
  primary key (coll, id)
);
create index if not exists docs_handoff_to   on public.docs ((data ->> 'to'))   where coll = 'handoffs';
create index if not exists docs_handoff_from on public.docs ((data ->> 'from')) where coll = 'handoffs';

create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists docs_touch on public.docs;
create trigger docs_touch before update on public.docs for each row execute function public.touch_updated_at();

alter table public.docs enable row level security;
alter table public.docs replica identity full;   -- lets live updates include the old row

drop policy if exists "private: own pipeline"   on public.docs;
drop policy if exists "team: read"              on public.docs;
drop policy if exists "team: write self"        on public.docs;
drop policy if exists "team: update self"       on public.docs;
drop policy if exists "handoffs: read mine"     on public.docs;
drop policy if exists "handoffs: send"          on public.docs;
drop policy if exists "handoffs: update mine"   on public.docs;

-- Your pipeline: only you, ever.
create policy "private: own pipeline" on public.docs for all
  using      (public.is_company_user() and coll = 'data/users/' || auth.uid()::text)
  with check (public.is_company_user() and coll = 'data/users/' || auth.uid()::text);

-- Team list: everyone at the company can see who uses My Day; you can only add yourself.
create policy "team: read" on public.docs for select
  using (public.is_company_user() and coll = 'team');
create policy "team: write self" on public.docs for insert
  with check (public.is_company_user() and coll = 'team' and id = auth.uid()::text);
create policy "team: update self" on public.docs for update
  using (public.is_company_user() and coll = 'team' and id = auth.uid()::text);

-- Handoffs: only the sender and the receiver can see one.
create policy "handoffs: read mine" on public.docs for select
  using (public.is_company_user() and coll = 'handoffs'
         and (data ->> 'from' = auth.uid()::text or data ->> 'to' = auth.uid()::text));
create policy "handoffs: send" on public.docs for insert
  with check (public.is_company_user() and coll = 'handoffs' and data ->> 'from' = auth.uid()::text);
create policy "handoffs: update mine" on public.docs for update
  using      (public.is_company_user() and coll = 'handoffs'
              and (data ->> 'from' = auth.uid()::text or data ->> 'to' = auth.uid()::text))
  with check (public.is_company_user() and coll = 'handoffs'
              and (data ->> 'from' = auth.uid()::text or data ->> 'to' = auth.uid()::text));

-- Names for the team list.
create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  email      text,
  name       text,
  sales_id   text,
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
drop policy if exists "profiles: read" on public.profiles;
drop policy if exists "profiles: insert self" on public.profiles;
drop policy if exists "profiles: update self" on public.profiles;
create policy "profiles: read" on public.profiles for select using (public.is_company_user());
create policy "profiles: insert self" on public.profiles for insert with check (public.is_company_user() and id = auth.uid());
create policy "profiles: update self" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

-- Google sign-in tokens for read-only Gmail and Calendar. Only the server can read these:
-- row level security is on and there are no policies, so the browser can't see them.
create table if not exists public.google_tokens (
  user_id       uuid primary key references auth.users (id) on delete cascade,
  refresh_token text,
  access_token  text,
  expires_at    timestamptz,
  updated_at    timestamptz not null default now()
);
alter table public.google_tokens enable row level security;

-- Live updates (another tab, a teammate sending a handoff).
do $$ begin
  alter publication supabase_realtime add table public.docs;
exception when duplicate_object then null; when undefined_object then null;
end $$;
