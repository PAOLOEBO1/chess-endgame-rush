import assert from 'node:assert/strict';
import { test } from 'node:test';
import { absolute, buildQuestion } from '../src/core/quiz/judgeQuiz';
import { tbMove, tbPosition } from './fixtures';

const FEN = '8/8/8/4k3/8/8/4P3/4K3 w - - 0 1';

test('résultat absolu à partir du camp au trait', () => {
  assert.equal(absolute(FEN, 'win'), 'white');
  assert.equal(absolute(FEN, 'loss'), 'black');
  assert.equal(absolute(FEN.replace(' w ', ' b '), 'win'), 'black');
  assert.equal(absolute(FEN, 'draw'), 'draw');
});

test('question : les trois résultats possibles sont tirés au sort équitablement', () => {
  // Position gagnante pour les Blancs ; Kf1 annule ; Kd1?? n'existe pas en perte ici : 2 résultats disponibles.
  const pos = tbPosition('win', [tbMove('e1d2', 'Kd2', 'loss', -20), tbMove('e1f1', 'Kf1', 'draw', 0)], 21);
  const answers = new Set([0, 0.2, 0.6, 0.99].map((r) => buildQuestion(FEN, pos, () => r)?.answer));
  assert.deepEqual([...answers].sort(), ['draw', 'white']);
  const q = buildQuestion(FEN, pos, () => 0)!; // premier panier = Blancs gagnent, première position = celle du puzzle
  assert.equal(q.fen, FEN);
  assert.equal(q.mateIn, 11);
  const d = buildQuestion(FEN, pos, () => 0.99)!;
  assert.equal(d.answer, 'draw');
  assert.equal(d.lastMove, 'e1f1');
  assert.match(d.fen, / b /); // aux Noirs de jouer après Kf1
});

test('position inconnue et sans coup exploitable : pas de question', () => {
  assert.equal(buildQuestion(FEN, tbPosition('unknown', [])), null);
});
