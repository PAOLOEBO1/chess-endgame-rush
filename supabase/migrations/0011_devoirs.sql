-- Chess Endgame Rush — 0011 (02/10/2026) : devoirs de l'entraîneur.
-- Peut être relancé sans risque.
-- À exécuter une fois dans Supabase : SQL Editor → New query → coller TOUT → Run, AVANT de publier la version.
--
-- Les devoirs (« réussir N exercices de tel motif avant telle date ») sont rangés avec la base de
-- l'entraîneur ; les élèves les lisent avec elle, par le code du groupe (fonction coach_set).

alter table public.coach_sets add column if not exists homework jsonb not null default '[]'::jsonb;
alter table public.coach_sets drop constraint if exists coach_sets_homework_check;
alter table public.coach_sets add constraint coach_sets_homework_check
  check (jsonb_typeof(homework) = 'array' and jsonb_array_length(homework) <= 20 and octet_length(homework::text) <= 20000);

grant update (homework) on public.coach_sets to authenticated;

-- Lecture par les élèves : la base ET ses devoirs (avertissement « security definer » VOULU).
create or replace function public.coach_set(p_code text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('name', s.name, 'puzzles', s.puzzles, 'updated_at', s.updated_at, 'homework', s.homework)
  from public.coach_sets s
  where s.code = upper(trim(p_code)) and upper(trim(p_code)) ~ '^[A-HJ-NP-Z2-9]{8}$';
$$;
revoke execute on function public.coach_set(text) from public;
grant execute on function public.coach_set(text) to anon, authenticated;
