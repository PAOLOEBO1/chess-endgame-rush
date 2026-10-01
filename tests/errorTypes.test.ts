import assert from 'node:assert/strict';
import { test } from 'node:test';
import { errorStats, errorTypeOf } from '../src/core/errorTypes';
import type { BadReason, Verdict } from '../src/core/judge/tablebaseJudge';
import { isAttempt, rowToAttempt, attemptToRow } from '../src/core/history';

const bad = (reason: BadReason): Verdict => ({ kind: 'bad', san: 'x', reason, outcome: 'draw', bestMoves: [], bestUci: [] });
const ANY = '8/8/8/4k3/8/8/8/R3K3 b - - 0 1';
const PAT = 'k7/8/1Q6/8/8/8/8/K7 b - - 0 1'; // roi noir a8 pat

test('type d’erreur déduit de la fin de la position', () => {
  assert.equal(errorTypeOf({ success: true, endReason: 'checkmate', verdict: null, fen: ANY }), undefined);
  assert.equal(errorTypeOf({ success: true, hintUsed: true, endReason: 'checkmate', verdict: null, fen: ANY }), 'hint');
  assert.equal(errorTypeOf({ success: false, endReason: 'bad-move', verdict: bad('throws-win'), fen: ANY }), 'win-lost');
  assert.equal(errorTypeOf({ success: false, endReason: 'bad-move', verdict: bad('throws-win'), fen: PAT }), 'stalemate');
  assert.equal(errorTypeOf({ success: false, endReason: 'drawn-instead', verdict: null, fen: PAT }), 'stalemate');
  assert.equal(errorTypeOf({ success: false, endReason: 'bad-move', verdict: bad('loses'), fen: ANY }), 'loses');
  assert.equal(errorTypeOf({ success: false, endReason: 'bad-move', verdict: bad('too-slow'), fen: ANY }), 'slow');
  assert.equal(errorTypeOf({ success: false, endReason: 'too-long', verdict: null, fen: ANY }), 'slow');
  assert.equal(errorTypeOf({ success: false, endReason: 'mated', verdict: null, fen: ANY }), 'defense');
});

test('bilan : les plus fréquentes d’abord', () => {
  const s = errorStats([{ e: 'slow' }, {}, { e: 'stalemate' }, { e: 'slow' }, { e: 'slow' }]);
  assert.deepEqual(s.map((x) => [x.type, x.count]), [['slow', 3], ['stalemate', 1]]);
  assert.equal(s[0].share, 0.75);
});

test('historique : le type d’erreur est validé et transmis à la base', () => {
  const a = { t: 1_790_000_000_000, m: 'training' as const, p: 'x', r: 1000, c: 'c', f: 'f', ok: false, e: 'slow' as const };
  assert.ok(isAttempt(a));
  assert.ok(!isAttempt({ ...a, e: 'nimporte' }));
  assert.equal(attemptToRow(a, 'u').e, 'slow');
  assert.equal(attemptToRow({ ...a, e: undefined }, 'u').e, null);
  assert.deepEqual(rowToAttempt({ ...attemptToRow(a, 'u') }), a);
  assert.equal('e' in rowToAttempt({ ...attemptToRow(a, 'u'), e: null }), false);
});
