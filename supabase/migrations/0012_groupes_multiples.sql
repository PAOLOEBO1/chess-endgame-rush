-- Chess Endgame Rush — 0012 (04/10/2026) : plusieurs groupes par entraîneur.
-- Peut être relancé sans risque.
-- À exécuter une fois dans Supabase : SQL Editor → New query → coller TOUT → Run, AVANT de publier la version.
--
-- Jusqu'ici un entraîneur n'avait qu'UNE base (coach_sets.owner = clé primaire). Désormais un entraîneur peut avoir
-- jusqu'à 10 groupes, chacun avec son code, son PGN, ses devoirs et son suivi. Le code (unique) devient la clé.
-- Les élèves ne changent pas : ils rejoignent un groupe par son code (coach_set, coach_join, coach_report restent identiques).
-- Compatibilité : les versions déjà ouvertes chez les entraîneurs appellent coach_progress() sans argument ; la nouvelle
-- fonction coach_progress(p_code) sans code renvoie le suivi du plus ancien groupe, comme avant.

-- 1. Clé primaire sur le code (les références de coach_members sur coach_sets.code restent valables).
alter table public.coach_sets add column if not exists created_at timestamptz not null default now();
alter table public.coach_sets drop constraint if exists coach_sets_pkey;
alter table public.coach_sets alter column owner set not null;
alter table public.coach_sets add primary key (code);
create index if not exists coach_sets_owner on public.coach_sets (owner, created_at);

-- 2. Au plus 10 groupes par entraîneur.
create or replace function private.coach_sets_limit() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.coach_sets where owner = new.owner) >= 10 then
    raise exception 'trop de groupes (10 au plus)' using errcode = 'P0001';
  end if;
  return new;
end $$;
revoke execute on function private.coach_sets_limit() from public, anon, authenticated;
drop trigger if exists coach_sets_limit on public.coach_sets;
create trigger coach_sets_limit before insert on public.coach_sets
  for each row execute function private.coach_sets_limit();

-- 3. Les droits de modification couvrent le nom, les exercices et les devoirs (inchangé par rapport à 0011).
grant update (name, puzzles, updated_at, homework) on public.coach_sets to authenticated;

-- 4. Suivi : d'un groupe précis (ou, sans code, du plus ancien groupe : anciens clients).
drop function if exists public.coach_progress();
create or replace function public.coach_progress(p_code text default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  c text;
begin
  if auth.uid() is null or not (select private.mfa_ok()) then raise exception 'non autorisé' using errcode = '42501'; end if;
  select s.code into c from public.coach_sets s
    where s.owner = auth.uid() and (p_code is null or s.code = upper(trim(p_code)))
    order by s.created_at, s.code limit 1;
  if c is null then return '[]'::jsonb; end if;
  perform private.coach_purge();
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', m.id, 'pseudo', m.pseudo, 'joined', m.consent_at, 'lastSeen', m.last_seen,
      'results', coalesce((
        select jsonb_agg(jsonb_build_object('t', r.t, 'mode', r.mode, 'score', r.score, 'errors', r.errors, 'played', r.played,
                                            'failed', r.failed, 'v', r.set_version, 'd', r.detail) order by r.t)
        from (select * from public.coach_results x where x.member = m.id and x.t > now() - interval '1 year' order by x.t desc limit 300) r
      ), '[]'::jsonb)
    ) order by lower(m.pseudo))
    from public.coach_members m where m.code = c
  ), '[]'::jsonb);
end $$;
revoke execute on function public.coach_progress(text) from public;
grant execute on function public.coach_progress(text) to authenticated;
