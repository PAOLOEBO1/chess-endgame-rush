-- 0005 — Défi de la semaine (même série de 10 finales pour tous).
-- À exécuter dans Supabase : SQL Editor → coller TOUT le fichier (Ctrl+A) → Run.
-- 1) les tentatives acceptent le mode « challenge » ;
-- 2) le classement gagne un onglet « challenge » (réussites sur les 10 positions de la
--    semaine en cours, première tentative seulement, départage au plus tôt terminé).

alter table public.attempts drop constraint if exists attempts_m_check;
alter table public.attempts add constraint attempts_m_check
  check (m in ('storm', 'streak', 'training', 'review', 'daily', 'challenge'));

create or replace function private.compute_leaderboard() returns jsonb
language sql stable set search_path = '' as $$
  with players as (
    select user_id, pseudo from public.profiles where leaderboard
  ),
  now_ms as (select (extract(epoch from now()) * 1000)::bigint as v),
  elo as (
    select p.user_id, p.pseudo, round(e.r)::int as value, e.games
    from players p cross join lateral private.player_elo(p.user_id) e
    where e.rd <= 110                              -- Elo stabilisé seulement (pas « provisoire »)
  ),
  storm as (
    select p.user_id, p.pseudo, max(x.score)::int as value, count(*)::int as games
    from players p join public.runs x on x.user_id = p.user_id
    where x.mode = 'storm' and x.theme = 'mix' and x.level <= 600  -- Mix, départ Automatique ou Débutant
      and x.played is not null and x.moves is not null and x.duration_ms is not null
      and x.score <= x.played and x.moves >= x.score
      and x.duration_ms >= x.played * 1000         -- au moins 1 s par puzzle
      and x.duration_ms <= 185000 + x.score * 3000 -- 3 min + bonus de temps possibles
      and x.t <= (select v from now_ms) + 600000
    group by p.user_id, p.pseudo
  ),
  week as (
    select p.user_id, p.pseudo, count(distinct a.p)::int as value, count(*)::int as games
    from players p join public.attempts a on a.user_id = p.user_id
    where a.ok and a.t between (select v from now_ms) - 7 * 86400000 and (select v from now_ms) + 600000
    group by p.user_id, p.pseudo
  ),
  -- Défi de la semaine (lundi 0 h, heure de Paris) : première tentative de chaque
  -- position, 10 positions au plus ; départage : le plus tôt terminé.
  week_start as (
    select (extract(epoch from (date_trunc('week', now() at time zone 'Europe/Paris') at time zone 'Europe/Paris')) * 1000)::bigint as v
  ),
  challenge_first as (
    select distinct on (a.user_id, a.p) a.user_id, a.p, a.ok, a.t
    from public.attempts a
    where a.m = 'challenge' and a.t >= (select v from week_start) and a.t <= (select v from now_ms) + 600000
      and a.user_id in (select user_id from players)
    order by a.user_id, a.p, a.t, a.id
  ),
  challenge_top as (
    select *, row_number() over (partition by user_id order by t) as n from challenge_first
  ),
  challenge as (
    select p.user_id, p.pseudo, count(*) filter (where c.ok)::int as value, count(*)::int as games, max(c.t) as finished
    from players p join challenge_top c on c.user_id = p.user_id
    where c.n <= 10
    group by p.user_id, p.pseudo
  ),
  ranked as (
    select 'elo' as kind, rank() over (order by value desc) as rank, * from elo
    union all select 'storm', rank() over (order by value desc), * from storm
    union all select 'week', rank() over (order by value desc), * from week
    union all select 'challenge', rank() over (order by value desc, finished), user_id, pseudo, value, games from challenge
  )
  select coalesce(jsonb_object_agg(kind, rows), '{}'::jsonb)
  from (
    select kind, jsonb_agg(jsonb_build_object('rank', rank, 'pseudo', pseudo, 'value', value, 'games', games, 'uid', user_id)
                           order by rank, pseudo) as rows
    from ranked group by kind
  ) k
$$;

revoke execute on function private.compute_leaderboard() from public, anon, authenticated;

-- Recalcul immédiat au prochain affichage.
delete from private.leaderboard_cache;
