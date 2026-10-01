// Analyse libre : une position (FEN, Bases ou partie jouée), les coups joués
// pour les deux camps, et le verdict de la table de finales (≤ 7 pièces) ou
// de Stockfish au-delà. Rien n'est enregistré.

import { useEffect, useMemo, useState } from 'react';
import { Board } from '../components/board/Board';
import { MoveInput } from '../components/board/MoveInput';
import { Icon } from '../components/Icon';
import { moveLabel, positionLabel, rankTbMoves, type RankedTbMove } from '../core/analysis';
import { applyMove, applyUci, isValidFen } from '../core/chessRules';
import { CONFIG } from '../core/config';
import { countPieces, parseUci, sideToMove } from '../core/fen';
import { formatScore } from '../core/judge/engineJudge';
import type { TbPosition } from '../core/judge/tablebaseTypes';
import type { Color, PromotionPiece } from '../core/types';
import type { Engine } from '../services/stockfish';
import type { TablebaseClient } from '../services/tablebaseClient';

interface Props {
  /** Position de départ et coups déjà joués (UCI), facultatifs. */
  startFen?: string;
  moves?: string[];
  tablebase: Pick<TablebaseClient, 'lookup'>;
  engine: Pick<Engine, 'analyse'>;
  onHome: () => void;
  backLabel?: string;
}

const EXAMPLE = '8/8/8/4k3/8/8/4P3/4K3 w - - 0 1';

type Report =
  | { kind: 'loading' }
  | { kind: 'tb'; position: TbPosition; moves: RankedTbMove[] }
  | { kind: 'engine'; score: string; line: string[]; best: string | null }
  | { kind: 'error'; text: string }
  | { kind: 'over'; text: string };

/** Position et coups joués depuis le départ (on peut revenir en arrière puis rejouer autre chose). */
function replay(start: string, ucis: string[]): { fens: string[]; sans: string[] } {
  const fens = [start];
  const sans: string[] = [];
  for (const u of ucis) {
    const m = applyUci(fens[fens.length - 1], u);
    if (!m) break;
    fens.push(m.fen);
    sans.push(m.san);
  }
  return { fens, sans };
}

export function AnalysisScreen({ startFen, moves: initialMoves = [], tablebase, engine, onHome, backLabel = '← Accueil' }: Props) {
  const [start, setStart] = useState(startFen && isValidFen(startFen) ? startFen : EXAMPLE);
  const [ucis, setUcis] = useState<string[]>(initialMoves);
  const [cursor, setCursor] = useState(initialMoves.length); // nombre de coups affichés
  const [fenInput, setFenInput] = useState('');
  const [inputError, setInputError] = useState<string | null>(null);
  const [orientation, setOrientation] = useState<Color>(sideToMove(start));
  const [report, setReport] = useState<Report>({ kind: 'loading' });

  const line = useMemo(() => replay(start, ucis), [start, ucis]);
  const fen = line.fens[Math.min(cursor, line.fens.length - 1)];
  const lastUci = cursor > 0 ? ucis[cursor - 1] : null;

  // Verdict de la position affichée.
  useEffect(() => {
    let cancelled = false;
    setReport({ kind: 'loading' });
    void (async () => {
      try {
        if (countPieces(fen) <= CONFIG.tablebase.maxPieces) {
          const position = await tablebase.lookup(fen);
          if (cancelled) return;
          if (!position.moves.length) {
            setReport({ kind: 'over', text: positionLabel(position) });
            return;
          }
          setReport({ kind: 'tb', position, moves: rankTbMoves(position) });
          return;
        }
        const a = await engine.analyse(fen, 1500);
        if (cancelled) return;
        // Ligne principale en notation lisible (6 demi-coups au plus).
        let f = fen;
        const sans: string[] = [];
        for (const u of a.pv.slice(0, 6)) {
          const m = applyUci(f, u);
          if (!m) break;
          sans.push(m.san);
          f = m.fen;
        }
        setReport({ kind: 'engine', score: formatScore(a.score), line: sans, best: a.bestmove });
      } catch {
        if (!cancelled) setReport({ kind: 'error', text: 'Analyse indisponible pour le moment (réseau ou moteur). Réessaie dans un instant.' });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fen, tablebase, engine]);

  const play = (uci: string) => {
    if (!applyUci(fen, uci)) return;
    // Un nouveau coup après un retour en arrière remplace la suite.
    setUcis((list) => (list[cursor] === uci ? list : [...list.slice(0, cursor), uci]));
    setCursor((c) => c + 1);
  };
  const onBoardMove = (from: string, to: string, promotion?: PromotionPiece) => {
    const m = applyMove(fen, from, to, promotion);
    if (m) play(m.uci);
  };
  const load = () => {
    const f = fenInput.trim().replace(/\s+/g, ' ');
    if (!isValidFen(f)) {
      setInputError('Position (FEN) invalide : copie-la depuis Lichess (« Partager et exporter » → FEN).');
      return;
    }
    setInputError(null);
    setStart(f);
    setUcis([]);
    setCursor(0);
    setOrientation(sideToMove(f));
    setFenInput('');
  };

  const stm = sideToMove(fen) === 'w' ? 'Blancs' : 'Noirs';
  const tone = (m: RankedTbMove) => (m.outcome === 'win' ? 'text-emerald-300' : m.outcome === 'loss' ? 'text-red-300' : 'text-stone-200');
  const best = report.kind === 'tb' ? report.moves[0] : null;
  const arrowUci = report.kind === 'tb' ? best?.uci : report.kind === 'engine' ? report.best : null;
  const arrow = arrowUci ? parseUci(arrowUci) : null;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 lg:flex-row lg:items-start">
      <div className="mx-auto w-full shrink-0 lg:mx-0 lg:w-[min(640px,58vw)]" style={{ maxWidth: 'min(100%, calc(100dvh - 120px))' }}>
        <Board
          fen={fen}
          orientation={orientation}
          interactive
          lastMove={lastUci ? parseUci(lastUci) : null}
          arrow={arrow ? { from: arrow.from, to: arrow.to } : null}
          onMove={onBoardMove}
        />
        <div className="mt-2">
          <MoveInput fen={fen} enabled onMove={onBoardMove} />
        </div>
      </div>

      <aside className="flex w-full flex-col gap-4">
        <div className="flex items-center justify-between text-sm text-stone-400">
          <button type="button" onClick={onHome} className="hover:text-stone-100">
            {backLabel}
          </button>
          <button type="button" onClick={() => setOrientation((o) => (o === 'w' ? 'b' : 'w'))} className="hover:text-stone-100">
            ⇅ Retourner l’échiquier
          </button>
        </div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-stone-50">
          <Icon name="search" className="h-6 w-6 text-amber-300" /> Analyse libre
        </h1>
        <p className="text-sm text-stone-400">
          Joue les coups des deux camps. La flèche verte montre le meilleur coup. Table de finales jusqu’à {CONFIG.tablebase.maxPieces} pièces,
          Stockfish au-delà. Rien n’est enregistré.
        </p>

        <section className="flex flex-col gap-2 rounded-xl bg-stone-800/60 p-4" aria-live="polite">
          <p className="text-sm text-stone-400">Au tour des {stm}</p>
          {report.kind === 'loading' && <p className="text-stone-300">Analyse…</p>}
          {report.kind === 'error' && <p className="text-amber-300">{report.text}</p>}
          {report.kind === 'over' && <p className="text-lg font-bold text-stone-50">{report.text}</p>}
          {report.kind === 'engine' && (
            <>
              <p className="text-lg font-bold text-stone-50">
                Stockfish : {report.score} <span className="text-sm font-normal text-stone-400">(pour les {stm}, plus de 7 pièces)</span>
              </p>
              {report.line.length > 0 && <p className="font-mono text-sm text-stone-300">Ligne : {report.line.join(' ')}</p>}
            </>
          )}
          {report.kind === 'tb' && (
            <>
              <p className="text-lg font-bold text-stone-50">{positionLabel(report.position)}</p>
              <ol className="flex max-h-72 flex-col gap-1 overflow-y-auto pr-1 text-sm">
                {report.moves.map((m) => (
                  <li key={m.uci}>
                    <button
                      type="button"
                      onClick={() => play(m.uci)}
                      className="flex w-full items-center justify-between gap-3 rounded-lg bg-stone-900/60 px-3 py-1.5 text-left hover:bg-stone-700"
                    >
                      <span className="font-mono font-semibold text-stone-50">{m.san}</span>
                      <span className={tone(m)}>{moveLabel(m)}</span>
                    </button>
                  </li>
                ))}
              </ol>
            </>
          )}
        </section>

        {line.sans.length > 0 && (
          <section className="flex flex-col gap-2">
            <div className="flex flex-wrap gap-x-2 gap-y-1 font-mono text-sm">
              {line.sans.map((san, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setCursor(i + 1)}
                  className={`rounded px-1 ${i + 1 === cursor ? 'bg-amber-500 text-stone-900' : 'text-stone-300 hover:bg-stone-700'}`}
                >
                  {san}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button type="button" disabled={cursor === 0} onClick={() => setCursor(0)} className="rounded-lg bg-stone-700 px-3 py-1.5 text-sm text-stone-100 disabled:opacity-40" aria-label="Début">
                ⏮
              </button>
              <button type="button" disabled={cursor === 0} onClick={() => setCursor((c) => c - 1)} className="rounded-lg bg-stone-700 px-3 py-1.5 text-sm text-stone-100 disabled:opacity-40" aria-label="Coup précédent">
                ◀
              </button>
              <button
                type="button"
                disabled={cursor >= line.sans.length}
                onClick={() => setCursor((c) => c + 1)}
                className="rounded-lg bg-stone-700 px-3 py-1.5 text-sm text-stone-100 disabled:opacity-40"
                aria-label="Coup suivant"
              >
                ▶
              </button>
            </div>
          </section>
        )}

        <section className="flex flex-col gap-2 rounded-xl border border-stone-700 p-4">
          <label className="text-sm font-semibold text-stone-200" htmlFor="analyse-fen">
            Analyser une autre position (FEN)
          </label>
          <div className="flex flex-wrap gap-2">
            <input
              id="analyse-fen"
              className="min-w-0 flex-1 rounded-lg bg-stone-900 px-3 py-2 font-mono text-sm text-stone-100 placeholder:text-stone-500"
              value={fenInput}
              onChange={(e) => setFenInput(e.target.value)}
              placeholder={EXAMPLE}
              spellCheck={false}
            />
            <button type="button" onClick={load} disabled={!fenInput.trim()} className="rounded-lg bg-amber-500 px-4 py-2 font-semibold text-stone-900 hover:bg-amber-400 disabled:opacity-40">
              Analyser
            </button>
          </div>
          {inputError && <p className="text-sm text-amber-300">{inputError}</p>}
          <p className="text-xs text-stone-400">Astuce : sur Lichess, « Partager et exporter » donne le FEN de n’importe quelle position.</p>
        </section>
      </aside>
    </div>
  );
}
