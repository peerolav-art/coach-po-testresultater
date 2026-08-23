-- Coach PO Testresultater – felles database
-- Kjør hele filen i Supabase: SQL Editor -> New query -> Run.

create extension if not exists pgcrypto;

create table if not exists public.test_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  client_id text not null,
  athlete text not null,
  birthdate date,
  gender text,
  test_date date,
  location text,
  group_name text,
  longjump numeric,
  liakov numeric,
  ball numeric,
  sprint numeric,
  bosco numeric,
  bosco_type text,
  comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint test_results_user_client_unique unique(user_id, client_id)
);

alter table public.test_results enable row level security;

-- Hver innlogget bruker ser og endrer bare sine egne resultater.
drop policy if exists "read own results" on public.test_results;
create policy "read own results" on public.test_results for select to authenticated using (auth.uid() = user_id);

drop policy if exists "insert own results" on public.test_results;
create policy "insert own results" on public.test_results for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "update own results" on public.test_results;
create policy "update own results" on public.test_results for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "delete own results" on public.test_results;
create policy "delete own results" on public.test_results for delete to authenticated using (auth.uid() = user_id);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists test_results_set_updated_at on public.test_results;
create trigger test_results_set_updated_at before update on public.test_results
for each row execute function public.set_updated_at();

create index if not exists test_results_user_athlete_idx on public.test_results(user_id, athlete);
create index if not exists test_results_user_test_date_idx on public.test_results(user_id, test_date desc);
