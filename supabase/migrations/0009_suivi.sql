-- Chess Endgame Rush — 0009 (01/10/2026) : suivi des élèves par l'entraîneur.
-- Peut être relancé sans risque.
-- À exécuter une fois dans Supabase : SQL Editor → New query → coller TOUT → Run, AVANT de publier la version.
--
-- Un élève rejoint le groupe d'un entraîneur (code) sous un PSEUDO, avec son consentement ; ses résultats
-- de Storm / Streak sur la base de l'entraîneur sont alors envoyés, et visibles par CET entraîneur seulement.
-- Pas de compte nécessaire : l'appareil de l'élève garde un secret (dont la base ne stocke que l'empreinte).
-- Tables fermées à tous : tout passe par les fonctions ci-dessous (avertissements « security definer » du
-- Security Advisor VOULUS : ne pas cliquer « Resolve »). Effacement automatique après un an d'inactivité.

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.coach_members (
  id          uuid primary key default gen_random_uuid(),
  code        text not null references public.coach_sets (code) on delete cascade,
  pseudo      text not null check (pseudo ~ '^[[:alnum:] _.-]{2,30}$'),
  secret_hash text not null,
  consent_at  timestamptz not null default now(),
  last_seen   timestamptz not null default now()
);
create unique index if not exists coach_members_pseudo on public.coach_members (code, lower(pseudo));

create table if not exists public.coach_results (
  id       bigint generated always as identity primary key,
  member   uuid not null references public.coach_members (id) on delete cascade,
  t        timestamptz not null default now(),
  mode     text not null check (mode in ('storm', 'streak')),
  score    smallint not null check (score between 0 and 1000),
  errors   smallint not null check (errors between 0 and 1000),
  played   smallint not null check (played between 0 and 2000),
  failed   smallint[] not null default '{}' check (cardinality(failed) <= 100),
  set_version timestamptz
);
create index if not exists coach_results_member on public.coach_results (member, t desc);

revoke all on public.coach_members, public.coach_results from public, anon, authenticated;
alter table public.coach_members enable row level security;
alter table public.coach_results enable row level security;

create or replace function private.coach_purge() returns void
language sql security definer set search_path = '' as $$
  delete from public.coach_members where last_seen < now() - interval '1 year';
$$;
revoke execute on function private.coach_purge() from public, anon, authenticated;

-- Élève : rejoindre le groupe (renvoie l'identifiant de membre).
create or replace function public.coach_join(p_code text, p_pseudo text, p_secret text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  c text := upper(trim(p_code));
  m uuid;
begin
  if char_length(coalesce(p_secret, '')) < 32 then raise exception 'secret invalide' using errcode = '22023'; end if;
  if not exists (select 1 from public.coach_sets where code = c) then raise exception 'groupe inconnu' using errcode = 'P0002'; end if;
  if (select count(*) from public.coach_members where code = c) >= 200 then raise exception 'groupe complet' using errcode = 'P0001'; end if;
  perform private.coach_purge();
  insert into public.coach_members (code, pseudo, secret_hash)
    values (c, trim(p_pseudo), encode(extensions.digest(p_secret, 'sha256'), 'hex'))
    returning id into m;
  return m;
end $$;

-- Élève : envoyer le résultat d'une partie (au plus 200 par jour).
create or replace function public.coach_report(p_member uuid, p_secret text, p_mode text, p_score int, p_errors int, p_played int,
                                               p_failed smallint[], p_version timestamptz) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.coach_members where id = p_member and secret_hash = encode(extensions.digest(p_secret, 'sha256'), 'hex')) then
    raise exception 'membre inconnu' using errcode = 'P0002';
  end if;
  if (select count(*) from public.coach_results where member = p_member and t > now() - interval '1 day') >= 200 then
    raise exception 'trop de résultats aujourd''hui' using errcode = 'P0001';
  end if;
  insert into public.coach_results (member, mode, score, errors, played, failed, set_version)
    values (p_member, p_mode, p_score, p_errors, p_played, coalesce(p_failed[1:100], '{}'), p_version);
  update public.coach_members set last_seen = now() where id = p_member;
end $$;

-- Élève : quitter le groupe (ses résultats sont supprimés avec lui).
create or replace function public.coach_leave(p_member uuid, p_secret text) returns void
language sql security definer set search_path = '' as $$
  delete from public.coach_members where id = p_member and secret_hash = encode(extensions.digest(p_secret, 'sha256'), 'hex');
$$;

-- Entraîneur connecté : ses élèves et leurs résultats des 12 derniers mois (300 derniers par élève).
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
                                            'failed', r.failed, 'v', r.set_version) order by r.t)
        from (select * from public.coach_results x where x.member = m.id and x.t > now() - interval '1 year' order by x.t desc limit 300) r
      ), '[]'::jsonb)
    ) order by lower(m.pseudo))
    from public.coach_members m where m.code = c
  ), '[]'::jsonb);
end $$;

-- Entraîneur connecté : retirer un élève de son groupe (et ses résultats).
create or replace function public.coach_remove_member(p_member uuid) returns void
language sql security definer set search_path = '' as $$
  delete from public.coach_members m
  using public.coach_sets s
  where m.id = p_member and m.code = s.code and s.owner = auth.uid() and (select private.mfa_ok());
$$;

revoke execute on function public.coach_join(text, text, text) from public;
revoke execute on function public.coach_report(uuid, text, text, int, int, int, smallint[], timestamptz) from public;
revoke execute on function public.coach_leave(uuid, text) from public;
revoke execute on function public.coach_progress() from public;
revoke execute on function public.coach_remove_member(uuid) from public;
grant execute on function public.coach_join(text, text, text) to anon, authenticated;
grant execute on function public.coach_report(uuid, text, text, int, int, int, smallint[], timestamptz) to anon, authenticated;
grant execute on function public.coach_leave(uuid, text) to anon, authenticated;
grant execute on function public.coach_progress() to authenticated;
grant execute on function public.coach_remove_member(uuid) to authenticated;
