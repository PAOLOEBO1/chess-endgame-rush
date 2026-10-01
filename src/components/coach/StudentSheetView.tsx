// Fiche d'un élève (vue entraîneur) : Elo sur la base et sa courbe, réussite, temps médian,
// plafond par tranche de difficulté, motifs faibles, types d'erreurs, exercices ratés.

import type { MemberProgress } from '../../core/coachProgress';
import type { CoachItem } from '../../core/coachSet';
import { bandLabel, studentSheet } from '../../core/coachStats';
import { formatClock } from '../../hooks/useSolveClock';
import { Icon } from '../Icon';

const pct = (x: number | null) => (x === null ? '–' : `${Math.round(x * 100)} %`);

function Tile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg bg-stone-900/60 px-3 py-2" title={hint}>
      <div className="text-xs text-stone-400">{label}</div>
      <div className="text-lg font-bold tabular-nums text-stone-50">{value}</div>
    </div>
  );
}

/** Courbe de l'Elo sur la base, partie après partie. */
function EloCurve({ points }: { points: { t: number; r: number }[] }) {
  if (points.length < 2) return <p className="text-xs text-stone-400">La courbe apparaîtra après deux parties.</p>;
  const w = 320;
  const h = 90;
  const pad = 4;
  const rs = points.map((p) => p.r);
  const lo = Math.min(...rs) - 20;
  const hi = Math.max(...rs) + 20;
  const x = (i: number) => pad + (i / (points.length - 1)) * (w - 2 * pad);
  const y = (r: number) => pad + (1 - (r - lo) / (hi - lo)) * (h - 2 * pad);
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.r).toFixed(1)}`).join(' ');
  const first = points[0];
  const last = points[points.length - 1];
  return (
    <figure>
      <svg viewBox={`0 0 ${w} ${h}`} className="h-24 w-full max-w-md" role="img" aria-label={`Elo sur la base : de ${first.r} à ${last.r} en ${points.length} parties`}>
        <path d={d} fill="none" stroke="currentColor" strokeWidth={2} className="text-amber-400" />
        <circle cx={x(points.length - 1)} cy={y(last.r)} r={3.5} className="fill-amber-400" />
      </svg>
      <figcaption className="text-xs text-stone-400">
        {new Date(first.t).toLocaleDateString('fr-FR')} : {first.r} → {new Date(last.t).toLocaleDateString('fr-FR')} : {last.r}
      </figcaption>
    </figure>
  );
}

export function StudentSheetView({ member, items, version, onBack }: { member: MemberProgress; items: CoachItem[]; version: string; onBack: () => void }) {
  const s = studentSheet(member, items, version);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-lg font-bold text-stone-50">
          <Icon name="user" className="h-5 w-5 text-amber-300" /> {member.pseudo}
        </h3>
        <button type="button" onClick={onBack} className="text-sm text-sky-400 hover:underline">
          ← Tous les élèves
        </button>
      </div>
      {s.tries === 0 ? (
        <p className="text-stone-400">Pas encore de partie détaillée sur la base actuelle.</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            <Tile
              label="Elo sur la base"
              value={`${s.rating.r}${s.rating.provisional ? ' ?' : ''}`}
              hint={`± ${s.rating.rd} ; 1re tentative de chaque exercice (${s.rating.games}). « ? » = provisoire.`}
            />
            <Tile label="Exercices tentés" value={String(s.tries)} />
            <Tile label="Réussite" value={pct(s.success)} />
            <Tile label="Temps médian" value={s.medianMs === null ? '–' : formatClock(s.medianMs)} hint="Sur les exercices réussis" />
            <Tile label="Plafond" value={s.ceiling === null ? '–' : bandLabel(s.ceiling)} hint="Tranche la plus difficile réussie à 60 % ou plus (3 tentatives au moins)" />
          </div>

          <EloCurve points={s.rating.history} />

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-400">Réussite par difficulté</h4>
              <ul className="flex flex-col gap-1">
                {s.bands.map((b) => (
                  <li key={b.band} className="flex items-center gap-2">
                    <span className="w-20 shrink-0 tabular-nums text-stone-300">{bandLabel(b.band)}</span>
                    <span className="h-3 flex-1 overflow-hidden rounded bg-stone-700" aria-hidden="true">
                      <span className={`block h-full ${b.ok / b.n >= 0.6 ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${(b.ok / b.n) * 100}%` }} />
                    </span>
                    <span className="w-24 shrink-0 text-right tabular-nums text-stone-300">
                      {Math.round((b.ok / b.n) * 100)} % ({b.ok}/{b.n})
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex flex-col gap-4">
              <div>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-400">Motifs à retravailler</h4>
                {s.motifs.length === 0 ? (
                  <p className="text-xs text-stone-400">Pas encore assez de tentatives par motif (ou la base n’a pas d’en-tête [Theme]).</p>
                ) : (
                  <ul className="flex flex-col gap-0.5">
                    {s.motifs.slice(0, 5).map((m) => (
                      <li key={m.id} className="flex justify-between gap-2">
                        <span>{m.label}</span>
                        <span className="tabular-nums text-stone-400">
                          {Math.round((m.ok / m.n) * 100)} % ({m.ok}/{m.n})
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-400">Types d’erreurs</h4>
                {s.errors.length === 0 ? (
                  <p className="text-xs text-stone-400">Aucune erreur détaillée.</p>
                ) : (
                  <ul className="flex flex-col gap-0.5">
                    {s.errors.map((e) => (
                      <li key={e.type} className="flex justify-between gap-2">
                        <span>{e.label}</span>
                        <span className="tabular-nums text-stone-400">{e.count}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>

          {s.missed.length > 0 && (
            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-400">Exercices les plus ratés</h4>
              <ul className="flex flex-col gap-0.5">
                {s.missed.map((m) => (
                  <li key={m.index} className="flex justify-between gap-2">
                    <span className="truncate">
                      {m.index + 1}. {items[m.index]?.t ?? `Exercice ${m.index + 1}`}
                    </span>
                    <span className="shrink-0 tabular-nums text-stone-400">raté {m.misses} fois</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}
