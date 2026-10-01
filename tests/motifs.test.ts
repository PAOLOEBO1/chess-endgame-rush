import assert from 'node:assert/strict';
import { test } from 'node:test';
import { hasMotif, motifChoices, motifId, motifLabel, parseThemes } from '../src/core/motifs';
import { draftsFromPgn, finalizeItems, sanitizeCoachItems, coachPuzzles } from '../src/core/coachSet';
import type { Puzzle } from '../src/core/types';

test('motifs : identifiants sûrs et libellés', () => {
  assert.equal(motifId('zugzwang'), 'zugzwang');
  assert.equal(motifId('advancedPawn'), 'advancedPawn');
  assert.equal(motifId('Opposition à distance'), 'opposition-a-distance');
  assert.equal(motifId('  <b> '), 'b');
  assert.equal(motifLabel('advancedPawn'), 'Pion avancé');
  assert.equal(motifLabel('opposition-a-distance'), 'Opposition a distance');
  assert.match(`mix.${motifId('Règle du carré')}`, /^[\w./-]+$/); // valide comme thème de partie
});

test('motifs : en-tête [Theme] (virgules, clés Lichess, 3 au plus, sans doublon)', () => {
  assert.deepEqual(parseThemes('Opposition, Triangulation ; opposition'), ['Opposition', 'Triangulation']);
  assert.deepEqual(parseThemes('zugzwang advancedPawn'), ['zugzwang', 'advancedPawn']);
  assert.deepEqual(parseThemes('Règle du carré'), ['Règle du carré']);
  assert.deepEqual(parseThemes('a,b,c,d'), ['a', 'b', 'c']);
  assert.deepEqual(parseThemes(undefined), []);
});

test('motifs : choix proposés selon le nombre d’exercices', () => {
  const p = (i: number, themes: string[]): Puzzle => ({ id: `p${i}`, title: '', fen: '', objective: 'win', collection: 'coach', level: 'debutant', rating: 1000, concept: '', themes });
  const coach = [p(1, ['Opposition']), p(2, ['opposition', 'Triangulation']), p(3, ['Opposition']), p(4, ['Triangulation'])];
  assert.deepEqual(motifChoices(coach, true), [{ id: 'opposition', label: 'Opposition', n: 3 }]);
  assert.ok(hasMotif(coach[1], 'opposition'));
  const lichess = Array.from({ length: 120 }, (_, i) => p(i, i < 110 ? ['zugzwang', 'crushing'] : ['fork']));
  assert.deepEqual(motifChoices(lichess, false), [{ id: 'zugzwang', label: 'Zugzwang', n: 110 }]);
});

test('base entraîneur : les thèmes passent du PGN aux exercices jouables', () => {
  const fen = '8/8/8/4k3/8/8/8/3QK3 w - - 0 1';
  const drafts = draftsFromPgn([{ index: 1, fen, moves: ['d1d7'], headers: { Theme: 'Opposition, Mat' } }]);
  const items = finalizeItems(drafts, [{ r: 900, estimated: false }]);
  assert.deepEqual(items[0].th, ['Opposition', 'Mat']);
  const back = sanitizeCoachItems([...items, { ...items[0], th: ['<x>', 42, 'Opposition'] }]);
  assert.deepEqual(back[0].th, ['Opposition', 'Mat']);
  assert.deepEqual(back[1].th, ['x', 'Opposition']);
  assert.deepEqual(coachPuzzles('ABCDEFGH', back)[0].themes, ['Opposition', 'Mat']);
});
