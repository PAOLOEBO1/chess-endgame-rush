// Piste de la course, inspirée de Lichess Puzzle Racer : une voie par joueur, chacun avance
// avec son score ; score en chiffres à droite. Barre de combo avec ses paliers de bonus.

import { RACE_COMBO_STEPS, comboProgress, type RacePlayer } from '../../core/race';

/** Pièces des coureurs ; ︎ force l'affichage texte (pas d'émoji sur téléphone). */
const PIECES = ['♞', '♝', '♜', '♛', '♚', '♟', '♘', '♗', '♖', '♕'].map((p) => `${p}︎`);
const COLORS = ['text-amber-300', 'text-sky-300', 'text-emerald-300', 'text-rose-300', 'text-violet-300', 'text-orange-300', 'text-lime-300', 'text-cyan-300', 'text-pink-300', 'text-teal-300'];

interface TrackProps {
  players: RacePlayer[];
  meId: string;
  /** Mon score local (plus réactif que celui renvoyé par le salon). */
  myScore: number;
}

export function RaceTrack({ players, meId, myScore }: TrackProps) {
  // Voies stables : moi d'abord, puis par ordre d'arrivée (comme Lichess, on ne réordonne pas pendant la course).
  const lanes = [...players].sort(
    (a, b) => Number(b.id === meId) - Number(a.id === meId) || a.joinedAt - b.joinedAt || a.id.localeCompare(b.id),
  );
  const scoreOf = (p: RacePlayer) => (p.id === meId ? myScore : p.score);
  const best = Math.max(0, ...lanes.map(scoreOf));
  // Échelle : le meneur n'atteint jamais tout à fait le bout de la piste.
  const goal = Math.max(30, Math.ceil(best * 1.2));

  return (
    <div className="rounded-xl border border-stone-700 bg-stone-900 p-1.5 shadow-inner" data-testid="race-track" aria-label="Avancement des joueurs">
      {lanes.map((p, i) => {
        const score = scoreOf(p);
        const pct = Math.min(100, (score / goal) * 100);
        const mine = p.id === meId;
        return (
          <div key={p.id} className={`flex h-8 items-center border-b border-dashed border-stone-700 last:border-b-0 ${mine ? 'bg-amber-500/10' : ''}`}>
            <div className="relative h-full flex-1 overflow-hidden">
              <div
                className="absolute top-1/2 flex items-center gap-1 whitespace-nowrap transition-[left,transform] duration-700 ease-out"
                style={{ left: `${pct}%`, transform: `translate(-${pct}%, -50%)` }}
              >
                <span className={`text-2xl leading-none ${COLORS[i % COLORS.length]}`} aria-hidden="true">{PIECES[i % PIECES.length]}</span>
                <span className={`max-w-[9rem] truncate text-xs ${mine ? 'font-bold text-amber-200' : 'text-stone-300'} ${p.done ? 'opacity-60' : ''}`}>
                  {p.name}
                </span>
              </div>
            </div>
            <span className={`w-10 shrink-0 text-right font-mono text-lg font-black tabular-nums ${mine ? 'text-amber-400' : 'text-stone-100'}`}>{score}</span>
          </div>
        );
      })}
    </div>
  );
}

/** Barre de combo : nombre de bons coups d'affilée et paliers +1 / +2 / +3 / +4. */
export function ComboBar({ combo }: { combo: number }) {
  const { reached, fill } = comboProgress(combo);
  return (
    <div className="flex items-center gap-3 rounded-xl bg-stone-800 px-3 py-2" data-testid="race-combo">
      <div className="text-center">
        <div className="font-mono text-3xl font-black leading-none text-stone-50 tabular-nums">{combo}</div>
        <div className="text-[10px] uppercase tracking-wide text-stone-400">Combo</div>
      </div>
      <div className="flex-1">
        <div className="h-3 overflow-hidden rounded-full bg-stone-700" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(fill * 100)} aria-label="Remplissage de la barre de combo">
          <div className="h-full rounded-full bg-amber-500 transition-[width] duration-300" style={{ width: `${fill * 100}%` }} />
        </div>
        <div className="mt-1 grid grid-cols-4 text-center text-[11px] font-semibold">
          {RACE_COMBO_STEPS.map((at, i) => (
            <span key={at} className={i < reached ? 'text-amber-300' : 'text-stone-500'} title={`Bonus à ${at} bons coups d'affilée`}>
              +{i + 1}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
