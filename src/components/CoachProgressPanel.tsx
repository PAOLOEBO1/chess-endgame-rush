// Entraîneur : suivi des élèves de son groupe (résultats de Storm / Streak sur sa base).

import { useCallback, useEffect, useState } from 'react';
import { hardestExercises, studentRows, type MemberProgress } from '../core/coachProgress';
import type { CoachItem } from '../core/coachSet';
import { fetchProgress, removeStudent } from '../services/coachSets';
import { Icon } from './Icon';

interface Props {
  items: CoachItem[];
  /** Version actuelle de la base (date du dernier import). */
  version: string;
}

const fmtDate = (iso: string) => (iso ? new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : '–');

/** Petite courbe des derniers scores Storm. */
function Spark({ values }: { values: number[] }) {
  if (values.length < 2) return <span className="text-stone-500">–</span>;
  const max = Math.max(...values, 1);
  const w = 60;
  const h = 18;
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * w},${h - (v / max) * h}`).join(' ');
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-label={`Derniers scores Storm : ${values.join(', ')}`} role="img">
      <polyline points={pts} fill="none" stroke="currentColor" strokeWidth={1.5} className="text-amber-400" />
    </svg>
  );
}

export function CoachProgressPanel({ items, version }: Props) {
  const [members, setMembers] = useState<MemberProgress[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    fetchProgress()
      .then(setMembers)
      .catch(() => setError('Suivi indisponible (réseau, ou migration 0009 pas encore exécutée).'));
  }, []);
  useEffect(load, [load]);

  const rows = members ? studentRows(members) : [];
  const hard = members ? hardestExercises(members, version) : [];

  return (
    <section className="flex flex-col gap-3 rounded-lg bg-stone-900/60 p-3 text-sm text-stone-200">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-bold text-stone-50">
          <Icon name="chart" className="h-4 w-4 text-amber-300" /> Suivi de mes élèves
        </h3>
        <button type="button" onClick={load} className="text-xs text-sky-400 hover:underline">
          ⟳ Actualiser
        </button>
      </div>
      <p className="text-xs text-stone-400">
        Les élèves qui ont accepté de partager leurs résultats (sous un pseudo) apparaissent ici. Toi seul les vois ; ils peuvent arrêter à
        tout moment, et tout est effacé après un an d’inactivité.
      </p>
      {error && <p className="text-amber-300">{error}</p>}
      {!members && !error && <p className="text-stone-400">Chargement…</p>}
      {members && rows.length === 0 && <p className="text-stone-400">Aucun élève pour l’instant : envoie le lien du groupe.</p>}
      {rows.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[34rem] text-left text-sm">
            <thead className="text-xs uppercase text-stone-400">
              <tr>
                <th className="py-1 pr-2 font-semibold">Élève</th>
                <th className="py-1 pr-2 font-semibold">Parties</th>
                <th className="py-1 pr-2 font-semibold">Record Storm</th>
                <th className="py-1 pr-2 font-semibold">Record Streak</th>
                <th className="py-1 pr-2 font-semibold">Réussite</th>
                <th className="py-1 pr-2 font-semibold">Storm récents</th>
                <th className="py-1 pr-2 font-semibold">Dernière partie</th>
                <th className="py-1" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-stone-800">
                  <td className="py-1.5 pr-2 font-semibold text-stone-50">{r.pseudo}</td>
                  <td className="py-1.5 pr-2 tabular-nums">{r.sessions}</td>
                  <td className="py-1.5 pr-2 tabular-nums">{r.bestStorm ?? '–'}</td>
                  <td className="py-1.5 pr-2 tabular-nums">{r.bestStreak ?? '–'}</td>
                  <td className="py-1.5 pr-2 tabular-nums">{r.success === null ? '–' : `${Math.round(r.success * 100)} %`}</td>
                  <td className="py-1.5 pr-2">
                    <span className="flex items-center gap-1">
                      <Spark values={r.recentStorm} />
                      {r.trend !== null && (
                        <span className={r.trend > 0 ? 'text-emerald-300' : r.trend < 0 ? 'text-red-300' : 'text-stone-400'} title="Moyenne des 5 derniers Storm comparée aux 5 précédents">
                          {r.trend > 0 ? '▲' : r.trend < 0 ? '▼' : '='} {Math.abs(r.trend)}
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="py-1.5 pr-2 text-stone-400">{r.sessions ? fmtDate(r.lastSeen) : '–'}</td>
                  <td className="py-1.5 text-right">
                    {confirm === r.id ? (
                      <span className="flex justify-end gap-1">
                        <button
                          type="button"
                          className="rounded bg-red-600 px-2 py-0.5 text-xs font-semibold text-white"
                          onClick={() => {
                            setConfirm(null);
                            void removeStudent(r.id).then(load, () => setError('Retrait impossible pour le moment.'));
                          }}
                        >
                          Retirer
                        </button>
                        <button type="button" className="rounded bg-stone-700 px-2 py-0.5 text-xs" onClick={() => setConfirm(null)}>
                          Non
                        </button>
                      </span>
                    ) : (
                      <button type="button" onClick={() => setConfirm(r.id)} className="text-xs text-stone-500 hover:text-red-300" aria-label={`Retirer ${r.pseudo} du groupe`}>
                        retirer
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {hard.length > 0 && (
        <div>
          <h4 className="mb-1 text-xs font-semibold uppercase text-stone-400">Exercices les plus ratés (base actuelle)</h4>
          <ol className="flex flex-col gap-0.5">
            {hard.map((h) => (
              <li key={h.index} className="flex justify-between gap-2">
                <span className="truncate">
                  {h.index + 1}. {items[h.index]?.t ?? `Exercice ${h.index + 1}`}
                </span>
                <span className="shrink-0 tabular-nums text-stone-400">
                  raté {h.misses} fois · {h.students} élève{h.students > 1 ? 's' : ''}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}
