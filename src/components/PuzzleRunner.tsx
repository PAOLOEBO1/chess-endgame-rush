// Un puzzle en mode Rush : échiquier + ligne d'état, et signal de fin au parent.

import { errorTypeOf, type ErrorType } from '../core/errorTypes';
import { useEffect, useMemo, useRef } from 'react';
import type { SolveInfo } from '../core/history';
import { useSolveClock } from '../hooks/useSolveClock';
import { SolveClock } from './hud/SolveClock';
import { rushRules } from '../core/config';
import { parseUci } from '../core/fen';
import type { PromotionPiece, Puzzle } from '../core/types';
import { usePuzzlePlayer } from '../hooks/usePuzzlePlayer';
import type { MoveJudge } from '../services/moveJudge';
import { useBoardFlash } from './board/useBoardFlash';
import { MoveInput } from './board/MoveInput';
import { Board, type MarkTone } from './board/Board';
import { feedbackFor, type Tone } from './hud/feedback';

export type PuzzleEnd = 'solved' | 'failed' | 'skipped';

interface Props {
  puzzle: Puzzle;
  active: boolean;
  judge: MoveJudge;
  onEnd: (end: PuzzleEnd, error?: ErrorType, info?: SolveInfo) => void;
  onPlayerMove?: () => void;
  /** Coup du joueur jugé bon (course : 1 point par bon coup, comme Lichess Racer). */
  onGoodMove?: () => void;
  /** Joker « passer » : chaque incrément demande à l'appli de jouer le bon coup à la place du joueur. */
  skipRequest?: number;
  /** Le joker a bien été utilisé (coup joué pour le joueur, ou position abandonnée faute de réponse). */
  onSkipUsed?: () => void;
  /** Message affiché à la place de l'état (ex. « le chrono démarre au premier coup »). */
  banner?: string | null;
}

const TONE: Record<Tone, string> = {
  neutral: 'text-stone-200',
  good: 'text-emerald-300',
  bad: 'text-red-300',
  warn: 'text-amber-300',
  success: 'text-emerald-300',
};

export function PuzzleRunner({ puzzle, active, judge, onEnd, onPlayerMove, onGoodMove, skipRequest = 0, onSkipUsed, banner }: Props) {
  const rules = useMemo(() => rushRules(puzzle.solution), [puzzle]);
  const { state, playMove } = usePuzzlePlayer(puzzle, rules, judge, onPlayerMove);
  const flash = useBoardFlash(state.phase, state.verdict?.kind);
  const reported = useRef(false);
  const clock = useSolveClock(active && state.phase === 'awaitingPlayer');

  useEffect(() => {
    if (reported.current) return;
    const end: PuzzleEnd | null =
      state.phase === 'solved' ? 'solved' : state.phase === 'failed' ? 'failed' : state.phase === 'error' ? 'skipped' : null;
    if (end) {
      reported.current = true;
      onEnd(end, errorTypeOf({ success: end === 'solved', endReason: state.endReason, verdict: state.verdict, fen: state.fen }), {
        ms: clock.read(),
        ...(state.firstWrong ? { w: state.firstWrong } : {}),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- issue lue au moment où la phase change
  }, [state.phase, onEnd]);

  // Joker : l'appli joue le meilleur coup (table ou Stockfish) ; ce coup ne rapporte pas de point.
  const skipping = useRef(false);
  const handledSkip = useRef(skipRequest);
  useEffect(() => {
    if (skipRequest === handledSkip.current) return;
    handledSkip.current = skipRequest;
    if (!active || state.phase !== 'awaitingPlayer' || skipping.current) return;
    skipping.current = true;
    const fen = state.fen;
    void Promise.race([judge.hint(fen), new Promise<null>((r) => setTimeout(() => r(null), 6_000))])
      .catch(() => null)
      .then((uci) => {
        if (stateRef.current.fen !== fen || stateRef.current.phase !== 'awaitingPlayer') {
          skipping.current = false;
          return;
        }
        const m = uci ? parseUci(uci) : null;
        if (m && playMove(m.from, m.to, m.promotion as PromotionPiece | undefined)) {
          onSkipUsed?.();
          return;
        }
        // Pas de coup disponible : on passe la position entière.
        skipping.current = false;
        if (!reported.current) {
          reported.current = true;
          onSkipUsed?.();
          onEnd('skipped');
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- déclenché par la seule demande
  }, [skipRequest]);
  const stateRef = useRef(state);
  stateRef.current = state;

  // Chaque verdict est un nouvel objet : on compte chaque bon coup une seule fois.
  const countedVerdict = useRef<unknown>(null);
  useEffect(() => {
    const v = state.verdict;
    if (!v || v === countedVerdict.current) return;
    countedVerdict.current = v;
    const skipped = skipping.current;
    skipping.current = false;
    if (v.kind === 'good' && state.phase !== 'failed' && !skipped) onGoodMove?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- déclenché par le seul verdict
  }, [state.verdict]);

  const failedBad = state.phase === 'failed' && state.verdict?.kind === 'bad' ? state.verdict : null;
  const marks = useMemo(() => {
    const list: { square: string; tone: MarkTone }[] = [];
    if (failedBad && state.lastMove) list.push({ square: state.lastMove.to, tone: 'bad' });
    if (state.phase === 'solved' && state.lastMove) list.push({ square: state.lastMove.to, tone: 'good' });
    return list;
  }, [failedBad, state.phase, state.lastMove]);
  const arrow = failedBad?.bestUci[0] ? parseUci(failedBad.bestUci[0]) : null;

  const feedback = feedbackFor(state);
  const playerWhite = state.playerColor === 'w';

  return (
    <div className="flex flex-col gap-2">
      {import.meta.env.DEV && (
        // Mode développement uniquement : état lisible par les tests automatisés.
        <span hidden data-testid="cer-state" data-phase={state.phase} data-fen={state.fen} data-puzzle={puzzle.id} data-rating={puzzle.rating} data-orientation={state.playerColor} />
      )}
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="flex items-center gap-2 font-semibold">
          <span className={`inline-block h-4 w-4 rounded-full border-2 border-stone-400 ${playerWhite ? 'bg-white' : 'bg-stone-950'}`} />
          {playerWhite ? 'Blancs' : 'Noirs'} :{' '}
          <span className={puzzle.objective === 'win' ? 'text-amber-400' : 'text-sky-400'}>
            {puzzle.objective === 'win' ? 'gagner' : 'tenir la nulle'}
          </span>
        </span>
        <span className="flex items-center gap-2 text-stone-400">
          <SolveClock ms={clock.read()} running={active && state.phase === 'awaitingPlayer'} />
          <span>
          <span title={puzzle.ratingEstimated ? 'Elo estimé : exercice généré, pas encore noté par Lichess' : 'Elo Lichess'}>
            Elo {puzzle.ratingEstimated ? '≈' : ''}
            {puzzle.rating}
          </span>{' '}
          · coup {Math.min(state.playerMoveCount + (state.phase === 'awaitingPlayer' ? 1 : 0), rules.maxPlayerMoves ?? 1)}/
          {rules.maxPlayerMoves}
          </span>
        </span>
      </div>
      <div className={flash}>
        <Board
          fen={state.fen}
          orientation={state.playerColor}
          interactive={active && state.phase === 'awaitingPlayer'}
          lastMove={state.lastMove}
          marks={marks}
          arrow={arrow}
          onMove={(from, to, promotion) => playMove(from, to, promotion)}
        />
      </div>
      <MoveInput fen={state.fen} enabled={active && state.phase === 'awaitingPlayer'} onMove={(f, t, p) => playMove(f, t, p)} />
      <p className={`min-h-[1.5rem] text-sm font-medium ${banner ? 'text-amber-300' : TONE[feedback.tone]}`} aria-live="polite">
        {banner ?? `${feedback.title}${feedback.detail ? ` — ${feedback.detail}` : ''}`}
      </p>
    </div>
  );
}
