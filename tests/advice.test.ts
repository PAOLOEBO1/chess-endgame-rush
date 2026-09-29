import assert from 'node:assert/strict';
import { test } from 'node:test';
import { endOfRunAdvice } from '../src/core/advice';
import { LESSONS } from '../src/data/lessons';

test('conseil de fin de partie : la famille la plus ratée, à partir de 2 erreurs', () => {
  assert.equal(endOfRunAdvice(['tours']), null);
  const a = endOfRunAdvice(['tours', 'pions', 'tours', undefined])!;
  assert.equal(a.family, 'tours');
  assert.equal(a.errors, 2);
  assert.ok(LESSONS.some((l) => l.id === a.lessonId));
});

test('conseil : chaque leçon conseillée existe', () => {
  for (const f of ['pions', 'tours', 'dames', 'fous', 'cavaliers', 'mixte'] as const) {
    const a = endOfRunAdvice([f, f]);
    assert.ok(a);
    if (a!.lessonId) assert.ok(LESSONS.some((l) => l.id === a!.lessonId), f);
  }
});
