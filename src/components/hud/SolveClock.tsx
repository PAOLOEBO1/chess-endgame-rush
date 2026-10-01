import { formatClock } from '../../hooks/useSolveClock';
import { Icon } from '../Icon';

/** Chrono de l'exercice en cours (temps de réflexion du joueur). */
export function SolveClock({ ms, running }: { ms: number; running: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 tabular-nums ${running ? 'text-stone-200' : 'text-stone-400'}`}
      title="Temps de réflexion sur cet exercice"
      role="timer"
      aria-label={`Temps sur cet exercice : ${formatClock(ms)}`}
    >
      <Icon name="timer" className="h-4 w-4" /> {formatClock(ms)}
    </span>
  );
}
