// Groupes rejoints par un élève (thème « Entraîneur ») : depuis le 05/10/2026, un élève peut être dans PLUSIEURS
// groupes à la fois (un code par groupe, 10 au plus). Il en choisit un pour jouer (« groupe actif ») ; le suivi par
// l'entraîneur, le refus de partage et les résultats en attente sont propres à chaque groupe.
// Fonctions pures (testées) : le stockage local est géré par services/coachSets.ts.

/** Un élève peut rejoindre jusqu'à 10 groupes. */
export const MAX_JOINED = 10;

export interface JoinedState<G extends { code: string }> {
  /** Groupes rejoints, dans l'ordre où ils ont été ajoutés. */
  groups: G[];
  /** Code du groupe joué (null : aucun groupe). */
  active: string | null;
  /** Codes des groupes où l'élève a choisi de ne pas partager ses résultats. */
  declined: string[];
}

export const emptyJoined = <G extends { code: string }>(): JoinedState<G> => ({ groups: [], active: null, declined: [] });

/** Groupe actif, ou le premier groupe si le code actif n'existe plus (null : aucun groupe). */
export function activeGroup<G extends { code: string }>(s: JoinedState<G>): G | null {
  return s.groups.find((g) => g.code === s.active) ?? s.groups[0] ?? null;
}

/**
 * Ajoute un groupe (ou remplace sa copie s'il est déjà rejoint) et, si demandé, en fait le groupe actif.
 * Renvoie null si la limite de 10 groupes empêche l'ajout d'un NOUVEAU groupe.
 */
export function upsertGroup<G extends { code: string }>(s: JoinedState<G>, group: G, makeActive: boolean): JoinedState<G> | null {
  const known = s.groups.some((g) => g.code === group.code);
  if (!known && s.groups.length >= MAX_JOINED) return null;
  const groups = known ? s.groups.map((g) => (g.code === group.code ? group : g)) : [...s.groups, group];
  return { ...s, groups, active: makeActive || !s.active ? group.code : s.active };
}

/** Retire un groupe ; si c'était le groupe actif, le premier groupe restant devient actif. */
export function removeGroup<G extends { code: string }>(s: JoinedState<G>, code: string): JoinedState<G> {
  const groups = s.groups.filter((g) => g.code !== code);
  const active = s.active === code || !groups.some((g) => g.code === s.active) ? (groups[0]?.code ?? null) : s.active;
  return { groups, active, declined: s.declined.filter((c) => c !== code) };
}

/** Choisit le groupe joué (ignoré si le code n'est pas rejoint). */
export function selectGroup<G extends { code: string }>(s: JoinedState<G>, code: string): JoinedState<G> {
  return s.groups.some((g) => g.code === code) ? { ...s, active: code } : s;
}

/** Refus (ou acceptation) de partager ses résultats dans un groupe. */
export function setDeclined<G extends { code: string }>(s: JoinedState<G>, code: string, declined: boolean): JoinedState<G> {
  const rest = s.declined.filter((c) => c !== code);
  return { ...s, declined: declined ? [...rest, code] : rest };
}

/**
 * Reprise de l'ancien stockage (un seul groupe, un seul suivi, un seul refus) : rien n'est perdu.
 * `legacyMember` n'est gardé que s'il porte un code (suivi éventuellement dans un autre groupe que celui affiché).
 */
export function migrateLegacy<G extends { code: string }, M extends { code: string }>(
  legacyGroup: G | null,
  legacyMember: M | null,
  legacyDeclined: string | null,
): { state: JoinedState<G>; members: Record<string, M> } {
  const state: JoinedState<G> = legacyGroup
    ? { groups: [legacyGroup], active: legacyGroup.code, declined: legacyDeclined ? [legacyDeclined] : [] }
    : { groups: [], active: null, declined: legacyDeclined ? [legacyDeclined] : [] };
  const members: Record<string, M> = legacyMember?.code ? { [legacyMember.code]: legacyMember } : {};
  return { state, members };
}
