// Réglages de l'appli, enregistrés dans le navigateur.

const KEY = 'endgameRush:v1:settings';

interface Settings {
  /** Répétition espacée des erreurs (sinon : liste libre des erreurs à retravailler). */
  spacedRepetition: boolean;
  /** Derniers choix de l'accueil (mode, thème, sous-thème, niveau de départ ; null = automatique). */
  lastMode: string | null;
  lastTheme: string | null;
  lastSub: string | null;
  lastStart: number | null;
  /** Couleurs de l'échiquier. */
  boardTheme: BoardTheme;
}

export type BoardTheme = 'brown' | 'blue' | 'green' | 'contrast';
export const BOARD_THEMES: { id: BoardTheme; label: string; light: string; dark: string }[] = [
  { id: 'brown', label: 'Bois', light: '#f0d9b5', dark: '#b58863' },
  { id: 'blue', label: 'Bleu', light: '#dee3e6', dark: '#8ca2ad' },
  { id: 'green', label: 'Vert', light: '#ffffdd', dark: '#86a666' },
  { id: 'contrast', label: 'Contraste', light: '#f5f5f5', dark: '#4a6f8f' },
];

/** Applique le thème d'échiquier à la page. */
export function applyBoardTheme(theme: BoardTheme): void {
  if (theme === 'brown') document.documentElement.removeAttribute('data-board');
  else document.documentElement.setAttribute('data-board', theme);
}

const DEFAULTS: Settings = { spacedRepetition: true, lastMode: null, lastTheme: null, lastSub: null, lastStart: null, boardTheme: 'brown' };

export function getSettings(): Settings {
  try {
    return { ...DEFAULTS, ...(JSON.parse(window.localStorage.getItem(KEY) ?? '{}') as Partial<Settings>) };
  } catch {
    return DEFAULTS;
  }
}

export function setSetting<K extends keyof Settings>(key: K, value: Settings[K]): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify({ ...getSettings(), [key]: value }));
  } catch {
    /* sans stockage : réglage non conservé */
  }
}
