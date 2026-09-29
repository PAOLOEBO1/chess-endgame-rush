import assert from 'node:assert/strict';
import { test } from 'node:test';
import { examPassed, examText, recordExam } from '../src/core/exam';

test('test de maîtrise : réussi seulement si toutes les positions le sont', () => {
  assert.equal(examPassed([true, true, true]), true);
  assert.equal(examPassed([true, null, true]), false);
  assert.equal(examPassed([]), false);
});

test('bilan : meilleur score conservé, date de maîtrise figée à la 1re réussite', () => {
  const a = recordExam(undefined, [true, false, true], 1000);
  assert.deepEqual(a, { best: 2, total: 3, passedAt: null, lastAt: 1000 });
  const b = recordExam(a, [true, true, true], 2000);
  assert.equal(b.passedAt, 2000);
  const c = recordExam(b, [false, false, true], 3000);
  assert.deepEqual(c, { best: 3, total: 3, passedAt: 2000, lastAt: 3000 });
});

test('texte partageable', () => {
  assert.match(examText('Finales de tours', [true, false]), /1\/2 — 1✅ 2❌/);
  assert.match(examText('Mats', [true, true]), /thème maîtrisé/);
});
