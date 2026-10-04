-- Vérification de la migration 0012 (plusieurs groupes par entraîneur).
-- Banc local : mock-supabase.sql + schéma extensions + migrations 0001 à 0012 sur une base NEUVE, puis ce fichier
-- (à lancer depuis la racine du dépôt, à cause de \i en fin de fichier).
\set ON_ERROR_STOP 0
\set A '11111111-1111-1111-1111-111111111111'
\set B '22222222-2222-2222-2222-222222222222'
\pset tuples_only on

-- A crée 9 groupes.
set role authenticated; select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","aal":"aal1"}', false) \g /dev/null
select 'T1 A crée 9 groupes (9 attendus)';
insert into public.coach_sets (code, name) select 'AAAAAAA' || g, 'Groupe ' || g from generate_series(2, 9) g;
insert into public.coach_sets (code, name) values ('AAAAAAAB', 'Groupe 10');
select count(*) from public.coach_sets;
reset role;

-- B : ses groupes sont à lui, ceux de A lui sont invisibles et intouchables.
set role authenticated; select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","aal":"aal1"}', false) \g /dev/null
select 'T2 B ne voit aucun groupe de A (0 attendu)', count(*) from public.coach_sets;
select 'T2b B modifie un groupe de A (UPDATE 0 attendu)'; update public.coach_sets set name = 'piraté' where code = 'AAAAAAA2';
select 'T2c B supprime un groupe de A (DELETE 0 attendu)'; delete from public.coach_sets where code = 'AAAAAAA2';
select 'T2d B crée son propre groupe (INSERT 0 1 attendu)'; insert into public.coach_sets (code, name) values ('BBBBBBBB', 'Groupe de B');
select 'T2e B insère un groupe au nom de A (refus RLS attendu)'; insert into public.coach_sets (owner, code, name) values (:'A', 'BBBBBBBC', 'faux');
select 'T2f B reprend le code d''un groupe de A (refus 23505 attendu)'; insert into public.coach_sets (code, name) values ('AAAAAAAB', 'Doublon');
reset role;
select 'T2g groupes de A intacts (9 attendus, piratés : 0)', count(*) filter (where owner = :'A'), count(*) filter (where name = 'piraté') from public.coach_sets;

-- Limite de 10.
set role authenticated; select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","aal":"aal1"}', false) \g /dev/null
select 'T3 A crée le 10e groupe (INSERT 0 1 attendu)'; insert into public.coach_sets (code, name) values ('AAAAAAAC', 'Groupe 1');
select 'T3b 11e groupe (refus P0001 « trop de groupes » attendu)'; insert into public.coach_sets (code, name) values ('AAAAAAAD', 'Groupe 11');
select 'T3c A supprime un groupe puis en recrée un (INSERT 0 1 attendu)'; delete from public.coach_sets where code = 'AAAAAAAC';
insert into public.coach_sets (code, name) values ('AAAAAAAC', 'Groupe 1 bis');
select 'T3d renommer sans changer la version : updated_at identique (t attendu)'; update public.coach_sets set name = 'Renommé' where code = 'AAAAAAAC';
select name = 'Renommé' from public.coach_sets where code = 'AAAAAAAC';
reset role;

-- Élèves (anon) : lecture par code, inscription, résultat.
set role anon;
select 'T4 lecture par code (t attendu)', public.coach_set('AAAAAAA2') is not null;
select 'T4b code inconnu (vide attendu)', public.coach_set('ZZZZZZZZ');
select 'T4c Alice rejoint le groupe 2 (t attendu)', public.coach_join('AAAAAAA2', 'Alice', repeat('s', 40)) is not null;
select 'T4d Bob rejoint le groupe 3 (t attendu)', public.coach_join('AAAAAAA3', 'Bob', repeat('t', 40)) is not null;
select 'T4e même pseudo dans le même groupe (refus 23505 attendu)'; select public.coach_join('AAAAAAA2', 'alice', repeat('u', 40));
reset role;
select id as alice from public.coach_members where pseudo = 'Alice' \gset
select id as bob from public.coach_members where pseudo = 'Bob' \gset
select 'T4f résultat d''Alice envoyé'; select public.coach_report(:'alice', repeat('s', 40), 'storm', 12, 1, 13, '{}', null, null);

-- Suivi par groupe.
set role authenticated; select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","aal":"aal1"}', false) \g /dev/null
select 'T5 suivi du groupe 2 (1 et Alice attendus)', jsonb_array_length(public.coach_progress('AAAAAAA2')), public.coach_progress('AAAAAAA2')->0->>'pseudo';
select 'T5b suivi du groupe 3 (Bob attendu)', public.coach_progress('AAAAAAA3')->0->>'pseudo';
select 'T5c suivi du groupe 4 (0 attendu)', jsonb_array_length(public.coach_progress('AAAAAAA4'));
select 'T5d code en minuscules avec espaces (1 attendu)', jsonb_array_length(public.coach_progress(' aaaaaaa2 '));
select 'T5e sans code, anciens clients (array attendu)', jsonb_typeof(public.coach_progress());
select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","aal":"aal1"}', false) \g /dev/null
select 'T5f B demande le suivi d''un groupe de A (0 attendu)', jsonb_array_length(public.coach_progress('AAAAAAA2'));
select 'T5g B demande le suivi de son groupe (0 attendu)', jsonb_array_length(public.coach_progress('BBBBBBBB'));
select 'T5h B retire Alice (rien ne doit être supprimé)'; select public.coach_remove_member(:'alice');
reset role;
select 'T5i Alice toujours là (1 attendu)', count(*) from public.coach_members where pseudo = 'Alice';
set role authenticated; select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","aal":"aal1"}', false) \g /dev/null
select 'T5j A retire Alice'; select public.coach_remove_member(:'alice');
reset role;
select 'T5k Alice et ses résultats supprimés (0 et 0 attendus)', (select count(*) from public.coach_members where pseudo = 'Alice'), (select count(*) from public.coach_results);

-- Suppression d'un groupe : ses élèves partent avec lui, les autres groupes restent.
set role authenticated; select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","aal":"aal1"}', false) \g /dev/null
select 'T6 A supprime le groupe 3 (DELETE 1 attendu)'; delete from public.coach_sets where code = 'AAAAAAA3';
reset role;
select 'T6b Bob supprimé avec son groupe, 9 groupes restants pour A (0 et 9 attendus)', (select count(*) from public.coach_members where pseudo = 'Bob'), (select count(*) from public.coach_sets where owner = :'A');

-- Droits : anon ne touche ni à la table ni au suivi.
set role anon;
select 'T7 anon lit coach_sets (refus attendu)'; select count(*) from public.coach_sets;
select 'T7b anon appelle coach_progress (refus attendu)'; select public.coach_progress('AAAAAAA2');
reset role;

-- Relance de la migration : sans effet sur les données.
\i supabase/migrations/0012_groupes_multiples.sql
select 'T8 migration relancée : 9 groupes de A toujours là (9 attendus)', count(*) from public.coach_sets where owner = :'A';
