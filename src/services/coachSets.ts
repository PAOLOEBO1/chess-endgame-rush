// Base d'exercices de l'entraîneur, en ligne (table coach_sets, migration 0008).
//  - l'entraîneur (connecté) lit, remplace ou vide SA base ;
//  - l'élève la lit par le code du groupe (fonction coach_set), sans compte ;
//    une copie locale permet de jouer hors ligne.

import { newCoachCode, sanitizeCoachItems, COACH_CODE, type CoachItem } from '../core/coachSet';
import { getCloud } from './cloud';

export interface CoachSet {
  code: string;
  name: string;
  items: CoachItem[];
  updatedAt: string;
}

const CACHE = 'endgameRush:v1:coachGroup';

async function cloud() {
  const c = await getCloud();
  if (!c) throw 'Comptes en ligne indisponibles.';
  return c;
}

/** Base de l'entraîneur connecté (null : pas encore créée). */
export async function fetchMySet(): Promise<CoachSet | null> {
  const { data, error } = await (await cloud()).from('coach_sets').select('code, name, puzzles, updated_at').maybeSingle();
  if (error) throw error;
  return data ? { code: data.code, name: data.name, items: sanitizeCoachItems(data.puzzles), updatedAt: data.updated_at } : null;
}

/** Remplace TOUTE la base (purge à chaque import), en la créant au besoin. */
export async function replaceMySet(name: string, items: CoachItem[]): Promise<CoachSet> {
  const c = await cloud();
  const existing = await fetchMySet();
  const updatedAt = new Date().toISOString();
  if (existing) {
    const { error } = await c.from('coach_sets').update({ name, puzzles: items, updated_at: updatedAt }).eq('code', existing.code);
    if (error) throw error;
    return { code: existing.code, name, items, updatedAt };
  }
  for (let attempt = 0; attempt < 3; attempt++) {
    const code = newCoachCode();
    const { error } = await c.from('coach_sets').insert({ code, name, puzzles: items, updated_at: updatedAt });
    if (!error) return { code, name, items, updatedAt };
    if (error.code !== '23505') throw error; // code déjà pris : on en tire un autre
  }
  throw 'Création de la base impossible, réessaie.';
}

/** Base d'un groupe, par son code (élève). Null si le code n'existe pas. */
export async function fetchGroupSet(code: string): Promise<CoachSet | null> {
  const clean = code.trim().toUpperCase();
  if (!COACH_CODE.test(clean)) return null;
  const { data, error } = await (await cloud()).rpc('coach_set', { p_code: clean });
  if (error) throw error;
  if (!data) return null;
  const set: CoachSet = { code: clean, name: String(data.name ?? 'Groupe'), items: sanitizeCoachItems(data.puzzles), updatedAt: String(data.updated_at ?? '') };
  try {
    window.localStorage.setItem(CACHE, JSON.stringify(set));
  } catch {
    /* sans stockage : pas de copie hors ligne */
  }
  return set;
}

/** Dernière copie locale du groupe rejoint (jeu hors ligne). */
export function cachedGroupSet(): CoachSet | null {
  try {
    const raw = JSON.parse(window.localStorage.getItem(CACHE) ?? 'null') as CoachSet | null;
    if (!raw || !COACH_CODE.test(raw.code)) return null;
    return { code: raw.code, name: String(raw.name), items: sanitizeCoachItems(raw.items), updatedAt: String(raw.updatedAt) };
  } catch {
    return null;
  }
}

export function forgetGroupSet(): void {
  try {
    window.localStorage.removeItem(CACHE);
  } catch {
    /* rien à faire */
  }
}
