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

/** Un entraîneur peut avoir jusqu'à 10 groupes (migration 0012). */
export const MAX_GROUPS = 10;

const COLUMNS = 'code, name, puzzles, updated_at, homework';
interface CoachRow {
  code: string;
  name: string;
  puzzles: unknown;
  updated_at: string;
  homework: unknown;
}
const fromRow = (r: CoachRow): CoachSet => ({
  code: r.code,
  name: r.name,
  items: sanitizeCoachItems(r.puzzles),
  updatedAt: r.updated_at,
  homework: sanitizeHomework(r.homework),
});

/** Tous les groupes de l'entraîneur connecté, du plus ancien au plus récent (liste vide : aucun groupe). */
export async function fetchMySets(): Promise<CoachSet[]> {
  const { data, error } = await (await cloud()).from('coach_sets').select(COLUMNS).order('created_at', { ascending: true });
  if (error) throw error;
  return ((data ?? []) as CoachRow[]).map(fromRow);
}

/** Remplace TOUTE la base du groupe `code` (purge à chaque import), ou crée un NOUVEAU groupe si `code` est absent
 *  (erreur P0001 au-delà de 10 groupes). Les devoirs, liés aux rangs des exercices, sont effacés avec la base. */
export async function replaceMySet(name: string, items: CoachItem[], code?: string): Promise<CoachSet> {
  const c = await cloud();
  const updatedAt = new Date().toISOString();
  if (code) {
    const { error } = await c.from('coach_sets').update({ name, puzzles: items, updated_at: updatedAt, homework: [] }).eq('code', code);
    if (error) throw error;
    return { code, name, items, updatedAt, homework: [] };
  }
  for (let attempt = 0; attempt < 3; attempt++) {
    const fresh = newCoachCode();
    const { error } = await c.from('coach_sets').insert({ code: fresh, name, puzzles: items, updated_at: updatedAt });
    if (!error) return { code: fresh, name, items, updatedAt, homework: [] };
    if (error.code !== '23505') throw error; // code déjà pris : on en tire un autre
  }
  throw 'Création de la base impossible, réessaie.';
}

/** Change le nom d'un groupe (la version de la base, donc le suivi, ne change pas). */
export async function renameMySet(code: string, name: string): Promise<void> {
  const { error } = await (await cloud()).from('coach_sets').update({ name }).eq('code', code);
  if (error) throw error;
}

/** Supprime un groupe, avec ses élèves suivis et leurs résultats. */
export async function deleteMySet(code: string): Promise<void> {
  const { error } = await (await cloud()).from('coach_sets').delete().eq('code', code);
  if (error) throw error;
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

/** Entraîneur : les élèves d'un de ses groupes et leurs résultats. */
export async function fetchProgress(code: string): Promise<import('../core/coachProgress').MemberProgress[]> {
  const { data, error } = await (await cloud()).rpc('coach_progress', { p_code: code });
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
