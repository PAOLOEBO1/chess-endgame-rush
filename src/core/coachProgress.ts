// Suivi des élèves par l'entraîneur : synthèse des résultats envoyés par les
// élèves de son groupe (Storm / Streak sur sa base d'exercices). Fonctions pures.

import { isErrorType, type ErrorType } from './errorTypes';
import { MAX_SOLVE_MS, UCI, type PlayedExercise } from './history';

/** Détail d'un exercice joué : rang dans la base, réussite, temps, 1er mauvais coup, type d'erreur. */
export interface CoachDetail {
  i: number;
  ok: boolean;
  ms?: number;
  w?: string;
  e?: ErrorType;
}

export const MAX_DETAIL = 300;

export interface MemberResult {
  t: string;
  mode: 'storm' | 'streak';
  score: number;
  errors: number;
  played: number;
  /** Rangs (0 = premier) des exercices ratés dans la base. */
  failed: number[];
  /** Version de la base au moment de la partie (date de son dernier import). */
  v: string | null;
  /** Détail exercice par exercice (parties envoyées depuis la migration 0010). */
  d?: CoachDetail[];
}

export interface MemberProgress {
  id: string;
  pseudo: string;
  joined: string;
  lastSeen: string;
  results: MemberResult[];
}

export interface StudentRow {
  id: string;
  pseudo: string;
  sessions: number;
  bestStorm: number | null;
  bestStreak: number | null;
  /** Part des exercices réussis (0–1), toutes parties confondues. */
  success: number | null;
  /** Scores Storm récents (du plus ancien au plus récent), 10 au plus. */
  recentStorm: number[];
  /** Moyenne des 5 derniers Storm moins celle des 5 précédents (null : pas assez de parties). */
  trend: number | null;
  lastSeen: string;
  /** Temps médian sur un exercice réussi (ms), null sans donnée. */
  medianMs: number | null;
}

export function median(xs: number[]): number | null {
  if (!xs.length) return null;
  const v = [...xs].sort((a, b) => a - b);
  const h = v.length >> 1;
  return v.length % 2 ? v[h] : Math.round((v[h - 1] + v[h]) / 2);
}

/** Détail d'une partie, réduit aux exercices de la base de l'entraîneur. */
export function coachDetail(played: PlayedExercise[], code: string): CoachDetail[] {
  const out: CoachDetail[] = [];
  for (const x of played) {
    const i = coachIndexOf(x.id, code);
    if (i === null) continue;
    out.push({ i, ok: x.ok, ...(x.ms != null ? { ms: x.ms } : {}), ...(x.w ? { w: x.w } : {}), ...(x.e ? { e: x.e } : {}) });
  }
  return out.slice(0, MAX_DETAIL);
}

/** Valide un détail reçu (envoyé par un élève : données non fiables). */
export function sanitizeDetail(raw: unknown): CoachDetail[] {
  if (!Array.isArray(raw)) return [];
  const out: CoachDetail[] = [];
  for (const x of raw.slice(0, MAX_DETAIL) as Record<string, unknown>[]) {
    if (!x || typeof x !== 'object' || !Number.isInteger(x.i) || (x.i as number) < 0 || (x.i as number) >= 500 || typeof x.ok !== 'boolean') continue;
    const d: CoachDetail = { i: x.i as number, ok: x.ok };
    if (Number.isInteger(x.ms) && (x.ms as number) >= 0 && (x.ms as number) <= MAX_SOLVE_MS) d.ms = x.ms as number;
    if (typeof x.w === 'string' && UCI.test(x.w)) d.w = x.w;
    if (isErrorType(x.e)) d.e = x.e;
    out.push(d);
  }
  return out;
}

const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

export function studentRows(members: MemberProgress[]): StudentRow[] {
  return members.map((m) => {
    const rs = [...m.results].sort((a, b) => a.t.localeCompare(b.t));
    const storm = rs.filter((r) => r.mode === 'storm').map((r) => r.score);
    const streak = rs.filter((r) => r.mode === 'streak').map((r) => r.score);
    const played = rs.reduce((n, r) => n + r.played, 0);
    const errors = rs.reduce((n, r) => n + Math.min(r.errors, r.played), 0);
    const last5 = storm.slice(-5);
    const prev5 = storm.slice(-10, -5);
    return {
      id: m.id,
      pseudo: m.pseudo,
      sessions: rs.length,
      bestStorm: storm.length ? Math.max(...storm) : null,
      bestStreak: streak.length ? Math.max(...streak) : null,
      success: played ? (played - errors) / played : null,
      recentStorm: storm.slice(-10),
      trend: last5.length === 5 && prev5.length === 5 ? Math.round((avg(last5) - avg(prev5)) * 10) / 10 : null,
      lastSeen: rs.length ? rs[rs.length - 1].t : m.lastSeen,
      medianMs: median(rs.flatMap((r) => (r.d ?? []).filter((d) => d.ok && d.ms != null).map((d) => d.ms!))),
    };
  });
}

/** Exercices les plus ratés du groupe, sur la version actuelle de la base seulement. */
export function hardestExercises(members: MemberProgress[], version: string | null, top = 10): { index: number; misses: number; students: number }[] {
  const misses = new Map<number, number>();
  const who = new Map<number, Set<string>>();
  for (const m of members)
    for (const r of m.results) {
      if (!version || r.v !== version) continue;
      for (const i of r.failed) {
        misses.set(i, (misses.get(i) ?? 0) + 1);
        (who.get(i) ?? who.set(i, new Set()).get(i)!).add(m.id);
      }
    }
  return [...misses.entries()]
    .map(([index, n]) => ({ index, misses: n, students: who.get(index)!.size }))
    .sort((a, b) => b.misses - a.misses || a.index - b.index)
    .slice(0, top);
}

export interface ExerciseStat {
  index: number;
  tries: number;
  success: number;
  medianMs: number | null;
  /** Mauvais coup le plus fréquent et son nombre d'occurrences. */
  commonWrong: { uci: string; n: number } | null;
}

/** Statistiques par exercice (version actuelle de la base, parties avec détail). */
export function exerciseStats(members: MemberProgress[], version: string | null): Map<number, ExerciseStat> {
  const acc = new Map<number, { tries: number; ok: number; ms: number[]; wrong: Map<string, number> }>();
  for (const m of members)
    for (const r of m.results) {
      if (!version || r.v !== version) continue;
      for (const d of r.d ?? []) {
        const a = acc.get(d.i) ?? acc.set(d.i, { tries: 0, ok: 0, ms: [], wrong: new Map() }).get(d.i)!;
        a.tries += 1;
        if (d.ok) {
          a.ok += 1;
          if (d.ms != null) a.ms.push(d.ms);
        }
        if (d.w) a.wrong.set(d.w, (a.wrong.get(d.w) ?? 0) + 1);
      }
    }
  const out = new Map<number, ExerciseStat>();
  for (const [index, a] of acc) {
    const top = [...a.wrong.entries()].sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0]))[0];
    out.set(index, { index, tries: a.tries, success: a.ok / a.tries, medianMs: median(a.ms), commonWrong: top ? { uci: top[0], n: top[1] } : null });
  }
  return out;
}

/** Rang dans la base d'un exercice d'entraîneur (« c-CODE-12 » → 11), ou null. */
export function coachIndexOf(puzzleId: string, code: string): number | null {
  const m = new RegExp(`^c-${code}-(\\d+)$`).exec(puzzleId);
  return m ? Number(m[1]) - 1 : null;
}
