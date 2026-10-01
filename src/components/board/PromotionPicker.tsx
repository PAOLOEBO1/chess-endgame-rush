import { useEffect, useRef } from 'react';
import type { Color, PromotionPiece } from '../../core/types';
import { PIECE_FONT, PIECE_GLYPH } from './pieces';

const CHOICES: { piece: PromotionPiece; label: string }[] = [
  { piece: 'q', label: 'Dame' },
  { piece: 'r', label: 'Tour' },
  { piece: 'b', label: 'Fou' },
  { piece: 'n', label: 'Cavalier' },
];

export function PromotionPicker({
  color,
  onPick,
  onCancel,
}: {
  color: Color;
  onPick: (piece: PromotionPiece) => void;
  onCancel: () => void;
}) {
  // Choix pris dès le premier appui (pointerdown) : pas de « clic fantôme »
  // ni d'appui à répéter sur téléphone ; le clavier passe par onClick.
  // Le fond n'annule qu'après un court délai : le clic qui suit le dépôt de
  // la pièce ne doit pas refermer le menu aussitôt ouvert.
  const openedAt = useRef(0);
  const done = useRef(false);
  useEffect(() => {
    openedAt.current = performance.now();
  }, []);
  const pick = (piece: PromotionPiece) => {
    if (done.current) return;
    done.current = true;
    onPick(piece);
  };
  const cancel = () => {
    if (done.current || performance.now() - openedAt.current < 400) return;
    done.current = true;
    onCancel();
  };
  return (
    <div
      className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 rounded-md"
      style={{ touchAction: 'manipulation' }}
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) cancel();
      }}
    >
      <div className="flex gap-2 rounded-xl bg-stone-800 p-3 shadow-xl" role="dialog" aria-label="Choisir la pièce de promotion">
        {CHOICES.map(({ piece, label }) => (
          <button
            key={piece}
            type="button"
            title={label}
            aria-label={`Promouvoir en ${label}`}
            autoFocus={piece === 'q'}
            onPointerDown={(e) => {
              e.preventDefault();
              pick(piece);
            }}
            onClick={(e) => {
              if (e.detail === 0) pick(piece); // Entrée / Espace au clavier
            }}
            className="h-16 w-16 rounded-lg bg-stone-200 text-5xl leading-none hover:bg-amber-200"
            style={{
              fontFamily: PIECE_FONT,
              color: color === 'w' ? '#fff' : '#1c1917',
              WebkitTextStroke: color === 'w' ? '1.5px #1c1917' : undefined,
            }}
          >
            {PIECE_GLYPH[piece]}
          </button>
        ))}
      </div>
    </div>
  );
}
