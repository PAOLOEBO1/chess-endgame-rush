// Accueil, thème « Entraîneur » : groupes rejoints par l'élève, partage des résultats, saisie d'un code.

import { Icon } from '../Icon';
import { MAX_JOINED } from '../../core/studentGroups';
import { useState, type ReactNode } from 'react';
import type { HomeProps } from '../../screens/HomeScreen';
import { subChip } from './styles';

export function TrackingBox({
  tracking,
  declined,
  onShare,
  onDecline,
  onStop,
}: {
  tracking: { pseudo: string } | null;
  declined: boolean;
  onShare: (pseudo: string) => Promise<string | null>;
  onDecline: () => void;
  onStop: () => void;
}) {
  const [pseudo, setPseudo] = useState('');
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  if (tracking) {
    return (
      <p className="mt-2 text-xs text-stone-400">
        <Icon name="chart" className="h-3.5 w-3.5 text-emerald-300" /> L’entraîneur de ce groupe suit tes résultats sur ses exercices, sous le pseudo{' '}
        <strong className="text-stone-200">« {tracking.pseudo} »</strong>.{' '}
        <button type="button" onClick={onStop} className="text-sky-400 hover:underline">
          Ne plus partager (efface mes résultats)
        </button>
      </p>
    );
  }
  if (declined && !open) {
    return (
      <p className="mt-2 text-xs text-stone-400">
        Tes résultats ne sont pas partagés dans ce groupe.{' '}
        <button type="button" onClick={() => setOpen(true)} className="text-sky-400 hover:underline">
          Les partager
        </button>
      </p>
    );
  }
  return (
    <form
      className="mt-2 flex flex-col gap-2 rounded-xl border border-sky-500/40 bg-sky-500/10 p-3 text-sm text-stone-200"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(await onShare(pseudo));
        setBusy(false);
      }}
    >
      <p>
        <strong>Partager tes résultats avec l’entraîneur de ce groupe ?</strong> Il verra, sous ton pseudo seulement, tes scores sur les
        exercices de ce groupe (Storm, Streak, réussite, exercices ratés) pour t’aider à progresser. Personne d’autre ne les voit ; tu peux
        arrêter à tout moment. Tes autres groupes ne changent pas.
      </p>
      <input
        value={pseudo}
        onChange={(e) => setPseudo(e.target.value)}
        maxLength={30}
        placeholder="Ton pseudo (ex. prénom + initiale)"
        aria-label="Pseudo pour l’entraîneur"
        className="rounded-lg bg-stone-900 px-3 py-2 text-stone-100 placeholder:text-stone-500"
      />
      <label className="flex items-start gap-2">
        <input type="checkbox" className="mt-1" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
        <span>
          J’accepte que mon entraîneur voie mes résultats, et j’ai <strong>15 ans ou plus</strong> ou un parent est d’accord.
        </span>
      </label>
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={busy || !consent || pseudo.trim().length < 2} className="rounded-lg bg-sky-500 px-4 py-2 font-semibold text-stone-900 hover:bg-sky-400 disabled:opacity-40">
          {busy ? 'Envoi…' : 'Partager mes résultats'}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            onDecline();
          }}
          className="rounded-lg px-3 py-2 text-stone-300 hover:text-stone-50"
        >
          Non merci
        </button>
      </div>
      {error && <p className="text-red-300">{error}</p>}
    </form>
  );
}

export function JoinForm({ onJoin, intro, onCancel }: { onJoin: HomeProps['onJoinGroup']; intro: ReactNode; onCancel?: () => void }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="mt-3 flex flex-col gap-2 rounded-xl border border-amber-500/50 bg-amber-500/10 p-3 text-sm text-stone-200"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        const err = await onJoin(code);
        setError(err);
        setBusy(false);
        if (!err) {
          setCode('');
          onCancel?.();
        }
      }}
    >
      <p>{intro}</p>
      <div className="flex flex-wrap gap-2">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          maxLength={8}
          placeholder="CODE"
          aria-label="Code du groupe"
          autoCapitalize="characters"
          spellCheck={false}
          className="w-36 rounded-lg bg-stone-900 px-3 py-2 font-mono tracking-widest text-stone-100 placeholder:text-stone-500"
        />
        <button type="submit" disabled={busy || code.trim().length !== 8} className="rounded-lg bg-amber-500 px-4 py-2 font-semibold text-stone-900 hover:bg-amber-400 disabled:opacity-40">
          {busy ? 'Recherche…' : 'Rejoindre'}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="rounded-lg px-3 py-2 text-stone-300 hover:text-stone-50">
            Annuler
          </button>
        )}
      </div>
      {error && <p className="text-red-300">{error}</p>}
    </form>
  );
}

export function CoachGroupBox({
  group,
  groups,
  notice,
  tracked,
  onSelect,
  onJoin,
  onLeave,
}: {
  group: HomeProps['coachGroup'];
  groups: HomeProps['coachGroups'];
  notice: string | null;
  /** Les résultats de l'élève sont suivis dans le groupe joué : le quitter les efface. */
  tracked: boolean;
  onSelect: (code: string) => void;
  onJoin: HomeProps['onJoinGroup'];
  onLeave: () => void;
}) {
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [adding, setAdding] = useState(false);
  const noticeBox = notice && (
    <p className="mt-3 rounded-lg bg-amber-500/15 px-3 py-2 text-sm text-amber-200" role="note">
      {notice}
    </p>
  );
  if (!group) {
    // Aucun groupe encore : le message (ex. lien ouvert sans connexion) doit rester visible au-dessus de la saisie du code.
    return (
      <>
        {noticeBox}
        <JoinForm
          onJoin={onJoin}
          intro={
            <>
              Les exercices choisis par <strong>ton entraîneur</strong>. Entre le code de ton groupe (8 caractères), ou ouvre le lien qu’il t’a
              envoyé.
            </>
          }
        />
      </>
    );
  }
  return (
    <>
      {noticeBox}
      {groups.length > 1 && (
        <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Mes groupes">
          {groups.map((g) => (
            <button
              key={g.code}
              type="button"
              aria-pressed={g.code === group.code}
              onClick={() => {
                setConfirmLeave(false);
                onSelect(g.code);
              }}
              className={subChip(g.code === group.code)}
            >
              {g.name}
              {g.tracked && <Icon name="chart" className="ml-1 h-3.5 w-3.5 opacity-70" />}
            </button>
          ))}
        </div>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl border border-stone-700 p-3 text-sm text-stone-200">
        <span className="min-w-0 flex-1">
          <Icon name="board" className="h-4 w-4 text-amber-300" /> Groupe <strong>« {group.name} »</strong> · {group.count} exercice{group.count > 1 ? 's' : ''},
          du plus facile au plus difficile
          {group.updatedAt && <span className="text-stone-400"> · mis à jour le {new Date(group.updatedAt).toLocaleDateString('fr-FR')}</span>}
        </span>
        {confirmLeave ? (
          <span className="flex flex-wrap items-center gap-2 text-xs text-amber-200">
            Quitter ce groupe efface tes résultats chez son entraîneur (tes autres groupes ne changent pas). Quitter ?
            <button
              type="button"
              onClick={() => {
                setConfirmLeave(false);
                onLeave();
              }}
              className="rounded-md bg-red-600 px-2 py-1 font-semibold text-white hover:bg-red-500"
            >
              Oui, quitter
            </button>
            <button type="button" onClick={() => setConfirmLeave(false)} className="rounded-md bg-stone-700 px-2 py-1 text-stone-100">
              Rester
            </button>
          </span>
        ) : (
          <span className="flex flex-wrap items-center gap-3 text-xs">
            {groups.length < MAX_JOINED && !adding && (
              <button type="button" onClick={() => setAdding(true)} className="text-sky-400 hover:underline">
                + Ajouter un groupe
              </button>
            )}
            <button type="button" onClick={() => (tracked ? setConfirmLeave(true) : onLeave())} className="text-stone-400 hover:text-stone-100 hover:underline">
              Quitter ce groupe
            </button>
          </span>
        )}
      </div>
      {adding && (
        <JoinForm
          onJoin={onJoin}
          onCancel={() => setAdding(false)}
          intro={<>Entre le code d’un autre groupe (8 caractères) : tu gardes aussi tes groupes actuels ({groups.length}/{MAX_JOINED}).</>}
        />
      )}
    </>
  );
}
