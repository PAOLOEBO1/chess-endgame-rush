// Espace entraîneur : base d'exercices du groupe (import PGN), jouée par les
// élèves en Storm / Streak avec le thème « Entraîneur ».

import { useEffect, useRef, useState } from 'react';
import { parsePgnExercises, type PgnExercise } from '../core/chessRules';
import {
  draftsFromPgn,
  estimateCoachRating,
  fileOrderRatings,
  finalizeItems,
  ratingFeatures,
  COACH_MAX_ITEMS,
  type CoachDraft,
} from '../core/coachSet';
import { toCp } from '../core/judge/engineJudge';
import { fetchMySet, replaceMySet, type CoachSet } from '../services/coachSets';
import type { Engine } from '../services/stockfish';
import { Icon } from './Icon';
import { CoachProgressPanel } from './CoachProgressPanel';

interface Props {
  signedIn: boolean;
  onAccount: () => void;
  engine: Pick<Engine, 'analyse'>;
  /** « base » : import et partage ; « suivi » : résultats des élèves. */
  view?: 'base' | 'suivi';
}

/** Temps de réflexion croissants : le palier où Stockfish trouve le 1er coup mesure la difficulté. */
const TIERS_MS = [30, 120, 400, 1500];

type Parsed = { drafts: CoachDraft[]; skipped: string[] };

export function CoachBasePanel({ signedIn, onAccount, engine, view = 'base' }: Props) {
  const [set, setSet] = useState<CoachSet | null>(null);
  const [loading, setLoading] = useState(signedIn);
  const [parsed, setParsed] = useState<Parsed | null>(null);
  const [mode, setMode] = useState<'estimate' | 'order'>('estimate');
  const [name, setName] = useState('');
  const [progress, setProgress] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const [doubtful, setDoubtful] = useState<string[]>([]);
  const [confirmClear, setConfirmClear] = useState(false);
  const cancelled = useRef(false);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!signedIn) return;
    let stop = false;
    fetchMySet()
      .then((s) => {
        if (stop) return;
        setSet(s);
        if (s) setName(s.name);
      })
      .catch(() => !stop && setMessage({ tone: 'error', text: 'Base indisponible (réseau, ou migration 0008 pas encore exécutée).' }))
      .finally(() => !stop && setLoading(false));
    return () => {
      stop = true;
    };
  }, [signedIn]);

  const link = set ? `${window.location.origin}${window.location.pathname}#groupe=${set.code}` : '';

  const readFiles = async (files: FileList) => {
    const items: PgnExercise[] = [];
    const skipped: string[] = [];
    for (const file of [...files]) {
      if (file.size > 5 * 1024 * 1024) {
        skipped.push(`${file.name} : fichier trop gros (5 Mo au plus)`);
        continue;
      }
      const res = parsePgnExercises(await file.text());
      items.push(...res.items);
      skipped.push(...res.skipped.map((s) => `${file.name}, partie ${s.index} : ${s.reason}`));
    }
    const drafts = draftsFromPgn(items).map((d, i) => ({ ...d, index: i + 1 }));
    setParsed({ drafts, skipped });
    setDoubtful([]);
    setMessage(drafts.length ? null : { tone: 'error', text: 'Aucun exercice lisible : chaque partie doit avoir un en-tête [FEN "…"] et des coups.' });
    if (!name) setName('Exercices du groupe');
  };

  const importNow = async () => {
    if (!parsed?.drafts.length) return;
    const drafts = parsed.drafts.slice(0, COACH_MAX_ITEMS);
    cancelled.current = false;
    setMessage(null);
    let ratings: { r: number; estimated: boolean }[];
    const warn: string[] = [];
    if (mode === 'order') {
      ratings = fileOrderRatings(drafts.length).map((r) => ({ r, estimated: true }));
    } else {
      ratings = [];
      for (const [i, d] of drafts.entries()) {
        if (cancelled.current) {
          setProgress(null);
          setMessage({ tone: 'error', text: 'Import annulé : ta base n’a pas été modifiée.' });
          return;
        }
        setProgress(`Estimation de l’Elo : ${i + 1} / ${drafts.length}…`);
        if (d.headerRating !== null) {
          ratings.push({ r: d.headerRating, estimated: false });
          continue;
        }
        let tier = TIERS_MS.length;
        let cp: number | null = null;
        try {
          for (const [t, ms] of TIERS_MS.entries()) {
            const a = await engine.analyse(d.fen, ms);
            cp = toCp(a.score);
            if (a.bestmove === d.solution[0]) {
              tier = t;
              break;
            }
          }
        } catch {
          tier = 2; // moteur indisponible : difficulté moyenne
        }
        // Objectif douteux d'après Stockfish : signalé à l'entraîneur, sans bloquer.
        if (cp !== null && ((d.objective === 'win' && cp < 150) || (d.objective === 'draw' && Math.abs(cp) > 250))) warn.push(`${d.index}. ${d.title}`);
        ratings.push({ r: estimateCoachRating(ratingFeatures(d, tier)), estimated: true });
      }
    }
    setProgress('Envoi…');
    try {
      const saved = await replaceMySet(name.trim().slice(0, 60) || 'Exercices du groupe', finalizeItems(drafts, ratings));
      setSet(saved);
      setParsed(null);
      setDoubtful(warn);
      setMessage({ tone: 'ok', text: `Base remplacée : ${saved.items.length} exercices, du plus facile au plus difficile.` });
    } catch (e) {
      const code = (e as { code?: string } | null)?.code;
      setMessage({ tone: 'error', text: `Envoi impossible${code ? ` (code ${code})` : ''} : ta base n’a pas été modifiée.` });
    } finally {
      setProgress(null);
    }
  };

  const clear = async () => {
    setConfirmClear(false);
    try {
      const saved = await replaceMySet(set?.name ?? 'Exercices du groupe', []);
      setSet(saved);
      setMessage({ tone: 'ok', text: 'Base vidée. Tes élèves ne voient plus d’exercices tant que tu n’en importes pas de nouveaux.' });
    } catch {
      setMessage({ tone: 'error', text: 'Impossible de vider la base pour le moment.' });
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setMessage({ tone: 'ok', text: 'Lien copié : envoie-le à tes élèves.' });
    } catch {
      setMessage({ tone: 'ok', text: 'Sélectionne le lien ci-dessous pour le copier.' });
    }
  };

  const input = 'rounded-lg bg-stone-900 px-3 py-2 text-stone-100 placeholder:text-stone-500';
  const busy = progress !== null;

  if (view === 'suivi') {
    return !signedIn ? (
      <p className="text-sm text-stone-300">
        Le suivi est réservé à l’entraîneur connecté.{' '}
        <button type="button" onClick={onAccount} className="font-semibold text-sky-400 hover:underline">
          Me connecter →
        </button>
      </p>
    ) : loading ? (
      <p className="text-sm text-stone-400">Chargement…</p>
    ) : set ? (
      <CoachProgressPanel set={set} onSetChange={setSet} />
    ) : (
      <p className="text-sm text-stone-400">Importe d’abord tes exercices (onglet « Mon groupe ») et envoie le lien à tes élèves.</p>
    );
  }

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-amber-500/40 bg-stone-800/60 p-4">
      <h2 className="font-bold text-stone-50">
        <Icon name="library" className="h-5 w-5 text-amber-300" /> Exercices de mon groupe (Storm et Streak)
      </h2>
      <p className="text-sm text-stone-400">
        Importe tes propres exercices en PGN : tes élèves les jouent en Storm ou en Streak avec le thème <strong>« Entraîneur »</strong>, du
        plus facile au plus difficile. Chaque import <strong>remplace toute ta base</strong> (et efface les devoirs, liés aux rangs des exercices).
      </p>

      {!signedIn ? (
        <p className="text-sm text-stone-300">
          Il faut un compte pour déposer une base (tes élèves, eux, n’en ont pas besoin).{' '}
          <button type="button" onClick={onAccount} className="font-semibold text-sky-400 hover:underline">
            Créer un compte ou me connecter →
          </button>
        </p>
      ) : loading ? (
        <p className="text-sm text-stone-400">Chargement de ta base…</p>
      ) : (
        <>
          {set && (
            <div className="flex flex-col gap-2 rounded-lg bg-stone-900/60 p-3 text-sm text-stone-200">
              <p>
                <strong>« {set.name} »</strong> · {set.items.length} exercice{set.items.length > 1 ? 's' : ''}
                {set.updatedAt && ` · mise à jour le ${new Date(set.updatedAt).toLocaleDateString('fr-FR')}`}
              </p>
              <p>
                Code du groupe : <strong className="font-mono text-lg tracking-widest text-amber-300">{set.code}</strong>
              </p>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => void copy()} className="rounded-lg bg-amber-500 px-4 py-2 font-semibold text-stone-900 hover:bg-amber-400">
                  <Icon name="link" className="h-4 w-4" /> Copier le lien pour mes élèves
                </button>
                {set.items.length > 0 &&
                  (confirmClear ? (
                    <span className="flex flex-wrap items-center gap-2 text-red-300">
                      Vider toute la base ?
                      <button type="button" onClick={() => void clear()} className="rounded-md bg-red-600 px-2 py-1 font-semibold text-white hover:bg-red-500">
                        Oui, vider
                      </button>
                      <button type="button" onClick={() => setConfirmClear(false)} className="rounded-md bg-stone-700 px-2 py-1 text-stone-100">
                        Annuler
                      </button>
                    </span>
                  ) : (
                    <button type="button" onClick={() => setConfirmClear(true)} className="rounded-lg px-3 py-2 text-red-300 hover:underline">
                      Vider la base
                    </button>
                  ))}
              </div>
              <input readOnly value={link} onFocus={(e) => e.target.select()} className={`${input} font-mono text-xs`} aria-label="Lien du groupe" />
            </div>
          )}

          <div className="flex flex-col gap-2">
            <button type="button" disabled={busy} onClick={() => fileInput.current?.click()} className="self-start rounded-lg bg-stone-700 px-4 py-2 font-semibold text-stone-100 hover:bg-stone-600 disabled:opacity-40">
              <Icon name="plus" className="h-4 w-4" /> Choisir un ou plusieurs fichiers PGN
            </button>
            <input
              ref={fileInput}
              type="file"
              accept=".pgn,application/x-chess-pgn,text/plain"
              multiple
              hidden
              onChange={(e) => {
                if (e.target.files?.length) void readFiles(e.target.files);
                e.target.value = '';
              }}
            />
            <details className="text-xs text-stone-400">
              <summary className="cursor-pointer">Format attendu</summary>
              <p className="mt-1">
                Une partie par exercice, avec un en-tête <code>[FEN "…"]</code> : c’est au camp qui a le trait de jouer (l’élève), et la ligne
                principale est la solution (les variantes sont ignorées, 20 demi-coups au plus). Objectif « gagner » par défaut ;{' '}
                <code>[Result "1/2-1/2"]</code> = tenir la nulle. Un en-tête <code>[Rating "1450"]</code> fixe l’Elo de l’exercice. Le titre
                vient de <code>[Event]</code>. Un en-tête <code>[Theme "Opposition, Triangulation"]</code> (3 thèmes au plus) permet à tes
                élèves de s’entraîner sur un motif précis. Exports Lichess (études) et ChessBase conviennent. N’importe que des exercices que tu as le droit
                de partager (pas de recueil sous droits d’auteur).
              </p>
            </details>
          </div>

          {parsed && parsed.drafts.length > 0 && (
            <div className="flex flex-col gap-3 rounded-lg bg-stone-900/60 p-3 text-sm text-stone-200">
              <p>
                <strong>{parsed.drafts.length}</strong> exercice{parsed.drafts.length > 1 ? 's' : ''} lu{parsed.drafts.length > 1 ? 's' : ''}
                {parsed.drafts.length > COACH_MAX_ITEMS && ` (les ${COACH_MAX_ITEMS} premiers seront gardés)`}
                {parsed.skipped.length > 0 && `, ${parsed.skipped.length} ignoré${parsed.skipped.length > 1 ? 's' : ''}`}.
                {(() => {
                  const n = parsed.drafts.filter((d) => d.themes.length).length;
                  const names = [...new Set(parsed.drafts.flatMap((d) => d.themes))];
                  return n > 0 ? ` ${n} avec un thème (${names.slice(0, 6).join(', ')}${names.length > 6 ? '…' : ''}).` : null;
                })()}
              </p>
              {parsed.skipped.length > 0 && (
                <details className="text-xs text-stone-400">
                  <summary className="cursor-pointer">Voir les parties ignorées</summary>
                  <ul className="mt-1 list-disc pl-5">
                    {parsed.skipped.slice(0, 50).map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </details>
              )}
              <label className="flex flex-col gap-1">
                Nom de la base
                <input className={input} value={name} maxLength={60} onChange={(e) => setName(e.target.value)} />
              </label>
              <fieldset className="flex flex-col gap-1">
                <legend className="mb-1">Ordre de difficulté</legend>
                <label className="flex items-start gap-2">
                  <input type="radio" className="mt-1" checked={mode === 'estimate'} onChange={() => setMode('estimate')} />
                  <span>
                    <strong>Estimer l’Elo de chaque exercice</strong> (recommandé) : longueur de la solution, coup naturel ou non, temps que met
                    Stockfish à le trouver. Compte 1 à 2 secondes par exercice. Un Elo indiqué dans le PGN est gardé.
                  </span>
                </label>
                <label className="flex items-start gap-2">
                  <input type="radio" className="mt-1" checked={mode === 'order'} onChange={() => setMode('order')} />
                  <span>
                    <strong>Garder l’ordre des fichiers</strong> : le 1er exercice est le plus facile, le dernier le plus difficile.
                  </span>
                </label>
              </fieldset>
              <div className="flex flex-wrap gap-2">
                <button type="button" disabled={busy} onClick={() => void importNow()} className="rounded-xl bg-amber-500 px-5 py-3 font-black text-stone-900 hover:bg-amber-400 disabled:opacity-40">
                  {set?.items.length ? `Remplacer ma base (${set.items.length}) par ces exercices` : 'Créer ma base avec ces exercices'}
                </button>
                {busy && mode === 'estimate' && (
                  <button type="button" onClick={() => (cancelled.current = true)} className="rounded-xl bg-stone-700 px-4 py-3 font-semibold text-stone-100">
                    Annuler
                  </button>
                )}
              </div>
            </div>
          )}

          {progress && (
            <p className="text-sm text-amber-300" role="status">
              {progress}
            </p>
          )}
          {doubtful.length > 0 && (
            <details className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-stone-200" open>
              <summary className="cursor-pointer font-semibold">
                ⚠️ {doubtful.length} exercice{doubtful.length > 1 ? 's' : ''} à vérifier : Stockfish ne trouve pas l’objectif annoncé
              </summary>
              <ul className="mt-1 list-disc pl-5 text-xs">
                {doubtful.slice(0, 30).map((d) => (
                  <li key={d}>{d}</li>
                ))}
              </ul>
              <p className="mt-1 text-xs text-stone-400">Ils sont importés quand même ; corrige le PGN (objectif, FEN) et réimporte si besoin.</p>
            </details>
          )}
        </>
      )}
      {message && (
        <p role="status" className={`text-sm ${message.tone === 'error' ? 'text-red-400' : 'text-emerald-400'}`}>
          {message.text}
        </p>
      )}
    </section>
  );
}
