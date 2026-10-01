import assert from 'node:assert/strict';
import { test } from 'node:test';
import { attemptToRow, mergeHistories, rowToAttempt, rowToRun, runToRow, sanitizeHistory } from '../src/core/history';

const T = 1_790_000_000_000;
const A = { t: T, m: 'storm' as const, p: 'abc12', r: 1200, c: 'rp-r', f: 'tours', ok: true };
const R = { t: T, mode: 'storm' as const, theme: 'tours/rp-r', level: 1200, score: 16, errors: 2, bestCombo: 14, moves: 32, durationMs: 174000 };

test('import : seules les entrées valides sont gardées, champs inconnus retirés', () => {
  const { history, rejected } = sanitizeHistory({
    attempts: [A, { ...A, r: 99999 }, { ...A, p: '<img onerror=x>' }, { ...A, extra: 'x', __proto__: { polluted: 1 } }, null, 'x'],
    runs: [R, { ...R, mode: 'racer' }, { ...R, score: -1 }, { ...R, theme: 'a'.repeat(61) }],
  });
  assert.equal(history.attempts.length, 2);
  assert.equal(history.runs.length, 1);
  assert.equal(rejected, 7);
  assert.deepEqual(Object.keys(history.attempts[1]).sort(), ['c', 'f', 'm', 'ok', 'p', 'r', 't']);
  assert.deepEqual(sanitizeHistory(undefined).history, { attempts: [], runs: [] });
});

test('fusion sans doublon (mêmes clés que la base en ligne)', () => {
  const base = { attempts: [A], runs: [R] };
  const extra = { attempts: [A, { ...A, t: T + 5 }], runs: [R, { ...R, t: T + 9 }] };
  const { history, added } = mergeHistories(base, extra);
  assert.equal(added, 2);
  assert.equal(history.attempts.length, 2);
  assert.equal(mergeHistories(history, extra).added, 0);
});

test('conversion ligne ↔ entrée : aller-retour sans perte', () => {
  assert.deepEqual(rowToRun(runToRow(R, 'u')), R);
  assert.deepEqual(rowToAttempt(attemptToRow(A, 'u')), A);
  assert.equal(runToRow({ ...R, moves: undefined }, 'u').moves, null);
  assert.equal(runToRow(R, 'u').best_combo, 14);
});

test('historique : temps de réflexion et premier mauvais coup validés', async () => {
  const { sanitizeHistory, attemptToRow, rowToAttempt, cleanSolveInfo } = await import('../src/core/history');
  const base = { t: 1_790_000_000_000, m: 'storm', p: 'p1', r: 1500, c: 'c', f: 'f', ok: false };
  const { history, rejected } = sanitizeHistory({ attempts: [{ ...base, ms: 4200, w: 'e7e8q' }, { ...base, t: base.t + 1, ms: -1 }, { ...base, t: base.t + 2, w: 'x' }], runs: [] });
  assert.equal(rejected, 2);
  assert.deepEqual(history.attempts, [{ ...base, ms: 4200, w: 'e7e8q' }]);
  const row = attemptToRow(history.attempts[0] as never, 'u');
  assert.equal(row.ms, 4200);
  assert.equal(row.w, 'e7e8q');
  assert.deepEqual(rowToAttempt({ ...base, ms: null, w: null } as never), base);
  assert.deepEqual(cleanSolveInfo({ ms: 1e9, w: 'zz' }), { ms: 3_600_000 });
  assert.deepEqual(cleanSolveInfo(undefined), {});
});
