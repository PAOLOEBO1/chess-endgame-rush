import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatClock } from '../src/hooks/useSolveClock';

test('chrono : affichage minutes:secondes', () => {
  assert.equal(formatClock(0), '0:00');
  assert.equal(formatClock(7_900), '0:07');
  assert.equal(formatClock(83_000), '1:23');
  assert.equal(formatClock(725_000), '12:05');
  assert.equal(formatClock(-5), '0:00');
});
