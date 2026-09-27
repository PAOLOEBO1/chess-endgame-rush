import assert from 'node:assert/strict';
import { test } from 'node:test';
import { applyUci } from '../src/core/chessRules';
import { LESSONS } from '../src/data/lessons';
import { PUZZLES_MOCK } from '../src/data/puzzlesMock';

test('leçons : chaque coup est légal et chaque leçon mène à une position Bases existante', () => {
  for (const lesson of LESSONS) {
    let fen = lesson.fen;
    for (const [i, step] of lesson.steps.entries()) {
      const m = applyUci(fen, step.uci);
      assert.ok(m, `${lesson.id} : coup ${i + 1} (${step.uci}) illégal`);
      fen = m!.fen;
    }
    assert.ok(PUZZLES_MOCK.some((p) => p.id === lesson.practiceId && p.fen === lesson.fen), `${lesson.id} : position d'entraînement`);
  }
});

test('leçons : les coups annoncés comme échecs en sont bien', () => {
  const lucena = LESSONS.find((l) => l.id === 'lecon-lucena')!;
  let fen = lucena.fen;
  const sans = lucena.steps.map((s) => {
    const m = applyUci(fen, s.uci)!;
    fen = m.fen;
    return m.san;
  });
  assert.deepEqual(sans.slice(0, 3), ['Rd1+', 'Ke7', 'Rd4']);
  assert.equal(sans.at(-1), 'Rb4');
});
