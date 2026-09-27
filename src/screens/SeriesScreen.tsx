// Série reçue d'un entraîneur : présentation, puis bilan à lui renvoyer.

import { useState } from 'react';
import { resultText, type Series } from '../core/series';

interface Props {
  series: Series;
  /** Résultat de chaque position (null = pas encore jouée). */
  results: (boolean | null)[];
  titles: string[];
  onPlay: (index: number) => void;
  onHome: () => void;
}

export function SeriesScreen({ series, results, titles, onPlay, onHome }: Props) {
  const [message, setMessage] = useState<string | null>(null);
  const played = results.filter((r) => r !== null).length;
  const solved = results.filter((r) => r === true).length;
  const next = results.findIndex((r) => r === null);
  const text = resultText(series.name, results);

  const send = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ text });
        return;
      }
      await navigator.clipboard.writeText(text);
      setMessage('Résultat copié : colle-le dans ta réponse à ton entraîneur.');
    } catch {
      setMessage('Envoi annulé ou impossible : recopie le texte ci-dessous.');
    }
  };

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-8">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-amber-300">🧑‍🏫 Série de ton entraîneur</p>
        <button type="button" onClick={onHome} className="text-sm text-stone-400 hover:text-stone-100">
          ← Accueil
        </button>
      </div>
      <h1 className="text-2xl font-extrabold text-stone-50">{series.name}</h1>
      <p className="text-stone-300">
        {series.items.length} position{series.items.length > 1 ? 's' : ''} · {played} jouée{played > 1 ? 's' : ''} · {solved} réussie{solved > 1 ? 's' : ''}.
        Seule ta première tentative de chaque position compte.
      </p>
      <ol className="flex flex-col gap-2">
        {titles.map((t, i) => (
          <li key={i}>
            <button type="button" onClick={() => onPlay(i)} className="flex w-full items-center justify-between rounded-lg bg-stone-800 px-4 py-2 text-left text-stone-100 hover:bg-stone-700">
              <span>
                {i + 1}. {t}
              </span>
              <span>{results[i] === true ? '✅' : results[i] === false ? '❌' : '▶'}</span>
            </button>
          </li>
        ))}
      </ol>
      {next >= 0 ? (
        <button type="button" onClick={() => onPlay(next)} className="self-start rounded-xl bg-amber-500 px-6 py-3 font-black text-stone-900 hover:bg-amber-400">
          ▶ {played === 0 ? 'Commencer' : 'Continuer'}
        </button>
      ) : (
        <div className="flex flex-col gap-3 rounded-xl bg-emerald-900/60 p-4 text-emerald-50">
          <p className="font-bold">
            Série terminée : {solved}/{series.items.length}.
          </p>
          <button type="button" onClick={() => void send()} className="self-start rounded-lg bg-amber-500 px-5 py-2 font-bold text-stone-900 hover:bg-amber-400">
            📤 Envoyer mon résultat à mon entraîneur
          </button>
          <p className="select-all rounded bg-stone-900/60 p-2 font-mono text-xs">{text}</p>
          {message && <p className="text-sm text-amber-200">{message}</p>}
        </div>
      )}
    </div>
  );
}
