// Retour visuel : l'échiquier s'illumine brièvement en vert (bon coup, réussite)
// ou en rouge (erreur). Désactivé si le système demande moins d'animations (CSS).

import { useEffect, useState } from 'react';

export function useBoardFlash(phase: string, verdictKind: string | undefined): string {
  const [cls, setCls] = useState('');
  useEffect(() => {
    const k =
      phase === 'failed' ? 'board-flash-bad' : phase === 'solved' || (phase === 'opponentThinking' && verdictKind === 'good') ? 'board-flash-good' : '';
    if (!k) return;
    setCls(k);
    const t = window.setTimeout(() => setCls(''), 650);
    return () => window.clearTimeout(t);
  }, [phase, verdictKind]);
  return cls;
}
