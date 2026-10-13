// Accueil : carte « Aujourd'hui » (puzzle du jour, défi, série, révision, devoirs…).

import { Icon, type IconName } from '../Icon';
import { type ReactNode } from 'react';
import type { HomeProps as Props } from '../../screens/HomeScreen';

/** Une ligne de la carte « Aujourd'hui » : icône, texte, action. */
export function TodayRow({ icon, tone = 'text-amber-300', children, action }: { icon: IconName; tone?: string; children: ReactNode; action?: ReactNode }) {
  return (
    <li className="flex items-center justify-between gap-3 py-2">
      <span className="flex min-w-0 items-start gap-2 text-sm text-stone-200">
        <Icon name={icon} className={`mt-0.5 h-4 w-4 shrink-0 ${tone}`} />
        <span>{children}</span>
      </span>
      {action}
    </li>
  );
}

const todayBtn = (primary = false) =>
  `shrink-0 rounded-lg px-3 py-1.5 text-sm font-bold ${primary ? 'bg-amber-500 text-stone-900 hover:bg-amber-400' : 'bg-stone-700 text-stone-100 hover:bg-stone-600'}`;

/** Ce qu'il y a à faire aujourd'hui, en une seule carte (révision, puzzle du jour, défi, point faible). */
export function TodayCard({ p }: { p: Props }) {
  const review = p.review && p.review.total > 0 ? p.review : null;
  if (!review && !p.daily && !p.challenge && !p.weakness && !p.streak && !p.homework.length) return null;
  const streak = p.streak;
  return (
    <section aria-labelledby="today-title" className="mb-6 rounded-xl border border-stone-700 bg-stone-800/50 px-4 pb-2 pt-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="today-title" className="text-sm font-semibold uppercase tracking-wide text-stone-400">
          <Icon name="calendar" className="h-4 w-4" /> Aujourd’hui
        </h2>
        {streak && (
          <span
            className={`rounded-full px-3 py-1 text-xs font-bold ${streak.current > 0 ? 'bg-orange-500/20 text-orange-300' : 'bg-stone-800 text-stone-400'}`}
            title={`Meilleure série : ${streak.best} jour(s)`}
          >
            <Icon name="flame" className="h-3.5 w-3.5" /> {streak.current} jour{streak.current > 1 ? 's' : ''} d’affilée
            {!streak.playedToday && streak.current > 0 && ' · joue pour la prolonger'}
          </span>
        )}
      </div>
      <ul className="divide-y divide-stone-700/60">
        {p.homework.map((hw) => (
          <TodayRow
            key={`${hw.code}-${hw.id}`}
            icon="board"
            action={
              hw.done >= hw.goal ? (
                <span className="flex items-center gap-1 text-sm font-semibold text-emerald-300">
                  <Icon name="check" className="h-4 w-4" /> fait
                </span>
              ) : (
                <button type="button" onClick={() => p.onHomework(hw.id, hw.code)} className={todayBtn(true)}>
                  Faire
                </button>
              )
            }
          >
            <strong>Devoir{hw.group ? ` (${hw.group})` : ''} : {hw.title}</strong>{' '}
            <span className="text-stone-400">
              · {hw.done}/{hw.goal} réussis · avant le {new Date(`${hw.due}T12:00:00`).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
            </span>
          </TodayRow>
        ))}
        {review && (
          <TodayRow
            icon="refresh"
            action={
              review.due > 0 ? (
                <button type="button" onClick={p.onReview} className={todayBtn(true)}>
                  Réviser
                </button>
              ) : (
                <span className="text-xs text-stone-400">rien à revoir aujourd’hui</span>
              )
            }
          >
            <strong>Révision des erreurs :</strong>{' '}
            {review.spaced ? `${review.due} à revoir` : `${review.total} à retravailler`}
            <span className="text-stone-400"> · {review.total} en cours</span>
          </TodayRow>
        )}
        {p.daily && (
          <TodayRow
            icon="pin"
            tone="text-sky-300"
            action={
              p.daily.result === null ? (
                <button type="button" onClick={p.onDaily} className={todayBtn()} title={p.daily.title}>
                  Jouer
                </button>
              ) : (
                <span className={`flex items-center gap-1 text-sm font-semibold ${p.daily.result ? 'text-emerald-300' : 'text-red-300'}`}>
                  <Icon name={p.daily.result ? 'check' : 'cross'} className="h-4 w-4" /> {p.daily.result ? 'réussi' : 'raté, à revoir'}
                </span>
              )
            }
          >
            <strong>Puzzle du jour</strong> <span className="text-stone-400">· Elo {p.daily.rating}</span>
          </TodayRow>
        )}
        {p.challenge && (
          <TodayRow
            icon="flag"
            tone="text-sky-300"
            action={
              p.challenge.played < p.challenge.total ? (
                <button type="button" onClick={p.onChallenge} className={todayBtn()}>
                  {p.challenge.played === 0 ? 'Jouer' : 'Continuer'}
                </button>
              ) : (
                <span className="flex items-center gap-1 text-sm font-semibold text-emerald-300">
                  <Icon name="check" className="h-4 w-4" /> {p.challenge.solved}/{p.challenge.total} réussies
                </span>
              )
            }
          >
            <strong>Défi de la semaine</strong>{' '}
            <span className="text-stone-400">
              · {p.challenge.played}/{p.challenge.total} jouées<span className="hidden sm:inline">, mêmes finales pour tout le monde</span>
            </span>
          </TodayRow>
        )}
        {p.weakness && (
          <TodayRow
            icon="target"
            tone="text-sky-300"
            action={
              <button type="button" onClick={() => p.onWeakness(p.weakness!.family)} className={todayBtn()}>
                Storm ciblé
              </button>
            }
          >
            <strong>Point faible :</strong> {p.weakness.label.toLowerCase()} <span className="text-stone-400">· Elo {p.weakness.elo}</span>
          </TodayRow>
        )}
      </ul>
    </section>
  );
}
