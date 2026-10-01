// Base d'exercices de l'entraîneur, en ligne (table coach_sets, migration 0008).
//  - l'entraîneur (connecté) lit, remplace ou vide SA base ;
//  - l'élève la lit par le code du groupe (fonction coach_set), sans compte ;
//    une copie locale permet de jouer hors ligne.

import { newCoachCode, sanitizeCoachItems, COACH_CODE, type CoachItem } from '../core/coachSet';
import { getCloud } from './cloud';
import { sanitizeDetail } from '../core/coachProgress';
import { sanitizeHomework, type Homework } from '../core/homework';

export interface CoachSet {
  code: string;
  name: string;
  items: CoachItem[];
  updatedAt: string;
  /** Devoirs en cours (migration 0011). */
  homework: Homework[];
}

const CACHE = 'endgameRush:v1:coachGroup';

async function cloud() {
  const c = await getCloud();
  if (!c) throw 'Comptes en ligne indisponibles.';
  return c;
}

/** Base de l'entraîneur connecté (null : pas encore créée). */
export async function fetchMySet(): Promise<CoachSet | null> {
  const { data, error } = await (await cloud()).from('coach_sets').select('code, name, puzzles, updated_at, homework').maybeSingle();
  if (error) throw error;
  return data
    ? { code: data.code, name: data.name, items: sanitizeCoachItems(data.puzzles), updatedAt: data.updated_at, homework: sanitizeHomework(data.homework) }
    : null;
}

/** Remplace TOUTE la base (purge à chaque import), en la créant au besoin. Les devoirs, liés aux
 *  rangs des exercices, sont effacés avec elle. */
export async function replaceMySet(name: string, items: CoachItem[]): Promise<CoachSet> {
  const c = await cloud();
  const existing = await fetchMySet();
  const updatedAt = new Date().toISOString();
  if (existing) {
    const { error } = await c.from('coach_sets').update({ name, puzzles: items, updated_at: updatedAt, homework: [] }).eq('code', existing.code);
    if (error) throw error;
    return { code: existing.code, name, items, updatedAt, homework: [] };
  }
  for (let attempt = 0; attempt < 3; attempt++) {
    const code = newCoachCode();
    const { error } = await c.from('coach_sets').insert({ code, name, puzzles: items, updated_at: updatedAt });
    if (!error) return { code, name, items, updatedAt, homework: [] };
    if (error.code !== '23505') throw error; // code déjà pris : on en tire un autre
  }
  throw 'Création de la base impossible, réessaie.';
}

/** Elo recalibrés : mêmes exercices, mêmes rangs, même version (le suivi reste valable). */
export async function saveRatings(code: string, items: CoachItem[]): Promise<void> {
  const { error } = await (await cloud()).from('coach_sets').update({ puzzles: items }).eq('code', code);
  if (error) throw error;
}

/** Enregistre la liste des devoirs. */
export async function saveHomework(code: string, homework: Homework[]): Promise<void> {
  const { error } = await (await cloud()).from('coach_sets').update({ homework }).eq('code', code);
  if (error) throw error;
}

/** Base d'un groupe, par son code (élève). Null si le code n'existe pas. */
export async function fetchGroupSet(code: string): Promise<CoachSet | null> {
  const clean = code.trim().toUpperCase();
  if (!COACH_CODE.test(clean)) return null;
  const { data, error } = await (await cloud()).rpc('coach_set', { p_code: clean });
  if (error) throw error;
  if (!data) return null;
  const set: CoachSet = {
    code: clean,
    name: String(data.name ?? 'Groupe'),
    items: sanitizeCoachItems(data.puzzles),
    updatedAt: String(data.updated_at ?? ''),
    homework: sanitizeHomework(data.homework),
  };
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
    return { code: raw.code, name: String(raw.name), items: sanitizeCoachItems(raw.items), updatedAt: String(raw.updatedAt), homework: sanitizeHomework(raw.homework) };
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

// ---------------------------------------------------------------- Suivi des élèves (migration 0009)

export interface Membership {
  code: string;
  memberId: string;
  secret: string;
  pseudo: string;
}

const MEMBER = 'endgameRush:v1:coachMember';
const DECLINED = 'endgameRush:v1:coachShareDeclined';
const PENDING = 'endgameRush:v1:coachPending';

const readJson = <T,>(key: string, fallback: T): T => {
  try {
    return (JSON.parse(window.localStorage.getItem(key) ?? 'null') as T) ?? fallback;
  } catch {
    return fallback;
  }
};
const writeJson = (key: string, value: unknown) => {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* sans stockage */
  }
};

export const membership = (): Membership | null => readJson<Membership | null>(MEMBER, null);
/** L'élève a choisi de jouer sans partager ses résultats (pour ce groupe). */
export const shareDeclined = (code: string): boolean => readJson<string | null>(DECLINED, null) === code;
export const declineShare = (code: string | null) => writeJson(DECLINED, code);

function newSecret(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Rejoindre le suivi du groupe sous un pseudo (consentement donné). Renvoie un message d'erreur, ou null. */
export async function joinTracking(code: string, pseudo: string): Promise<string | null> {
  const clean = pseudo.trim();
  if (!/^[\p{L}\p{N} _.-]{2,30}$/u.test(clean)) return 'Pseudo : 2 à 30 caractères (lettres, chiffres, espace, _ . -).';
  const secret = newSecret();
  try {
    const { data, error } = await (await cloud()).rpc('coach_join', { p_code: code, p_pseudo: clean, p_secret: secret });
    if (error?.code === '23505') return 'Ce pseudo est déjà pris dans le groupe : choisis-en un autre.';
    if (error?.code === 'P0001') return 'Le groupe est complet (200 élèves).';
    if (error) throw error;
    writeJson(MEMBER, { code, memberId: String(data), secret, pseudo: clean } satisfies Membership);
    declineShare(null);
    return null;
  } catch {
    return 'Inscription impossible pour le moment (connexion). Réessaie plus tard.';
  }
}

/** Ne plus partager : l'élève est retiré du suivi et ses résultats sont supprimés. */
export async function leaveTracking(): Promise<void> {
  const m = membership();
  writeJson(MEMBER, null);
  writeJson(PENDING, null);
  if (!m) return;
  try {
    await (await cloud()).rpc('coach_leave', { p_member: m.memberId, p_secret: m.secret });
  } catch {
    /* hors ligne : l'entraîneur peut aussi retirer l'élève ; effacement automatique après un an */
  }
}

export interface ReportEntry {
  mode: 'storm' | 'streak';
  score: number;
  errors: number;
  played: number;
  failed: number[];
  version: string | null;
  /** Détail par exercice (temps, 1er mauvais coup, type d'erreur). */
  detail?: import('../core/coachProgress').CoachDetail[];
}

/** Envoie le résultat d'une partie (et ceux restés en attente faute de connexion). */
export async function reportResult(entry: ReportEntry): Promise<void> {
  const m = membership();
  if (!m) return;
  const queue = [...readJson<ReportEntry[]>(PENDING, []), entry].slice(-50);
  writeJson(PENDING, queue);
  const c = await cloud();
  while (queue.length) {
    const e = queue[0];
    const { error } = await c.rpc('coach_report', {
      p_member: m.memberId,
      p_secret: m.secret,
      p_mode: e.mode,
      p_score: e.score,
      p_errors: e.errors,
      p_played: e.played,
      p_failed: e.failed.slice(0, 100),
      p_version: e.version || null,
      p_detail: e.detail?.length ? e.detail : null,
    });
    if (error?.code === 'P0002') {
      // Retiré du groupe par l'entraîneur : on arrête le partage.
      writeJson(MEMBER, null);
      writeJson(PENDING, null);
      return;
    }
    if (error) throw error;
    queue.shift();
    writeJson(PENDING, queue);
  }
}

/** Entraîneur : ses élèves et leurs résultats. */
export async function fetchProgress(): Promise<import('../core/coachProgress').MemberProgress[]> {
  const { data, error } = await (await cloud()).rpc('coach_progress');
  if (error) throw error;
  if (!Array.isArray(data)) return [];
  return (data as import('../core/coachProgress').MemberProgress[]).map((m) => ({
    ...m,
    results: (Array.isArray(m.results) ? m.results : []).map((r) => ({ ...r, d: sanitizeDetail(r.d) })),
  }));
}

export async function removeStudent(memberId: string): Promise<void> {
  const { error } = await (await cloud()).rpc('coach_remove_member', { p_member: memberId });
  if (error) throw error;
}
