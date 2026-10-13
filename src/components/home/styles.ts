// Styles et petits calculs partagés par les blocs de l'accueil.

export const subChip = (active: boolean) =>
  `rounded-lg px-2.5 py-1 text-sm transition disabled:opacity-30 ${active ? 'bg-amber-500 text-stone-900' : 'bg-stone-800/70 text-stone-200 hover:bg-stone-700'}`;

export const chip = (active: boolean) =>
  `rounded-full px-3 py-1.5 text-sm font-semibold transition ${active ? 'bg-amber-500 text-stone-900' : 'bg-stone-800 text-stone-200 hover:bg-stone-700'}`;

/** Départ légèrement sous l'Elo personnel (échauffement), arrondi à 50. */
export const myStart = (elo: number) => Math.max(400, Math.round((elo - 100) / 50) * 50);
