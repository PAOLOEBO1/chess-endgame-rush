// Exercice « Gain, nulle ou perte ? » : série de 10 positions de 7 pièces au
// plus ; le joueur annonce le résultat avec le meilleur jeu, la table corrige.

import { useCallback, useEffect, useRef, useState } from 'react';
import { Icon } from '../components/Icon';
import { Board } from '../components/board/Board';
import { materialSymbols } from '../core/material';
import { buildQuestion, type JudgeQuestion, type Verdict3 } from '../core/quiz/judgeQuiz';
import type { Puzzle } from '../core/types';
import { getBest, submitScore } from '../services/highScores';
import type { TablebaseClient } from '../services/tablebaseClient';

const SERIES = 10;
const LABEL: Record<Verdict3, string> = { white: 'Les Blancs gagnent', draw: 'Nulle', black: 'Les Noirs gagnent' };
const BEST_KEY = 'judge|series10';

interface Props {
  pool: Puzzle[];
  tablebase: Pick<TablebaseClient, 'lookup'>;
  onHome: () => void;
}

export function JudgeQuizScreen({ pool, tablebase, onHome }: Props) {
  const [question, setQuestion] = useState<JudgeQuestion | null>(null);
  const [answered, setAnswered] = useState<Verdict3 | null>(null);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [problem, setProblem] = useState<string | null>(null);
  const [done, setDone] = useState<{ record: boolean } | null>(null);
  const [run, setRun] = useState(0);
  const used = useRef(new Set<string>());
  const shownAt = useRef(Date.now());
  const [times, setTimes] = useState<number[]>([]);

  const next = useCallback(async () => {
    setQuestion(null);
    setAnswered(null);
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const choices = pool.filter((p) => !used.current.has(p.id));
      const pick = (choices.length ? choices : pool)[Math.floor(Math.random() * (choices.length || pool.length))];
      if (!pick) break;
      used.current.add(pick.id);
      try {
        const q = buildQuestion(pick.fen, await tablebase.lookup(pick.fen));
        if (q) {
          setQuestion(q);
          shownAt.current = Date.now();
          return;
        }
      } catch {
        setProblem('Ce mode a besoin de la table de finales de Lichess, injoignable pour le moment. Réessayez plus tard.');
        return;
      }
    }
    setProblem('Aucune position disponible pour ce choix.');
  }, [pool, tablebase]);

  useEffect(() => {
    void next();
  }, [next, run]);

  const answer = useCallback(
    (v: Verdict3) => {
      if (!question || answered) return;
      setAnswered(v);
      setTimes((t) => [...t, Date.now() - shownAt.current]);
      if (v === question.answer) setScore((s) => s + 1);
    },
    [question, answered],
  );

  const proceed = () => {
    if (index + 1 >= SERIES) {
      const final = score;
      setDone({ record: submitScore(BEST_KEY, final).isRecord });
      return;
    }
    setIndex((i) => i + 1);
    void next();
  };

  // Clavier : 1 = Blancs gagnent, 2 = nulle, 3 = Noirs gagnent, Entrée = suivante.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '1') answer('white');
      if (e.key === '2') answer('draw');
      if (e.key === '3') answer('black');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [answer]);

  const restart = () => {
    setIndex(0);
    setScore(0);
    setTimes([]);
    setDone(null);
    setProblem(null);
    setRun((r) => r + 1);
  };

  const header = (
    <div className="flex items-center justify-between text-sm text-stone-400">
      <button type="button" onClick={onHome} className="hover:text-stone-100">
        ← Accueil
      </button>
      <span>
        {Math.min(index + 1, SERIES)} / {SERIES} · {score} juste{score > 1 ? 's' : ''}
      </span>
    </div>
  );

  if (problem) {
    return (
      <div className="mx-auto flex max-w-md flex-col gap-4 px-4 py-10 text-center text-stone-300">
        <p>{problem}</p>
        <button type="button" onClick={onHome} className="rounded-lg bg-stone-700 px-4 py-2 font-semibold text-stone-100">
          ← Accueil
        </button>
      </div>
    );
  }

  if (done) {
    const best = getBest(BEST_KEY);
    const avg = times.length ? Math.round(times.reduce((a, b) => a + b, 0) / times.length / 100) / 10 : 0;
    return (
      <div className="mx-auto flex max-w-md flex-col gap-4 px-4 py-10 text-center">
        <h1 className="text-2xl font-extrabold text-stone-50"><Icon name="scale" className="h-6 w-6 text-amber-300" /> {score} / {SERIES}</h1>
        <p className="text-stone-300">
          {done.record ? 'Nouveau record !' : best ? `Record : ${best.score} / ${SERIES}` : ''} Temps moyen : {avg} s par position.
        </p>
        <p className="text-sm text-stone-400">
          Savoir juger vite une finale aide à choisir ses échanges : simplifier vers une finale gagnante, éviter une finale perdante.
        </p>
        <div className="flex justify-center gap-3">
          <button type="button" onClick={restart} className="rounded-lg bg-amber-500 px-5 py-2 font-bold text-stone-900 hover:bg-amber-400">
            <Icon name="refresh" className="h-4 w-4" /> Nouvelle série
          </button>
          <button type="button" onClick={onHome} className="rounded-lg bg-stone-700 px-5 py-2 font-semibold text-stone-100">
            Accueil
          </button>
        </div>
      </div>
    );
  }

  const turn = question ? (question.fen.split(' ')[1] === 'b' ? 'Noirs' : 'Blancs') : '';
  const right = answered && question && answered === question.answer;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-6 lg:flex-row lg:items-start lg:gap-6">
      <div className="mx-auto w-full shrink-0 lg:mx-0 lg:w-[min(600px,55vw)]" style={{ maxWidth: 'min(100%, calc(100dvh - 220px))' }}>
        {question ? (
          <Board
            fen={question.fen}
            orientation="w"
            interactive={false}
            lastMove={question.lastMove ? { from: question.lastMove.slice(0, 2), to: question.lastMove.slice(2, 4) } : null}
            onMove={() => undefined}
          />
        ) : (
          <div className="flex aspect-square items-center justify-center rounded-lg bg-stone-800 text-stone-400">Préparation…</div>
        )}
      </div>
      <aside className="flex w-full flex-col gap-4">
        {header}
        <div>
          <h1 className="text-2xl font-bold text-stone-50"><Icon name="scale" className="h-6 w-6 text-amber-300" /> Gain, nulle ou perte ?</h1>
          <p className="mt-1 text-sm text-stone-400">
            {question ? `${materialSymbols(question.fen, 'w').text} · trait aux ${turn}` : ''} — résultat avec le meilleur jeu des deux camps.
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          {(['white', 'draw', 'black'] as const).map((v, i) => {
            const isAnswer = answered && question?.answer === v;
            const isWrongPick = answered === v && !isAnswer;
            return (
              <button
                key={v}
                type="button"
                disabled={!question || !!answered}
                onClick={() => answer(v)}
                className={`rounded-xl px-4 py-3 font-bold transition ${
                  isAnswer ? 'bg-emerald-600 text-white' : isWrongPick ? 'bg-red-700 text-white' : 'bg-stone-800 text-stone-100 hover:bg-stone-700'
                } disabled:cursor-default`}
              >
                <span className="mr-1 text-xs opacity-60">{i + 1}</span> {LABEL[v]}
              </button>
            );
          })}
        </div>
        {answered && question && (
          <div className={`rounded-xl px-4 py-3 ${right ? 'bg-emerald-900/70 text-emerald-100' : 'bg-red-900/70 text-red-100'}`} role="status">
            <p className="font-semibold">
              <Icon name={right ? 'check' : 'cross'} className="h-4 w-4" /> {right ? 'Exact' : 'Non'} : {LABEL[question.answer].toLowerCase()}
              {question.mateIn ? ` (mat en ${question.mateIn} avec le meilleur jeu)` : ''}.
            </p>
          </div>
        )}
        {answered && (
          <button type="button" onClick={proceed} className="self-start rounded-lg bg-amber-500 px-5 py-2 font-bold text-stone-900 hover:bg-amber-400">
            {index + 1 >= SERIES ? 'Voir le résultat' : 'Position suivante →'}
          </button>
        )}
        <p className="text-xs text-stone-400">Raccourcis clavier : 1, 2, 3. Corrigé par la table de finales Syzygy (Lichess).</p>
      </aside>
    </div>
  );
}
