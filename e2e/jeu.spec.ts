import { expect, test } from '@playwright/test';
import { erreursDePage, horsLigne, ouvrirAccueil } from './outils';

test.beforeEach(async ({ context }) => horsLigne(context));

test('Storm : la partie démarre (échiquier, chrono 3:00) puis Abandonner ramène à l’accueil', async ({ page }) => {
  const erreurs = erreursDePage(page);
  await ouvrirAccueil(page);
  await page.getByTestId('play').click();
  await expect(page.getByText('Le chrono démarre à ton premier coup')).toBeVisible();
  await expect(page.getByText('3:00')).toBeVisible();
  await expect(page.locator('cg-board')).toHaveCount(1);
  await page.getByText('Abandonner').click();
  await expect(page.getByTestId('play')).toBeVisible();
  expect(erreurs).toEqual([]);
});

test('course publique : pseudo tiré au hasard, non modifiable', async ({ page }) => {
  await ouvrirAccueil(page);
  if (test.info().project.name === 'telephone') {
    await page.getByRole('button', { name: /^Course/ }).click();
    await page.getByRole('menuitem', { name: /Course publique/ }).click();
  } else {
    await page.getByRole('button', { name: 'Course publique' }).click();
  }
  await expect(page.getByRole('heading', { name: /Course publique/ })).toBeVisible();
  const pseudo = page.getByLabel('Ton pseudo dans la course');
  await expect(pseudo).toHaveAttribute('readonly', '');
  await expect(pseudo).toHaveValue(/^\p{L}+\d{2}$/u);
  const avant = await pseudo.inputValue();
  // « 🎲 Autre » tire un autre pseudo (peut retomber sur le même, rarement : on essaie plusieurs fois).
  let autre = avant;
  for (let i = 0; i < 5 && autre === avant; i++) {
    await page.getByRole('button', { name: /Autre/ }).click();
    autre = await pseudo.inputValue();
  }
  expect(autre).not.toBe(avant);
});

test('course entre amis : pseudo libre', async ({ page }) => {
  await ouvrirAccueil(page);
  if (test.info().project.name === 'telephone') {
    await page.getByRole('button', { name: /^Course/ }).click();
    await page.getByRole('menuitem', { name: /Course entre amis/ }).click();
  } else {
    await page.getByRole('button', { name: 'Course entre amis' }).click();
  }
  const pseudo = page.getByLabel('Ton pseudo dans la course');
  await expect(pseudo).toBeVisible();
  await expect(pseudo).not.toHaveAttribute('readonly', '');
});

test('guide : la course publique et l’anti-triche sont expliqués', async ({ page }) => {
  await ouvrirAccueil(page);
  // Téléphone : « Guide » dans la barre du bas ; ordinateur : bouton en haut de l'accueil.
  if (test.info().project.name === 'telephone') await page.getByRole('button', { name: 'Guide', exact: true }).click();
  else await page.getByRole('button', { name: 'Guide de l’application' }).first().click();
  await expect(page.getByText(/Joueur anonyme/)).toBeVisible();
  await expect(page.getByText(/Anti-triche/)).toBeVisible();
});
