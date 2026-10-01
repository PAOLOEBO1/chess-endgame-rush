// Analyse libre : classement des coups d'une position d'après la table de
// finales (≤ 7 pièces). Fonctions pures.

import type { Outcome } from './types';
import { outcomeAfterMove, outcomeOf, rankOf } from './judge/outcome';
import { mateInAfter } from './judge/tablebaseJudge';
import type { TbMove, TbPosition } from './judge/tablebaseTypes';

export interface RankedTbMove {
  uci: string;
  san: string;
  /** Résultat pour le camp qui joue le coup. */
  outcome: Outcome;
  /** Gain : mat en N (si la table donne la distance au mat). */
  mateIn?: number;
  /** Perte : maté en N au mieux. */
  matedIn?: number;
  /** Demi-coups avant la prochaine prise ou poussée de pion (règle des 50 coups). */
  dtz: number | null;
}

/** Perte : nombre de coups avant d'être maté, après `move` (plus grand = meilleure résistance). */
function matedInAfter(move: TbMove): number | undefined {
  if (move.dtm === null || outcomeOf(move.category) !== 'win') return undefined;
  return Math.ceil(Math.abs(move.dtm) / 2);
}

const far = (n: number | undefined | null) => (n == null ? Number.POSITIVE_INFINITY : Math.abs(n));

/** Tous les coups légaux, du meilleur au moins bon. */
export function rankTbMoves(position: TbPosition): RankedTbMove[] {
  return position.moves
    .map((m) => ({ uci: m.uci, san: m.san, outcome: outcomeAfterMove(m), mateIn: mateInAfter(m), matedIn: matedInAfter(m), dtz: m.dtz }))
    .sort((a, b) => {
      const r = rankOf(b.outcome) - rankOf(a.outcome);
      if (r) return r;
      if (a.outcome === 'win') return far(a.mateIn ?? a.dtz) - far(b.mateIn ?? b.dtz); // gagner le plus vite
      if (a.outcome === 'loss') return far(b.matedIn ?? b.dtz) - far(a.matedIn ?? a.dtz); // résister le plus longtemps
      return 0;
    });
}

/** Résultat de la position pour le camp au trait, en clair. */
export function positionLabel(position: TbPosition): string {
  if (position.checkmate) return 'Échec et mat';
  if (position.stalemate) return 'Pat : nulle';
  if (position.insufficient_material) return 'Matériel insuffisant : nulle';
  const o = outcomeOf(position.category);
  const mate = position.dtm !== null ? Math.ceil(Math.abs(position.dtm) / 2) : null;
  if (o === 'win') return mate ? `Gagnant pour le camp au trait (mat en ${mate})` : 'Gagnant pour le camp au trait';
  if (o === 'loss') return mate ? `Perdant pour le camp au trait (maté en ${mate})` : 'Perdant pour le camp au trait';
  if (o === 'draw') return position.category === 'draw' ? 'Nulle avec le meilleur jeu' : 'Nulle (règle des 50 coups)';
  return 'Résultat inconnu';
}

export function moveLabel(m: RankedTbMove): string {
  if (m.outcome === 'win') return m.mateIn ? `gagne · mat en ${m.mateIn}` : 'gagne';
  if (m.outcome === 'loss') return m.matedIn ? `perd · maté en ${m.matedIn}` : 'perd';
  if (m.outcome === 'draw') return 'nulle';
  return '?';
}
