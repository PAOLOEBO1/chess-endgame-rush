// Course entre amis : tout le monde joue les MÊMES finales, dans le même ordre, avec la
// même couleur, et voit le classement en direct. La suite de positions est déduite du seul
// code de la course (aucun serveur ne la choisit) : même code = mêmes positions.

import { sideToMove } from './fen';
import type { Color } from './types';

export const RACE_DURATION_MS = 180_000;
/** Temps retiré à celui qui se trompe. */
export const RACE_PENALTY_MS = 10_000;
export const RACE_COUNTDOWN_MS = 5_000;
export const RACE_MAX_PLAYERS = 10;
export const RACE_NAME_MAX = 20;
export const RACE_LENGTH = 90;

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
    const target = Math.min(2200, 800 + k * 25);
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
    score: num(r.score, RACE_LENGTH),
    errors: num(r.errors, RACE_LENGTH),
    joinedAt: num(r.joinedAt, 9_999_999_999_999),
    done: r.done === true,
    started: r.started === true,
  };
}

/** Classement : plus de réussites, puis moins d'erreurs ; égalité = même rang. */
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
