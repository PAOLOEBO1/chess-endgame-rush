// Course entre amis : tout le monde joue les MÊMES finales, dans le même ordre, avec la
// même couleur, et voit le classement en direct. La suite de positions est déduite du seul
// code de la course (aucun serveur ne la choisit) : même code = mêmes positions.

import { sideToMove } from './fen';
import type { Color } from './types';

/** Durée de la course : 1 min 30, comme Lichess Puzzle Racer. */
export const RACE_DURATION_MS = 90_000;
/** Temps retiré à celui qui se trompe (Lichess Racer n'en retire pas ; Storm retire 10 s sur 3 min). */
export const RACE_PENALTY_MS = 5_000;
export const RACE_COUNTDOWN_MS = 5_000;
export const RACE_MAX_PLAYERS = 10;
export const RACE_NAME_MAX = 20;
export const RACE_LENGTH = 90;
/** Borne des scores reçus des autres joueurs (1 point par bon coup + bonus de combo). */
export const RACE_MAX_SCORE = 999;

/**
 * Combo façon Lichess Puzzle Racer : chaque bon coup vaut 1 point et remplit la barre ;
 * bonus de +1 à 5 bons coups d'affilée, +2 à 12, +3 à 20, +4 à 30, puis +4 tous les 10.
 * Un mauvais coup vide la barre.
 */
export const RACE_COMBO_STEPS = [5, 12, 20, 30] as const;

/** Bonus gagné au moment où le combo atteint `combo` (0 s'il n'atteint aucun palier). */
export function comboBonus(combo: number): number {
  const i = RACE_COMBO_STEPS.indexOf(combo as (typeof RACE_COMBO_STEPS)[number]);
  if (i >= 0) return i + 1;
  return combo > 30 && (combo - 30) % 10 === 0 ? 4 : 0;
}

/** Barre de combo : paliers déjà atteints (0 à 4) et remplissage vers le prochain bonus (0 à 1). */
export function comboProgress(combo: number): { reached: number; fill: number } {
  const c = Math.max(0, Math.floor(combo));
  if (c >= 30) return { reached: 4, fill: ((c - 30) % 10) / 10 };
  const marks = [0, ...RACE_COMBO_STEPS];
  let i = 0;
  while (c >= marks[i + 1]) i++;
  return { reached: i, fill: (c - marks[i]) / (marks[i + 1] - marks[i]) };
}

/** Sans 0/O/1/I/L : le code se lit et se dicte sans ambiguïté. */
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function newRaceCode(random: () => number = Math.random): string {
  let code = '';
  for (let i = 0; i < 6; i++) code += ALPHABET[Math.floor(random() * ALPHABET.length)];
  return code;
}

/** Code lu dans un lien (#course=XXXXXX) ou saisi à la main ; null s'il est invalide. */
export function parseRaceCode(text: string): string | null {
  const m = /^(?:#?course=)?([A-Za-z0-9]{6})$/.exec(text.trim());
  if (!m) return null;
  const code = m[1].toUpperCase();
  return [...code].every((c) => ALPHABET.includes(c)) ? code : null;
}

/**
 * Revanche (comme Lichess Racer) : le code de la course suivante se déduit du code actuel.
 * Tous ceux qui cliquent « Revanche » arrivent donc dans le même salon, sans nouveau lien ;
 * un joueur arrivé trop tard rejoint la suivante de la chaîne.
 */
export function nextRaceCode(code: string): string {
  let out = '';
  for (let i = 0; i < 6; i++) out += ALPHABET[hash(`${code}#revanche#${i}`) % ALPHABET.length];
  return out;
}

/** Joker : un coup peut être passé par course (joué par l'appli, sans point, combo conservé). */
export const RACE_SKIPS = 1;

export const raceLink = (origin: string, code: string) => `${origin}/#course=${code}`;

/** Pseudo propre : espaces réduits, longueur bornée, sans caractère de contrôle. */
export function cleanRaceName(raw: string): string {
  // eslint-disable-next-line no-control-regex
  return raw.replace(/[\u0000-\u001f\u007f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, RACE_NAME_MAX);
}

const hash = (s: string) => {
  let h = 2166136261; // FNV-1a
  for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
  return h;
};

export const raceColor = (code: string): Color => (hash(`${code}#couleur`) % 2 === 0 ? 'w' : 'b');

/**
 * Suite de positions de la course : difficulté croissante (≈ 800 → 2200 Elo), toutes du même
 * camp (l'échiquier ne se retourne jamais), tirées de façon déterministe d'après le code.
 */
export function raceSequence<T extends { id: string; rating: number; fen: string }>(pool: T[], code: string, length = RACE_LENGTH): T[] {
  const color = raceColor(code);
  const sorted = pool.filter((p) => sideToMove(p.fen) === color).sort((a, b) => a.id.localeCompare(b.id));
  const used = new Set<string>();
  const out: T[] = [];
  for (let k = 0; k < length; k++) {
    // Comme Lichess Racer (une position Storm sur deux) : la difficulté monte deux fois plus vite qu'en Storm.
    const target = Math.min(2200, 800 + k * 50);
    let band = sorted.filter((p) => !used.has(p.id) && Math.abs(p.rating - target) <= 60);
    if (!band.length) {
      // tranche épuisée : la position non jouée la plus proche
      let best = Infinity;
      for (const p of sorted) {
        if (used.has(p.id)) continue;
        const d = Math.abs(p.rating - target);
        if (d < best) {
          best = d;
          band = [p];
        } else if (d === best) band.push(p);
      }
    }
    if (!band.length) break;
    const pick = band[hash(`${code}#${k}`) % band.length];
    used.add(pick.id);
    out.push(pick);
  }
  return out;
}

export interface RacePlayer {
  id: string;
  name: string;
  score: number;
  errors: number;
  /** Heure d'arrivée dans le salon (départage « le plus ancien = organisateur »). */
  joinedAt: number;
  done: boolean;
  /** Le joueur a vu le départ de la course (sert à refuser les arrivées en retard). */
  started: boolean;
}

/** Les données reçues viennent d'inconnus : on borne et on type tout. */
export function sanitizePlayer(id: string, raw: unknown): RacePlayer | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const name = typeof r.name === 'string' ? cleanRaceName(r.name) : '';
  if (!name) return null;
  const num = (v: unknown, max: number) => (typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.min(max, Math.floor(v))) : 0);
  return {
    id: String(id).slice(0, 40),
    name,
    score: num(r.score, RACE_MAX_SCORE),
    errors: num(r.errors, RACE_MAX_SCORE),
    joinedAt: num(r.joinedAt, 9_999_999_999_999),
    done: r.done === true,
    started: r.started === true,
  };
}

/** Classement : plus de points, puis moins d'erreurs ; égalité = même rang. */
export function rankPlayers(players: RacePlayer[]): (RacePlayer & { rank: number })[] {
  const sorted = [...players].sort((a, b) => b.score - a.score || a.errors - b.errors || a.joinedAt - b.joinedAt || a.id.localeCompare(b.id));
  return sorted.map((p, i) => {
    const prev = sorted[i - 1];
    const tie = i > 0 && prev.score === p.score && prev.errors === p.errors;
    return { ...p, rank: tie ? (prevRank(sorted, i - 1)) : i + 1 };
  });
}
function prevRank(sorted: RacePlayer[], i: number): number {
  let r = i + 1;
  while (r > 1 && sorted[r - 2].score === sorted[i].score && sorted[r - 2].errors === sorted[i].errors) r -= 1;
  return r;
}

/** L'organisateur est le plus ancien du salon ; s'il part, le suivant prend le relais. */
export function raceHost(players: RacePlayer[]): string | null {
  const first = [...players].sort((a, b) => a.joinedAt - b.joinedAt || a.id.localeCompare(b.id))[0];
  return first?.id ?? null;
}
