// Séries d'entraîneur partagées par lien : la liste des positions voyage dans
// l'adresse, après le « # » (jamais envoyée au serveur, rien n'est stocké en
// ligne). Fonctions pures.
//   https://…/#serie=<base64url(JSON)>
//   JSON : { v: 1, n: "Nom", p: [ "bases-lucena" | { f: FEN, o: "w" | "d", t?: "Titre" }, … ] }

import { isValidFen } from './chessRules';

export type SeriesItem = { id: string } | { fen: string; objective: 'win' | 'draw'; title?: string };

export interface Series {
  name: string;
  items: SeriesItem[];
}

export const SERIES_MAX = 30;
const PREFIX = '#serie=';

function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(data: string): string {
  const bin = atob(data.replace(/-/g, '+').replace(/_/g, '/'));
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}

const clean = (s: string, max: number) => s.replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, max);

export function encodeSeries(series: Series): string {
  const p = series.items.slice(0, SERIES_MAX).map((it) =>
    'id' in it ? it.id : { f: it.fen, o: it.objective === 'win' ? 'w' : 'd', ...(it.title ? { t: clean(it.title, 60) } : {}) },
  );
  return PREFIX + toBase64Url(JSON.stringify({ v: 1, n: clean(series.name, 60), p }));
}

/** Lit une série depuis l'adresse ; null si absente ou invalide. Les identifiants inconnus sont ignorés. */
export function decodeSeries(hash: string, knownId: (id: string) => boolean): Series | null {
  if (!hash.startsWith(PREFIX)) return null;
  try {
    const raw = JSON.parse(fromBase64Url(hash.slice(PREFIX.length))) as { v?: number; n?: unknown; p?: unknown };
    if (raw.v !== 1 || !Array.isArray(raw.p)) return null;
    const items: SeriesItem[] = [];
    for (const x of raw.p.slice(0, SERIES_MAX)) {
      if (typeof x === 'string' && x.length <= 40 && knownId(x)) items.push({ id: x });
      else if (x && typeof x === 'object') {
        const o = x as { f?: unknown; o?: unknown; t?: unknown };
        if (typeof o.f === 'string' && o.f.length <= 100 && isValidFen(o.f) && (o.o === 'w' || o.o === 'd')) {
          items.push({ fen: o.f, objective: o.o === 'w' ? 'win' : 'draw', ...(typeof o.t === 'string' && o.t ? { title: clean(o.t, 60) } : {}) });
        }
      }
    }
    if (!items.length) return null;
    return { name: typeof raw.n === 'string' && raw.n.trim() ? clean(raw.n, 60) : 'Série d’entraînement', items };
  } catch {
    return null;
  }
}

/** Texte du résultat, à renvoyer à l'entraîneur. */
export function resultText(name: string, results: (boolean | null)[]): string {
  const ok = results.filter((r) => r === true).length;
  const marks = results.map((r, i) => `${i + 1}${r === true ? '✅' : r === false ? '❌' : '–'}`).join(' ');
  return `Série « ${name} » : ${ok}/${results.length} réussies — ${marks} (Chess Endgame Rush)`;
}

export interface BulkLine {
  line: number;
  fen: string;
  objective: 'win' | 'draw';
  title?: string;
}

/**
 * Ajout en masse : une position par ligne, « FEN ; titre ; nulle » (titre et
 * objectif facultatifs, « ; » ou « | » comme séparateur, objectif « gain » par
 * défaut). Renvoie les positions lisibles et les numéros des lignes invalides.
 */
export function parseBulk(text: string): { items: BulkLine[]; invalid: number[] } {
  const items: BulkLine[] = [];
  const invalid: number[] = [];
  text.split(/\r?\n/).forEach((raw, i) => {
    const parts = raw.split(/[;|]/).map((x) => x.trim());
    if (!parts[0]) return; // ligne vide
    const fen = parts[0].replace(/\s+/g, ' ');
    if (!isValidFen(fen)) {
      invalid.push(i + 1);
      return;
    }
    let objective: 'win' | 'draw' = 'win';
    let title: string | undefined;
    for (const x of parts.slice(1)) {
      if (/^(nulle|nul|draw|=)$/i.test(x)) objective = 'draw';
      else if (/^(gain|gagner|win|\+)$/i.test(x)) objective = 'win';
      else if (x) title = clean(x, 60);
    }
    items.push({ line: i + 1, fen, objective, ...(title ? { title } : {}) });
  });
  return { items, invalid };
}
