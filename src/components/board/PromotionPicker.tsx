import { useEffect, useRef } from 'react';
import type { Color, PromotionPiece } from '../../core/types';
import { PIECE_IMG } from './pieceImages';

// Ordre des choix façon Lichess : dame sur la case d'arrivée, puis cavalier,
// tour, fou en s'éloignant du bord.
const CHOICES: { piece: PromotionPiece; label: string }[] = [
  { piece: 'q', label: 'Dame' },
  { piece: 'n', label: 'Cavalier' },
  { piece: 'r', label: 'Tour' },
  { piece: 'b', label: 'Fou' },
];

/**
 * Colonne de choix posée directement sur l'échiquier, au-dessus de la case de
 * promotion (comme Lichess), au lieu d'une boîte centrée : le geste reste dans
 * la même zone, un seul appui suffit, et un appui ailleurs annule.
 * `dest` : case d'arrivée du pion ; `orientation` : sens d'affichage du plateau.
 */
export function PromotionPicker({
  color,
  dest,
  orientation,
  onPick,
  onCancel,
}: {
  color: Color;
  dest: string;
  orientation: Color;
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

  // Position de la colonne : 8 colonnes / 8 rangées de 12,5 % chacune.
  const file = dest.charCodeAt(0) - 97; // 0 = colonne a
  const rank = Number(dest[1]); // 1..8
  const col = orientation === 'w' ? file : 7 - file;
  const row = orientation === 'w' ? 8 - rank : rank - 1; // 0 = haut de l'écran
  const fromTop = row <= 3; // la colonne s'étend vers l'intérieur du plateau

  return (
    <div
      className="absolute inset-0 z-20 rounded-md bg-black/55"
      style={{ touchAction: 'manipulation' }}
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) cancel();
      }}
    >
      <div
        role="dialog"
        aria-label="Choisir la pièce de promotion"
        className="absolute flex flex-col overflow-hidden rounded-md shadow-xl"
        style={{
          width: '12.5%',
          left: `${col * 12.5}%`,
          ...(fromTop ? { top: `${row * 12.5}%` } : { bottom: `${(7 - row) * 12.5}%`, flexDirection: 'column-reverse' }),
        }}
      >
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
            className="flex aspect-square w-full items-center justify-center bg-stone-200/95 p-[6%] hover:bg-amber-300 focus-visible:bg-amber-300"
          >
            <img src={PIECE_IMG[`${color}${piece}`]} alt="" draggable={false} className="h-full w-full" />
          </button>
        ))}
      </div>
    </div>
  );
}
