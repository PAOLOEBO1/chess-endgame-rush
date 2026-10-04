// Base d'exercices de l'entraîneur, en ligne (table coach_sets, migration 0008).
//  - l'entraîneur (connecté) lit, remplace ou vide SA base ;
//  - l'élève la lit par le code du groupe (fonction coach_set), sans compte ;
//    une copie locale de chaque groupe rejoint permet de jouer hors ligne (plusieurs groupes à la fois depuis le 05/10).

import { newCoachCode, sanitizeCoachItems, COACH_CODE, type CoachItem } from '../core/coachSet';
import { getCloud } from './cloud';
import { sanitizeDetail } from '../core/coachProgress';
import { sanitizeHomework, type Homework } from '../core/homework';
import { emptyJoined, MAX_JOINED, migrateLegacy, removeGroup, selectGroup, setDeclined, upsertGroup, type JoinedState } from '../core/studentGroups';

export interface CoachSet {
  code: string;
  name: string;
  items: CoachItem[];
  updatedAt: string;
  /** Devoirs en cours (migration 0011). */
  homework: Homework[];
}

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

/** Base d'un groupe, par son code (élève). Null si le code n'existe pas. Ne modifie pas la liste des groupes rejoints. */
export async function fetchGroupSet(code: string): Promise<CoachSet | null> {
  const clean = code.trim().toUpperCase();
  if (!COACH_CODE.test(clean)) return null;
  const { data, error } = await (await cloud()).rpc('coach_set', { p_code: clean });
  if (error) throw error;
  if (!data) return null;
  return {
    code: clean,
    name: String(data.name ?? 'Groupe'),
    items: sanitizeCoachItems(data.puzzles),
    updatedAt: String(data.updated_at ?? ''),
    homework: sanitizeHomework(data.homework),
  };
}

// ---------------------------------------------------------------- Groupes rejoints par l'élève (plusieurs à la fois)

export interface Membership {
  code: string;
  memberId: string;
  secret: string;
  pseudo: string;
}

// Ancien stockage (un seul groupe à la fois, jusqu'au 05/10/2026) : repris une fois puis effacé.
const LEGACY_GROUP = 'endgameRush:v1:coachGroup';
const LEGACY_MEMBER = 'endgameRush:v1:coachMember';
const LEGACY_DECLINED = 'endgameRush:v1:coachShareDeclined';
const LEGACY_PENDING = 'endgameRush:v1:coachPending';
// Nouveau stockage : groupes rejoints (copies hors ligne, groupe actif, refus), suivis et résultats en attente PAR CODE.
const JOINED = 'endgameRush:v2:coachGroups';
const MEMBERS = 'endgameRush:v2:coachMembers';
const PENDING = 'endgameRush:v2:coachPending';

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

const cleanSet = (raw: unknown): CoachSet | null => {
  const r = raw as Partial<CoachSet> | null;
  if (!r || typeof r.code !== 'string' || !COACH_CODE.test(r.code)) return null;
  return { code: r.code, name: String(r.name ?? 'Groupe'), items: sanitizeCoachItems(r.items), updatedAt: String(r.updatedAt ?? ''), homework: sanitizeHomework(r.homework) };
};
const cleanMember = (raw: unknown): Membership | null => {
  const r = raw as Partial<Membership> | null;
  if (!r || typeof r.code !== 'string' || !COACH_CODE.test(r.code) || typeof r.memberId !== 'string' || typeof r.secret !== 'string') return null;
  return { code: r.code, memberId: r.memberId, secret: r.secret, pseudo: String(r.pseudo ?? '') };
};

/** Reprend l'ancien stockage à un seul groupe (une fois). */
function migrateIfNeeded(): void {
  try {
    if (window.localStorage.getItem(JOINED) !== null) return;
    const hasLegacy = [LEGACY_GROUP, LEGACY_MEMBER, LEGACY_DECLINED].some((k) => window.localStorage.getItem(k) !== null);
    if (!hasLegacy) return;
    const { state, members } = migrateLegacy(cleanSet(readJson(LEGACY_GROUP, null)), cleanMember(readJson(LEGACY_MEMBER, null)), readJson<string | null>(LEGACY_DECLINED, null));
    const legacyMember = Object.values(members)[0];
    const legacyPending = readJson<ReportEntry[]>(LEGACY_PENDING, []);
    writeJson(JOINED, state);
    writeJson(MEMBERS, members);
    if (legacyMember && Array.isArray(legacyPending) && legacyPending.length) writeJson(PENDING, { [legacyMember.code]: legacyPending });
    for (const k of [LEGACY_GROUP, LEGACY_MEMBER, LEGACY_DECLINED, LEGACY_PENDING]) window.localStorage.removeItem(k);
  } catch {
    /* sans stockage */
  }
}

/** Groupes rejoints (copies locales pour jouer hors ligne), groupe actif et refus de partage. */
export function joinedGroups(): JoinedState<CoachSet> {
  migrateIfNeeded();
  const raw = readJson<{ groups?: unknown; active?: unknown; declined?: unknown } | null>(JOINED, null);
  if (!raw || !Array.isArray(raw.groups)) return emptyJoined<CoachSet>();
  const groups = (raw.groups as unknown[]).map(cleanSet).filter((g): g is CoachSet => !!g).slice(0, MAX_JOINED);
  const active = typeof raw.active === 'string' ? raw.active : null;
  const declined = Array.isArray(raw.declined) ? (raw.declined as unknown[]) : [];
  return {
    groups,
    active: active && groups.some((g) => g.code === active) ? active : (groups[0]?.code ?? null),
    declined: declined.filter((c): c is string => typeof c === 'string' && COACH_CODE.test(c)),
  };
}
const saveJoined = (s: JoinedState<CoachSet>) => writeJson(JOINED, s);

/** Ajoute (ou met à jour) un groupe rejoint. Renvoie false si l'élève a déjà 10 groupes. */
export function keepJoinedGroup(set: CoachSet, makeActive: boolean): boolean {
  const next = upsertGroup(joinedGroups(), set, makeActive);
  if (!next) return false;
  saveJoined(next);
  return true;
}

/** Choisit le groupe joué. */
export function selectJoinedGroup(code: string): void {
  saveJoined(selectGroup(joinedGroups(), code));
}

/** Retire un groupe de la liste (son suivi doit être quitté avant : voir leaveTracking). */
export function forgetJoinedGroup(code: string): void {
  saveJoined(removeGroup(joinedGroups(), code));
}

/** Suivis par groupe (code → inscription). */
export function memberships(): Record<string, Membership> {
  migrateIfNeeded();
  const raw = readJson<Record<string, unknown>>(MEMBERS, {});
  const out: Record<string, Membership> = {};
  for (const [code, m] of Object.entries(raw ?? {})) {
    const clean = cleanMember(m);
    if (clean && clean.code === code) out[code] = clean;
  }
  return out;
}
export const membershipFor = (code: string): Membership | null => memberships()[code] ?? null;
const setMembership = (code: string, m: Membership | null) => {
  const all = memberships();
  if (m) all[code] = m;
  else delete all[code];
  writeJson(MEMBERS, all);
};

const pendingFor = (code: string): ReportEntry[] => {
  const all = readJson<Record<string, ReportEntry[]>>(PENDING, {});
  return Array.isArray(all?.[code]) ? all[code] : [];
};
const setPending = (code: string, queue: ReportEntry[]) => {
  const all = readJson<Record<string, ReportEntry[]>>(PENDING, {}) ?? {};
  if (queue.length) all[code] = queue;
  else delete all[code];
  writeJson(PENDING, Object.keys(all).length ? all : null);
};

/** L'élève a choisi de jouer sans partager ses résultats dans ce groupe. */
export const shareDeclined = (code: string): boolean => joinedGroups().declined.includes(code);
export const declineShare = (code: string, declined = true) => saveJoined(setDeclined(joinedGroups(), code, declined));

function newSecret(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Rejoindre le suivi d'UN groupe sous un pseudo (consentement donné). Les suivis dans les autres groupes ne changent
 * pas. Renvoie un message d'erreur, ou null.
 */
export async function joinTracking(code: string, pseudo: string): Promise<string | null> {
  const clean = pseudo.trim();
  if (!/^[\p{L}\p{N} _.-]{2,30}$/u.test(clean)) return 'Pseudo : 2 à 30 caractères (lettres, chiffres, espace, _ . -).';
  const old = membershipFor(code);
  const secret = newSecret();
  try {
    const { data, error } = await (await cloud()).rpc('coach_join', { p_code: code, p_pseudo: clean, p_secret: secret });
    if (error?.code === '23505') return 'Ce pseudo est déjà pris dans le groupe : choisis-en un autre.';
    if (error?.code === 'P0001') return 'Le groupe est complet (200 élèves).';
    if (error) throw error;
    setMembership(code, { code, memberId: String(data), secret, pseudo: clean });
    declineShare(code, false);
    if (old) await leaveMembership(old); // ancienne inscription dans CE groupe (cas rare) : remplacée
    return null;
  } catch {
    return 'Inscription impossible pour le moment (connexion). Réessaie plus tard.';
  }
}

/** Retire un suivi précis côté entraîneur (résultats supprimés avec lui). */
async function leaveMembership(m: Membership): Promise<void> {
  try {
    await (await cloud()).rpc('coach_leave', { p_member: m.memberId, p_secret: m.secret });
  } catch {
    /* hors ligne : l'entraîneur peut aussi retirer l'élève ; effacement automatique après un an */
  }
}

/** Ne plus partager dans CE groupe : l'élève y est retiré du suivi et ses résultats y sont supprimés. */
export async function leaveTracking(code: string): Promise<void> {
  const m = membershipFor(code);
  setMembership(code, null);
  setPending(code, []);
  if (!m) return;
  await leaveMembership(m);
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

/** Envoie le résultat d'une partie jouée sur la base du groupe `code` (et ceux de ce groupe restés en attente). */
export async function reportResult(code: string, entry: ReportEntry): Promise<void> {
  const m = membershipFor(code);
  if (!m) return;
  const queue = [...pendingFor(code), entry].slice(-50);
  setPending(code, queue);
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
      // Retiré de ce groupe par l'entraîneur : on arrête le partage dans ce groupe seulement.
      setMembership(code, null);
      setPending(code, []);
      return;
    }
    if (error) throw error;
    queue.shift();
    setPending(code, queue);
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
