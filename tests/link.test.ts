import assert from 'node:assert/strict';
import { test } from 'node:test';
import { linkPlan } from '../src/core/link';

test('première connexion : quel profil relier au compte', () => {
  assert.equal(linkPlan('p1', 50, 0), 'current'); // compte neuf : il reprend le profil en cours
  assert.equal(linkPlan('p1', 0, 300), 'current'); // profil vide : il devient celui du compte
  assert.equal(linkPlan('p1', 12, 300), 'ask'); // deux historiques : on demande
  assert.equal(linkPlan(null, 0, 300), 'new'); // invité : nouveau profil au nom du compte
  assert.equal(linkPlan(null, 0, 0), 'new');
});
