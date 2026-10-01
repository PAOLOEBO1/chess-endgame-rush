import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '../components/Icon';
import { Board, type MarkTone } from '../components/board/Board';
import { useBoardFlash } from '../components/board/useBoardFlash';
import { MoveInput } from '../components/board/MoveInput';
import { feedbackFor, type Tone } from '../components/hud/feedback';
import { TRAINING_RULES, type ModeRules } from '../core/config';
import { parseUci } from '../core/fen';
import { errorTypeOf, type ErrorType } from '../core/errorTypes';
import { materialSymbols } from '../core/material';
import type { Puzzle } from '../core/types';
import { usePuzzlePlayer } from '../hooks/usePuzzlePlayer';
import { useSolveClock } from '../hooks/useSolveClock';
import { SolveClock } from '../components/hud/SolveClock';
import type { SolveInfo } from '../core/history';
import type { MoveJudge } from '../services/moveJudge';

const TONE_CLASS: Record<Tone, string> = {
  neutral: 'bg-stone-800 text-stone-100',
  good: 'bg-emerald-900/70 text-emerald-100',
  bad: 'bg-red-900/70 text-red-100',
  warn: 'bg-amber-900/70 text-amber-100',
  success: 'bg-emerald-600 text-white',
};

interface Props {
  puzzle: Puzzle;
  position: { index: number; total: number };
  judge: MoveJudge;
  onAttempt?: (puzzle: Puzzle, success: boolean, error?: ErrorType, info?: SolveInfo) => void;
  onNext: () => void;
  onHome: () => void;
  /** Règles du puzzle (par défaut : entraînement jusqu'au bout). */
  rules?: ModeRules;
  /** Libellé du retour (par défaut : « Toutes les positions »). */
  backLabel?: string;
  /** Bandeau au-dessus du titre (ex. état de la révision). */
  header?: string;
  /** Rejouer la position depuis l'autre camp (défendre une position gagnante). */
  onOtherSide?: () => void;
  /** Test de maîtrise : ni indice, ni retour en arrière, ni « Recommencer ». */
  exam?: boolean;
  /** Ouvrir la partie jouée dans l'analyse libre (position de départ + coups). */
  onAnalyse?: (fen: string, moves: string[]) => void;
}

export function GameScreen({ puzzle, position, judge, onAttempt, onNext, onHome, rules = TRAINING_RULES, backLabel = '← Toutes les positions', header, onOtherSide, exam = false, onAnalyse }: Props) {
  const { state, timings, playMove, reset, takeBack } = usePuzzlePlayer(puzzle, rules, judge);
  const flash = useBoardFlash(state.phase, state.verdict?.kind);
  const feedback = feedbackFor(state);
  const clock = useSolveClock(state.phase === 'awaitingPlayer');

  // Indices progressifs : 1 = plan (idée clé), 2 = pièce à jouer, 3 = coup.
  // Une réussite avec indice ne valide pas la position (comptée comme à retravailler).
  const [planShown, setPlanShown] = useState(false);
  const [hintLevel, setHintLevel] = useState(0); // pour la position affichée (2 ou 3)
  const [hintMove, setHintMove] = useState<string | null>(null);
  const [hintBusy, setHintBusy] = useState(false);
  const hintsUsed = useRef(0);
  useEffect(() => {
    setHintLevel(0);
    setHintMove(null);
  }, [state.fen]);
  const askHint = async (level: 2 | 3) => {
    hintsUsed.current += 1;
    setHintLevel(level);
    if (hintMove) return;
    setHintBusy(true);
    try {
      setHintMove(await judge.hint(state.fen));
    } catch {
      setHintMove(null);
    } finally {
      setHintBusy(false);
    }
  };

  // Archivage : première issue de chaque tentative (un « Recommencer » en crée une nouvelle).
  const archived = useRef(false);
  useEffect(() => {
    if (state.phase === 'awaitingPlayer' && state.moves.length === 0) {
      archived.current = false;
      if (state.takebacks === 0) {
        hintsUsed.current = 0;
        clock.restart();
      }
    }
    if (!archived.current && (state.phase === 'solved' || state.phase === 'failed')) {
      archived.current = true;
      const solved = state.phase === 'solved';
      const error = errorTypeOf({ success: solved, hintUsed: hintsUsed.current > 0, endReason: state.endReason, verdict: state.verdict, fen: state.fen });
      onAttempt?.(puzzle, solved && hintsUsed.current === 0, error, { ms: clock.read(), ...(state.firstWrong ? { w: state.firstWrong } : {}) });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- chrono lu au moment de l'issue
  }, [state.phase, state.moves.length, state.takebacks, puzzle, onAttempt]);
  const playerIsWhite = state.playerColor === 'w';
  const turnIsWhite = state.fen.split(' ')[1] === 'w';
  const finished = state.phase === 'solved' || state.phase === 'failed' || state.phase === 'error';

  const marks = useMemo(() => {
    const list: { square: string; tone: MarkTone }[] = [];
    if (state.phase === 'failed' && state.verdict?.kind === 'bad' && state.lastMove) {
      list.push({ square: state.lastMove.to, tone: 'bad' });
    }
    if (state.phase === 'awaitingPlayer' && hintLevel >= 2 && hintMove) list.push({ square: hintMove.slice(0, 2), tone: 'hint' });
    return list;
  }, [state.phase, state.verdict, state.lastMove, hintLevel, hintMove]);
  const arrow =
    state.phase === 'failed' && state.verdict?.kind === 'bad' && state.verdict.bestUci[0]
      ? parseUci(state.verdict.bestUci[0])
      : state.phase === 'awaitingPlayer' && hintLevel === 3 && hintMove
        ? parseUci(hintMove)
        : null;

  // Numérotation des coups à partir du FEN de départ.
  const startMoveNumber = Number(puzzle.fen.split(' ')[5] ?? 1);
  const startsBlack = puzzle.fen.split(' ')[1] === 'b';
  const moveList = state.moves.map((m, i) => {
    const ply = i + (startsBlack ? 1 : 0);
    const number = startMoveNumber + Math.floor(ply / 2);
    const prefix = ply % 2 === 0 ? `${number}.` : i === 0 ? `${number}…` : '';
    return { ...m, label: `${prefix} ${m.san}`.trim() };
  });

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 lg:flex-row lg:items-start">
      <div className="mx-auto w-full shrink-0 lg:mx-0 lg:w-[min(680px,60vw)]" style={{ maxWidth: 'min(100%, calc(100dvh - 120px))' }}>
        <div className={flash}>
          <Board
            fen={state.fen}
            orientation={state.playerColor}
            interactive={state.phase === 'awaitingPlayer'}
            lastMove={state.lastMove}
            marks={marks}
            arrow={arrow}
            onMove={(from, to, promotion) => playMove(from, to, promotion)}
          />
        </div>
        <div className="mt-2">
          <MoveInput fen={state.fen} enabled={state.phase === 'awaitingPlayer'} onMove={(f, t, p) => playMove(f, t, p)} />
        </div>
      </div>

      <aside className="flex w-full flex-col gap-4">
        <div className="flex items-center justify-between text-sm text-stone-400">
          <button type="button" onClick={onHome} className="hover:text-stone-100">
            {backLabel}
          </button>
          <span className="flex items-center gap-3">
            <SolveClock ms={clock.read()} running={state.phase === 'awaitingPlayer'} />
            <span>
              {position.index + 1} / {position.total}
            </span>
          </span>
        </div>

        <div>
          {header && <p className="mb-1 text-sm font-semibold text-amber-300">{header}</p>}
          <h1 className="text-2xl font-bold text-stone-50">{puzzle.title}</h1>
          <p className="mt-1 text-lg text-stone-300" aria-label={materialSymbols(puzzle.fen, state.playerColor).label}>
            {materialSymbols(puzzle.fen, state.playerColor).text}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 text-sm font-semibold">
          <span className={`rounded-full px-3 py-1 ${puzzle.objective === 'win' ? 'bg-amber-500 text-stone-900' : 'bg-sky-500 text-stone-900'}`}>
            Objectif : {puzzle.resist ? 'RÉSISTER' : puzzle.objective === 'win' ? 'GAGNER' : 'TENIR LA NULLE'}
          </span>
          <span className="flex items-center gap-2 rounded-full bg-stone-800 px-3 py-1 text-stone-100">
            <span className={`inline-block h-3 w-3 rounded-full border border-stone-500 ${turnIsWhite ? 'bg-white' : 'bg-stone-950'}`} />
            {finished ? 'Terminé' : `Au ${turnIsWhite ? 'Blanc' : 'Noir'} de jouer`}
          </span>
          <span className="rounded-full bg-stone-800 px-3 py-1 text-stone-300">
            Tu joues les {playerIsWhite ? 'Blancs' : 'Noirs'} · coup {state.playerMoveCount}
            {puzzle.objective === 'draw' ? ` / ${rules.drawHoldMoves}` : rules.maxPlayerMoves ? ` / ${rules.maxPlayerMoves}` : ''}
          </span>
        </div>

        <div className={`rounded-xl px-4 py-3 ${TONE_CLASS[feedback.tone]}`} role="status" aria-live="polite">
          <p className="font-semibold">{feedback.title}</p>
          {feedback.detail && <p className="mt-1 text-sm opacity-90">{feedback.detail}</p>}
          {state.phase === 'solved' && state.takebacks > 0 && (
            <p className="mt-1 text-sm opacity-90">
              Réussi après {state.takebacks} correction{state.takebacks > 1 ? 's' : ''} : recommence depuis le début pour la valider.
            </p>
          )}
        </div>

        {exam ? (
          <p className="rounded-xl bg-stone-800/60 px-4 py-3 text-sm text-stone-300">
            Test de maîtrise : pas d’indice ni de retour en arrière. Seule cette tentative compte.
          </p>
        ) : (
        <div className="flex flex-col gap-2 rounded-xl bg-stone-800/60 px-4 py-3 text-sm text-stone-300">
          {planShown ? (
            <p><Icon name="bulb" className="h-4 w-4 text-amber-300" /> {puzzle.concept}</p>
          ) : (
            <p className="text-stone-400">Cherche d’abord seul. Besoin d’aide ? Les indices viennent un par un.</p>
          )}
          {state.phase === 'awaitingPlayer' && (
            <div className="flex flex-wrap gap-2">
              {!planShown && (
                <button
                  type="button"
                  onClick={() => {
                    hintsUsed.current += 1;
                    setPlanShown(true);
                  }}
                  className="rounded-lg bg-stone-700 px-3 py-1.5 font-semibold text-stone-100 hover:bg-stone-600"
                >
                  <Icon name="bulb" className="h-4 w-4" /> Indice 1 : le plan
                </button>
              )}
              {planShown && hintLevel < 2 && (
                <button type="button" onClick={() => void askHint(2)} className="rounded-lg bg-stone-700 px-3 py-1.5 font-semibold text-stone-100 hover:bg-stone-600">
                  <Icon name="target" className="h-4 w-4" /> Indice 2 : la pièce à jouer
                </button>
              )}
              {hintLevel === 2 && (
                <button type="button" onClick={() => void askHint(3)} className="rounded-lg bg-stone-700 px-3 py-1.5 font-semibold text-stone-100 hover:bg-stone-600">
                  <Icon name="arrowRight" className="h-4 w-4" /> Indice 3 : le coup
                </button>
              )}
              {hintBusy && <span className="self-center text-stone-400">Recherche…</span>}
              {hintLevel >= 2 && !hintBusy && !hintMove && <span className="self-center text-stone-400">Indice indisponible pour cette position.</span>}
            </div>
          )}
          {hintsUsed.current > 0 && (
            <p className="text-xs text-stone-400">Avec un indice, la position ne compte pas comme réussie : refais-la sans aide pour la valider.</p>
          )}
        </div>
        )}

        {moveList.length > 0 && (
          <div className="flex flex-wrap gap-x-3 gap-y-1 font-mono text-sm text-stone-300">
            {moveList.map((m, i) => (
              <span key={i} className={m.by === 'player' ? 'text-stone-50' : 'text-stone-400'}>
                {m.label}
              </span>
            ))}
          </div>
        )}

        {onOtherSide && !exam && (
          <button
            type="button"
            onClick={onOtherSide}
            className="self-start rounded-lg border border-stone-600 px-3 py-1.5 text-sm font-semibold text-stone-200 hover:bg-stone-800"
            title="L'ordinateur joue le camp gagnant, toi tu défends"
          >
            <Icon name="shield" className="h-4 w-4" /> Jouer l’autre camp (défendre)
          </button>
        )}
        <div className="flex flex-wrap gap-3">
          {!exam && state.phase === 'failed' && state.endReason === 'bad-move' && (
            <button
              type="button"
              onClick={takeBack}
              className="rounded-lg bg-sky-500 px-4 py-2 font-semibold text-stone-900 hover:bg-sky-400"
              title="Annule ton dernier coup et rejoue depuis la position d’avant"
            >
              ↶ Réessayer ce coup
            </button>
          )}
          {!exam && finished && onAnalyse && (
            <button
              type="button"
              onClick={() => onAnalyse(puzzle.fen, state.moves.map((m) => m.uci))}
              className="rounded-lg bg-stone-700 px-4 py-2 font-semibold text-stone-100 hover:bg-stone-600"
              title="Revoir la partie coup par coup avec la table de finales"
            >
              <Icon name="search" className="h-4 w-4" /> Analyser
            </button>
          )}
          {!exam && (
          <button type="button" onClick={() => { reset(); setPlanShown(false); }} className="rounded-lg bg-stone-700 px-4 py-2 font-semibold text-stone-100 hover:bg-stone-600">
            <Icon name="refresh" className="h-4 w-4" /> Recommencer
          </button>
          )}
          <button
            type="button"
            onClick={onNext}
            className={`rounded-lg px-4 py-2 font-semibold ${finished ? 'bg-amber-500 text-stone-900 hover:bg-amber-400' : 'bg-stone-700 text-stone-100 hover:bg-stone-600'}`}
          >
            {exam && !finished ? 'Passer (comptée ratée) →' : 'Suivant →'}
          </button>
        </div>

        <p className="text-xs text-stone-400">
          Verdict : {timings.verdictMs ?? '–'} ms · Réponse adverse : {timings.opponentMs ?? '–'} ms
          {timings.source && ` (${timings.source === 'tablebase' ? 'table de finales' : 'Stockfish'})`}
        </p>
      </aside>
    </div>
  );
}
