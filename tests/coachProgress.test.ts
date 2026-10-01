import assert from 'node:assert/strict';
import { test } from 'node:test';
import { coachIndexOf, hardestExercises, studentRows, type MemberProgress } from '../src/core/coachProgress';

const R = (day: number, mode: 'storm' | 'streak', score: number, errors: number, played: number, failed: number[] = [], v: string | null = 'V2') => ({
  t: `2026-10-${String(day).padStart(2, '0')}T10:00:00Z`, mode, score, errors, played, failed, v,
});

const members: MemberProgress[] = [
  { id: 'a', pseudo: 'Léo', joined: '', lastSeen: '2026-10-12', results: [...[5, 6, 5, 7, 6, 9, 10, 11, 10, 12].map((s, i) => R(i + 1, 'storm', s, 1, s + 1, [2])), R(11, 'streak', 8, 1, 9, [4])] },
  { id: 'b', pseudo: 'Zoé', joined: '', lastSeen: '2026-10-03', results: [R(2, 'storm', 3, 3, 6, [2, 7], 'V1'), R(3, 'storm', 4, 2, 6, [2, 7])] },
  { id: 'c', pseudo: 'Max', joined: '', lastSeen: '2026-10-01', results: [] },
];

test('suivi : synthèse par élève (meilleurs scores, réussite, tendance)', () => {
  const [leo, zoe, max] = studentRows(members);
  assert.equal(leo.sessions, 11);
  assert.equal(leo.bestStorm, 12);
  assert.equal(leo.bestStreak, 8);
  assert.equal(leo.trend, 4.6); // (9+10+11+10+12)/5 − (5+6+5+7+6)/5
  assert.equal(zoe.trend, null);
  assert.equal(zoe.success, 7 / 12);
  assert.equal(max.success, null);
  assert.equal(max.bestStorm, null);
});

test('suivi : exercices les plus ratés, sur la version actuelle de la base', () => {
  assert.deepEqual(hardestExercises(members, 'V2'), [
    { index: 2, misses: 11, students: 2 },
    { index: 4, misses: 1, students: 1 },
    { index: 7, misses: 1, students: 1 },
  ]);
  assert.deepEqual(hardestExercises(members, null), []);
});

test('rang d’un exercice d’entraîneur', () => {
  assert.equal(coachIndexOf('c-ABCD2345-12', 'ABCD2345'), 11);
  assert.equal(coachIndexOf('c-ZZZZ2222-1', 'ABCD2345'), null);
  assert.equal(coachIndexOf('bases-lucena', 'ABCD2345'), null);
});

test('suivi : détail par exercice (temps médian, erreur fréquente) et validation', async () => {
  const { coachDetail, exerciseStats, sanitizeDetail, median } = await import('../src/core/coachProgress');
  assert.deepEqual(
    coachDetail(
      [
        { id: 'c-ABCDEFGH-1', ok: true, ms: 8000 },
        { id: 'lichess-x', ok: false },
        { id: 'c-ABCDEFGH-3', ok: false, ms: 4000, w: 'd1d8', e: 'loses' },
      ],
      'ABCDEFGH',
    ),
    [{ i: 0, ok: true, ms: 8000 }, { i: 2, ok: false, ms: 4000, w: 'd1d8', e: 'loses' }],
  );
  assert.deepEqual(sanitizeDetail([{ i: 1, ok: true, ms: -3, w: '<b>', e: 'zz' }, { i: 'x', ok: true }, { i: 600, ok: true }, null]), [{ i: 1, ok: true }]);
  assert.deepEqual(sanitizeDetail('pas un tableau'), []);
  assert.equal(median([3, 1, 2]), 2);
  assert.equal(median([4, 1, 2, 3]), 3);
  assert.equal(median([]), null);

  const d = (i: number, ok: boolean, ms?: number, w?: string) => ({ i, ok, ...(ms != null ? { ms } : {}), ...(w ? { w } : {}) });
  const ms: MemberProgress[] = [
    { id: 'a', pseudo: 'A', joined: '', lastSeen: '', results: [{ ...R(1, 'storm', 2, 1, 3), d: [d(0, true, 5000), d(1, true, 9000), d(2, false, 3000, 'a1a8')] }] },
    { id: 'b', pseudo: 'B', joined: '', lastSeen: '', results: [{ ...R(2, 'storm', 1, 1, 2), d: [d(0, true, 7000), d(2, false, 2000, 'a1a8')] }, { ...R(3, 'storm', 0, 1, 1, [], 'V1'), d: [d(2, false, 1, 'h1h8')] }] },
  ];
  const st = exerciseStats(ms, 'V2');
  assert.deepEqual(st.get(0), { index: 0, tries: 2, success: 1, medianMs: 6000, commonWrong: null });
  assert.deepEqual(st.get(2), { index: 2, tries: 2, success: 0, medianMs: null, commonWrong: { uci: 'a1a8', n: 2 } });
  const rows = studentRows(ms);
  assert.equal(rows[0].medianMs, 7000);
  assert.equal(rows[1].medianMs, 7000);
});
