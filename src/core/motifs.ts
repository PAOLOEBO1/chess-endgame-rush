// Motifs (thèmes tactiques) : ceux de Lichess pour la base publique, ceux de
// l'en-tête PGN [Theme] pour la base d'un entraîneur. Fonctions pures.

import type { Puzzle } from './types';

/** Libellés français des thèmes Lichess. */
export const THEME_FR: Record<string, string> = {
  advancedPawn: 'pion avancé',
  promotion: 'promotion',
  underPromotion: 'sous-promotion',
  crushing: 'gain décisif',
  advantage: 'avantage',
  equality: 'égalisation',
  mate: 'mat',
  mateIn1: 'mat en 1',
  mateIn2: 'mat en 2',
  mateIn3: 'mat en 3',
  mateIn4: 'mat en 4',
  mateIn5: 'mat en 5+',
  zugzwang: 'zugzwang',
  skewer: 'enfilade',
  fork: 'fourchette',
  pin: 'clouage',
  hangingPiece: 'pièce en prise',
  defensiveMove: 'coup défensif',
  quietMove: 'coup calme',
  sacrifice: 'sacrifice',
  deflection: 'déviation',
  attraction: 'attraction',
  discoveredAttack: 'attaque à la découverte',
  xRayAttack: 'rayons X',
  intermezzo: 'coup intermédiaire',
  exposedKing: 'roi exposé',
  trappedPiece: 'pièce piégée',
  clearance: 'dégagement',
  interference: 'interférence',
  capturingDefender: 'élimination du défenseur',
  doubleCheck: 'échec double',
  backRankMate: 'mat du couloir',
  pawnEndgame: 'finale de pions',
  rookEndgame: 'finale de tours',
  queenEndgame: 'finale de dames',
  bishopEndgame: 'finale de fous',
  knightEndgame: 'finale de cavaliers',
  queenRookEndgame: 'dame et tour',
};

/** Thèmes Lichess proposés comme filtre (les autres sont trop généraux ou trop rares). */
export const LICHESS_MOTIFS = [
  'advancedPawn', 'promotion', 'quietMove', 'defensiveMove', 'zugzwang', 'mate', 'skewer', 'fork',
  'deflection', 'hangingPiece', 'exposedKing', 'sacrifice', 'discoveredAttack', 'pin', 'attraction',
] as const;

/** Identifiant sûr d'un motif (lettres sans accent, chiffres, tirets) : sert dans les clés de parties. */
export function motifId(theme: string): string {
  if (THEME_FR[theme]) return theme; // clé Lichess (camelCase) gardée telle quelle
  return theme
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 30);
}

export function motifLabel(id: string): string {
  const fr = THEME_FR[id];
  const label = fr ?? id.replace(/-/g, ' ');
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export interface MotifChoice {
  id: string;
  label: string;
  n: number;
}

/** Nombre minimum d'exercices pour proposer un motif (base Lichess / base d'entraîneur). */
export const MIN_MOTIF = { lichess: 100, coach: 3 } as const;

/** Motifs disponibles dans un ensemble d'exercices, du plus fréquent au plus rare. */
export function motifChoices(pool: Puzzle[], coach: boolean): MotifChoice[] {
  const counts = new Map<string, { label: string; n: number }>();
  for (const p of pool) {
    const seen = new Set<string>();
    for (const raw of p.themes ?? []) {
      const id = motifId(raw);
      if (!id || seen.has(id) || (!coach && !(LICHESS_MOTIFS as readonly string[]).includes(id))) continue;
      seen.add(id);
      const c = counts.get(id) ?? counts.set(id, { label: coach && !THEME_FR[raw] ? raw : motifLabel(id), n: 0 }).get(id)!;
      c.n += 1;
    }
  }
  const min = coach ? MIN_MOTIF.coach : MIN_MOTIF.lichess;
  return [...counts.entries()]
    .filter(([, c]) => c.n >= min)
    .map(([id, c]) => ({ id, label: c.label, n: c.n }))
    .sort((a, b) => b.n - a.n || a.label.localeCompare(b.label, 'fr'));
}

export const hasMotif = (p: Puzzle, id: string) => (p.themes ?? []).some((t) => motifId(t) === id);

/** Thèmes d'un en-tête PGN [Theme "Opposition, Triangulation"] : 3 au plus, 30 caractères chacun. */
export function parseThemes(raw: string | undefined): string[] {
  if (!raw) return [];
  const parts = /[,;|]/.test(raw) ? raw.split(/[,;|]/) : /^[A-Za-z]+( [A-Za-z]+)+$/.test(raw.trim()) && raw.trim().split(' ').some((k) => THEME_FR[k]) ? raw.trim().split(' ') : [raw];
  const out: string[] = [];
  for (const x of parts) {
    const t = x.replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 30);
    if (t && motifId(t) && !out.some((o) => motifId(o) === motifId(t))) out.push(t);
    if (out.length === 3) break;
  }
  return out;
}
