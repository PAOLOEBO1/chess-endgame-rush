// Vue entraîneur, façon ChessTempo : fiche élève, fiche exercice, recalibrage de l'Elo des
// exercices, carte du groupe, inactivité, export CSV. Fonctions pures, à partir des résultats
// envoyés par les élèves (coach_progress) et de la base de l'entraîneur.
//
// Choix documentés :
//  - seules les parties jouées sur la version ACTUELLE de la base comptent (les rangs des
//    exercices changent à chaque import) ;
//  - Elo de l'élève sur la base : Glicko-2 comme l'Elo personnel de l'appli (départ 1500 ± 500,
//    tau 0,5), PREMIÈRE tentative de chaque exercice seulement ; écart-type de l'exercice 75 si
//    son Elo vient du PGN, 200 s'il est estimé ; provisoire tant que l'écart-type dépasse 110 ;
//  - plafond : tranche de 200 Elo la plus haute réussie à 60 % ou plus, sur 3 tentatives au moins ;
//  - recalibrage : « performance » de l'exercice contre les élèves qui l'ont tenté (moyenne de leurs
//    Elo + 400 × (échecs − réussites) / n), mêlée à l'Elo actuel avec un poids de 5 tentatives ;
//    proposé à partir de 5 tentatives et d'un écart de 50 points.

import type { CoachDetail, MemberProgress } from './coachProgress';
import { median } from './coachProgress';
import type { CoachItem } from './coachSet';
import { ERROR_INFO, ERROR_TYPES, type ErrorType } from './errorTypes';
import { updateRating, type Rating } from './glicko2';
import { motifId, motifLabel } from './motifs';
import { PROVISIONAL_RD, START } from './playerRating';

const TAU = 0.5;
export const INACTIVE_DAYS = 14;
const DAY = 86_400_000;

/** Un exercice joué par un élève (entrée de détail d'une partie, avec sa date). */
export interface PlayedEntry extends CoachDetail {
  t: number;
  mode: 'storm' | 'streak';
}

/** Exercices joués par un élève sur la version actuelle de la base, dans l'ordre. */
export function entriesOf(m: MemberProgress, version: string | null): PlayedEntry[] {
  const out: PlayedEntry[] = [];
  const results = [...m.results].filter((r) => version && r.v === version).sort((a, b) => a.t.localeCompare(b.t));
  for (const r of results) for (const d of r.d ?? []) out.push({ ...d, t: Date.parse(r.t), mode: r.mode });
  return out;
}

// ------------------------------------------------------------------ Elo de l'élève

export interface BaseRating {
  r: number;
  rd: number;
  games: number;
  provisional: boolean;
  /** Elo après chaque partie (pour la courbe). */
  history: { t: number; r: number }[];
}

export function baseRating(entries: PlayedEntry[], items: CoachItem[]): BaseRating {
  let rating: Rating = START;
  let games = 0;
  const seen = new Set<number>();
  const history: { t: number; r: number }[] = [];
  for (const e of entries) {
    const item = items[e.i];
    if (!item || seen.has(e.i)) continue;
    seen.add(e.i);
    rating = updateRating(rating, [{ r: item.r, rd: item.e ? 200 : 75, s: e.ok ? 1 : 0 }], TAU);
    games += 1;
    const point = { t: e.t, r: Math.round(rating.r) };
    if (history.length && history[history.length - 1].t === e.t) history[history.length - 1] = point;
    else history.push(point);
  }
  return { r: Math.round(rating.r), rd: Math.round(rating.rd), games, provisional: rating.rd > PROVISIONAL_RD, history };
}

// ------------------------------------------------------------------ Fiche élève

export interface Rate {
  n: number;
  ok: number;
}
const add = (map: Map<string, Rate>, key: string, ok: boolean) => {
  const cur = map.get(key) ?? map.set(key, { n: 0, ok: 0 }).get(key)!;
  cur.n += 1;
  if (ok) cur.ok += 1;
};

export const BAND = 200;
export const bandOf = (r: number) => Math.floor(r / BAND) * BAND;
export const bandLabel = (b: number) => `${b}–${b + BAND - 1}`;

export interface StudentSheet {
  rating: BaseRating;
  tries: number;
  success: number | null;
  medianMs: number | null;
  /** Réussite par tranche de 200 Elo (du plus facile au plus difficile). */
  bands: { band: number; n: number; ok: number }[];
  /** Tranche la plus haute réussie à 60 % ou plus (3 tentatives au moins). */
  ceiling: number | null;
  /** Motifs (thèmes de la base), du plus faible au plus fort, 3 tentatives au moins. */
  motifs: { id: string; label: string; n: number; ok: number }[];
  errors: { type: ErrorType; label: string; count: number }[];
  /** Exercices les plus ratés par cet élève. */
  missed: { index: number; misses: number }[];
}

export function studentSheet(m: MemberProgress, items: CoachItem[], version: string | null): StudentSheet {
  const entries = entriesOf(m, version).filter((e) => items[e.i]);
  const bands = new Map<string, Rate>();
  const motifs = new Map<string, Rate>();
  const labels = new Map<string, string>();
  const errors = new Map<ErrorType, number>();
  const missed = new Map<number, number>();
  for (const e of entries) {
    const item = items[e.i];
    add(bands, String(bandOf(item.r)), e.ok);
    for (const th of item.th ?? []) {
      const id = motifId(th);
      labels.set(id, th);
      add(motifs, id, e.ok);
    }
    if (e.e) errors.set(e.e, (errors.get(e.e) ?? 0) + 1);
    if (!e.ok) missed.set(e.i, (missed.get(e.i) ?? 0) + 1);
  }
  const bandList = [...bands.entries()].map(([b, x]) => ({ band: Number(b), ...x })).sort((a, b) => a.band - b.band);
  const passed = bandList.filter((b) => b.n >= 3 && b.ok / b.n >= 0.6);
  const ok = entries.filter((e) => e.ok).length;
  return {
    rating: baseRating(entries, items),
    tries: entries.length,
    success: entries.length ? ok / entries.length : null,
    medianMs: median(entries.filter((e) => e.ok && e.ms != null).map((e) => e.ms!)),
    bands: bandList,
    ceiling: passed.length ? passed[passed.length - 1].band : null,
    motifs: [...motifs.entries()]
      .filter(([, x]) => x.n >= 3)
      .map(([id, x]) => ({ id, label: labels.get(id) ?? motifLabel(id), ...x }))
      .sort((a, b) => a.ok / a.n - b.ok / b.n || b.n - a.n),
    errors: ERROR_TYPES.filter((t) => errors.has(t))
      .map((t) => ({ type: t, label: ERROR_INFO[t].label, count: errors.get(t)! }))
      .sort((a, b) => b.count - a.count),
    missed: [...missed.entries()]
      .map(([index, misses]) => ({ index, misses }))
      .sort((a, b) => b.misses - a.misses || a.index - b.index)
      .slice(0, 5),
  };
}

// ---------------------------------------------------------- Fiche exercice et recalibrage

export interface ExerciseSheet {
  index: number;
  tries: number;
  success: number | null;
  medianMs: number | null;
  /** Mauvais coups les plus fréquents (UCI). */
  wrong: { uci: string; n: number }[];
  /** Élèves qui l'ont raté au moins une fois. */
  failedBy: string[];
  students: number;
  /** Elo proposé (null : pas assez de tentatives ou écart trop faible). */
  suggested: number | null;
}

/** Elo de chaque élève sur la base (pour le recalibrage). */
export function studentRatings(members: MemberProgress[], items: CoachItem[], version: string | null): Map<string, number> {
  return new Map(members.map((m) => [m.id, baseRating(entriesOf(m, version), items).r]));
}

export const MIN_RECAL_TRIES = 5;
const PRIOR = 5;

export function suggestRating(current: number, outcomes: { opp: number; ok: boolean }[]): number | null {
  if (outcomes.length < MIN_RECAL_TRIES) return null;
  const n = outcomes.length;
  const avgOpp = outcomes.reduce((s, o) => s + o.opp, 0) / n;
  const fails = outcomes.filter((o) => !o.ok).length;
  const perf = avgOpp + (400 * (fails - (n - fails))) / n;
  const blended = (current * PRIOR + perf * n) / (PRIOR + n);
  const s = Math.round(Math.min(3000, Math.max(400, blended)) / 10) * 10;
  return Math.abs(s - current) >= 50 ? s : null;
}

export function exerciseSheets(members: MemberProgress[], items: CoachItem[], version: string | null): Map<number, ExerciseSheet> {
  const ratings = studentRatings(members, items, version);
  const acc = new Map<number, { tries: number; ok: number; ms: number[]; wrong: Map<string, number>; failed: Set<string>; who: Set<string>; out: { opp: number; ok: boolean }[] }>();
  for (const m of members) {
    const first = new Set<number>();
    for (const e of entriesOf(m, version)) {
      if (!items[e.i]) continue;
      const a = acc.get(e.i) ?? acc.set(e.i, { tries: 0, ok: 0, ms: [], wrong: new Map(), failed: new Set(), who: new Set(), out: [] }).get(e.i)!;
      a.tries += 1;
      a.who.add(m.pseudo);
      if (e.ok) {
        a.ok += 1;
        if (e.ms != null) a.ms.push(e.ms);
      } else a.failed.add(m.pseudo);
      if (e.w) a.wrong.set(e.w, (a.wrong.get(e.w) ?? 0) + 1);
      // Recalibrage : première tentative de chaque élève seulement.
      if (!first.has(e.i)) {
        first.add(e.i);
        a.out.push({ opp: ratings.get(m.id) ?? START.r, ok: e.ok });
      }
    }
  }
  const out = new Map<number, ExerciseSheet>();
  for (const [index, a] of acc) {
    out.set(index, {
      index,
      tries: a.tries,
      success: a.tries ? a.ok / a.tries : null,
      medianMs: median(a.ms),
      wrong: [...a.wrong.entries()].map(([uci, n]) => ({ uci, n })).sort((x, y) => y.n - x.n || x.uci.localeCompare(y.uci)).slice(0, 3),
      failedBy: [...a.failed].sort((x, y) => x.localeCompare(y, 'fr')),
      students: a.who.size,
      suggested: suggestRating(items[index].r, a.out),
    });
  }
  return out;
}

/** Base avec les Elo recalibrés (même ordre, mêmes rangs ; l'Elo n'est plus « estimé »). */
export function applyRecalibration(items: CoachItem[], sheets: Map<number, ExerciseSheet>): { items: CoachItem[]; changed: number } {
  let changed = 0;
  const next = items.map((it, i) => {
    const s = sheets.get(i)?.suggested;
    if (s == null) return it;
    changed += 1;
    const { e: _estimated, ...rest } = it;
    return { ...rest, r: s };
  });
  return { items: next, changed };
}

// ---------------------------------------------------------------- Carte du groupe

export interface HeatColumn {
  id: string;
  label: string;
}
export interface Heatmap {
  /** « motifs » si la base a des thèmes, sinon tranches de difficulté. */
  kind: 'motifs' | 'tranches';
  columns: HeatColumn[];
  rows: { id: string; pseudo: string; cells: (Rate | null)[] }[];
}

export function groupHeatmap(members: MemberProgress[], items: CoachItem[], version: string | null): Heatmap {
  const hasThemes = items.some((it) => it.th?.length);
  const keysOf = (it: CoachItem) => (hasThemes ? (it.th ?? []).map(motifId) : [String(bandOf(it.r))]);
  const labels = new Map<string, string>();
  for (const it of items) {
    if (hasThemes) for (const th of it.th ?? []) labels.set(motifId(th), th);
    else labels.set(String(bandOf(it.r)), bandLabel(bandOf(it.r)));
  }
  const perMember = members.map((m) => {
    const map = new Map<string, Rate>();
    for (const e of entriesOf(m, version)) {
      const it = items[e.i];
      if (it) for (const k of keysOf(it)) add(map, k, e.ok);
    }
    return { m, map };
  });
  const used = new Set(perMember.flatMap((x) => [...x.map.keys()]));
  const columns = [...labels.entries()]
    .filter(([id]) => used.has(id))
    .map(([id, label]) => ({ id, label }))
    .sort((a, b) => (hasThemes ? a.label.localeCompare(b.label, 'fr') : Number(a.id) - Number(b.id)));
  return {
    kind: hasThemes ? 'motifs' : 'tranches',
    columns,
    rows: perMember.map(({ m, map }) => ({ id: m.id, pseudo: m.pseudo, cells: columns.map((c) => map.get(c.id) ?? null) })),
  };
}

// ------------------------------------------------------------------ Inactivité

/** Élèves sans partie depuis `days` jours (ou n'ayant jamais joué), du plus ancien au plus récent. */
export function inactiveStudents(members: MemberProgress[], now: number, days = INACTIVE_DAYS): { id: string; pseudo: string; days: number | null }[] {
  return members
    .map((m) => {
      const last = m.results.length ? Math.max(...m.results.map((r) => Date.parse(r.t))) : null;
      return { id: m.id, pseudo: m.pseudo, days: last === null ? null : Math.floor((now - last) / DAY) };
    })
    .filter((x) => x.days === null || x.days >= days)
    .sort((a, b) => (b.days ?? Infinity) - (a.days ?? Infinity));
}

// ------------------------------------------------------------------ Export CSV

/** Champ CSV (séparateur « ; » pour Excel en français), protégé contre l'injection de formules. */
export function csvField(v: string | number | null | undefined): string {
  if (v == null) return '';
  let s = String(v);
  if (/^[=+\-@\t\r]/.test(s) && typeof v === 'string') s = `'${s}`;
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
const csv = (rows: (string | number | null | undefined)[][]) => '﻿' + rows.map((r) => r.map(csvField).join(';')).join('\r\n') + '\r\n';
const pct = (x: number | null) => (x === null ? '' : Math.round(x * 100));
const sec = (ms: number | null | undefined) => (ms == null ? '' : (ms / 1000).toFixed(1).replace('.', ','));
const day = (t: number | string) => new Date(t).toISOString().slice(0, 10);

export function studentsCsv(members: MemberProgress[], items: CoachItem[], version: string | null): string {
  const rows: (string | number | null)[][] = [
    ['Élève', 'Elo sur la base', 'Provisoire', 'Exercices tentés', 'Réussite (%)', 'Temps médian (s)', 'Plafond (Elo)', 'Motif le plus faible', 'Erreur la plus fréquente', 'Parties', 'Dernière partie'],
  ];
  for (const m of members) {
    const s = studentSheet(m, items, version);
    const last = m.results.length ? day(Math.max(...m.results.map((r) => Date.parse(r.t)))) : '';
    rows.push([
      m.pseudo,
      s.rating.games ? s.rating.r : '',
      s.rating.games ? (s.rating.provisional ? 'oui' : 'non') : '',
      s.tries,
      pct(s.success),
      sec(s.medianMs),
      s.ceiling === null ? '' : bandLabel(s.ceiling),
      s.motifs[0]?.label ?? '',
      s.errors[0]?.label ?? '',
      m.results.length,
      last,
    ]);
  }
  return csv(rows);
}

export function attemptsCsv(members: MemberProgress[], items: CoachItem[], version: string | null): string {
  const rows: (string | number | null)[][] = [['Élève', 'Date', 'Mode', 'Rang', 'Exercice', 'Elo exercice', 'Réussi', 'Temps (s)', '1er mauvais coup', 'Type d’erreur']];
  for (const m of members)
    for (const e of entriesOf(m, version)) {
      const it = items[e.i];
      rows.push([m.pseudo, day(e.t), e.mode === 'storm' ? 'Storm' : 'Streak', e.i + 1, it?.t ?? '', it?.r ?? '', e.ok ? 'oui' : 'non', sec(e.ms), e.w ?? '', e.e ? ERROR_INFO[e.e].label : '']);
    }
  return csv(rows);
}
