-- Chess Endgame Rush — 0010 (02/10/2026) : temps de réflexion et détail par exercice.
-- Peut être relancé sans risque.
-- À exécuter une fois dans Supabase : SQL Editor → New query → coller TOUT → Run, AVANT de publier la version.

-- 1) Chaque tentative garde son temps de réflexion (ms) et le premier mauvais coup joué (UCI).
alter table public.attempts add column if not exists ms integer;
alter table public.attempts add column if not exists w text;
alter table public.attempts drop constraint if exists attempts_ms_check;
alter table public.attempts add constraint attempts_ms_check check (ms is null or ms between 0 and 3600000);
alter table public.attempts drop constraint if exists attempts_w_check;
alter table public.attempts add constraint attempts_w_check check (w is null or w ~ '^[a-h][1-8][a-h][1-8][qrbn]?$');

-- 2) Résultats envoyés à l'entraîneur : détail exercice par exercice
--    [{ i: rang dans la base, ok, ms, w, e }], 300 au plus.
alter table public.coach_results add column if not exists detail jsonb;
alter table public.coach_results drop constraint if exists coach_results_detail_check;
alter table public.coach_results add constraint coach_results_detail_check
  check (detail is null or (jsonb_typeof(detail) = 'array' and jsonb_array_length(detail) <= 300 and octet_length(detail::text) <= 30000));

-- Ne garde du détail envoyé (par un élève, donc non fiable) que des champs connus et valides.
create or replace function private.coach_clean_detail(p jsonb) returns jsonb
language sql immutable set search_path = '' as $$
  select case when p is null or jsonb_typeof(p) <> 'array' then null else (
    select jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
             'i', (x->>'i')::int,
             'ok', (x->>'ok')::boolean,
             'ms', case when jsonb_typeof(x->'ms') = 'number' and (x->>'ms') ~ '^\d{1,7}$' and (x->>'ms')::int <= 3600000
                        then (x->>'ms')::int end,
             'w',  case when (x->>'w') ~ '^[a-h][1-8][a-h][1-8][qrbn]?$' then x->>'w' end,
             'e',  case when (x->>'e') in ('win-lost', 'stalemate', 'loses', 'slow', 'defense', 'hint') then x->>'e' end
           )) order by n)
    from jsonb_array_elements(p) with ordinality as t(x, n)
    where n <= 300
      and jsonb_typeof(x) = 'object'
      and jsonb_typeof(x->'i') = 'number' and (x->>'i') ~ '^\d{1,3}$' and (x->>'i')::int < 500
      and jsonb_typeof(x->'ok') = 'boolean'
  ) end;
$$;
revoke execute on function private.coach_clean_detail(jsonb) from public, anon, authenticated;

-- Élève : envoyer le résultat d'une partie, avec le détail (au plus 200 par jour).
-- L'ancienne version (sans détail) est remplacée ; les appareils pas encore à jour l'appellent
-- toujours avec les mêmes paramètres nommés, le détail valant alors null.
drop function if exists public.coach_report(uuid, text, text, int, int, int, smallint[], timestamptz);
create or replace function public.coach_report(p_member uuid, p_secret text, p_mode text, p_score int, p_errors int, p_played int,
                                               p_failed smallint[], p_version timestamptz, p_detail jsonb default null) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.coach_members where id = p_member and secret_hash = encode(extensions.digest(p_secret, 'sha256'), 'hex')) then
    raise exception 'membre inconnu' using errcode = 'P0002';
  end if;
  if (select count(*) from public.coach_results where member = p_member and t > now() - interval '1 day') >= 200 then
    raise exception 'trop de résultats aujourd''hui' using errcode = 'P0001';
  end if;
  insert into public.coach_results (member, mode, score, errors, played, failed, set_version, detail)
    values (p_member, p_mode, p_score, p_errors, p_played, coalesce(p_failed[1:100], '{}'), p_version, private.coach_clean_detail(p_detail));
  update public.coach_members set last_seen = now() where id = p_member;
end $$;

-- Entraîneur connecté : ses élèves et leurs résultats (avec le détail, champ « d »).
create or replace function public.coach_progress() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  c text;
begin
  if auth.uid() is null or not (select private.mfa_ok()) then raise exception 'non autorisé' using errcode = '42501'; end if;
  select code into c from public.coach_sets where owner = auth.uid();
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

revoke execute on function public.coach_report(uuid, text, text, int, int, int, smallint[], timestamptz, jsonb) from public;
grant execute on function public.coach_report(uuid, text, text, int, int, int, smallint[], timestamptz, jsonb) to anon, authenticated;
revoke execute on function public.coach_progress() from public;
grant execute on function public.coach_progress() to authenticated;
