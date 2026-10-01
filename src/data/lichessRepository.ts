// Chargement des finales Lichess (public/data/lichess-endgames.json,
// produit par scripts/import-lichess.ts). Chargé une seule fois.

import { FAMILY_LABEL, familyOf } from '../core/material';
import type { Puzzle } from '../core/types';
import { readPuzzleFile, type RawPuzzle } from './puzzleFormat';


import { THEME_FR } from '../core/motifs';

const ENDGAME_THEME_KEYS = new Set(['pawnEndgame', 'rookEndgame', 'queenEndgame', 'bishopEndgame', 'knightEndgame', 'queenRookEndgame']);

function levelOf(rating: number): Puzzle['level'] {
  if (rating < 1200) return 'debutant';
  if (rating < 1600) return 'intermediaire';
  if (rating < 2000) return 'avance';
  return 'master';
}

function toPuzzle(raw: RawPuzzle): Puzzle {
  const family = raw.family ?? familyOf(raw.fen);
  const themes = raw.themes.filter((t) => !ENDGAME_THEME_KEYS.has(t)).map((t) => THEME_FR[t] ?? t);
  if (raw.ratingEstimated) {
    return {
      id: raw.id,
      title: `${FAMILY_LABEL[family]} · table de finales Lichess`,
      fen: raw.fen,
      objective: raw.objective,
      collection: 'tablebase',
      level: levelOf(raw.rating),
      rating: raw.rating,
      ratingEstimated: true,
      concept: 'Position générée ; un seul coup juste, vérifié par la table de finales. Elo estimé.',
      family,
      lastMove: raw.lastMove || undefined,
      solution: raw.solution,
      themes: raw.themes,
    };
  }
  return {
    id: raw.id,
    title: `${FAMILY_LABEL[family]}${(raw.pieces ?? 0) > 7 ? ' (longue)' : ''} · Lichess`,
    fen: raw.fen,
    objective: raw.objective,
    collection: 'lichess',
    level: levelOf(raw.rating),
    rating: raw.rating,
    concept: themes.length ? `Thèmes : ${themes.join(', ')}` : 'Position issue d’une partie réelle.',
    family,
    lastMove: raw.lastMove,
    solution: raw.solution,
    themes: raw.themes,
    gameUrl: raw.gameUrl,
  };
}

let cache: Promise<Puzzle[]> | null = null;

async function fetchPuzzles(file: string, optional: boolean): Promise<RawPuzzle[]> {
  const r = await fetch(`${import.meta.env.BASE_URL}data/${file}`);
  if (!r.ok) {
    if (optional) return [];
    throw new Error(`Chargement des finales Lichess impossible (HTTP ${r.status}).`);
  }
  return readPuzzleFile(await r.json());
}

/**
 * Finales Lichess (puzzles, Elo Lichess) + exercices générés avec la table de
 * finales (fichier facultatif, Elo estimé) pour les sous-thèmes trop pauvres.
 */
export function loadLichessPuzzles(): Promise<Puzzle[]> {
  if (!cache) {
    cache = Promise.all([
      fetchPuzzles('lichess-endgames.json', false),
      fetchPuzzles('tablebase-endgames.json', true).catch(() => []),
    ])
      .then(([lichess, generated]) => [...lichess, ...generated].map(toPuzzle))
      .catch((error) => {
        cache = null;
        throw error;
      });
  }
  return cache;
}
