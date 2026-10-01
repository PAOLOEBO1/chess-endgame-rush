// Lien profil local ↔ compte en ligne : décision pure (testable sans navigateur).

/**
 * Première connexion d'un appareil à un compte : quel profil local relier ?
 *  - compte vide → le profil en cours (son historique part sur le compte), sinon un nouveau ;
 *  - compte déjà utilisé et profil en cours vide → ce profil, qui prend le nom du compte ;
 *  - compte déjà utilisé et profil en cours avec des parties → demander (fusion ou profil à part) ;
 *  - aucun profil en cours (invité) → un nouveau profil au nom du compte.
 */
export function linkPlan(current: string | null, localEntries: number, onlineEntries: number): 'ask' | 'current' | 'new' {
  if (!current) return 'new';
  if (onlineEntries > 0 && localEntries > 0) return 'ask';
  return 'current';
}
