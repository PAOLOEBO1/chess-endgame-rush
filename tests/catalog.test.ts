import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BASICS, buildPool, classify, PARCOURS } from '../src/app/catalog';
import type { Puzzle } from '../src/core/types';

const pz = (id: string, fen: string): Puzzle =>
  classify({ id, title: id, fen, objective: 'win', collection: 'lichess', level: 'intermediaire', rating: 1500, concept: '' } as Puzzle);

test('catalogue : Bases triées dans l’ordre du parcours conseillé', () => {
  const ranked = BASICS.map((b) => PARCOURS.indexOf(b.id)).filter((i) => i >= 0);
  assert.deepEqual(ranked, [...ranked].sort((a, b) => a - b));
  assert.ok(BASICS.every((b) => b.family && b.subcategory));
});

test('catalogue : choix des puzzles d’un thème', () => {
  const tours = pz('t', '8/8/4k3/8/8/4K3/4R3/8 w - - 0 1');
  const pions = pz('p', '8/8/4k3/8/8/4K3/4P3/8 w - - 0 1');
  const list = [tours, pions];
  assert.equal(buildPool('mix', 'all', list).length, 2);
  assert.deepEqual(buildPool(tours.family as never, 'all', list).map((p) => p.id), ['t']);
  assert.deepEqual(buildPool(tours.family as never, 'sous-theme-inconnu', list), []);
});
