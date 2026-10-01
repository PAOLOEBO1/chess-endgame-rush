// Réglages de l'en-tête : son, apparence (sombre / clair), grand affichage,
// couleurs de l'échiquier, répétition espacée. Regroupés pour alléger l'accueil.

import { useEffect, useRef, useState } from 'react';
import { isSoundOn, setSoundOn } from '../services/sound';
import {
  APPEARANCES,
  applyAppearance,
  applyBoardTheme,
  BOARD_THEMES,
  getSettings,
  setSetting,
  type Appearance,
  type BoardTheme,
} from '../services/settings';
import { Icon } from './Icon';

interface Props {
  /** Répétition espacée des erreurs (absent : réglage non proposé ici). */
  spaced?: boolean;
  onSpaced?: (on: boolean) => void;
}

export function SettingsMenu({ spaced, onSpaced }: Props) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const [sound, setSound] = useState(isSoundOn);
  const [board, setBoard] = useState<BoardTheme>(() => getSettings().boardTheme);
  const [appearance, setAppearance] = useState<Appearance>(() => getSettings().appearance);
  const [large, setLarge] = useState(() => getSettings().largeDisplay);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close);
    };
  }, [open]);

  const pickAppearance = (a: Appearance) => {
    setAppearance(a);
    setSetting('appearance', a);
    applyAppearance(a, large);
  };
  const toggleLarge = (on: boolean) => {
    setLarge(on);
    setSetting('largeDisplay', on);
    applyAppearance(appearance, on);
  };
  const pickBoard = (t: BoardTheme) => {
    setBoard(t);
    setSetting('boardTheme', t);
    applyBoardTheme(t);
  };
  const seg = (on: boolean) =>
    `rounded-lg px-2.5 py-1.5 text-sm font-semibold ${on ? 'bg-amber-500 text-stone-900' : 'bg-stone-700 text-stone-100 hover:bg-stone-600'}`;

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="reglages"
        className="rounded-lg bg-stone-800 px-3 py-2 text-sm font-semibold text-stone-100 hover:bg-stone-700"
        title="Réglages : son, apparence, échiquier"
        aria-label="Réglages"
      >
        <Icon name="settings" className="h-5 w-5" />
      </button>
      {open && (
        <div
          id="reglages"
          role="dialog"
          aria-label="Réglages"
          className="absolute right-0 z-40 mt-2 flex w-[min(20rem,calc(100vw-2rem))] flex-col gap-4 rounded-xl border border-stone-700 bg-stone-800 p-4 text-sm text-stone-100 shadow-xl"
        >
          <label className="flex items-center justify-between gap-3">
            <span>
              <Icon name={sound ? 'volume' : 'mute'} className="mr-1 h-4 w-4" /> Son
            </span>
            <input
              type="checkbox"
              className="h-5 w-5 accent-amber-500"
              checked={sound}
              onChange={(e) => {
                setSoundOn(e.target.checked);
                setSound(e.target.checked);
              }}
            />
          </label>

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-400">Apparence</legend>
            <div className="flex flex-wrap gap-2">
              {APPEARANCES.map((a) => (
                <button key={a.id} type="button" aria-pressed={appearance === a.id} className={seg(appearance === a.id)} onClick={() => pickAppearance(a.id)}>
                  {a.label}
                </button>
              ))}
            </div>
          </fieldset>

          <label className="flex items-start justify-between gap-3">
            <span>
              <Icon name="projector" className="mr-1 h-4 w-4" /> Grand affichage
              <span className="block text-xs text-stone-400">Textes et échiquier plus grands : projection au club, lecture de loin.</span>
            </span>
            <input type="checkbox" className="mt-0.5 h-5 w-5 shrink-0 accent-amber-500" checked={large} onChange={(e) => toggleLarge(e.target.checked)} />
          </label>

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-400">Échiquier</legend>
            <div className="flex flex-wrap gap-2">
              {BOARD_THEMES.map((t) => (
                <button key={t.id} type="button" aria-pressed={board === t.id} className={`flex items-center gap-1.5 ${seg(board === t.id)}`} onClick={() => pickBoard(t.id)}>
                  <span aria-hidden="true" className="inline-block h-3.5 w-3.5 rounded-sm" style={{ background: `linear-gradient(135deg, ${t.light} 50%, ${t.dark} 50%)` }} />
                  {t.label}
                </button>
              ))}
            </div>
          </fieldset>

          {onSpaced && (
            <label className="flex items-start justify-between gap-3">
              <span>
                <Icon name="refresh" className="mr-1 h-4 w-4" /> Répétition espacée
                <span className="block text-xs text-stone-400">
                  Un puzzle raté revient après 1, 3, 7 puis 14 jours ; acquis après 4 réussites. Sinon : toutes les erreurs, dans le désordre.
                </span>
              </span>
              <input type="checkbox" className="mt-0.5 h-5 w-5 shrink-0 accent-amber-500" checked={!!spaced} onChange={(e) => onSpaced(e.target.checked)} />
            </label>
          )}
        </div>
      )}
    </div>
  );
}
