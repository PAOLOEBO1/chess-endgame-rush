import assert from 'node:assert/strict';
import { test } from 'node:test';
import { challengePick, challengeProgress, weekKey } from '../src/core/challenge';

test('semaine ISO à l’heure de Paris', () => {
  assert.equal(weekKey(Date.UTC(2026, 8, 27, 12)), '2026-S39'); // dimanche 27 sept. 2026
  assert.equal(weekKey(Date.UTC(2026, 8, 27, 22, 30)), '2026-S40'); // lundi 0 h 30 à Paris (UTC+2)
  assert.equal(weekKey(Date.UTC(2027, 0, 1, 12)), '2026-S53'); // 1er janv. 2027 (vendredi) : semaine 53 de 2026
});

test('défi : 10 positions déterministes, difficulté croissante, une première tentative compte', () => {
  const pool = Array.from({ length: 500 }, (_, i) => ({ id: `p${i}`, rating: 800 + ((i * 37) % 1500) }));
  const now = Date.UTC(2026, 8, 23, 12);
  const a = challengePick(pool, now);
  assert.equal(a.length, 10);
  assert.deepEqual(challengePick([...pool].reverse(), now), a); // indépendant de l'ordre
  for (let i = 1; i < a.length; i++) assert.ok(a[i].rating > a[i - 1].rating);
  assert.notDeepEqual(challengePick(pool, now + 7 * 86_400_000).map((p) => p.id), a.map((p) => p.id));
  const acts = [
    { t: now, m: 'challenge', p: a[0].id, ok: false },
    { t: now + 1000, m: 'challenge', p: a[0].id, ok: true }, // 2e essai : ignoré
    { t: now + 2000, m: 'challenge', p: a[1].id, ok: true },
    { t: now - 7 * 86_400_000, m: 'challenge', p: a[2].id, ok: true }, // semaine précédente
  ];
  const g = challengeProgress(acts, a, now);
  assert.equal(g.played, 2);
  assert.equal(g.solved, 1);
  assert.equal(g.next, 2);
});
