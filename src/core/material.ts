// Classement automatique d'une position par matériel, sur le modèle
// d'Endgame Trainer (familles Pions / Tours / Dames / Cavaliers / Fous).

import { fenToPieces } from './fen';
import type { Color, Family } from './types';

const LETTER_FR: Record<string, string> = { k: 'R', q: 'D', r: 'T', b: 'F', n: 'C', p: 'P' };
const ORDER = ['k', 'q', 'r', 'b', 'n', 'p'];

function sideString(types: string[]): string {
  const sorted = [...types].sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b));
  return sorted.map((t) => LETTER_FR[t]).join('+');
}

/**
 * Signature lisible, du point de vue du camp `perspective`.
 * Ex. finale de Lucena vue par les Blancs : "R+T+P vs R+T".
 */
export function materialSignature(fen: string, perspective: Color): string {
  const pieces = fenToPieces(fen);
  const mine = pieces.filter((p) => p.color === perspective).map((p) => p.type);
  const theirs = pieces.filter((p) => p.color !== perspective).map((p) => p.type);
  return `${sideString(mine)} vs ${sideString(theirs)}`;
}

const GLYPH: Record<'w' | 'b', Record<string, string>> = {
  w: { k: '♔', q: '♕', r: '♖', b: '♗', n: '♘', p: '♙' },
  b: { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' },
};
const NAME_FR: Record<string, [string, string]> = {
  k: ['roi', 'rois'],
  q: ['dame', 'dames'],
  r: ['tour', 'tours'],
  b: ['fou', 'fous'],
  n: ['cavalier', 'cavaliers'],
  p: ['pion', 'pions'],
};

/**
 * Matériel en symboles de pièces, camp `perspective` d'abord :
 * ex. Lucena vue par les Blancs → « ♔♖♙ contre ♚♜ ». `label` : la même chose en
 * toutes lettres, pour les lecteurs d'écran (« roi, tour, pion contre roi, tour »).
 */
export function materialSymbols(fen: string, perspective: Color): { text: string; label: string } {
  const pieces = fenToPieces(fen);
  const side = (color: Color) =>
    pieces
      .filter((p) => p.color === color)
      .map((p) => p.type)
      .sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b));
  const other: Color = perspective === 'w' ? 'b' : 'w';
  const glyphs = (color: Color) => side(color).map((t) => GLYPH[color][t]).join('');
  const words = (color: Color) => {
    const counts = new Map<string, number>();
    for (const t of side(color)) counts.set(t, (counts.get(t) ?? 0) + 1);
    return [...counts].map(([t, n]) => (n > 1 ? `${n} ${NAME_FR[t][1]}` : NAME_FR[t][0])).join(', ');
  };
  return { text: `${glyphs(perspective)} contre ${glyphs(other)}`, label: `${words(perspective)} contre ${words(other)}` };
}

/** Famille déduite des pièces autres que rois et pions. */
export function familyOf(fen: string): Family {
  const pieces = fenToPieces(fen).filter((p) => p.type !== 'k' && p.type !== 'p');
  const types = new Set(pieces.map((p) => p.type));
  const hasPawns = fenToPieces(fen).some((p) => p.type === 'p');
  if (types.size === 0) return hasPawns ? 'pions' : 'mixte';
  if (types.size > 1) return 'mixte';
  const only = [...types][0];
  return ({ q: 'dames', r: 'tours', b: 'fous', n: 'cavaliers' } as const)[only as 'q' | 'r' | 'b' | 'n'];
}

export const FAMILY_LABEL: Record<Family, string> = {
  pions: 'Finales de pions',
  tours: 'Finales de tours',
  dames: 'Finales de dames',
  cavaliers: 'Finales de cavaliers',
  fous: 'Finales de fous',
  mixte: 'Finales mixtes',
  mats: 'Mats élémentaires',
};
