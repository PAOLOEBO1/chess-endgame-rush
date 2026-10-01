// Chrono d'un exercice : temps de réflexion du joueur (pendant que c'est à lui de jouer),
// affiché en direct et enregistré avec la tentative.

import { useCallback, useEffect, useRef, useState } from 'react';

export function useSolveClock(running: boolean) {
  const acc = useRef(0);
  const since = useRef<number | null>(null);
  const [, setTick] = useState(0);

  useEffect(() => {
    if (running) {
      since.current = performance.now();
      const id = setInterval(() => setTick((t) => t + 1), 250);
      return () => {
        clearInterval(id);
        if (since.current !== null) acc.current += performance.now() - since.current;
        since.current = null;
      };
    }
    return undefined;
  }, [running]);

  /** Temps écoulé (ms), arrondi. */
  const read = useCallback(() => Math.round(acc.current + (since.current === null ? 0 : performance.now() - since.current)), []);
  /** Remet à zéro (nouvelle tentative). */
  const restart = useCallback(() => {
    acc.current = 0;
    if (since.current !== null) since.current = performance.now();
    setTick((t) => t + 1);
  }, []);
  return { read, restart };
}

/** « 0:07 », « 1:23 », « 12:05 ». */
export function formatClock(ms: number): string {
  const s = Math.floor(Math.max(0, ms) / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
