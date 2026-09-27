// Exercice « Gain, nulle ou perte ? » : on montre une position et le joueur
// annonce le résultat avec le meilleur jeu ; la table de finales corrige.
//
// Pour ne pas répondre « gain » à chaque fois (les puzzles Lichess sont presque
// tous gagnants pour le camp au trait), la question porte soit sur la position
// du puzzle, soit sur la position obtenue après l'un de ses coups légaux — la
// table donne déjà le résultat de chacun. Le résultat demandé est tiré au sort
// parmi ceux disponibles (Blancs gagnent / nulle / Noirs gagnent).

import { applyUci } from '../chessRules';
import { outcomeOf } from '../judge/outcome';
import { mateInAfter } from '../judge/tablebaseJudge';
import type { TbPosition } from '../judge/tablebaseTypes';

/** Résultat absolu : Blancs gagnent, nulle, Noirs gagnent. */
export type Verdict3 = 'white' | 'draw' | 'black';

export interface JudgeQuestion {
  fen: string;
  answer: Verdict3;
  /** Coup qui a mené à la position (UCI), quand la question porte sur une position « fille ». */
  lastMove?: string;
  /** Gain : mat en N coups avec le meilleur jeu, si la table le sait. */
  mateIn?: number;
}

const sideToMove = (fen: string) => (fen.split(' ')[1] === 'b' ? 'b' : 'w');

/** Résultat « du camp au trait » → résultat absolu. */
export function absolute(fen: string, outcome: 'win' | 'draw' | 'loss'): Verdict3 {
  if (outcome === 'draw') return 'draw';
  const winnerIsWhite = (sideToMove(fen) === 'w') === (outcome === 'win');
  return winnerIsWhite ? 'white' : 'black';
}

export function buildQuestion(fen: string, position: TbPosition, random: () => number = Math.random): JudgeQuestion | null {
  const candidates: JudgeQuestion[] = [];
  const own = outcomeOf(position.category);
  if (own !== 'unknown') {
    const mate = position.dtm !== null && own === 'win' ? Math.floor(Math.abs(position.dtm) / 2) + 1 : undefined;
    candidates.push({ fen, answer: absolute(fen, own), ...(mate ? { mateIn: mate } : {}) });
  }
  for (const m of position.moves) {
    if (m.checkmate || m.stalemate) continue; // partie déjà finie : sans intérêt
    const child = applyUci(fen, m.uci);
    const o = outcomeOf(m.category); // point de vue du camp au trait APRÈS le coup
    if (!child || o === 'unknown') continue;
    // Gain du camp qui vient de jouer : mat en N depuis la position d'avant, moins ce coup.
    // Gain du camp au trait (le coup était une faute) : mat en N d'après sa distance au mat.
    const moverMate = o === 'loss' ? mateInAfter(m) : undefined;
    const mateIn =
      o === 'loss'
        ? moverMate && moverMate > 1
          ? moverMate - 1
          : undefined
        : o === 'win' && m.dtm !== null
          ? Math.floor(Math.abs(m.dtm) / 2) + 1
          : undefined;
    candidates.push({ fen: child.fen, answer: absolute(child.fen, o), lastMove: m.uci, ...(mateIn ? { mateIn } : {}) });
  }
  if (!candidates.length) return null;
  const buckets = (['white', 'draw', 'black'] as const).map((v) => candidates.filter((c) => c.answer === v)).filter((b) => b.length);
  const bucket = buckets[Math.floor(random() * buckets.length)];
  return bucket[Math.floor(random() * bucket.length)];
}
