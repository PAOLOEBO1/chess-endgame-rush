// Types d'erreurs : pourquoi une position est ratée. Sert au bilan de
// progression (« tes erreurs les plus fréquentes ») et aux conseils.

import { isInCheck, legalDestsMap } from './chessRules';
import type { Verdict } from './judge/tablebaseJudge';
import type { EndReason } from './session/puzzleSession';

export type ErrorType = 'win-lost' | 'stalemate' | 'loses' | 'slow' | 'defense' | 'hint';
export const ERROR_TYPES: ErrorType[] = ['win-lost', 'stalemate', 'loses', 'slow', 'defense', 'hint'];

export const ERROR_INFO: Record<ErrorType, { label: string; advice: string }> = {
  'win-lost': {
    label: 'Gain laissé échapper',
    advice: 'Avant chaque coup, vérifie que la position reste gagnante : règle du carré, opposition, case clé du pion.',
  },
  stalemate: {
    label: 'Pat donné',
    advice: 'Avec une dame ou une tour, vérifie avant de jouer que le roi adverse garde au moins une case libre.',
  },
  loses: {
    label: 'Coup perdant',
    advice: 'Regarde d’abord ce que menace l’adversaire : échecs, prises, pion qui file vers la promotion.',
  },
  slow: {
    label: 'Méthode trop lente',
    advice: 'Revois les méthodes de base (mat de l’escalier, réduction de la « boîte », pont de Lucena) dans les Bases et les leçons.',
  },
  defense: {
    label: 'Défense écourtée',
    advice: 'En défense, cherche le coup qui résiste le plus longtemps : roi au centre, loin du bord et du coin de mat.',
  },
  hint: {
    label: 'Réussi avec un indice',
    advice: 'Refais ces positions sans aide : c’est ce qui les ancre en mémoire.',
  },
};

export const isErrorType = (v: unknown): v is ErrorType => typeof v === 'string' && (ERROR_TYPES as string[]).includes(v);

function isStalemate(fen: string): boolean {
  try {
    return !isInCheck(fen) && legalDestsMap(fen).size === 0;
  } catch {
    return false;
  }
}

/** Type d'erreur d'une position terminée ; undefined si réussie sans aide. */
export function errorTypeOf(p: { success: boolean; hintUsed?: boolean; endReason: EndReason | null; verdict: Verdict | null; fen: string }): ErrorType | undefined {
  if (p.success) return p.hintUsed ? 'hint' : undefined;
  const v = p.verdict?.kind === 'bad' ? p.verdict : null;
  if (p.endReason === 'bad-move' && v) {
    if (v.reason === 'throws-win') return isStalemate(p.fen) ? 'stalemate' : 'win-lost';
    if (v.reason === 'loses') return 'loses';
    if (v.reason === 'too-slow') return 'slow';
    return 'defense';
  }
  if (p.endReason === 'drawn-instead') return isStalemate(p.fen) ? 'stalemate' : 'win-lost';
  if (p.endReason === 'too-long') return 'slow';
  if (p.endReason === 'mated') return 'defense';
  return undefined;
}

/** Répartition des erreurs (les plus fréquentes d'abord), sur les `last` dernières positions classées. */
export function errorStats(attempts: { e?: ErrorType }[], last = 300): { type: ErrorType; count: number; share: number }[] {
  const typed = attempts.filter((a) => a.e).slice(-last);
  const counts = new Map<ErrorType, number>();
  for (const a of typed) counts.set(a.e!, (counts.get(a.e!) ?? 0) + 1);
  return [...counts.entries()]
    .map(([type, count]) => ({ type, count, share: count / typed.length }))
    .sort((a, b) => b.count - a.count);
}
