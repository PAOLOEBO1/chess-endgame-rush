import assert from 'node:assert/strict';
import { test } from 'node:test';
import { applyUci, isInCheck, legalDestsMap } from '../src/core/chessRules';
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

test('nouvelles leçons : les issues annoncées sont exactes', () => {
  const play = (id: string) => {
    const l = LESSONS.find((x) => x.id === id)!;
    let fen = l.fen;
    const sans = l.steps.map((s) => {
      const m = applyUci(fen, s.uci)!;
      fen = m.fen;
      return m.san;
    });
    return { fen, sans };
  };
  // Pat : aucun coup légal et pas d'échec.
  const pat = play('lecon-mauvais-fou');
  assert.equal(isInCheck(pat.fen), false);
  assert.equal(legalDestsMap(pat.fen).size, 0);
  assert.equal(play('lecon-roi-6e').sans.at(-1), 'e8=Q+');
  assert.equal(play('lecon-dame-tour').sans[0], 'Qc1+');
  assert.equal(play('lecon-dame-tour').sans.at(-1), 'Qxb2');
  assert.equal(play('lecon-dame-pion').sans.at(-1), 'Qxd2');
  assert.deepEqual(play('lecon-pion-eloigne').sans.filter((s) => s.includes('x')), ['Kxa5', 'Kxg5']);
});
