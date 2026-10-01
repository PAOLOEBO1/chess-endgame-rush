// « Tes types d'erreurs » : répartition des erreurs récentes et conseil ciblé.

import { ERROR_INFO, errorStats, type ErrorType } from '../core/errorTypes';

export function ErrorProfile({ attempts }: { attempts: { e?: ErrorType }[] }) {
  const stats = errorStats(attempts);
  const total = stats.reduce((n, s) => n + s.count, 0);
  if (total < 3) {
    return (
      <section className="rounded-xl bg-stone-800/60 p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-400">Tes types d’erreurs</h2>
        <p className="mt-2 text-sm text-stone-400">Encore trop peu de données : le bilan apparaît après quelques positions ratées.</p>
      </section>
    );
  }
  const top = stats[0];
  return (
    <section className="flex flex-col gap-3 rounded-xl bg-stone-800/60 p-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-400">Tes types d’erreurs · {total} dernières</h2>
      <ul className="flex flex-col gap-2">
        {stats.map((s) => (
          <li key={s.type} className="flex items-center gap-3 text-sm">
            <span className="w-44 shrink-0 text-stone-200">{ERROR_INFO[s.type].label}</span>
            <span className="h-3 min-w-0 flex-1 overflow-hidden rounded-full bg-stone-900" aria-hidden="true">
              <span className="block h-full rounded-full bg-amber-500" style={{ width: `${Math.round(s.share * 100)}%` }} />
            </span>
            <span className="w-16 shrink-0 text-right tabular-nums text-stone-300">
              {Math.round(s.share * 100)} % <span className="sr-only">({s.count})</span>
            </span>
          </li>
        ))}
      </ul>
      <p className="rounded-lg border border-sky-500/40 bg-sky-500/10 p-3 text-sm text-stone-200">
        🎯 <strong>{ERROR_INFO[top.type].label}</strong> : {ERROR_INFO[top.type].advice}
      </p>
    </section>
  );
}
