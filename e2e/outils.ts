// Outils communs aux tests d'interface.
import { expect, type BrowserContext, type Page } from '@playwright/test';

/**
 * Coupe les services extérieurs (comptes Supabase, table de finales Lichess, mesure d'audience) :
 * les tests ne dépendent pas d'Internet et ne touchent jamais aux vraies données.
 * Sans table de finales, l'appli juge avec Stockfish (repli prévu).
 */
export async function horsLigne(context: BrowserContext) {
  await context.route(/supabase\.co|tablebase\.lichess|cloudflareinsights/, (route) => route.abort());
}

/** Ouvre l'accueil et ferme la fenêtre de bienvenue (affichée à la première visite). */
export async function ouvrirAccueil(page: Page) {
  await page.goto('./');
  await expect(page.getByRole('heading', { name: 'Bienvenue sur Gambix' })).toBeVisible();
  await page.getByRole('button', { name: 'Passer' }).click();
  await expect(page.getByText(/\d+ finales disponibles/).filter({ visible: true }).first()).toBeVisible();
}

/** Erreurs JavaScript de la page, à vérifier en fin de test. */
export function erreursDePage(page: Page): string[] {
  const erreurs: string[] = [];
  page.on('pageerror', (e) => erreurs.push(e.message));
  return erreurs;
}
