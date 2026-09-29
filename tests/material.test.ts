import assert from 'node:assert/strict';
import { test } from 'node:test';
import { familyOf, materialSignature } from '../src/core/material';

const LUCENA = '1K1k4/1P6/8/8/8/8/r7/2R5 w - - 0 1';

test('signature du point de vue de chaque camp', () => {
  assert.equal(materialSignature(LUCENA, 'w'), 'R+T+P vs R+T');
  assert.equal(materialSignature(LUCENA, 'b'), 'R+T vs R+T+P');
});

test('familles déduites du matériel', () => {
  assert.equal(familyOf(LUCENA), 'tours');
  assert.equal(familyOf('8/8/4k3/8/4K3/8/4P3/8 w - - 0 1'), 'pions');
  assert.equal(familyOf('8/8/8/8/1K6/8/3pk3/7Q w - - 0 1'), 'dames');
  assert.equal(familyOf('8/8/8/4k3/8/8/8/2B1KB2 w - - 0 1'), 'fous');
  assert.equal(familyOf('8/8/8/4k3/8/8/8/2B1KN2 w - - 0 1'), 'mixte');
});

test('matériel en symboles, avec libellé pour lecteur d’écran', async () => {
  const { materialSymbols } = await import('../src/core/material');
  const lucena = '1K1k4/1P6/8/8/8/8/r7/2R5 w - - 0 1';
  assert.deepEqual(materialSymbols(lucena, 'w'), { text: '♔♖♙ contre ♚♜', label: 'roi, tour, pion contre roi, tour' });
  assert.equal(materialSymbols('8/8/5PP1/8/8/2K5/8/r5k1 w - - 0 1', 'b').label, 'roi, tour contre roi, 2 pions');
});
