// Espace entraîneur : composer une série de positions, la partager par lien,
// l'imprimer, et garder ses séries dans une bibliothèque (sur cet appareil).
// Rien n'est stocké en ligne : la série voyage dans le lien lui-même.

import { useEffect, useState } from 'react';
import { visibleSeries } from '../core/userData';
import { scheduleUserDataSync, USER_DATA_EVENT } from '../services/userDataSync';
import { isValidFen } from '../core/chessRules';
import { sideToMove } from '../core/fen';
import { encodeSeries, parseBulk, SERIES_MAX, type SeriesItem } from '../core/series';
import type { Puzzle } from '../core/types';
import { Diagram } from '../components/board/Diagram';
import { Icon } from '../components/Icon';
import { CoachBasePanel } from '../components/CoachBasePanel';
import type { Engine } from '../services/stockfish';
import { BASICS_GROUPS } from '../data/puzzlesMock';
import type { MoveJudge } from '../services/moveJudge';
import { getSettings, setSetting, type SavedSeries } from '../services/settings';

interface Props {
  basics: Puzzle[];
  judge: Pick<MoveJudge, 'check'>;
  onHome: () => void;
  /** Base d'exercices du groupe : compte requis, moteur pour estimer l'Elo. */
  signedIn: boolean;
  onAccount: () => void;
  engine: Pick<Engine, 'analyse'>;
}

const LIBRARY_MAX = 50;

export function CoachScreen({ basics, judge, onHome, signedIn, onAccount, engine }: Props) {
  const [name, setName] = useState('');
  const [items, setItems] = useState<SeriesItem[]>([]);
  const [fen, setFen] = useState('');
  const [objective, setObjective] = useState<'win' | 'draw'>('win');
  const [title, setTitle] = useState('');
  const [bulk, setBulk] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [link, setLink] = useState<string | null>(null);
  const [allSeries, setAllSeries] = useState<SavedSeries[]>(() => getSettings().seriesLibrary);
  const library = visibleSeries(allSeries);
  // Bibliothèque mise à jour depuis le compte (autre appareil).
  useEffect(() => {
    const reload = () => setAllSeries(getSettings().seriesLibrary);
    window.addEventListener(USER_DATA_EVENT, reload);
    return () => window.removeEventListener(USER_DATA_EVENT, reload);
  }, []);
  const [currentId, setCurrentId] = useState<string | null>(null);

  const change = (f: (list: SeriesItem[]) => SeriesItem[]) => {
    setLink(null);
    setItems(f);
  };
  const has = (id: string) => items.some((it) => 'id' in it && it.id === id);
  const toggle = (id: string) =>
    change((list) => (has(id) ? list.filter((it) => !('id' in it && it.id === id)) : list.length < SERIES_MAX ? [...list, { id }] : list));
  const move = (i: number, d: -1 | 1) =>
    change((list) => {
      const j = i + d;
      if (j < 0 || j >= list.length) return list;
      const next = [...list];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  const verify = async (f: string, o: 'win' | 'draw') => judge.check(f, o);

  const addFen = async () => {
    const f = fen.trim();
    if (!isValidFen(f)) {
      setMessage('Position (FEN) invalide : copie-la depuis Lichess (« Partager et exporter » → FEN).');
      return;
    }
    if (items.length >= SERIES_MAX) {
      setMessage(`Une série compte au plus ${SERIES_MAX} positions.`);
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const ok = await verify(f, objective);
      if (!ok) {
        setMessage(`La vérification (table de finales ou Stockfish) ne confirme pas l’objectif « ${objective === 'win' ? 'gagner' : 'tenir la nulle'} » pour le camp au trait.`);
        return;
      }
      change((list) => [...list, { fen: f, objective, ...(title.trim() ? { title: title.trim() } : {}) }]);
      setFen('');
      setTitle('');
    } catch {
      setMessage('Vérification impossible pour le moment (réseau). Réessaie plus tard.');
    } finally {
      setBusy(false);
    }
  };

  const addBulk = async () => {
    const { items: lines, invalid } = parseBulk(bulk);
    if (!lines.length) {
      setMessage(invalid.length ? `Aucune position lisible (lignes ${invalid.join(', ')}).` : 'Colle au moins une position.');
      return;
    }
    setBusy(true);
    setMessage(null);
    const added: SeriesItem[] = [];
    const refused: number[] = [];
    const offline: number[] = [];
    const room = SERIES_MAX - items.length;
    for (const l of lines) {
      if (added.length >= room) {
        refused.push(l.line);
        continue;
      }
      setMessage(`Vérification ${added.length + refused.length + offline.length + 1}/${lines.length}…`);
      try {
        if (await verify(l.fen, l.objective)) added.push({ fen: l.fen, objective: l.objective, ...(l.title ? { title: l.title } : {}) });
        else refused.push(l.line);
      } catch {
        offline.push(l.line);
      }
    }
    change((list) => [...list, ...added]);
    const kept = new Set([...refused, ...offline, ...invalid]);
    setBulk(
      bulk
        .split(/\r?\n/)
        .filter((_, i) => kept.has(i + 1))
        .join('\n'),
    );
    const parts = [`${added.length} position${added.length > 1 ? 's' : ''} ajoutée${added.length > 1 ? 's' : ''}`];
    if (invalid.length) parts.push(`FEN invalide : ligne${invalid.length > 1 ? 's' : ''} ${invalid.join(', ')}`);
    if (refused.length) parts.push(`objectif non confirmé ou série pleine : ligne${refused.length > 1 ? 's' : ''} ${refused.join(', ')}`);
    if (offline.length) parts.push(`vérification impossible (réseau) : ligne${offline.length > 1 ? 's' : ''} ${offline.join(', ')}`);
    setMessage(`${parts.join(' · ')}.${kept.size ? ' Les lignes non ajoutées restent dans la zone de saisie.' : ''}`);
    setBusy(false);
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

  // --- Bibliothèque (cet appareil) ------------------------------------------
  const saveLibrary = (next: SavedSeries[]) => {
    setAllSeries(next);
    setSetting('seriesLibrary', next);
    scheduleUserDataSync();
  };
  const save = () => {
    const entry: SavedSeries = {
      id: currentId ?? `s${Date.now().toString(36)}`,
      name: name.trim() || 'Série d’entraînement',
      items,
      savedAt: Date.now(),
    };
    const others = allSeries.filter((s) => s.id !== entry.id);
    if (!currentId && visibleSeries(others).length >= LIBRARY_MAX) {
      setMessage(`Bibliothèque pleine (${LIBRARY_MAX} séries) : supprimes-en une d’abord.`);
      return;
    }
    saveLibrary([entry, ...others]);
    setCurrentId(entry.id);
    setMessage(`Série « ${entry.name} » enregistrée sur cet appareil.`);
  };
  const load = (s: SavedSeries) => {
    setName(s.name);
    setItems(s.items);
    setCurrentId(s.id);
    setLink(null);
    setMessage(`Série « ${s.name} » ouverte.`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const newSeries = () => {
    setName('');
    setItems([]);
    setCurrentId(null);
    setLink(null);
    setMessage(null);
  };

  const puzzleOf = (it: SeriesItem) => ('id' in it ? basics.find((b) => b.id === it.id) : undefined);
  const label = (it: SeriesItem) => ('id' in it ? (puzzleOf(it)?.title ?? it.id) : (it.title ?? `Position ${it.fen.split(' ')[0].slice(0, 16)}…`));
  const fenOf = (it: SeriesItem) => ('id' in it ? (puzzleOf(it)?.fen ?? '') : it.fen);
  const goalOf = (it: SeriesItem) => ('id' in it ? (puzzleOf(it)?.objective ?? 'win') : it.objective);
  const task = (it: SeriesItem) => {
    const side = sideToMove(fenOf(it)) === 'w' ? 'Les Blancs' : 'Les Noirs';
    return `${side} jouent et ${goalOf(it) === 'win' ? 'gagnent' : 'font nulle'}`;
  };
  const input = 'rounded-lg bg-stone-900 px-3 py-2 text-stone-100 placeholder:text-stone-500';
  const seriesName = name.trim() || 'Série d’entraînement';

  return (
    <>
      <div className="mx-auto flex max-w-4xl flex-col gap-5 px-4 py-6 print:hidden">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-extrabold text-stone-50"><Icon name="board" className="h-6 w-6 text-amber-300" /> Créer une série pour tes élèves</h1>
          <button type="button" onClick={onHome} className="text-sm text-stone-400 hover:text-stone-100">
            ← Accueil
          </button>
        </div>
        <CoachBasePanel signedIn={signedIn} onAccount={onAccount} engine={engine} />

        <h2 className="mt-2 text-lg font-bold text-stone-50">Séries de positions à partager par lien</h2>
        <p className="text-sm text-stone-400">
          Choisis des positions, puis envoie le lien ou imprime la fiche. Tes élèves jouent la série et te renvoient leur résultat en un
          clic. La série tient dans le lien ; ta bibliothèque suit ton compte.
        </p>

        <div className="flex flex-wrap items-end gap-2">
          <label className="flex min-w-0 flex-1 flex-col gap-1 text-sm text-stone-300">
            Nom de la série
            <input className={input} value={name} maxLength={60} onChange={(e) => setName(e.target.value)} placeholder="ex. Finales de tours — séance 3" />
          </label>
          {(items.length > 0 || currentId) && (
            <button type="button" onClick={newSeries} className="rounded-lg bg-stone-800 px-3 py-2 text-sm font-semibold text-stone-200 hover:bg-stone-700">
              <Icon name="plus" className="h-4 w-4" /> Nouvelle série
            </button>
          )}
        </div>

        <section className="flex flex-col gap-3 rounded-xl bg-stone-800/60 p-4">
          <h2 className="font-bold text-stone-50"><Icon name="book" className="h-5 w-5 text-amber-300" /> Positions Bases</h2>
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
          <details className="rounded-lg bg-stone-900/50 p-3">
            <summary className="cursor-pointer text-sm font-semibold text-stone-200"><Icon name="plus" className="h-4 w-4" /> Ajouter plusieurs positions d’un coup</summary>
            <p className="mt-2 text-xs text-stone-400">
              Une position par ligne : <code className="text-stone-300">FEN ; titre ; nulle</code> — titre et objectif facultatifs (gain par
              défaut).
            </p>
            <textarea
              className={`${input} mt-2 h-32 w-full font-mono text-xs`}
              value={bulk}
              onChange={(e) => setBulk(e.target.value)}
              spellCheck={false}
              placeholder={'8/8/8/4k3/8/8/4P3/4K3 w - - 0 1 ; Roi et pion\n4k3/7R/r7/3PK3/8/8/8/8 b - - 0 1 ; Philidor ; nulle'}
            />
            <button type="button" disabled={busy || !bulk.trim()} onClick={() => void addBulk()} className="mt-2 rounded-lg bg-stone-700 px-4 py-2 text-sm font-semibold text-stone-100 hover:bg-stone-600 disabled:opacity-40">
              {busy ? 'Vérification…' : 'Vérifier et ajouter'}
            </button>
          </details>
        </section>

        <section className="flex flex-col gap-3 rounded-xl bg-stone-800/60 p-4">
          <h2 className="font-bold text-stone-50">
            Ta série · {items.length}/{SERIES_MAX}
          </h2>
          {items.length === 0 ? (
            <p className="text-sm text-stone-400">Aucune position pour l’instant.</p>
          ) : (
            <ol className="flex flex-col gap-1 text-sm text-stone-200">
              {items.map((it, i) => (
                <li key={i} className="flex flex-wrap items-center gap-2">
                  <span className="w-6 text-right tabular-nums text-stone-400">{i + 1}.</span>
                  <span className="min-w-0 flex-1">{label(it)}</span>
                  <button type="button" disabled={i === 0} onClick={() => move(i, -1)} className="px-1 text-stone-400 hover:text-stone-100 disabled:opacity-30" aria-label={`Monter ${label(it)}`}>
                    ↑
                  </button>
                  <button type="button" disabled={i === items.length - 1} onClick={() => move(i, 1)} className="px-1 text-stone-400 hover:text-stone-100 disabled:opacity-30" aria-label={`Descendre ${label(it)}`}>
                    ↓
                  </button>
                  <button type="button" onClick={() => change((l) => l.filter((_, j) => j !== i))} className="text-red-300 hover:underline" aria-label={`Retirer ${label(it)}`}>
                    retirer
                  </button>
                </li>
              ))}
            </ol>
          )}
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={!items.length} onClick={() => void makeLink()} className="rounded-xl bg-amber-500 px-6 py-3 font-black text-stone-900 hover:bg-amber-400 disabled:opacity-40">
              <Icon name="link" className="h-5 w-5" /> Créer le lien
            </button>
            <button type="button" disabled={!items.length} onClick={() => window.print()} className="rounded-xl bg-stone-700 px-4 py-3 font-semibold text-stone-100 hover:bg-stone-600 disabled:opacity-40">
              <Icon name="printer" className="h-5 w-5" /> Fiche imprimable
            </button>
            <button type="button" disabled={!items.length} onClick={save} className="rounded-xl bg-stone-700 px-4 py-3 font-semibold text-stone-100 hover:bg-stone-600 disabled:opacity-40">
              <Icon name="save" className="h-5 w-5" /> {currentId ? 'Mettre à jour' : 'Enregistrer'}
            </button>
          </div>
          {message && (
            <p className="text-sm text-amber-300" role="status">
              {message}
            </p>
          )}
          {link && <input readOnly value={link} onFocus={(e) => e.target.select()} className={`${input} font-mono text-xs`} aria-label="Lien de la série" />}
        </section>

        {library.length > 0 && (
          <section className="flex flex-col gap-3 rounded-xl border border-stone-700 p-4">
            <h2 className="font-bold text-stone-50"><Icon name="library" className="h-5 w-5 text-amber-300" /> Ma bibliothèque · {library.length}</h2>
            <p className="text-xs text-stone-400">Enregistrée sur cet appareil, et sur ton compte si tu es connecté : tu la retrouves alors partout.</p>
            <ul className="flex flex-col gap-2">
              {library.map((s) => (
                <li key={s.id} className={`flex flex-wrap items-center gap-2 rounded-lg px-3 py-2 ${s.id === currentId ? 'bg-amber-500/15' : 'bg-stone-800'}`}>
                  <span className="min-w-0 flex-1 text-sm text-stone-100">
                    <strong>{s.name}</strong>{' '}
                    <span className="text-stone-400">
                      · {s.items.length} position{s.items.length > 1 ? 's' : ''} · {new Date(s.savedAt).toLocaleDateString('fr-FR')}
                    </span>
                  </span>
                  <button type="button" onClick={() => load(s)} className="rounded-lg bg-stone-700 px-3 py-1 text-sm font-semibold text-stone-100 hover:bg-stone-600">
                    Ouvrir
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      // Suppression gardée en mémoire : elle atteindra aussi les autres appareils.
                      saveLibrary(allSeries.map((x) => (x.id === s.id ? { ...x, deletedAt: Date.now() } : x)));
                      if (s.id === currentId) setCurrentId(null);
                    }}
                    className="px-2 text-sm text-red-300 hover:underline"
                    aria-label={`Supprimer la série ${s.name}`}
                  >
                    supprimer
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      {/* Fiche imprimable : visible seulement à l'impression. */}
      <div className="hidden bg-white p-6 text-black print:block">
        <h1 className="text-xl font-bold">{seriesName}</h1>
        <p className="mb-4 text-sm">Chess Endgame Rush · {items.length} positions · le camp au trait est en bas du diagramme.</p>
        <div className="grid grid-cols-2 gap-6">
          {items.map((it, i) => (
            <figure key={i} className="break-inside-avoid">
              <Diagram fen={fenOf(it)} size={220} />
              <figcaption className="mt-1 text-sm">
                <strong>{i + 1}.</strong> {label(it)} — {task(it)}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </>
  );
}
