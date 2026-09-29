// Bilan d'un test de maîtrise (thème « Bases ») : score, positions à retravailler.

import { useState } from 'react';
import { examPassed, examScore, examText, type ExamRecord } from '../core/exam';
import { Icon } from '../components/Icon';

interface Props {
  label: string;
  titles: string[];
  results: (boolean | null)[];
  record: ExamRecord | undefined;
  onRetry: () => void;
  /** Rejouer une position ratée en entraînement (indices autorisés). */
  onTrain: (i: number) => void;
  onHome: () => void;
}

export function ExamScreen({ label, titles, results, record, onRetry, onTrain, onHome }: Props) {
  const [message, setMessage] = useState<string | null>(null);
  const passed = examPassed(results);
  const score = examScore(results);
  const text = examText(label, results);

  const share = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ text });
        return;
      }
      await navigator.clipboard.writeText(text);
      setMessage('Résultat copié.');
    } catch {
      setMessage(text);
    }
  };

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5 px-4 py-8">
      <h1 className="text-2xl font-extrabold text-stone-50"><Icon name="cap" className="h-6 w-6 text-amber-300" /> Test : {label}</h1>
      <section className={`rounded-xl p-5 ${passed ? 'bg-emerald-600/20 border border-emerald-500/50' : 'bg-stone-800/60'}`}>
        <div className="flex items-center gap-3 text-4xl font-black text-stone-50 tabular-nums">
          {passed && <Icon name="medal" className="h-9 w-9 text-emerald-300" />}
          {score}/{results.length}
        </div>
        <p className="mt-2 text-stone-200">
          {passed
            ? 'Thème maîtrisé ! Toutes les positions réussies du premier coup, sans aide.'
            : score >= results.length - 1
              ? 'Tout près ! Retravaille la position ratée, puis repasse le test.'
              : 'Retravaille les positions ratées (avec les indices si besoin), puis repasse le test.'}
        </p>
        {record && (
          <p className="mt-1 text-xs text-stone-400">
            Meilleur score : {record.best}/{record.total}
            {record.passedAt && ` · maîtrisé depuis le ${new Date(record.passedAt).toLocaleDateString('fr-FR')}`}
          </p>
        )}
      </section>

      <ol className="flex flex-col gap-2">
        {titles.map((t, i) => (
          <li key={i} className="flex items-center justify-between gap-3 rounded-lg bg-stone-800 px-4 py-2">
            <span className="text-stone-100">
              {results[i] === true ? '✅' : '❌'} {t}
            </span>
            {results[i] !== true && (
              <button type="button" onClick={() => onTrain(i)} className="shrink-0 rounded-lg bg-stone-700 px-3 py-1 text-sm font-semibold text-stone-100 hover:bg-stone-600">
                Retravailler
              </button>
            )}
          </li>
        ))}
      </ol>

      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={onRetry} className="rounded-xl bg-amber-500 px-6 py-3 font-black text-stone-900 hover:bg-amber-400">
          ↻ Repasser le test
        </button>
        <button type="button" onClick={() => void share()} className="rounded-xl bg-stone-700 px-5 py-3 font-semibold text-stone-100 hover:bg-stone-600">
          Partager le résultat
        </button>
        <button type="button" onClick={onHome} className="rounded-xl px-4 py-3 font-semibold text-stone-300 hover:text-stone-50">
          ← Accueil
        </button>
      </div>
      {message && <p className="text-sm text-amber-300">{message}</p>}
    </div>
  );
}
