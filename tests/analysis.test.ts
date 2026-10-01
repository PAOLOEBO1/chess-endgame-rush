import assert from 'node:assert/strict';
import { test } from 'node:test';
import { moveLabel, positionLabel, rankTbMoves } from '../src/core/analysis';
import type { TbMove, TbPosition } from '../src/core/judge/tablebaseTypes';

const mv = (uci: string, category: TbMove['category'], dtm: number | null, extra: Partial<TbMove> = {}): TbMove => ({
  uci, san: uci, category, dtz: dtm, dtm, zeroing: false, checkmate: false, stalemate: false, insufficient_material: false, ...extra,
});

test('analyse : gains du plus rapide au plus lent, puis nulles, puis pertes en résistant le plus longtemps', () => {
  // Catégories du point de vue de l'adversaire : « loss » = coup gagnant pour celui qui le joue.
  const pos: TbPosition = {
    category: 'win', dtz: 9, dtm: 9, checkmate: false, stalemate: false, insufficient_material: false,
    moves: [mv('a', 'draw', null), mv('b', 'loss', -12), mv('c', 'win', 4), mv('d', 'loss', -4), mv('e', 'win', 20), mv('f', 'draw', null, { stalemate: true })],
  };
  const ranked = rankTbMoves(pos);
  assert.deepEqual(ranked.map((m) => m.uci), ['d', 'b', 'a', 'f', 'e', 'c']);
  assert.equal(moveLabel(ranked[0]), 'gagne · mat en 3');
  assert.equal(moveLabel(ranked[4]), 'perd · maté en 10');
  assert.equal(positionLabel(pos), 'Gagnant pour le camp au trait (mat en 5)');
});
