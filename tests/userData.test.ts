import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mergeExams, mergeSeries, sanitizeExams, sanitizeSeries, visibleSeries } from '../src/core/userData';

const T0 = 1_790_000_000_000;

test('tests de maîtrise : fusion entre appareils', () => {
  const pc = { mats: { best: 4, total: 5, passedAt: null, lastAt: T0 }, tours: { best: 8, total: 8, passedAt: T0 + 5, lastAt: T0 + 5 } };
  const tel = { mats: { best: 5, total: 5, passedAt: T0 + 9, lastAt: T0 + 9 }, tours: { best: 6, total: 8, passedAt: T0 + 2, lastAt: T0 + 7 } };
  assert.deepEqual(mergeExams(pc, tel), {
    mats: { best: 5, total: 5, passedAt: T0 + 9, lastAt: T0 + 9 },
    tours: { best: 8, total: 8, passedAt: T0 + 2, lastAt: T0 + 7 },
  });
});

test('bibliothèque : version la plus récente, suppressions propagées puis oubliées', () => {
  const s = (id: string, savedAt: number, deletedAt?: number) => ({ id, name: id, items: [{ id: 'bases-lucena' }], savedAt, ...(deletedAt ? { deletedAt } : {}) });
  const pc = [s('a', T0 + 10), s('b', T0), s('c', T0)];
  const tel = [s('a', T0), s('b', T0, T0 + 5), s('d', T0 + 3)];
  const merged = mergeSeries(pc, tel, T0 + 20);
  assert.deepEqual(merged.map((x) => [x.id, x.savedAt, x.deletedAt ?? null]), [['a', T0 + 10, null], ['b', T0, T0 + 5], ['d', T0 + 3, null], ['c', T0, null]]);
  assert.deepEqual(visibleSeries(merged).map((x) => x.id), ['a', 'd', 'c']);
  assert.equal(mergeSeries(merged, [], T0 + 5 + 181 * 86_400_000).some((x) => x.id === 'b'), false);
});

test('données reçues : seules les valeurs valides sont gardées', () => {
  assert.deepEqual(sanitizeExams({ mats: { best: 3, total: 5, passedAt: null, lastAt: T0 }, 'x y': {}, tours: { best: 'a' } }), {
    mats: { best: 3, total: 5, passedAt: null, lastAt: T0 },
  });
  const list = sanitizeSeries([
    { id: 's1', name: '<b>Tours</b>', savedAt: T0, items: [{ id: 'bases-lucena' }, { fen: 'nimporte', objective: 'win' }, { fen: '8/8/8/4k3/8/8/8/R3K3 w - - 0 1', objective: 'draw', title: 'x' }] },
    { id: 'bad id!', savedAt: T0, items: [] },
  ]);
  assert.equal(list.length, 1);
  assert.equal(list[0].name, 'bTours/b');
  assert.equal(list[0].items.length, 2);
});
