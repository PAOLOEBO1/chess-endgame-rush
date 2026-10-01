// Devoirs de l'entraîneur : « réussir N exercices de ma base (un motif, ou des rangs) avant
// telle date ». Stockés avec la base (migration 0011) ; la progression se calcule à partir des
// tentatives (côté élève) ou des résultats partagés (côté entraîneur). Fonctions pures.

import { entriesOf } from './coachStats';
import type { MemberProgress } from './coachProgress';
import type { CoachItem } from './coachSet';
import { motifId } from './motifs';

export interface Homework {
  id: string;
  title: string;
  /** Motif (identifiant) ; absent = tous. */
  motif?: string;
  /** Rangs dans la base (1 = premier), bornes comprises ; absents = toute la base. */
  from?: number;
  to?: number;
  /** Nombre d'exercices différents à réussir. */
  target: number;
  /** Échéance (AAAA-MM-JJ), jusqu'à la fin de la journée. */
  due: string;
  /** Date de création (ISO) : seules les réussites postérieures comptent. */
  created: string;
}

export const MAX_HOMEWORK = 20;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const ID = /^[a-z0-9]{6,12}$/;

const clean = (s: string, max: number) => s.replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, max);

export function sanitizeHomework(raw: unknown): Homework[] {
  if (!Array.isArray(raw)) return [];
  const out: Homework[] = [];
  for (const v of raw.slice(0, MAX_HOMEWORK) as Record<string, unknown>[]) {
    if (!v || typeof v !== 'object') continue;
    if (typeof v.id !== 'string' || !ID.test(v.id) || typeof v.title !== 'string' || !clean(v.title, 60)) continue;
    if (!Number.isInteger(v.target) || (v.target as number) < 1 || (v.target as number) > 100) continue;
    if (typeof v.due !== 'string' || !DATE.test(v.due) || Number.isNaN(Date.parse(v.due))) continue;
    if (typeof v.created !== 'string' || Number.isNaN(Date.parse(v.created))) continue;
    const hw: Homework = { id: v.id, title: clean(v.title, 60), target: v.target as number, due: v.due, created: v.created };
    if (typeof v.motif === 'string' && /^[\w-]{1,30}$/.test(v.motif)) hw.motif = v.motif;
    if (Number.isInteger(v.from) && (v.from as number) >= 1 && (v.from as number) <= 500) hw.from = v.from as number;
    if (Number.isInteger(v.to) && (v.to as number) >= 1 && (v.to as number) <= 500) hw.to = v.to as number;
    out.push(hw);
  }
  return out;
}

export function newHomeworkId(random: (n: number) => Uint8Array = (n) => crypto.getRandomValues(new Uint8Array(n))): string {
  const alphabet = 'abcdefghijkmnpqrstuvwxyz23456789';
  return [...random(8)].map((b) => alphabet[b % alphabet.length]).join('');
}

/** Rangs (0 = premier) des exercices concernés par le devoir. */
export function homeworkIndices(items: CoachItem[], hw: Homework): number[] {
  const out: number[] = [];
  items.forEach((it, i) => {
    if (hw.from && i + 1 < hw.from) return;
    if (hw.to && i + 1 > hw.to) return;
    if (hw.motif && !(it.th ?? []).some((t) => motifId(t) === hw.motif)) return;
    out.push(i);
  });
  return out;
}

/** Objectif réaliste : jamais plus que le nombre d'exercices concernés. */
export const homeworkGoal = (items: CoachItem[], hw: Homework) => Math.min(hw.target, homeworkIndices(items, hw).length);

const endOf = (due: string) => Date.parse(`${due}T23:59:59`);

export function dueInfo(hw: Homework, now: number): { late: boolean; daysLeft: number } {
  const end = endOf(hw.due);
  return { late: now > end, daysLeft: Math.max(0, Math.ceil((end - now) / 86_400_000)) };
}

/** Élève : exercices différents du devoir réussis depuis sa création (tentatives locales). */
export function myHomeworkDone(attempts: { t: number; p: string; ok: boolean }[], hw: Homework, items: CoachItem[], code: string): number {
  const ids = new Set(homeworkIndices(items, hw).map((i) => `c-${code}-${i + 1}`));
  const start = Date.parse(hw.created);
  return new Set(attempts.filter((a) => a.ok && a.t >= start && ids.has(a.p)).map((a) => a.p)).size;
}

/** Entraîneur : progression de chaque élève suivi (réussites avant l'échéance). */
export function groupHomework(
  members: MemberProgress[],
  hw: Homework,
  items: CoachItem[],
  version: string | null,
): { id: string; pseudo: string; done: number; reached: boolean }[] {
  const idx = new Set(homeworkIndices(items, hw));
  const goal = homeworkGoal(items, hw);
  const start = Date.parse(hw.created);
  const end = endOf(hw.due);
  return members.map((m) => {
    const solved = new Set(entriesOf(m, version).filter((e) => e.ok && idx.has(e.i) && e.t >= start && e.t <= end).map((e) => e.i));
    return { id: m.id, pseudo: m.pseudo, done: solved.size, reached: goal > 0 && solved.size >= goal };
  });
}
