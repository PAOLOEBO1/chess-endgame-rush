// Diagramme statique (SVG) d'une position : fiches imprimables, aperçus.
// Le camp au trait est en bas.

import { fenToPieces, sideToMove } from '../../core/fen';
import { PIECE_IMG } from './pieceImages';

const FILES = 'abcdefgh';

interface Props {
  fen: string;
  size?: number;
  /** Couleurs des cases (par défaut : gris sobre, adapté à l'impression). */
  light?: string;
  dark?: string;
}

export function Diagram({ fen, size = 200, light = '#f2f2f2', dark = '#b8b8b8' }: Props) {
  const white = sideToMove(fen) === 'w';
  const s = size / 8;
  const pos = (sq: string) => {
    const f = FILES.indexOf(sq[0]);
    const r = Number(sq[1]) - 1;
    return white ? { x: f * s, y: (7 - r) * s } : { x: (7 - f) * s, y: r * s };
  };
  let pieces: ReturnType<typeof fenToPieces> = [];
  try {
    pieces = fenToPieces(fen);
  } catch {
    /* position illisible : échiquier vide */
  }
  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} role="img" aria-label={`Diagramme : ${fen}`} className="block">
      {Array.from({ length: 64 }, (_, i) => {
        const x = i % 8;
        const y = Math.floor(i / 8);
        return <rect key={i} x={x * s} y={y * s} width={s} height={s} fill={(x + y) % 2 === 0 ? light : dark} />;
      })}
      <rect x={0.5} y={0.5} width={size - 1} height={size - 1} fill="none" stroke="#333" />
      {pieces.map((p) => {
        const { x, y } = pos(p.square);
        return <image key={p.square} href={PIECE_IMG[p.color + p.type]} x={x} y={y} width={s} height={s} />;
      })}
    </svg>
  );
}
