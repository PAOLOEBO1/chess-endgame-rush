// Menu « profil » de l'en-tête : changer de joueur en un clic, voir lequel est
// relié au compte en ligne, accéder à la gestion des profils et du compte.

import { useEffect, useRef, useState } from 'react';
import { Icon } from './Icon';

export interface ProfileEntry {
  id: string;
  name: string;
  /** Relié au compte en ligne connecté. */
  linked: boolean;
}

interface Props {
  players: ProfileEntry[];
  playerId: string | null;
  /** Adresse du compte connecté (null : pas connecté). */
  accountEmail: string | null;
  onSelect: (id: string | null) => void;
  onManage: () => void;
}

export function ProfileMenu({ players, playerId, accountEmail, onSelect, onManage }: Props) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const current = players.find((p) => p.id === playerId) ?? null;

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

  const item = (active: boolean) =>
    `flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm ${active ? 'bg-amber-500 text-stone-900 font-bold' : 'text-stone-100 hover:bg-stone-700'}`;

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-1.5 rounded-lg bg-stone-800 px-3 py-2 text-sm font-semibold text-stone-100 hover:bg-stone-700"
        title="Changer de joueur, compte en ligne"
        aria-label={`Profil joueur : ${current?.name ?? 'invité'}${current?.linked ? ', relié au compte' : ''}`}
      >
        <Icon name="user" className="h-5 w-5" />
        <span className="hidden max-w-[10rem] truncate sm:inline">{current?.name ?? 'Invité'}</span>
        {current?.linked && <Icon name="cloud" className="h-4 w-4 text-sky-300" label="relié au compte" />}
      </button>
      {open && (
        <div role="menu" className="absolute right-0 z-40 mt-2 flex w-72 flex-col gap-1 rounded-xl border border-stone-700 bg-stone-800 p-2 shadow-xl">
          <p className="px-3 pb-1 pt-1 text-xs text-stone-400">
            {accountEmail ? (
              <>
                Connecté : <strong className="text-stone-200">{accountEmail}</strong>
              </>
            ) : (
              'Pas connecté : les profils restent sur cet appareil.'
            )}
          </p>
          {players.map((pl) => (
            <button
              key={pl.id}
              type="button"
              role="menuitemradio"
              aria-checked={pl.id === playerId}
              className={item(pl.id === playerId)}
              onClick={() => {
                onSelect(pl.id);
                setOpen(false);
              }}
            >
              <Icon name="user" className="h-4 w-4" />
              <span className="min-w-0 flex-1 truncate">{pl.name}</span>
              {pl.linked && (
                <span className="flex items-center gap-1 text-xs font-semibold">
                  <Icon name="cloud" className="h-4 w-4" /> compte
                </span>
              )}
            </button>
          ))}
          <button
            type="button"
            role="menuitemradio"
            aria-checked={playerId === null}
            className={item(playerId === null)}
            onClick={() => {
              onSelect(null);
              setOpen(false);
            }}
          >
            <span className="min-w-0 flex-1">Invité (parties non enregistrées)</span>
          </button>
          <hr className="my-1 border-stone-700" />
          <button
            type="button"
            role="menuitem"
            className={item(false)}
            onClick={() => {
              setOpen(false);
              onManage();
            }}
          >
            <Icon name="tool" className="h-4 w-4" />
            {accountEmail ? 'Gérer les profils et le compte' : 'Gérer les profils · se connecter'}
          </button>
        </div>
      )}
    </div>
  );
}
