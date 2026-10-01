// Données d'entraînement rattachées au compte (tests de maîtrise, bibliothèque
// de séries) : validation et fusion entre appareils. Fonctions pures.

import { isValidFen } from './chessRules';
import type { ExamRecord } from './exam';
import type { SeriesItem } from './series';

export interface SavedSeries {
  id: string;
  name: string;
  items: SeriesItem[];
  savedAt: number;
  /** Supprimée (gardée un temps pour que la suppression atteigne les autres appareils). */
  deletedAt?: number;
}

const TOMBSTONE_MS = 180 * 86_400_000;
const num = (v: unknown, min: number, max: number): v is number => typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;
const T = (v: unknown): v is number => num(v, 1_700_000_000_000, 4_102_444_800_000);
const text = (v: unknown, max: number) => (typeof v === 'string' ? v.replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, max) : '');

export function sanitizeExams(raw: unknown): Record<string, ExamRecord> {
  const out: Record<string, ExamRecord> = {};
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
  for (const [k, v] of Object.entries(raw as Record<string, unknown>).slice(0, 50)) {
    const x = v as Partial<ExamRecord> | null;
    if (!/^[a-z0-9-]{1,30}$/.test(k) || !x || !num(x.best, 0, 100) || !num(x.total, 1, 100) || !T(x.lastAt)) continue;
    out[k] = { best: x.best, total: x.total, passedAt: T(x.passedAt) ? x.passedAt : null, lastAt: x.lastAt };
  }
  return out;
}

export function sanitizeSeries(raw: unknown): SavedSeries[] {
  if (!Array.isArray(raw)) return [];
  const out: SavedSeries[] = [];
  for (const v of raw.slice(0, 200)) {
    const x = v as Partial<SavedSeries> | null;
    if (!x || typeof x.id !== 'string' || !/^[\w-]{1,40}$/.test(x.id) || !T(x.savedAt) || !Array.isArray(x.items)) continue;
    const items: SeriesItem[] = [];
    for (const it of x.items.slice(0, 30) as unknown[]) {
      const o = it as Record<string, unknown> | null;
      if (o && typeof o.id === 'string' && /^[\w.-]{1,40}$/.test(o.id)) items.push({ id: o.id });
      else if (o && typeof o.fen === 'string' && o.fen.length <= 100 && isValidFen(o.fen) && (o.objective === 'win' || o.objective === 'draw')) {
        const title = text(o.title, 60);
        items.push({ fen: o.fen, objective: o.objective, ...(title ? { title } : {}) });
      }
    }
    out.push({ id: x.id, name: text(x.name, 60) || 'Série d’entraînement', items, savedAt: x.savedAt, ...(T(x.deletedAt) ? { deletedAt: x.deletedAt } : {}) });
  }
  return out;
}

/** Même thème sur deux appareils : meilleur score, première maîtrise, dernier passage. */
export function mergeExams(a: Record<string, ExamRecord>, b: Record<string, ExamRecord>): Record<string, ExamRecord> {
  const out: Record<string, ExamRecord> = { ...a };
  for (const [k, y] of Object.entries(b)) {
    const x = out[k];
    if (!x) {
      out[k] = y;
      continue;
    }
    const passed = [x.passedAt, y.passedAt].filter((t): t is number => t !== null);
    out[k] = { best: Math.max(x.best, y.best), total: Math.max(x.total, y.total), passedAt: passed.length ? Math.min(...passed) : null, lastAt: Math.max(x.lastAt, y.lastAt) };
  }
  return out;
}

const stamp = (s: SavedSeries) => Math.max(s.savedAt, s.deletedAt ?? 0);

/** Bibliothèque : pour chaque série, la version la plus récente (suppression comprise), les plus récentes d'abord. */
export function mergeSeries(a: SavedSeries[], b: SavedSeries[], now: number): SavedSeries[] {
  const byId = new Map<string, SavedSeries>();
  for (const s of [...a, ...b]) {
    const cur = byId.get(s.id);
    if (!cur || stamp(s) > stamp(cur)) byId.set(s.id, s);
  }
  return [...byId.values()].filter((s) => !s.deletedAt || now - s.deletedAt < TOMBSTONE_MS).sort((x, y) => stamp(y) - stamp(x));
}

export const visibleSeries = (list: SavedSeries[]) => list.filter((s) => !s.deletedAt);
