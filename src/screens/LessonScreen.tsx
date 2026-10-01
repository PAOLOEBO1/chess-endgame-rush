// Leçon guidée : une position classique rejouée coup par coup, commentée.

import { useEffect, useMemo, useState } from 'react';
import { Icon } from '../components/Icon';
import { Board } from '../components/board/Board';
import { applyUci } from '../core/chessRules';
import type { Lesson } from '../data/lessons';

interface Props {
  lesson: Lesson;
  onPractice: () => void;
  onHome: () => void;
}

export function LessonScreen({ lesson, onPractice, onHome }: Props) {
  // Positions successives (0 = départ) et notation de chaque coup.
  const line = useMemo(() => {
    const fens = [lesson.fen];
    const moves: { san: string; from: string; to: string }[] = [];
    for (const step of lesson.steps) {
      const m = applyUci(fens[fens.length - 1], step.uci);
      if (!m) break;
      fens.push(m.fen);
      moves.push({ san: m.san, from: m.from, to: m.to });
    }
    return { fens, moves };
  }, [lesson]);
  const [ply, setPly] = useState(0);
  const last = line.moves.length;
  const end = ply === last;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') setPly((p) => Math.min(last, p + 1));
      if (e.key === 'ArrowLeft') setPly((p) => Math.max(0, p - 1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [last]);

  const startsBlack = lesson.fen.split(' ')[1] === 'b';
  const label = (i: number) => {
    const p = i + (startsBlack ? 1 : 0);
    const n = 1 + Math.floor(p / 2);
    return p % 2 === 0 ? `${n}. ${line.moves[i].san}` : i === 0 ? `${n}… ${line.moves[i].san}` : line.moves[i].san;
  };
  const orientation = startsBlack ? 'b' : 'w';
  const btn = 'rounded-lg bg-stone-700 px-4 py-2 font-semibold text-stone-100 hover:bg-stone-600 disabled:opacity-40';

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-6 lg:flex-row lg:items-start lg:gap-6">
      <div className="mx-auto w-full shrink-0 lg:mx-0 lg:w-[min(600px,55vw)]" style={{ maxWidth: 'min(100%, calc(100dvh - 220px))' }}>
        <Board
          fen={line.fens[ply]}
          orientation={orientation}
          interactive={false}
          lastMove={ply > 0 ? { from: line.moves[ply - 1].from, to: line.moves[ply - 1].to } : null}
          onMove={() => undefined}
        />
      </div>
      <aside className="flex w-full flex-col gap-4">
        <button type="button" onClick={onHome} className="self-start text-sm text-stone-400 hover:text-stone-100">
          ← Accueil
        </button>
        <div>
          <p className="text-sm font-semibold text-amber-300"><Icon name="cap" className="h-4 w-4" /> Leçon guidée</p>
          <h1 className="text-2xl font-bold text-stone-50">{lesson.title}</h1>
        </div>
        <div className="min-h-[5rem] rounded-xl bg-stone-800 px-4 py-3 text-stone-100" role="status" aria-live="polite">
          {ply === 0 ? lesson.intro : (
            <>
              <p className="font-mono font-semibold text-amber-300">{label(ply - 1)}</p>
              <p className="mt-1">{lesson.steps[ply - 1].comment}</p>
            </>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={btn} disabled={ply === 0} onClick={() => setPly(0)} aria-label="Revenir au début">
            ⏮
          </button>
          <button type="button" className={btn} disabled={ply === 0} onClick={() => setPly(ply - 1)} aria-label="Coup précédent">
            ◀
          </button>
          <button
            type="button"
            disabled={end}
            onClick={() => setPly(ply + 1)}
            className="rounded-lg bg-amber-500 px-6 py-2 font-bold text-stone-900 hover:bg-amber-400 disabled:opacity-40"
          >
            {ply === 0 ? 'Commencer ▶' : 'Suivant ▶'}
          </button>
          <span className="self-center text-sm text-stone-400">
            {ply} / {last}
          </span>
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-1 font-mono text-sm">
          {line.moves.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setPly(i + 1)}
              className={i + 1 === ply ? 'text-amber-300' : i < ply ? 'text-stone-200' : 'text-stone-400'}
            >
              {label(i)}
            </button>
          ))}
        </div>
        {end && (
          <div className="flex flex-col gap-3 rounded-xl bg-emerald-900/60 px-4 py-3 text-emerald-50">
            <p>
              <strong>À retenir :</strong> {lesson.summary}
            </p>
            <button type="button" onClick={onPractice} className="self-start rounded-lg bg-amber-500 px-5 py-2 font-bold text-stone-900 hover:bg-amber-400">
              ▶ À toi de jouer cette position
            </button>
          </div>
        )}
        <p className="text-xs text-stone-400">Flèches ← → du clavier pour avancer ou reculer.</p>
      </aside>
    </div>
  );
}
