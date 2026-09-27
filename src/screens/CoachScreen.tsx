// Espace entraîneur : composer une série de positions et la partager par lien.
// Rien n'est stocké en ligne : la série voyage dans le lien lui-même.

import { useState } from 'react';
import { isValidFen } from '../core/chessRules';
import { encodeSeries, SERIES_MAX, type SeriesItem } from '../core/series';
import type { Puzzle } from '../core/types';
import { BASICS_GROUPS } from '../data/puzzlesMock';
import type { MoveJudge } from '../services/moveJudge';

interface Props {
  basics: Puzzle[];
  judge: Pick<MoveJudge, 'check'>;
  onHome: () => void;
}

export function CoachScreen({ basics, judge, onHome }: Props) {
  const [name, setName] = useState('');
  const [items, setItems] = useState<SeriesItem[]>([]);
  const [fen, setFen] = useState('');
  const [objective, setObjective] = useState<'win' | 'draw'>('win');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [link, setLink] = useState<string | null>(null);

  const has = (id: string) => items.some((it) => 'id' in it && it.id === id);
  const toggle = (id: string) => {
    setLink(null);
    setItems((list) => (has(id) ? list.filter((it) => !('id' in it && it.id === id)) : list.length < SERIES_MAX ? [...list, { id }] : list));
  };

  const addFen = async () => {
    const f = fen.trim();
    if (!isValidFen(f)) {
      setMessage('Position (FEN) invalide : copie-la depuis Lichess (« Partager et exporter » → FEN).');
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const ok = await judge.check(f, objective);
      if (!ok) {
        setMessage(`La vérification (table de finales ou Stockfish) ne confirme pas l’objectif « ${objective === 'win' ? 'gagner' : 'tenir la nulle'} » pour le camp au trait.`);
        return;
      }
      setItems((list) => [...list, { fen: f, objective, ...(title.trim() ? { title: title.trim() } : {}) }]);
      setFen('');
      setTitle('');
      setLink(null);
    } catch {
      setMessage('Vérification impossible pour le moment (réseau). Réessaie plus tard.');
    } finally {
      setBusy(false);
    }
  };

  const makeLink = async () => {
    const url = `${window.location.origin}${window.location.pathname}${encodeSeries({ name: name.trim() || 'Série d’entraînement', items })}`;
    setLink(url);
    try {
      await navigator.clipboard.writeText(url);
      setMessage('Lien copié : colle-le dans un message à tes élèves.');
    } catch {
      setMessage('Copie automatique impossible : sélectionne le lien ci-dessous.');
    }
  };

  const label = (it: SeriesItem) => ('id' in it ? (basics.find((b) => b.id === it.id)?.title ?? it.id) : (it.title ?? `Position ${it.fen.split(' ')[0].slice(0, 16)}…`));
  const input = 'rounded-lg bg-stone-900 px-3 py-2 text-stone-100 placeholder:text-stone-500';

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-5 px-4 py-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-stone-50">🧑‍🏫 Créer une série pour tes élèves</h1>
        <button type="button" onClick={onHome} className="text-sm text-stone-400 hover:text-stone-100">
          ← Accueil
        </button>
      </div>
      <p className="text-sm text-stone-400">
        Choisis des positions, puis envoie le lien. Tes élèves jouent la série et te renvoient leur résultat en un clic. Rien n’est enregistré en
        ligne : la série tient dans le lien.
      </p>

      <label className="flex flex-col gap-1 text-sm text-stone-300">
        Nom de la série
        <input className={input} value={name} maxLength={60} onChange={(e) => setName(e.target.value)} placeholder="ex. Finales de tours — séance 3" />
      </label>

      <section className="flex flex-col gap-3 rounded-xl bg-stone-800/60 p-4">
        <h2 className="font-bold text-stone-50">📘 Positions Bases</h2>
        {BASICS_GROUPS.map((g) => (
          <div key={g.id} className="flex flex-wrap items-center gap-2">
            <span className="w-full text-sm font-semibold text-stone-300 sm:w-40">{g.label}</span>
            {g.ids.map((id) => (
              <button
                key={id}
                type="button"
                aria-pressed={has(id)}
                onClick={() => toggle(id)}
                className={`rounded-full px-3 py-1 text-sm font-semibold ${has(id) ? 'bg-amber-500 text-stone-900' : 'bg-stone-700 text-stone-100 hover:bg-stone-600'}`}
              >
                {has(id) ? '✓ ' : ''}
                {basics.find((b) => b.id === id)?.title ?? id}
              </button>
            ))}
          </div>
        ))}
      </section>

      <section className="flex flex-col gap-3 rounded-xl bg-stone-800/60 p-4">
        <h2 className="font-bold text-stone-50">♟ Ta propre position (FEN)</h2>
        <input className={`${input} font-mono text-sm`} value={fen} onChange={(e) => setFen(e.target.value)} placeholder="ex. 8/8/8/4k3/8/8/4P3/4K3 w - - 0 1" spellCheck={false} />
        <div className="flex flex-wrap gap-2">
          <input className={`${input} min-w-0 flex-1`} value={title} maxLength={60} onChange={(e) => setTitle(e.target.value)} placeholder="Titre (facultatif)" />
          <select className={input} value={objective} onChange={(e) => setObjective(e.target.value as 'win' | 'draw')} aria-label="Objectif du camp au trait">
            <option value="win">Gagner</option>
            <option value="draw">Tenir la nulle</option>
          </select>
          <button type="button" disabled={busy || !fen.trim()} onClick={() => void addFen()} className="rounded-lg bg-stone-700 px-4 py-2 font-semibold text-stone-100 hover:bg-stone-600 disabled:opacity-40">
            {busy ? 'Vérification…' : 'Ajouter'}
          </button>
        </div>
        <p className="text-xs text-stone-400">L’objectif est vérifié par la table de finales (7 pièces au plus) ou Stockfish.</p>
      </section>

      <section className="flex flex-col gap-3 rounded-xl bg-stone-800/60 p-4">
        <h2 className="font-bold text-stone-50">
          Ta série · {items.length}/{SERIES_MAX}
        </h2>
        {items.length === 0 ? (
          <p className="text-sm text-stone-400">Aucune position pour l’instant.</p>
        ) : (
          <ol className="list-decimal space-y-1 pl-6 text-sm text-stone-200">
            {items.map((it, i) => (
              <li key={i}>
                {label(it)}{' '}
                <button type="button" onClick={() => setItems((l) => l.filter((_, j) => j !== i))} className="text-red-300 hover:underline" aria-label={`Retirer ${label(it)}`}>
                  retirer
                </button>
              </li>
            ))}
          </ol>
        )}
        <button type="button" disabled={!items.length} onClick={() => void makeLink()} className="self-start rounded-xl bg-amber-500 px-6 py-3 font-black text-stone-900 hover:bg-amber-400 disabled:opacity-40">
          🔗 Créer le lien
        </button>
        {message && <p className="text-sm text-amber-300">{message}</p>}
        {link && <input readOnly value={link} onFocus={(e) => e.target.select()} className={`${input} font-mono text-xs`} aria-label="Lien de la série" />}
      </section>
    </div>
  );
}
