// Entraîneur : devoirs du groupe (« réussir N exercices de tel motif avant telle date »),
// création, suppression et progression de chaque élève suivi.

import { useMemo, useState } from 'react';
import type { MemberProgress } from '../../core/coachProgress';
import { dueInfo, groupHomework, homeworkGoal, homeworkIndices, MAX_HOMEWORK, newHomeworkId, type Homework } from '../../core/homework';
import { motifId } from '../../core/motifs';
import { saveHomework, type CoachSet } from '../../services/coachSets';
import { Icon } from '../Icon';

const fmtDay = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
const inDays = (n: number) => {
  const d = new Date(Date.now() + n * 86_400_000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

interface Props {
  set: CoachSet;
  members: MemberProgress[];
  onSetChange: (set: CoachSet) => void;
}

export function HomeworkPanel({ set, members, onSetChange }: Props) {
  const items = set.items;
  const motifs = useMemo(() => {
    const m = new Map<string, string>();
    for (const it of items) for (const th of it.th ?? []) m.set(motifId(th), th);
    return [...m.entries()].sort((a, b) => a[1].localeCompare(b[1], 'fr'));
  }, [items]);
  const [title, setTitle] = useState('');
  const [motif, setMotif] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [target, setTarget] = useState('10');
  const [due, setDue] = useState(inDays(7));
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const draft: Homework = {
    id: 'apercu00',
    title: title.trim() || 'Devoir',
    target: Math.max(1, Math.min(100, Number(target) || 1)),
    due,
    created: new Date().toISOString(),
    ...(motif ? { motif } : {}),
    ...(Number(from) >= 1 ? { from: Math.min(500, Number(from)) } : {}),
    ...(Number(to) >= 1 ? { to: Math.min(500, Number(to)) } : {}),
  };
  const available = homeworkIndices(items, draft).length;

  const save = async (list: Homework[], ok: string) => {
    setBusy(true);
    setMessage(null);
    try {
      await saveHomework(set.code, list);
      onSetChange({ ...set, homework: list });
      setMessage({ tone: 'ok', text: ok });
      return true;
    } catch {
      setMessage({ tone: 'error', text: 'Enregistrement impossible (connexion, ou migration 0011 pas encore exécutée).' });
      return false;
    } finally {
      setBusy(false);
    }
  };

  const add = async () => {
    if (!title.trim()) return setMessage({ tone: 'error', text: 'Donne un titre au devoir.' });
    if (!available) return setMessage({ tone: 'error', text: 'Aucun exercice ne correspond à ces critères.' });
    if (Date.parse(`${due}T23:59:59`) < Date.now()) return setMessage({ tone: 'error', text: 'L’échéance est déjà passée.' });
    const hw: Homework = { ...draft, id: newHomeworkId(), title: title.trim().slice(0, 60) };
    if (await save([...set.homework, hw].slice(-MAX_HOMEWORK), 'Devoir créé : tes élèves le voient dans « Aujourd’hui ».')) {
      setTitle('');
      setMotif('');
      setFrom('');
      setTo('');
    }
  };

  const input = 'rounded-lg bg-stone-900 px-3 py-2 text-stone-100 placeholder:text-stone-500';
  const now = Date.now();

  return (
    <div className="flex flex-col gap-4">
      {set.homework.length === 0 ? (
        <p className="text-stone-400">Aucun devoir en cours.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {[...set.homework].reverse().map((hw) => {
            const info = dueInfo(hw, now);
            const goal = homeworkGoal(items, hw);
            const progress = groupHomework(members, hw, items, set.updatedAt);
            const reached = progress.filter((p) => p.reached).length;
            return (
              <li key={hw.id} className="flex flex-col gap-2 rounded-lg bg-stone-900/60 p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-stone-50">{hw.title}</p>
                    <p className="text-xs text-stone-400">
                      Réussir {goal} exercice{goal > 1 ? 's' : ''}
                      {hw.motif ? ` · motif « ${motifs.find(([id]) => id === hw.motif)?.[1] ?? hw.motif} »` : ''}
                      {hw.from || hw.to ? ` · rangs ${hw.from ?? 1} à ${hw.to ?? items.length}` : ''} · avant le {fmtDay(hw.due)}{' '}
                      {info.late ? <span className="font-semibold text-red-300">(échu)</span> : `(J-${info.daysLeft})`}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void save(set.homework.filter((x) => x.id !== hw.id), 'Devoir supprimé.')}
                    className="text-xs text-stone-400 hover:text-red-300"
                    aria-label={`Supprimer le devoir ${hw.title}`}
                  >
                    <Icon name="trash" className="h-3.5 w-3.5" /> supprimer
                  </button>
                </div>
                {progress.length > 0 && (
                  <>
                    <p className="text-xs text-stone-300">
                      {reached}/{progress.length} élève{progress.length > 1 ? 's' : ''} suivi{progress.length > 1 ? 's' : ''} l’ont terminé.
                    </p>
                    <ul className="flex flex-wrap gap-1.5">
                      {progress.map((p) => (
                        <li
                          key={p.id}
                          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold tabular-nums ${p.reached ? 'bg-emerald-500/20 text-emerald-300' : 'bg-stone-700 text-stone-200'}`}
                        >
                          {p.reached && <Icon name="check" className="mr-0.5 h-3 w-3" label="terminé" />}
                          {p.pseudo} {Math.min(p.done, goal)}/{goal}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <form
        className="flex flex-col gap-3 rounded-lg border border-stone-700 p-3"
        onSubmit={(e) => {
          e.preventDefault();
          void add();
        }}
      >
        <h3 className="font-semibold text-stone-50">
          <Icon name="plus" className="h-4 w-4" /> Nouveau devoir
        </h3>
        <label className="flex flex-col gap-1">
          Titre
          <input className={input} value={title} maxLength={60} onChange={(e) => setTitle(e.target.value)} placeholder="ex. L’opposition — pour jeudi" />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1">
            Motif
            <select className={input} value={motif} onChange={(e) => setMotif(e.target.value)}>
              <option value="">Tous les exercices</option>
              {motifs.map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <div className="flex gap-2">
            <label className="flex flex-1 flex-col gap-1">
              Du rang
              <input className={input} type="number" min={1} max={items.length} value={from} onChange={(e) => setFrom(e.target.value)} placeholder="1" />
            </label>
            <label className="flex flex-1 flex-col gap-1">
              au rang
              <input className={input} type="number" min={1} max={items.length} value={to} onChange={(e) => setTo(e.target.value)} placeholder={String(items.length)} />
            </label>
          </div>
          <label className="flex flex-col gap-1">
            Exercices à réussir
            <input className={input} type="number" min={1} max={100} value={target} onChange={(e) => setTarget(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1">
            Échéance
            <input className={input} type="date" value={due} min={inDays(0)} onChange={(e) => setDue(e.target.value)} />
          </label>
        </div>
        <p className="text-xs text-stone-400">
          {available} exercice{available > 1 ? 's' : ''} concerné{available > 1 ? 's' : ''}
          {available > 0 && draft.target > available ? ` : l’objectif sera ramené à ${available}` : ''}. L’élève le voit dans sa carte « Aujourd’hui » et
          le joue en Streak ; seules les réussites à partir d’aujourd’hui comptent. Un nouvel import de la base efface les devoirs.
        </p>
        <button type="submit" disabled={busy} className="self-start rounded-lg bg-amber-500 px-4 py-2 font-bold text-stone-900 hover:bg-amber-400 disabled:opacity-40">
          Créer le devoir
        </button>
        {message && <p className={message.tone === 'ok' ? 'text-emerald-300' : 'text-amber-300'}>{message.text}</p>}
      </form>
    </div>
  );
}
