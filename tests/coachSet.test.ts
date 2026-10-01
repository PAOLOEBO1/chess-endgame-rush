import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parsePgnExercises } from '../src/core/chessRules';
import { coachPuzzles, draftsFromPgn, estimateCoachRating, fileOrderRatings, finalizeItems, newCoachCode, COACH_CODE, ratingFeatures, sanitizeCoachItems } from '../src/core/coachSet';

const PGN = `[Event "Mat du couloir"]
[FEN "6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1"]
[Result "*"]

1. Rd8# { simple } (1. Rd7 h6) *

[Event "?"]
[White "Carlsen"]
[Black "Anand"]
[FEN "8/8/8/4k3/8/8/4P3/4K3 w - - 0 1"]
[Result "1-0"]
[Rating "1350"]

1. Kd2 Kd5 2. Kd3 *

[Event "Sans position"]

1. e4 e5 *

[Event "Philidor"]
[FEN "4k3/7R/r7/3PK3/8/8/8/8 b - - 0 1"]
[Result "1/2-1/2"]

1... Rb6 2. d6 Rb1 *
`;

test('PGN d’exercices : position, solution, titre, objectif, Elo de l’en-tête', () => {
  const { items, skipped } = parsePgnExercises(PGN.replace(/\n/g, '\r\n'));
  assert.deepEqual(skipped, [{ index: 3, reason: 'pas de position de départ (en-tête FEN)' }]);
  const d = draftsFromPgn(items);
  assert.deepEqual(d.map((x) => [x.index, x.title, x.objective, x.headerRating, x.solution.join(' ')]), [
    [1, 'Mat du couloir', 'win', null, 'd1d8'],
    [2, 'Carlsen – Anand', 'win', 1350, 'e1d2 e5d5 d2d3'],
    [4, 'Philidor', 'draw', null, 'a6b6 d5d6 b6b1'],
  ]);
});

test('Elo estimé : plus élevé pour une solution longue et peu naturelle', () => {
  const { items } = parsePgnExercises(PGN);
  const [mate, , phil] = draftsFromPgn(items);
  const fm = ratingFeatures(mate, 0);
  assert.equal(fm.naturalMove, true); // échec et mat
  assert.equal(fm.playerMoves, 1);
  const fp = ratingFeatures(phil, 2);
  assert.equal(fp.naturalMove, false);
  assert.ok(estimateCoachRating(fp) > estimateCoachRating(fm));
  assert.equal(estimateCoachRating({ playerMoves: 1, naturalMove: true, objective: 'win', legalMoves: 10, engineTier: 0 }), 800);
});

test('ordre du fichier : Elo croissant et borné ; tri du plus facile au plus difficile', () => {
  assert.deepEqual(fileOrderRatings(3), [600, 640, 680]);
  const r = fileOrderRatings(500);
  assert.ok(r[499] <= 2400 && r[1] > r[0]);
  const { items } = parsePgnExercises(PGN);
  const drafts = draftsFromPgn(items);
  const out = finalizeItems(drafts, [{ r: 1500, estimated: true }, { r: 900, estimated: false }, { r: 1500, estimated: true }]);
  assert.deepEqual(out.map((x) => x.t), ['Carlsen – Anand', 'Mat du couloir', 'Philidor']);
  assert.equal(out[0].e, undefined);
  assert.equal(out[1].e, 1);
});

test('exercices reçus : validés puis transformés en puzzles', () => {
  const ok = { f: '6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1', s: ['d1d8'], r: 800, o: 'w', t: 'Couloir' };
  const items = sanitizeCoachItems([ok, { ...ok, f: 'faux' }, { ...ok, s: ['zz'] }, { ...ok, r: 9999 }]);
  assert.equal(items.length, 1);
  const [p] = coachPuzzles('ABCDEFGH', items);
  assert.equal(p.id, 'c-ABCDEFGH-1');
  assert.equal(p.collection, 'coach');
  assert.deepEqual(p.solution, ['d1d8']);
});

test('code de groupe : 8 caractères sans ambiguïté', () => {
  const code = newCoachCode();
  assert.match(code, COACH_CODE);
  assert.equal(newCoachCode(() => new Uint8Array(8)), 'AAAAAAAA');
});
