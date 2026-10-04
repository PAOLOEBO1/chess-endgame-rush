import assert from 'node:assert/strict';
import { test } from 'node:test';
import { activeGroup, emptyJoined, MAX_JOINED, migrateLegacy, removeGroup, selectGroup, setDeclined, upsertGroup } from '../src/core/studentGroups';

type G = { code: string; name: string };
const g = (code: string, name = code): G => ({ code, name });

test('plusieurs groupes : ajout, mise à jour sans doublon, groupe actif', () => {
  let s = emptyJoined<G>();
  assert.equal(activeGroup(s), null);
  s = upsertGroup(s, g('AAAAAAAA'), false)!;
  assert.equal(s.active, 'AAAAAAAA', 'le premier groupe devient actif même sans demande');
  s = upsertGroup(s, g('BBBBBBBB'), false)!;
  assert.equal(s.active, 'AAAAAAAA', 'ajouter un groupe ne change pas le groupe joué');
  s = upsertGroup(s, g('BBBBBBBB', 'Débutants'), true)!;
  assert.equal(s.groups.length, 2, 'même code = copie remplacée');
  assert.equal(activeGroup(s)?.name, 'Débutants');
  s = selectGroup(s, 'AAAAAAAA');
  assert.equal(activeGroup(s)?.code, 'AAAAAAAA');
  assert.equal(selectGroup(s, 'ZZZZZZZZ'), s, 'code inconnu ignoré');
});

test('plusieurs groupes : 10 au plus, mais un groupe déjà rejoint se met toujours à jour', () => {
  let s = emptyJoined<G>();
  for (let i = 0; i < MAX_JOINED; i++) s = upsertGroup(s, g(`GROUPE0${i}`), false)!;
  assert.equal(upsertGroup(s, g('NOUVEAU1'), true), null);
  assert.equal(upsertGroup(s, g('GROUPE03', 'renommé'), true)?.groups[3].name, 'renommé');
});

test('quitter un groupe : le suivant devient actif, le refus de partage est oublié', () => {
  let s = upsertGroup(upsertGroup(emptyJoined<G>(), g('AAAAAAAA'), true)!, g('BBBBBBBB'), false)!;
  s = setDeclined(s, 'AAAAAAAA', true);
  s = setDeclined(s, 'BBBBBBBB', true);
  assert.deepEqual(s.declined, ['AAAAAAAA', 'BBBBBBBB']);
  s = setDeclined(s, 'BBBBBBBB', false);
  assert.deepEqual(s.declined, ['AAAAAAAA']);
  s = removeGroup(s, 'AAAAAAAA');
  assert.equal(s.active, 'BBBBBBBB');
  assert.deepEqual(s.declined, []);
  s = removeGroup(s, 'BBBBBBBB');
  assert.deepEqual(s, { groups: [], active: null, declined: [] });
});

test('reprise de l’ancien stockage (un seul groupe) sans perte', () => {
  const m = { code: 'BBBBBBBB', memberId: 'x', secret: 's', pseudo: 'Léa' };
  const { state, members } = migrateLegacy(g('AAAAAAAA'), m, 'AAAAAAAA');
  assert.deepEqual(state, { groups: [g('AAAAAAAA')], active: 'AAAAAAAA', declined: ['AAAAAAAA'] });
  assert.deepEqual(members, { BBBBBBBB: m }, 'suivi conservé même dans un autre groupe que celui affiché');
  assert.deepEqual(migrateLegacy<G, typeof m>(null, null, null), { state: { groups: [], active: null, declined: [] }, members: {} });
});
