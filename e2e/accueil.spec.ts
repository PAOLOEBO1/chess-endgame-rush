import { expect, test } from '@playwright/test';
import { erreursDePage, horsLigne, ouvrirAccueil } from './outils';

test.beforeEach(async ({ context }) => horsLigne(context));

test('accueil : bienvenue, finales chargées, sans erreur', async ({ page }) => {
  const erreurs = erreursDePage(page);
  await ouvrirAccueil(page);
  await expect(page.getByText('Puzzle du jour')).toBeVisible();
  await expect(page.getByTestId('play')).toBeEnabled();
  // La bienvenue ne revient pas à la visite suivante.
  await page.reload();
  await expect(page.getByText(/\d+ finales disponibles/).filter({ visible: true }).first()).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Bienvenue sur Gambix' })).toHaveCount(0);
  expect(erreurs).toEqual([]);
});

test('aucun défilement horizontal', async ({ page }) => {
  await ouvrirAccueil(page);
  const largeur = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(largeur).toBeLessThanOrEqual(page.viewportSize()!.width);
});

test('téléphone : zone « Jouer » basse et menu des courses', async ({ page }, info) => {
  test.skip(info.project.name !== 'telephone', 'téléphone seulement');
  await ouvrirAccueil(page);
  // Audit du 13/10 : la zone collée en bas faisait 277 px ; elle doit rester basse.
  const hauteur = await page.getByTestId('play-bar').evaluate((e) => e.getBoundingClientRect().height);
  expect(hauteur).toBeLessThan(120);
  // Les thèmes restent visibles sans défiler.
  await expect(page.getByRole('button', { name: /Entraîneur/ }).first()).toBeInViewport();

  await page.getByRole('button', { name: /^Course/ }).click();
  await expect(page.getByRole('menuitem', { name: /Course entre amis/ })).toBeVisible();
  await expect(page.getByRole('menuitem', { name: /Course publique/ })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('menuitem')).toHaveCount(0);
});

test('ordinateur : boutons des courses affichés directement', async ({ page }, info) => {
  test.skip(info.project.name !== 'ordinateur', 'ordinateur seulement');
  await ouvrirAccueil(page);
  await expect(page.getByRole('button', { name: 'Course entre amis' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Course publique' })).toBeVisible();
});
