// Accueil : barre de navigation basse (téléphone).

import { Icon } from '../Icon';
import type { HomeProps as Props } from '../../screens/HomeScreen';

/** Navigation basse (téléphone) : accueil, progression, classement, guide. */
export function BottomNav({ p }: { p: Props }) {
  const item = 'flex flex-1 flex-col items-center gap-0.5 py-2 text-xs font-semibold text-stone-300 hover:text-stone-50';
  return (
    <nav
      aria-label="Navigation principale"
      className="fixed inset-x-0 bottom-0 z-20 flex border-t border-stone-800 bg-stone-900/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden"
    >
      <button type="button" className={`${item} text-amber-300`} aria-current="page" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
        <Icon name="home" className="h-5 w-5" /> Accueil
      </button>
      <button type="button" className={item} onClick={() => p.onProgress(true)}>
        <Icon name="chart" className="h-5 w-5" /> Progrès
      </button>
      {p.onLeaderboard && (
        <button type="button" className={item} onClick={p.onLeaderboard}>
          <Icon name="trophy" className="h-5 w-5" /> Classement
        </button>
      )}
      <button type="button" className={item} onClick={p.onHelp}>
        <Icon name="help" className="h-5 w-5" /> Guide
      </button>
    </nav>
  );
}
