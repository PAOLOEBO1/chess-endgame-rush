-- 0006 — Classement public : attestation d'âge (15 ans ou accord d'un parent).
-- À exécuter dans Supabase : SQL Editor → coller TOUT le fichier (Ctrl+A) → Run.
--
-- En France, quand un traitement repose sur le consentement, un mineur de moins de
-- 15 ans a besoin de l'accord d'un titulaire de l'autorité parentale (loi Informatique
-- et Libertés, art. 45 ; CNIL, recommandation 4 sur les droits numériques des mineurs).
-- La participation au classement repose sur le consentement : le joueur atteste avoir
-- 15 ans ou plus, ou l'accord d'un parent. Les participants actuels sont retirés du
-- classement jusqu'à ce qu'ils confirment (une case à cocher dans l'appli).

alter table public.profiles add column if not exists age_ok boolean not null default false;

update public.profiles set leaderboard = false where leaderboard and not age_ok;

alter table public.profiles drop constraint if exists profiles_leaderboard_age;
alter table public.profiles add constraint profiles_leaderboard_age check (not leaderboard or age_ok);

grant update (pseudo, leaderboard, age_ok) on public.profiles to authenticated;

-- Recalcul du classement au prochain affichage.
delete from private.leaderboard_cache;
