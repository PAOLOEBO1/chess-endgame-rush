// Entraîneur : suivi des élèves de son groupe, façon ChessTempo.
//  - Élèves : tableau de synthèse, inactivité, fiche détaillée de chaque élève ;
//  - Exercices : statistiques par exercice, fiche, recalibrage de l'Elo ;
//  - Carte du groupe : réussite élèves × motifs (ou tranches de difficulté) ;
//  - Devoirs : à faire avant une date, progression par élève ;
//  - export CSV (élèves, tentatives).

import { useCallback, useEffect, useMemo, useState } from 'react';
import { studentRows, type MemberProgress } from '../core/coachProgress';
import { attemptsCsv, exerciseSheets, inactiveStudents, INACTIVE_DAYS, studentRatings, studentsCsv } from '../core/coachStats';
import { fetchProgress, removeStudent, type CoachSet } from '../services/coachSets';
import { formatClock } from '../hooks/useSolveClock';
import { ExerciseList } from './coach/ExerciseList';
import { GroupHeatmap } from './coach/GroupHeatmap';
import { HomeworkPanel } from './coach/HomeworkPanel';
import { StudentSheetView } from './coach/StudentSheetView';
import { Icon, type IconName } from './Icon';

interface Props {
  set: CoachSet;
  /** La base a changé (Elo recalibrés, devoirs). */
  onSetChange: (set: CoachSet) => void;
}

type View = 'eleves' | 'exercices' | 'carte' | 'devoirs';
const VIEWS: { id: View; label: string; icon: IconName }[] = [
  { id: 'eleves', label: 'Élèves', icon: 'users' },
  { id: 'exercices', label: 'Exercices', icon: 'library' },
  { id: 'carte', label: 'Carte du groupe', icon: 'target' },
  { id: 'devoirs', label: 'Devoirs', icon: 'calendar' },
];

const fmtDate = (iso: string) => (iso ? new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : '–');

/** Petite courbe des derniers scores Storm. */
function Spark({ values }: { values: number[] }) {
  if (values.length < 2) return <span className="text-stone-400">–</span>;
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

function download(name: string, content: string) {
  const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function CoachProgressPanel({ set, onSetChange }: Props) {
  const [members, setMembers] = useState<MemberProgress[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);
  const [view, setView] = useState<View>('eleves');
  const [student, setStudent] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    fetchProgress()
      .then(setMembers)
      .catch(() => setError('Suivi indisponible (réseau, ou migration pas encore exécutée).'));
  }, []);
  useEffect(load, [load]);

  const items = set.items;
  const version = set.updatedAt;
  const rows = useMemo(() => (members ? studentRows(members) : []), [members]);
  const ratings = useMemo(() => (members ? studentRatings(members, items, version) : new Map<string, number>()), [members, items, version]);
  const sheets = useMemo(() => (members ? exerciseSheets(members, items, version) : new Map()), [members, items, version]);
  const inactive = useMemo(() => (members ? inactiveStudents(members, Date.now()) : []), [members]);
  const inactiveIds = new Set(inactive.map((x) => x.id));
  const selected = members?.find((m) => m.id === student) ?? null;
  const stamp = new Date().toISOString().slice(0, 10);

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-stone-700 bg-stone-800/60 p-4 text-sm text-stone-200">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-bold text-stone-50">
          <Icon name="chart" className="h-5 w-5 text-amber-300" /> Suivi de mes élèves
        </h2>
        <div className="flex flex-wrap gap-2">
          {members && members.length > 0 && (
            <>
              <button type="button" onClick={() => download(`eleves-${stamp}.csv`, studentsCsv(members, items, version))} className="rounded-lg bg-stone-700 px-3 py-1.5 text-xs font-semibold text-stone-100 hover:bg-stone-600">
                <Icon name="save" className="h-3.5 w-3.5" /> CSV élèves
              </button>
              <button type="button" onClick={() => download(`tentatives-${stamp}.csv`, attemptsCsv(members, items, version))} className="rounded-lg bg-stone-700 px-3 py-1.5 text-xs font-semibold text-stone-100 hover:bg-stone-600">
                <Icon name="save" className="h-3.5 w-3.5" /> CSV tentatives
              </button>
            </>
          )}
          <button type="button" onClick={load} className="rounded-lg px-2 py-1.5 text-xs font-semibold text-sky-400 hover:underline">
            <Icon name="refresh" className="h-3.5 w-3.5" /> Actualiser
          </button>
        </div>
      </div>
      <p className="text-xs text-stone-400">
        Les élèves qui ont accepté de partager leurs résultats (sous un pseudo) apparaissent ici. Toi seul les vois ; ils peuvent arrêter à
        tout moment, et tout est effacé après un an d’inactivité. Statistiques calculées sur la base actuelle (depuis le dernier import).
      </p>

      <div role="tablist" aria-label="Vues du suivi" className="flex flex-wrap gap-2">
        {VIEWS.map((v) => (
          <button
            key={v.id}
            type="button"
            role="tab"
            aria-selected={view === v.id}
            onClick={() => {
              setView(v.id);
              setStudent(null);
            }}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${view === v.id ? 'bg-amber-500 text-stone-900' : 'bg-stone-700 text-stone-100 hover:bg-stone-600'}`}
          >
            <Icon name={v.icon} className="h-3.5 w-3.5" /> {v.label}
          </button>
        ))}
      </div>

      {error && <p className="text-amber-300">{error}</p>}
      {!members && !error && <p className="text-stone-400">Chargement…</p>}

      {members && view === 'eleves' && selected && (
        <StudentSheetView member={selected} items={items} version={version} onBack={() => setStudent(null)} />
      )}

      {members && view === 'eleves' && !selected && (
        <>
          {rows.length === 0 && <p className="text-stone-400">Aucun élève pour l’instant : envoie le lien du groupe.</p>}
          {inactive.length > 0 && rows.length > 0 && (
            <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-stone-200">
              <Icon name="warning" className="h-4 w-4 text-amber-300" /> <strong>{inactive.length}</strong> élève{inactive.length > 1 ? 's' : ''} sans partie depuis{' '}
              {INACTIVE_DAYS} jours ou plus : {inactive.map((x) => x.pseudo).join(', ')}.
            </p>
          )}
          {rows.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[44rem] text-left text-sm">
                <thead className="text-xs uppercase text-stone-400">
                  <tr>
                    <th className="py-1 pr-2 font-semibold">Élève</th>
                    <th className="py-1 pr-2 font-semibold" title="Elo sur ta base (1re tentative de chaque exercice) ; « ? » = provisoire">Elo base</th>
                    <th className="py-1 pr-2 font-semibold">Parties</th>
                    <th className="py-1 pr-2 font-semibold">Record Storm</th>
                    <th className="py-1 pr-2 font-semibold">Réussite</th>
                    <th className="py-1 pr-2 font-semibold" title="Temps médian sur un exercice réussi">Temps médian</th>
                    <th className="py-1 pr-2 font-semibold">Storm récents</th>
                    <th className="py-1 pr-2 font-semibold">Dernière partie</th>
                    <th className="py-1" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-t border-stone-700">
                      <td className="py-1.5 pr-2">
                        <button type="button" onClick={() => setStudent(r.id)} className="font-semibold text-sky-400 hover:underline" title="Voir la fiche de l’élève">
                          {r.pseudo}
                        </button>
                      </td>
                      <td className="py-1.5 pr-2 tabular-nums">{ratings.has(r.id) && r.sessions ? ratings.get(r.id) : '–'}</td>
                      <td className="py-1.5 pr-2 tabular-nums">{r.sessions}</td>
                      <td className="py-1.5 pr-2 tabular-nums">{r.bestStorm ?? '–'}</td>
                      <td className="py-1.5 pr-2 tabular-nums">{r.success === null ? '–' : `${Math.round(r.success * 100)} %`}</td>
                      <td className="py-1.5 pr-2 tabular-nums">{r.medianMs === null ? '–' : formatClock(r.medianMs)}</td>
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
                      <td className={`py-1.5 pr-2 ${inactiveIds.has(r.id) ? 'font-semibold text-amber-300' : 'text-stone-400'}`}>
                        {r.sessions ? fmtDate(r.lastSeen) : 'jamais'}
                        {inactiveIds.has(r.id) && <Icon name="warning" className="ml-1 h-3.5 w-3.5" label="inactif" />}
                      </td>
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
                          <button type="button" onClick={() => setConfirm(r.id)} className="text-xs text-stone-400 hover:text-red-300" aria-label={`Retirer ${r.pseudo} du groupe`}>
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
        </>
      )}

      {members && view === 'exercices' && <ExerciseList set={set} sheets={sheets} onSetChange={onSetChange} />}
      {members && view === 'carte' && <GroupHeatmap members={members} items={items} version={version} onStudent={(id) => { setView('eleves'); setStudent(id); }} />}
      {members && view === 'devoirs' && <HomeworkPanel set={set} members={members} onSetChange={onSetChange} />}
    </section>
  );
}
