-- Chess Endgame Rush — 0007 (01/10/2026) : types d'erreurs et données d'entraînement synchronisées.
-- Peut être relancé sans risque.
-- À exécuter une fois dans Supabase : SQL Editor → New query → coller TOUT → Run, AVANT de publier la version.

-- 1) Type d'erreur d'une tentative (position ratée ou réussie avec un indice).
alter table public.attempts add column if not exists e text;
alter table public.attempts drop constraint if exists attempts_e_check;
alter table public.attempts add constraint attempts_e_check
  check (e is null or e in ('win-lost', 'stalemate', 'loses', 'slow', 'defense', 'hint'));

-- 2) Tests de maîtrise des Bases et bibliothèque de séries d'entraîneur : une ligne par compte.
create table if not exists public.user_data (
  user_id    uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  exams      jsonb not null default '{}'::jsonb check (jsonb_typeof(exams) = 'object' and octet_length(exams::text) <= 20000),
  series     jsonb not null default '[]'::jsonb check (jsonb_typeof(series) = 'array' and octet_length(series::text) <= 300000),
  updated_at timestamptz not null default now()
);

revoke all on public.user_data from anon, authenticated;
grant select, insert, update (exams, series, updated_at) on public.user_data to authenticated;
alter table public.user_data enable row level security;

drop policy if exists "données : lecture des siennes" on public.user_data;
drop policy if exists "données : création des siennes" on public.user_data;
drop policy if exists "données : modification des siennes" on public.user_data;
drop policy if exists "2FA exigée si activée" on public.user_data;
create policy "données : lecture des siennes"      on public.user_data for select to authenticated using ((select auth.uid()) = user_id);
create policy "données : création des siennes"     on public.user_data for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "données : modification des siennes" on public.user_data for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "2FA exigée si activée" on public.user_data as restrictive to authenticated
  using ((select private.mfa_ok())) with check ((select private.mfa_ok()));
