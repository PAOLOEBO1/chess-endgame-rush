// Bandeau « nouvelle version » (voir services/updates.ts).

import { useEffect, useState } from 'react';
import { onUpdate, updateAvailable } from '../services/updates';

export function UpdateBanner() {
  const [show, setShow] = useState(updateAvailable);
  useEffect(() => onUpdate(() => setShow(true)), []);
  if (!show) return null;
  return (
    <div role="status" className="sticky top-0 z-50 flex flex-wrap items-center justify-center gap-3 bg-sky-600 px-4 py-2 text-sm font-semibold text-white">
      Nouvelle version de l’appli disponible.
      <button type="button" onClick={() => window.location.reload()} className="rounded-md bg-white px-3 py-1 text-sky-700 hover:bg-sky-50">
        Recharger
      </button>
      <button type="button" onClick={() => setShow(false)} className="text-white/80 hover:text-white" aria-label="Plus tard">
        Plus tard
      </button>
    </div>
  );
}
