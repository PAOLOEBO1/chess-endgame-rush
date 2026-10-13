// Catalogue des positions : « Bases » triées dans l'ordre du parcours conseillé, et choix des puzzles
// d'un thème pour les modes classés. Fonctions pures, sans état React.

import { subcategoryOf } from '../core/categories';
import { familyOf } from '../core/material';
import type { Puzzle } from '../core/types';
import { BASICS_GROUPS, PUZZLES_MOCK } from '../data/puzzlesMock';
import type { ThemeChoice } from '../screens/HomeScreen';

/** Famille et sous-catégorie calculées une fois pour toutes au chargement. */
export function classify(p: Puzzle): Puzzle {
  const family = p.family ?? familyOf(p.fen);
  return { ...p, family, subcategory: subcategoryOf(p.fen, family) };
}
// Ordre du parcours conseillé (thème par thème), puis toute position non rangée.
export const PARCOURS = BASICS_GROUPS.flatMap((g) => g.ids);
const rank = (id: string) => (PARCOURS.includes(id) ? PARCOURS.indexOf(id) : PARCOURS.length);
export const BASICS = [...PUZZLES_MOCK].sort((a, b) => rank(a.id) - rank(b.id)).map(classify);

/**
 * Sous-thèmes exacts couverts par les « Bases » (Lucena, Philidor, dame contre
 * pion…). Les catégories fourre-tout « -autres » sont exclues : elles
 * mélangeraient des milliers de finales sans rapport avec les bases.
 */
const BASICS_SUBS = new Set(BASICS.map((p) => p.subcategory).filter((s) => s && !s.endsWith('-autres')));

/**
 * Puzzles des modes classés (Storm / Streak) : uniquement la base Lichess,
 * dont l'Elo est calculé par Lichess (Glicko-2). Les « Bases », à l'Elo
 * seulement estimé, restent réservées à l'entraînement ; le thème « Bases »
 * tire donc des puzzles Lichess de même matériel.
 */
export function buildPool(theme: ThemeChoice, sub: string, lichess: Puzzle[]): Puzzle[] {
  if (theme === 'bases') return lichess.filter((p) => BASICS_SUBS.has(p.subcategory));
  if (theme === 'mix') return lichess;
  return lichess.filter((p) => p.family === theme && (sub === 'all' || p.subcategory === sub));
}
