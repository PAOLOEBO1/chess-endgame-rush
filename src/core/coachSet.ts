// Base d'exercices de l'entraîneur : importée en PGN, jouée par ses élèves en
// Storm / Streak (thème « Entraîneur »). Fonctions pures.
//
// Elo des exercices : celui de l'en-tête PGN s'il existe (Rating, PuzzleRating,
// Elo), sinon une ESTIMATION (règle simple et documentée ci-dessous, sur le
// modèle des exercices générés), ou bien l'ordre du fichier si l'entraîneur le
// préfère. Les exercices sont ensuite servis du plus facile au plus difficile.

import { applyUci, isValidFen, legalDestsMap, type PgnExercise } from './chessRules';
import { parseThemes } from './motifs';
import type { Level, Objective, Puzzle } from './types';

export const COACH_MAX_ITEMS = 500;
export const COACH_MAX_PLIES = 20;

/** Exercice tel qu'il est stocké en ligne (format compact). */
export interface CoachItem {
  f: string; // FEN, camp au trait = élève
  s: string[]; // solution (UCI), coup de l'élève d'abord
  r: number; // Elo
  o: 'w' | 'd'; // gagner / tenir la nulle
  t?: string; // titre
  e?: 1; // Elo estimé
  th?: string[]; // thèmes (en-tête PGN [Theme]), 3 au plus
}

export interface CoachDraft {
  index: number;
  fen: string;
  solution: string[];
  objective: Objective;
  title: string;
  /** Elo donné par l'en-tête PGN (null : à estimer). */
  headerRating: number | null;
  /** Thèmes de l'en-tête [Theme] (ou [Themes]). */
  themes: string[];
}

const clean = (s: string, max: number) => s.replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, max);
const known = (v: string | undefined) => !!v && v !== '?' && v !== '????.??.??';

export function draftsFromPgn(exercises: PgnExercise[]): CoachDraft[] {
  return exercises.map((ex) => {
    const h = ex.headers;
    const result = h.Result;
    const goal = (h.Objective ?? h.Objectif ?? '').toLowerCase();
    const objective: Objective = result === '1/2-1/2' || /nul|draw/.test(goal) ? 'draw' : 'win';
    const rawRating = Number(h.Rating ?? h.PuzzleRating ?? h.Elo ?? NaN);
    const title = known(h.Event) ? h.Event : known(h.White) && known(h.Black) ? `${h.White} – ${h.Black}` : `Exercice ${ex.index}`;
    return {
      index: ex.index,
      fen: ex.fen,
      solution: ex.moves.slice(0, COACH_MAX_PLIES),
      objective,
      title: clean(title, 60) || `Exercice ${ex.index}`,
      headerRating: Number.isFinite(rawRating) && rawRating >= 400 && rawRating <= 3200 ? Math.round(rawRating) : null,
      themes: parseThemes(h.Theme ?? h.Themes ?? h.Motif ?? h.Theme1),
    };
  });
}

export interface CoachRatingFeatures {
  playerMoves: number;
  /** Le 1er coup juste est « naturel » : prise, échec ou coup de pion. */
  naturalMove: boolean;
  objective: Objective;
  legalMoves: number;
  /**
   * Temps de réflexion dont Stockfish a besoin pour trouver le 1er coup :
   * 0 (immédiat) à 4 (pas trouvé en 1,5 s) ; null si non mesuré.
   */
  engineTier: number | null;
}

export function ratingFeatures(d: CoachDraft, engineTier: number | null): CoachRatingFeatures {
  const first = applyUci(d.fen, d.solution[0]);
  const piece = first ? d.fen.split(' ')[0] : '';
  const fromPawn = first ? isPawnOn(piece, first.from) : false;
  const naturalMove = !!first && (fromPawn || first.san.includes('x') || first.san.includes('+') || first.san.includes('#'));
  let legalMoves = 0;
  for (const dests of legalDestsMap(d.fen).values()) legalMoves += dests.length;
  return { playerMoves: Math.ceil(d.solution.length / 2), naturalMove, objective: d.objective, legalMoves, engineTier };
}

function isPawnOn(placement: string, square: string): boolean {
  const file = 'abcdefgh'.indexOf(square[0]);
  const row = placement.split('/')[8 - Number(square[1])] ?? '';
  let col = 0;
  for (const ch of row) {
    if (/\d/.test(ch)) col += Number(ch);
    else {
      if (col === file) return ch.toLowerCase() === 'p';
      col++;
    }
  }
  return false;
}

/**
 * Elo ESTIMÉ : 800, + 120 par coup de solution au-delà du 1er, + 150 si le
 * 1er coup n'est pas naturel, + 100 pour une nulle à tenir, + 5 par coup
 * légal au-delà de 20, + 150 par palier de réflexion de Stockfish ;
 * borné à 500–2400, arrondi à 10. À recalibrer avec les résultats réels.
 */
export function estimateCoachRating(f: CoachRatingFeatures): number {
  let r = 800 + 120 * (f.playerMoves - 1);
  if (!f.naturalMove) r += 150;
  if (f.objective === 'draw') r += 100;
  r += 5 * Math.max(0, f.legalMoves - 20);
  if (f.engineTier !== null) r += 150 * f.engineTier;
  return Math.round(Math.min(2400, Math.max(500, r)) / 10) * 10;
}

/** « Ordre du fichier » : Elo croissant régulier, de 600 à 2400 au plus. */
export function fileOrderRatings(n: number): number[] {
  const step = n > 1 ? Math.min(40, Math.floor(1800 / (n - 1))) : 0;
  return Array.from({ length: n }, (_, i) => 600 + i * step);
}

/** Exercices prêts à stocker, du plus facile au plus difficile (ordre du fichier à égalité). */
export function finalizeItems(drafts: CoachDraft[], ratings: { r: number; estimated: boolean }[]): CoachItem[] {
  return drafts
    .map((d, i) => ({ d, i, ...ratings[i] }))
    .sort((a, b) => a.r - b.r || a.i - b.i)
    .slice(0, COACH_MAX_ITEMS)
    .map(({ d, r, estimated }) => ({
      f: d.fen,
      s: d.solution,
      r,
      o: d.objective === 'win' ? 'w' : 'd',
      t: d.title,
      ...(estimated ? { e: 1 as const } : {}),
      ...(d.themes.length ? { th: d.themes } : {}),
    }));
}

/** Données reçues du serveur : seules les entrées valides sont gardées. */
export function sanitizeCoachItems(raw: unknown): CoachItem[] {
  if (!Array.isArray(raw)) return [];
  const out: CoachItem[] = [];
  for (const v of raw.slice(0, COACH_MAX_ITEMS)) {
    const x = v as Partial<CoachItem> | null;
    if (!x || typeof x.f !== 'string' || x.f.length > 100 || !isValidFen(x.f)) continue;
    if (!Array.isArray(x.s) || !x.s.length || x.s.length > COACH_MAX_PLIES || !x.s.every((u) => typeof u === 'string' && /^[a-h][1-8][a-h][1-8][qrbn]?$/.test(u))) continue;
    if (typeof x.r !== 'number' || x.r < 0 || x.r > 4000 || (x.o !== 'w' && x.o !== 'd')) continue;
    out.push({ f: x.f, s: x.s, r: Math.round(x.r), o: x.o, ...(typeof x.t === 'string' && x.t ? { t: clean(x.t, 60) } : {}), ...(x.e ? { e: 1 as const } : {}), ...cleanThemes(x.th) });
  }
  return out;
}

function cleanThemes(raw: unknown): { th?: string[] } {
  if (!Array.isArray(raw)) return {};
  const th = parseThemes(raw.filter((t): t is string => typeof t === 'string').join(','));
  return th.length ? { th } : {};
}

const levelOf = (r: number): Level => (r < 1000 ? 'debutant' : r < 1500 ? 'intermediaire' : r < 2000 ? 'avance' : 'master');

/** Exercices de l'entraîneur sous forme de puzzles jouables (Storm / Streak). */
export function coachPuzzles(code: string, items: CoachItem[]): Puzzle[] {
  return items.map((x, i) => ({
    id: `c-${code}-${i + 1}`,
    title: x.t ?? `Exercice ${i + 1}`,
    fen: x.f,
    objective: x.o === 'w' ? 'win' : 'draw',
    collection: 'coach',
    level: levelOf(x.r),
    rating: x.r,
    ratingEstimated: !!x.e,
    concept: 'Exercice choisi par ton entraîneur : cherche la meilleure suite.',
    solution: x.s,
    ...(x.th ? { themes: x.th } : {}),
  }));
}

/** Code de groupe : 8 caractères sans ambiguïté (pas de 0/O, 1/I). */
export const COACH_CODE = /^[A-HJ-NP-Z2-9]{8}$/;
export function newCoachCode(random: (n: number) => Uint8Array = (n) => crypto.getRandomValues(new Uint8Array(n))): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return [...random(8)].map((b) => alphabet[b % alphabet.length]).join('');
}
