// Zone « Jouer » de l'accueil. Sur téléphone, elle reste collée en bas de l'écran : on la garde basse
// (une seule ligne : « Jouer » + un bouton « Course » qui ouvre les deux courses), pour laisser
// l'écran aux réglages. Sur ordinateur, tout est affiché en ligne, sans rien de collé.

import { useEffect, useState } from 'react';
import { Icon } from './Icon';

interface Props {
  compact?: boolean;
  poolSize: number | null;
  loadError?: string | null;
  best?: { score: number; date: string } | null;
  onStart: () => void;
  onRace?: () => void;
  onPublicRace?: () => void;
}

export function PlayBar({ compact, poolSize, loadError, best, onStart, onRace, onPublicRace }: Props) {
  const [raceMenu, setRaceMenu] = useState(false);
  const hasRace = Boolean(onRace || onPublicRace);

  // Échap ferme le menu des courses.
  useEffect(() => {
    if (!raceMenu) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setRaceMenu(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [raceMenu]);

  const info = loadError ?? (poolSize === null ? 'Chargement des finales…' : `${poolSize} finales disponibles`);

  return (
    <div
      data-testid="play-bar"
      // Collée juste au-dessus de la barre de navigation basse (légèrement glissée dessous, pour ne laisser aucun jour).
      style={{ bottom: compact ? 0 : 'calc(3.25rem + env(safe-area-inset-bottom, 0px))' }}
      className={`sticky z-10 -mx-4 border-t border-stone-800 bg-stone-900 px-4 py-2 sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0`}
    >
      {/* Téléphone : menu des courses, ouvert au-dessus de la barre. */}
      {raceMenu && (
        <div className="mb-2 flex flex-col gap-2 sm:hidden" role="menu" aria-label="Courses">
          {onRace && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setRaceMenu(false);
                onRace();
              }}
              className="rounded-xl border border-sky-500/60 bg-stone-900 px-4 py-3 text-left font-bold text-sky-300"
            >
              <Icon name="flag" className="h-5 w-5" /> Course entre amis
              <span className="block text-xs font-normal text-stone-400">Un lien à envoyer, jusqu’à 10 joueurs</span>
            </button>
          )}
          {onPublicRace && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setRaceMenu(false);
                onPublicRace();
              }}
              className="rounded-xl border border-emerald-500/60 bg-stone-900 px-4 py-3 text-left font-bold text-emerald-300"
            >
              <Icon name="flag" className="h-5 w-5" /> Course publique
              <span className="block text-xs font-normal text-stone-400">Départ toutes les 30 secondes, pseudo tiré au hasard</span>
            </button>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 sm:gap-4">
        <button
          type="button"
          data-testid="play"
          disabled={!poolSize}
          onClick={onStart}
          className="flex-1 rounded-xl bg-amber-500 px-6 py-3 text-lg font-black text-stone-900 hover:bg-amber-400 disabled:opacity-40 sm:flex-none sm:px-8 sm:py-4 sm:text-xl"
        >
          <Icon name="play" className="h-5 w-5" /> Jouer
        </button>

        {hasRace && (
          <button
            type="button"
            aria-expanded={raceMenu}
            aria-haspopup="menu"
            onClick={() => setRaceMenu((v) => !v)}
            className="rounded-xl border border-sky-500/60 px-4 py-3 text-lg font-bold text-sky-300 sm:hidden"
          >
            <Icon name="flag" className="h-5 w-5" /> Course {raceMenu ? '▾' : '▴'}
          </button>
        )}

        {onRace && (
          <button
            type="button"
            onClick={onRace}
            className="hidden rounded-xl border border-sky-500/60 px-5 py-4 text-lg font-bold text-sky-300 hover:bg-sky-500/10 sm:inline-block"
            title="Crée une course : tes amis la rejoignent par un lien et jouent les mêmes finales"
          >
            <Icon name="flag" className="h-5 w-5" /> Course entre amis
          </button>
        )}
        {onPublicRace && (
          <button
            type="button"
            onClick={onPublicRace}
            className="hidden rounded-xl border border-emerald-500/60 px-5 py-4 text-lg font-bold text-emerald-300 hover:bg-emerald-500/10 sm:inline-block"
            title="Course ouverte à tous : départ toutes les 30 secondes avec les joueurs présents"
          >
            <Icon name="flag" className="h-5 w-5" /> Course publique
          </button>
        )}

        <span className="hidden text-sm text-stone-400 sm:inline">
          {info}
          {best && ` · Record : ${best.score} (${best.date})`}
        </span>
      </div>
      {/* Téléphone : l'info tient sur une petite ligne. */}
      <p className="mt-1 truncate text-xs text-stone-500 sm:hidden">
        {info}
        {best && ` · Record : ${best.score}`}
      </p>
    </div>
  );
}
