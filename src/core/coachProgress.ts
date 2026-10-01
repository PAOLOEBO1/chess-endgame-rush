// Suivi des élèves par l'entraîneur : synthèse des résultats envoyés par les
// élèves de son groupe (Storm / Streak sur sa base d'exercices). Fonctions pures.

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
      lastSeen: m.lastSeen,
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

/** Rang dans la base d'un exercice d'entraîneur (« c-CODE-12 » → 11), ou null. */
export function coachIndexOf(puzzleId: string, code: string): number | null {
  const m = new RegExp(`^c-${code}-(\\d+)$`).exec(puzzleId);
  return m ? Number(m[1]) - 1 : null;
}
