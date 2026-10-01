// Entraîneur : statistiques par exercice (façon ChessTempo), fiche d'un exercice et
// recalibrage de l'Elo des exercices d'après les résultats réels des élèves.

import { useState } from 'react';
import { applyRecalibration, MIN_RECAL_TRIES, type ExerciseSheet } from '../../core/coachStats';
import { saveRatings, type CoachSet } from '../../services/coachSets';
import { formatClock } from '../../hooks/useSolveClock';
import { Diagram } from '../board/Diagram';
import { Icon } from '../Icon';

const pct = (x: number | null) => (x === null ? '–' : `${Math.round(x * 100)} %`);
const move = (uci: string) => `${uci.slice(0, 2)}-${uci.slice(2, 4)}${uci[4] ? `=${uci[4].toUpperCase()}` : ''}`;

interface Props {
  set: CoachSet;
  sheets: Map<number, ExerciseSheet>;
  onSetChange: (set: CoachSet) => void;
}

export function ExerciseList({ set, sheets, onSetChange }: Props) {
  const [sort, setSort] = useState<'rang' | 'reussite'>('reussite');
  const [open, setOpen] = useState<number | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const items = set.items;
  const proposals = [...sheets.values()].filter((s) => s.suggested !== null).length;

  const rows = items
    .map((it, index) => ({ it, index, s: sheets.get(index) ?? null }))
    .filter((r) => sort === 'rang' || r.s)
    .sort((a, b) => (sort === 'rang' ? a.index - b.index : (a.s?.success ?? 1) - (b.s?.success ?? 1) || (b.s?.tries ?? 0) - (a.s?.tries ?? 0)));

  const recalibrate = async () => {
    setConfirm(false);
    const { items: next, changed } = applyRecalibration(items, sheets);
    try {
      await saveRatings(set.code, next);
      onSetChange({ ...set, items: next });
      setMessage(`${changed} Elo mis à jour. Les Storm et Streak de tes élèves en tiennent compte dès maintenant.`);
    } catch {
      setMessage('Mise à jour impossible pour le moment (connexion).');
    }
  };

  if (open !== null && items[open]) {
    const it = items[open];
    const s = sheets.get(open);
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-lg font-bold text-stone-50">
            {open + 1}. {it.t ?? `Exercice ${open + 1}`}
          </h3>
          <button type="button" onClick={() => setOpen(null)} className="text-sm text-sky-400 hover:underline">
            ← Tous les exercices
          </button>
        </div>
        <div className="flex flex-wrap gap-4">
          <Diagram fen={it.f} size={200} />
          <dl className="grid min-w-[14rem] flex-1 grid-cols-2 gap-x-4 gap-y-1">
            <dt className="text-stone-400">Objectif</dt>
            <dd>{it.o === 'w' ? 'gagner' : 'tenir la nulle'}</dd>
            <dt className="text-stone-400">Elo</dt>
            <dd>
              {it.r}
              {it.e ? ' (estimé)' : ''}
              {s?.suggested != null && <span className="text-amber-300"> → proposé {s.suggested}</span>}
            </dd>
            <dt className="text-stone-400">Motifs</dt>
            <dd>{it.th?.join(', ') || '–'}</dd>
            <dt className="text-stone-400">Tentatives</dt>
            <dd>
              {s?.tries ?? 0} ({s?.students ?? 0} élève{(s?.students ?? 0) > 1 ? 's' : ''})
            </dd>
            <dt className="text-stone-400">Réussite</dt>
            <dd>{pct(s?.success ?? null)}</dd>
            <dt className="text-stone-400">Temps médian</dt>
            <dd>{s?.medianMs != null ? formatClock(s.medianMs) : '–'}</dd>
            <dt className="text-stone-400">Erreurs fréquentes</dt>
            <dd>{s?.wrong.length ? s.wrong.map((w) => `${move(w.uci)} (${w.n})`).join(', ') : '–'}</dd>
            <dt className="text-stone-400">Raté par</dt>
            <dd>{s?.failedBy.length ? s.failedBy.join(', ') : '–'}</dd>
          </dl>
        </div>
        <p className="text-xs text-stone-400">Solution : {it.s.map(move).join(' ')}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-2 text-xs" role="group" aria-label="Trier">
          {(['reussite', 'rang'] as const).map((k) => (
            <button
              key={k}
              type="button"
              aria-pressed={sort === k}
              onClick={() => setSort(k)}
              className={`rounded-lg px-2.5 py-1 font-semibold ${sort === k ? 'bg-stone-600 text-stone-50' : 'bg-stone-900/60 text-stone-300 hover:bg-stone-700'}`}
            >
              {k === 'reussite' ? 'Les plus ratés d’abord' : 'Ordre de la base'}
            </button>
          ))}
        </div>
        {proposals > 0 &&
          (confirm ? (
            <span className="flex flex-wrap items-center gap-2 text-xs">
              Remplacer {proposals} Elo par les valeurs proposées ?
              <button type="button" onClick={() => void recalibrate()} className="rounded bg-amber-500 px-2 py-1 font-semibold text-stone-900 hover:bg-amber-400">
                Oui
              </button>
              <button type="button" onClick={() => setConfirm(false)} className="rounded bg-stone-700 px-2 py-1">
                Annuler
              </button>
            </span>
          ) : (
            <button type="button" onClick={() => setConfirm(true)} className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-stone-900 hover:bg-amber-400">
              <Icon name="scale" className="h-3.5 w-3.5" /> Recalibrer {proposals} Elo
            </button>
          ))}
      </div>
      <p className="text-xs text-stone-400">
        Elo proposé : calculé d’après la 1re tentative de chaque élève et son Elo sur la base, à partir de {MIN_RECAL_TRIES} élèves et d’un
        écart de 50 points. Les rangs ne changent pas : le suivi et les devoirs restent valables.
      </p>
      {message && <p className="text-emerald-300">{message}</p>}
      {rows.length === 0 ? (
        <p className="text-stone-400">Pas encore de tentative détaillée sur la base actuelle.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead className="text-xs uppercase text-stone-400">
              <tr>
                <th className="py-1 pr-2 font-semibold">Rang</th>
                <th className="py-1 pr-2 font-semibold">Exercice</th>
                <th className="py-1 pr-2 font-semibold">Elo</th>
                <th className="py-1 pr-2 font-semibold">Tentatives</th>
                <th className="py-1 pr-2 font-semibold">Réussite</th>
                <th className="py-1 pr-2 font-semibold">Temps médian</th>
                <th className="py-1 pr-2 font-semibold">Erreur fréquente</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ it, index, s }) => (
                <tr key={index} className="border-t border-stone-700">
                  <td className="py-1.5 pr-2 tabular-nums text-stone-400">{index + 1}</td>
                  <td className="max-w-[14rem] truncate py-1.5 pr-2">
                    <button type="button" onClick={() => setOpen(index)} className="text-sky-400 hover:underline">
                      {it.t ?? `Exercice ${index + 1}`}
                    </button>
                  </td>
                  <td className="py-1.5 pr-2 tabular-nums">
                    {it.r}
                    {s?.suggested != null && <span className="text-amber-300"> → {s.suggested}</span>}
                  </td>
                  <td className="py-1.5 pr-2 tabular-nums">{s?.tries ?? 0}</td>
                  <td className="py-1.5 pr-2 tabular-nums">{pct(s?.success ?? null)}</td>
                  <td className="py-1.5 pr-2 tabular-nums">{s?.medianMs != null ? formatClock(s.medianMs) : '–'}</td>
                  <td className="py-1.5 pr-2 tabular-nums text-stone-400">{s?.wrong[0] ? move(s.wrong[0].uci) : '–'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
