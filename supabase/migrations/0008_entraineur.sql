-- Chess Endgame Rush — 0008 (01/10/2026) : base d'exercices de l'entraîneur.
-- Peut être relancé sans risque.
-- À exécuter une fois dans Supabase : SQL Editor → New query → coller TOUT → Run, AVANT de publier la version.
--
-- Un entraîneur (compte connecté) dépose UNE base d'exercices, partagée avec ses élèves par un code
-- de groupe. Les élèves (avec ou sans compte) la lisent par ce code via la fonction coach_set(code),
-- qui ne renvoie que cette base : la table n'est lisible que par son propriétaire.

create table if not exists public.coach_sets (
  owner      uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  code       text not null unique check (code ~ '^[A-HJ-NP-Z2-9]{8}$'),
  name       text not null check (char_length(name) between 1 and 60),
  puzzles    jsonb not null default '[]'::jsonb
             check (jsonb_typeof(puzzles) = 'array' and jsonb_array_length(puzzles) <= 500 and octet_length(puzzles::text) <= 400000),
  updated_at timestamptz not null default now()
);

revoke all on public.coach_sets from anon, authenticated;
grant select, insert, delete, update (name, puzzles, updated_at) on public.coach_sets to authenticated;
alter table public.coach_sets enable row level security;

drop policy if exists "base entraîneur : lecture de la sienne" on public.coach_sets;
drop policy if exists "base entraîneur : création de la sienne" on public.coach_sets;
drop policy if exists "base entraîneur : modification de la sienne" on public.coach_sets;
drop policy if exists "base entraîneur : suppression de la sienne" on public.coach_sets;
drop policy if exists "2FA exigée si activée" on public.coach_sets;
create policy "base entraîneur : lecture de la sienne"      on public.coach_sets for select to authenticated using ((select auth.uid()) = owner);
create policy "base entraîneur : création de la sienne"     on public.coach_sets for insert to authenticated with check ((select auth.uid()) = owner);
create policy "base entraîneur : modification de la sienne" on public.coach_sets for update to authenticated
  using ((select auth.uid()) = owner) with check ((select auth.uid()) = owner);
create policy "base entraîneur : suppression de la sienne"  on public.coach_sets for delete to authenticated using ((select auth.uid()) = owner);
create policy "2FA exigée si activée" on public.coach_sets as restrictive to authenticated
  using ((select private.mfa_ok())) with check ((select private.mfa_ok()));

-- Lecture par les élèves : uniquement la base dont on connaît le code (avertissement « security definer »
-- du Security Advisor VOULU, comme pour leaderboard : ne pas cliquer « Resolve »).
create or replace function public.coach_set(p_code text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('name', s.name, 'puzzles', s.puzzles, 'updated_at', s.updated_at)
  from public.coach_sets s
  where s.code = upper(trim(p_code)) and upper(trim(p_code)) ~ '^[A-HJ-NP-Z2-9]{8}$';
$$;
revoke execute on function public.coach_set(text) from public;
grant execute on function public.coach_set(text) to anon, authenticated;
