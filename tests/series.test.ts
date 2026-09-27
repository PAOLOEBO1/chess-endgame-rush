import assert from 'node:assert/strict';
import { test } from 'node:test';
import { decodeSeries, encodeSeries, resultText } from '../src/core/series';

const known = (id: string) => id.startsWith('bases-');

test('série par lien : aller-retour, accents compris', () => {
  const s = { name: 'Finales de tours — séance 3', items: [{ id: 'bases-lucena' }, { fen: '8/8/8/4k3/8/8/4P3/4K3 w - - 0 1', objective: 'draw' as const, title: 'Ma position' }] };
  const hash = encodeSeries(s);
  assert.match(hash, /^#serie=[A-Za-z0-9_-]+$/);
  assert.deepEqual(decodeSeries(hash, known), s);
});

test('série par lien : entrées invalides ignorées, lien cassé refusé', () => {
  const bad = encodeSeries({ name: '<b>x</b>', items: [{ id: 'inconnu' }, { fen: 'pas un fen', objective: 'win' }, { id: 'bases-philidor' }] });
  const s = decodeSeries(bad, known)!;
  assert.equal(s.name, 'bx/b'); // chevrons retirés
  assert.deepEqual(s.items, [{ id: 'bases-philidor' }]);
  assert.equal(decodeSeries('#serie=%%%', known), null);
  assert.equal(decodeSeries('#autre', known), null);
});

test('texte du résultat', () => {
  assert.equal(resultText('Test', [true, false, null]), 'Série « Test » : 1/3 réussies — 1✅ 2❌ 3– (Chess Endgame Rush)');
});
