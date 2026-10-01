// SEUL fichier de l'application qui importe chess.js.
// Toutes les fonctions sont pures : elles prennent un FEN et renvoient un
// résultat, sans état caché (plus simple à tester et à raisonner).

import { Chess } from 'chess.js';
import type { PromotionPiece } from './types';

export interface AppliedMove {
  fenBefore: string;
  fen: string;
  uci: string;
  san: string;
  from: string;
  to: string;
  isCheckmate: boolean;
  isStalemate: boolean;
  /** Matériel insuffisant pour mater (ex. R vs R). */
  isInsufficientMaterial: boolean;
}

function load(fen: string): Chess | null {
  try {
    return new Chess(fen);
  } catch {
    return null;
  }
}

export function isValidFen(fen: string): boolean {
  return load(fen) !== null;
}

/** Cases d'arrivée légales pour la pièce située sur `from`. */
export function legalDestinations(fen: string, from: string): string[] {
  const chess = load(fen);
  if (!chess) return [];
  // chess.js type `square` avec un type littéral ; la valeur vient de l'échiquier.
  const moves = chess.moves({ square: from as never, verbose: true });
  return [...new Set(moves.map((m) => m.to as string))];
}

/** Vrai si le coup from→to est une promotion (il faut alors choisir la pièce). */
export function isPromotionMove(fen: string, from: string, to: string): boolean {
  const chess = load(fen);
  if (!chess) return false;
  const moves = chess.moves({ square: from as never, verbose: true });
  return moves.some((m) => m.to === to && Boolean(m.promotion));
}

/**
 * Joue un coup. Renvoie null si le coup est illégal (chess.js 1.x lève une
 * exception dans ce cas : elle est interceptée ici).
 */
export function applyMove(fen: string, from: string, to: string, promotion?: PromotionPiece): AppliedMove | null {
  const chess = load(fen);
  if (!chess) return null;
  let move;
  try {
    move = chess.move({ from, to, promotion });
  } catch {
    return null;
  }
  if (!move) return null;
  return {
    fenBefore: fen,
    fen: chess.fen(),
    uci: `${move.from}${move.to}${move.promotion ?? ''}`,
    san: move.san,
    from: move.from,
    to: move.to,
    isCheckmate: chess.isCheckmate(),
    isStalemate: chess.isStalemate(),
    isInsufficientMaterial: chess.isInsufficientMaterial(),
  };
}

export function applyUci(fen: string, uci: string): AppliedMove | null {
  const promotion = uci.length > 4 ? (uci[4] as PromotionPiece) : undefined;
  return applyMove(fen, uci.slice(0, 2), uci.slice(2, 4), promotion);
}

/**
 * Coup saisi au clavier : notation algébrique anglaise (Nf3, exd5, O-O, e8=Q),
 * tolérante (sans + ni #, minuscules pour les pions), ou cases de départ et
 * d'arrivée (e2e4, e7e8q). Renvoie null si le coup est illégal ou incompris.
 */
export function parseMoveText(fen: string, text: string): AppliedMove | null {
  const t = text.trim().replace(/\s+/g, '').replace(/0/g, 'O');
  if (!t) return null;
  if (/^[a-h][1-8]-?[a-h][1-8][qrbnQRBN]?$/.test(t)) {
    const u = t.replace('-', '').toLowerCase();
    return applyUci(fen, u);
  }
  const chess = load(fen);
  if (!chess) return null;
  let move;
  try {
    move = chess.move(t, { strict: false });
  } catch {
    return null;
  }
  if (!move) return null;
  return applyMove(fen, move.from, move.to, move.promotion as PromotionPiece | undefined);
}

/** Tous les coups légaux, regroupés par case de départ (format attendu par l'échiquier). */
export function legalDestsMap(fen: string): Map<string, string[]> {
  const chess = load(fen);
  const map = new Map<string, string[]>();
  if (!chess) return map;
  for (const m of chess.moves({ verbose: true })) {
    const list = map.get(m.from) ?? [];
    if (!list.includes(m.to)) list.push(m.to);
    map.set(m.from, list);
  }
  return map;
}

/** Le camp au trait est-il en échec ? */
export function isInCheck(fen: string): boolean {
  return load(fen)?.inCheck() ?? false;
}

export interface PgnExercise {
  /** Rang dans le fichier (1 = première partie). */
  index: number;
  fen: string;
  /** Ligne principale (UCI), à partir du coup du camp au trait. */
  moves: string[];
  headers: Record<string, string>;
}

/**
 * Lit un fichier PGN d'exercices : chaque partie doit partir d'une position
 * (en-tête FEN) ; la ligne principale est la solution (variantes ignorées).
 */
export function parsePgnExercises(text: string): { items: PgnExercise[]; skipped: { index: number; reason: string }[] } {
  const items: PgnExercise[] = [];
  const skipped: { index: number; reason: string }[] = [];
  const chunks = text
    .replace(/\r\n?/g, '\n')
    .replace(/^﻿/, '')
    .split(/\n\s*\n(?=\s*\[)/)
    .map((c) => c.trim())
    .filter((c) => c.length > 0);
  chunks.forEach((chunk, i) => {
    const index = i + 1;
    const chess = new Chess();
    try {
      chess.loadPgn(chunk);
    } catch {
      skipped.push({ index, reason: 'PGN illisible' });
      return;
    }
    // En-têtes tels qu'écrits dans le fichier (chess.js remplace Result par la fin de la partie).
    const headers: Record<string, string> = { ...chess.getHeaders() };
    for (const m of chunk.matchAll(/^\s*\[(\w+)\s+"((?:[^"\\]|\\.)*)"\s*\]/gm)) headers[m[1]] = m[2];
    const fen = headers.FEN;
    if (!fen) {
      skipped.push({ index, reason: 'pas de position de départ (en-tête FEN)' });
      return;
    }
    const moves = chess.history({ verbose: true }).map((m) => m.from + m.to + (m.promotion ?? ''));
    if (!moves.length) {
      skipped.push({ index, reason: 'aucun coup de solution' });
      return;
    }
    items.push({ index, fen, moves, headers });
  });
  return { items, skipped };
}
