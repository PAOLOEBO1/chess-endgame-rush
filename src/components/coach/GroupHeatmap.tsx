// Entraîneur : carte du groupe, réussite de chaque élève par motif (ou par tranche de
// difficulté si la base n'a pas de thèmes). Chaque case affiche le pourcentage et le
// nombre de tentatives : la couleur n'est qu'un repère.

import type { MemberProgress } from '../../core/coachProgress';
import type { CoachItem } from '../../core/coachSet';
import { groupHeatmap } from '../../core/coachStats';

const tone = (r: number) => (r < 0.4 ? 'bg-red-500/30' : r < 0.7 ? 'bg-amber-500/30' : 'bg-emerald-500/30');

export function GroupHeatmap({ members, items, version, onStudent }: { members: MemberProgress[]; items: CoachItem[]; version: string; onStudent: (id: string) => void }) {
  const h = groupHeatmap(members, items, version);
  if (!h.columns.length) return <p className="text-stone-400">Pas encore de tentative détaillée sur la base actuelle.</p>;
  // Moyenne du groupe par colonne.
  const totals = h.columns.map((_, j) => {
    let n = 0;
    let ok = 0;
    for (const r of h.rows) {
      n += r.cells[j]?.n ?? 0;
      ok += r.cells[j]?.ok ?? 0;
    }
    return n ? { n, ok } : null;
  });
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-stone-400">
        {h.kind === 'motifs'
          ? 'Réussite par motif (en-têtes [Theme] de ta base). Rouge : moins de 40 %, ambre : moins de 70 %, vert : 70 % ou plus.'
          : 'Ta base n’a pas de thèmes : réussite par tranche de difficulté (Elo). Ajoute des en-têtes [Theme] à tes PGN pour voir les motifs.'}
      </p>
      <div className="overflow-x-auto">
        <table className="text-left text-sm">
          <thead className="text-xs text-stone-400">
            <tr>
              <th className="py-1 pr-3 font-semibold uppercase">Élève</th>
              {h.columns.map((c) => (
                <th key={c.id} className="max-w-[7rem] px-1 py-1 text-center font-semibold" scope="col">
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {h.rows.map((r) => (
              <tr key={r.id} className="border-t border-stone-700">
                <th scope="row" className="py-1 pr-3 font-semibold">
                  <button type="button" onClick={() => onStudent(r.id)} className="text-sky-400 hover:underline">
                    {r.pseudo}
                  </button>
                </th>
                {r.cells.map((c, j) => (
                  <td key={j} className="px-1 py-1 text-center">
                    {c ? (
                      <span className={`block rounded px-1.5 py-1 tabular-nums ${tone(c.ok / c.n)}`} title={`${c.ok} réussis sur ${c.n}`}>
                        {Math.round((c.ok / c.n) * 100)} %<span className="block text-[10px] text-stone-300">{c.n} ess.</span>
                      </span>
                    ) : (
                      <span className="text-stone-400">–</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
            <tr className="border-t-2 border-stone-600">
              <th scope="row" className="py-1 pr-3 font-semibold text-stone-300">Groupe</th>
              {totals.map((t, j) => (
                <td key={j} className="px-1 py-1 text-center font-semibold tabular-nums">
                  {t ? `${Math.round((t.ok / t.n) * 100)} %` : '–'}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
