// Conseil de fin de partie (Storm / Streak) : la famille de finales où le
// joueur s'est le plus trompé, et la leçon ou l'entraînement qui y répond.

import type { Family } from './types';

export interface Advice {
  family: Family;
  errors: number;
  text: string;
  /** Leçon guidée conseillée (identifiant de src/data/lessons.ts). */
  lessonId?: string;
}

const TIPS: Partial<Record<Family, { text: string; lessonId?: string }>> = {
  pions: { text: 'revois l’opposition et la règle du carré : en finale de pions, un seul temps décide.', lessonId: 'lecon-opposition' },
  tours: { text: 'revois Lucena (gagner) et Philidor (défendre) : la base de toutes les finales de tours.', lessonId: 'lecon-lucena' },
  dames: { text: 'avec la dame, cherche d’abord les échecs qui gagnent du temps et rapproche ton roi.' },
  fous: { text: 'pense à la couleur des cases : case de promotion, cases de blocage, fous de couleurs opposées.', lessonId: 'lecon-tour-fou' },
  cavaliers: { text: 'le cavalier est lent : compte les coups avant de courir après un pion passé.' },
  mixte: { text: 'dans les finales mixtes, cherche l’échange qui mène à une finale gagnante connue.' },
};

/** null si moins de 2 erreurs dans une même famille. */
export function endOfRunAdvice(failedFamilies: (Family | undefined)[]): Advice | null {
  const counts = new Map<Family, number>();
  for (const f of failedFamilies) if (f) counts.set(f, (counts.get(f) ?? 0) + 1);
  let best: [Family, number] | null = null;
  for (const entry of counts) if (!best || entry[1] > best[1]) best = entry;
  if (!best || best[1] < 2) return null;
  const tip = TIPS[best[0]];
  if (!tip) return null;
  return { family: best[0], errors: best[1], text: tip.text, ...(tip.lessonId ? { lessonId: tip.lessonId } : {}) };
}
