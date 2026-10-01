// Saisie d'un coup au clavier (accessibilité, ou simple préférence) :
// notation algébrique anglaise (Nf3, e4, O-O) ou cases (e2e4).

import { useState } from 'react';
import { Icon } from '../Icon';
import { parseMoveText } from '../../core/chessRules';
import type { PromotionPiece } from '../../core/types';

interface Props {
  fen: string;
  enabled: boolean;
  onMove: (from: string, to: string, promotion?: PromotionPiece) => void;
}

export function MoveInput({ fen, enabled, onMove }: Props) {
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      className="hidden flex-wrap items-center gap-2 text-sm sm:flex"
      onSubmit={(e) => {
        e.preventDefault();
        if (!enabled) return;
        const m = parseMoveText(fen, text);
        if (!m) {
          setError(`« ${text} » : coup illégal ou non reconnu.`);
          return;
        }
        setError(null);
        setText('');
        onMove(m.from, m.to, m.uci.length > 4 ? (m.uci[4] as PromotionPiece) : undefined);
      }}
    >
      <label htmlFor="move-input" className="text-stone-400">
        <Icon name="keyboard" className="h-4 w-4" /> Coup :
      </label>
      <input
        id="move-input"
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={!enabled}
        placeholder="ex. Rd2, e4, e2e4"
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
        className="w-36 rounded-lg bg-stone-800 px-2 py-1 font-mono text-stone-100 placeholder:text-stone-500 disabled:opacity-50"
        aria-describedby="move-input-help"
      />
      <span id="move-input-help" className="text-xs text-stone-400">
        Notation anglaise : K roi, Q dame, R tour, B fou, N cavalier.
      </span>
      {error && (
        <span className="w-full text-xs text-red-300" role="alert">
          {error}
        </span>
      )}
    </form>
  );
}
