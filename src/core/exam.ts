// Test de maîtrise d'un thème « Bases » : toutes les positions du thème
// d'affilée, sans indice ni retour en arrière ; seule la 1re tentative compte.
// Thème maîtrisé = toutes les positions réussies. Fonctions pures.

export interface ExamRecord {
  /** Meilleur score obtenu. */
  best: number;
  total: number;
  /** Date de la première réussite complète (null = pas encore maîtrisé). */
  passedAt: number | null;
  lastAt: number;
}

export const examScore = (results: (boolean | null)[]) => results.filter((r) => r === true).length;
export const examPassed = (results: (boolean | null)[]) => results.length > 0 && results.every((r) => r === true);

/** Met à jour le bilan d'un thème après un test terminé. */
export function recordExam(prev: ExamRecord | undefined, results: (boolean | null)[], now: number): ExamRecord {
  const score = examScore(results);
  const passed = examPassed(results);
  return {
    best: Math.max(prev?.best ?? 0, score),
    total: results.length,
    passedAt: prev?.passedAt ?? (passed ? now : null),
    lastAt: now,
  };
}

/** Texte de résultat à partager (club, entraîneur). */
export function examText(label: string, results: (boolean | null)[]): string {
  const marks = results.map((r, i) => `${i + 1}${r === true ? '✅' : '❌'}`).join(' ');
  return `Test « ${label} » : ${examScore(results)}/${results.length}${examPassed(results) ? ' — thème maîtrisé 🏅' : ''} — ${marks} (Chess Endgame Rush)`;
}
