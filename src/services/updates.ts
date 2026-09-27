// Nouvelle version du site : le service worker (public/sw.js) prend la main
// dès qu'une mise à jour est installée ; la page ouverte garde l'ancien code
// tant qu'elle n'est pas rechargée. On le signale au joueur.

type Listener = () => void;
let available = false;
const listeners = new Set<Listener>();

export const updateAvailable = () => available;

export function onUpdate(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function announce() {
  if (available) return;
  available = true;
  for (const l of listeners) l();
}

/** Enregistre le service worker et surveille les mises à jour (site en ligne uniquement). */
export function registerServiceWorker(): void {
  if (!('serviceWorker' in navigator)) return;
  // Une page déjà contrôlée qui change de contrôleur = une nouvelle version vient d'être installée.
  const hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (hadController) announce();
  });
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('./sw.js')
      .then((reg) => {
        const check = () => reg.update().catch(() => undefined);
        // Vérification au retour sur l'appli et toutes les 30 min.
        document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && check());
        window.setInterval(check, 30 * 60_000);
      })
      .catch(() => undefined);
  });
}
