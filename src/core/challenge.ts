// Défi de la semaine : les mêmes 10 finales pour tout le monde, du lundi au
// dimanche (heure de Paris), de difficulté croissante. Une seule tentative par
// position compte (la première), pour un classement équitable.

/** Semaine ISO « AAAA-Snn » selon l'heure de Paris. */
export function weekKey(now: number): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' })
    .formatToParts(new Date(now))
    .reduce<Record<string, string>>((acc, p) => ({ ...acc, [p.type]: p.value }), {});
  const d = new Date(Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day)));
  const day = d.getUTCDay() || 7; // lundi = 1 … dimanche = 7
  d.setUTCDate(d.getUTCDate() + 4 - day); // jeudi de la même semaine ISO
  const year = d.getUTCFullYear();
  const week = Math.ceil(((d.getTime() - Date.UTC(year, 0, 1)) / 86_400_000 + 1) / 7);
  return `${year}-S${String(week).padStart(2, '0')}`;
}

const hash = (s: string) => {
  let h = 2166136261; // FNV-1a
  for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
  return h;
};

export const CHALLENGE_SIZE = 10;

/**
 * Les 10 positions de la semaine : une par tranche d'Elo (900 → 2100), tirées
 * de façon déterministe (même semaine = mêmes positions pour tous).
 */
export function challengePick<T extends { id: string; rating: number }>(pool: T[], now: number): T[] {
  const key = weekKey(now);
  const sorted = [...pool].sort((a, b) => a.id.localeCompare(b.id));
  const picks: T[] = [];
  for (let i = 0; i < CHALLENGE_SIZE; i++) {
    const lo = 900 + i * 120;
    const band = sorted.filter((p) => p.rating >= lo && p.rating < lo + 120 && !picks.includes(p));
    if (band.length) picks.push(band[hash(`${key}#${i}`) % band.length]);
  }
  return picks;
}

/** Première tentative de chaque position du défi de cette semaine. */
export function challengeProgress(acts: { t: number; m: string; p: string; ok: boolean }[], picks: { id: string }[], now: number) {
  const key = weekKey(now);
  const ids = new Set(picks.map((p) => p.id));
  const first = new Map<string, boolean>();
  for (const a of [...acts].sort((x, y) => x.t - y.t)) {
    if (a.m === 'challenge' && ids.has(a.p) && !first.has(a.p) && weekKey(a.t) === key) first.set(a.p, a.ok);
  }
  const next = picks.findIndex((p) => !first.has(p.id));
  return { played: first.size, solved: [...first.values()].filter(Boolean).length, next, results: first };
}
