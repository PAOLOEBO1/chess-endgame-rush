import { SUBCATEGORIES } from '../core/categories';
import { BASICS_GROUPS } from '../data/puzzlesMock';
import { CONFIG } from '../core/config';
import { InstallButton } from '../components/InstallButton';
import { Icon, type IconName } from '../components/Icon';
import { ProfileMenu, type ProfileEntry } from '../components/ProfileMenu';
import { SOURCE_URL } from './PrivacyScreen';
import { sideToMove } from '../core/fen';
import { materialSymbols } from '../core/material';
import type { RushMode } from '../core/rush/rushRules';
import type { ExamRecord } from '../core/exam';
import type { Level, Puzzle } from '../core/types';
import { useState } from 'react';
import type { BestScore } from '../services/highScores';
import { isSoundOn, setSoundOn } from '../services/sound';
import { applyBoardTheme, BOARD_THEMES, getSettings, setSetting, type BoardTheme, type TrainTab } from '../services/settings';

export type HomeMode = RushMode | 'training';
export type ThemeChoice = 'mix' | 'bases' | 'pions' | 'tours' | 'dames' | 'fous' | 'cavaliers' | 'mixte';

export const THEMES: { id: ThemeChoice; label: string; icon?: IconName }[] = [
  { id: 'mix', label: 'Mix', icon: 'dice' },
  { id: 'pions', label: '♟ Pions' },
  { id: 'tours', label: '♜ Tours' },
  { id: 'dames', label: '♛ Dames' },
  { id: 'fous', label: '♝ Fous' },
  { id: 'cavaliers', label: '♞ Cavaliers' },
  { id: 'mixte', label: '⚖ Mixtes' },
  { id: 'bases', label: 'Bases', icon: 'book' },
];

const MODES: { id: HomeMode; icon: IconName; title: string; text: string }[] = [
  {
    id: 'storm',
    icon: 'bolt',
    title: 'Storm',
    text: `${CONFIG.modes.storm.durationMs / 60000} min · +${CONFIG.modes.storm.bonusMs / 1000} s par réussite · −${CONFIG.modes.storm.penaltyMs / 1000} s par erreur`,
  },
  { id: 'streak', icon: 'flame', title: 'Streak', text: 'Difficulté croissante · la série s’arrête à la 1re erreur' },
  { id: 'training', icon: 'book', title: 'Entraînement', text: 'Technique jusqu’au bout et positions « Bases », sans chrono' },
];

const LEVEL_LABEL: Record<Level, string> = { debutant: 'Débutant', intermediaire: 'Intermédiaire', avance: 'Avancé', master: 'Master' };

interface Props {
  /** Affichage compact (intégration dans un site). */
  compact?: boolean;
  mode: HomeMode;
  theme: ThemeChoice;
  /** Sous-thème (id) ou 'all'. */
  sub: string;
  /** Nombre de finales disponibles par sous-thème (id → n) et par famille. */
  counts: Map<string, number>;
  playerName: string | null;
  /** Menu de l'en-tête : profils de l'appareil et compte connecté. */
  players: ProfileEntry[];
  playerId: string | null;
  accountEmail: string | null;
  onSelectPlayer: (id: string | null) => void;
  /** Profil et compte (stats = true : statistiques de progression). */
  onProgress: (stats?: boolean) => void;
  /** Classement public (absent si les comptes en ligne ne sont pas configurés). */
  onLeaderboard?: () => void;
  onPrivacy: () => void;
  /** Révision des erreurs (joueur sélectionné) : à revoir maintenant / en cours / mode. */
  review: { due: number; total: number; spaced: boolean } | null;
  onReview: () => void;
  onSpaced: (on: boolean) => void;
  onSub: (s: string) => void;
  /** null = automatique (du plus facile, la difficulté monte en jeu). */
  startRating: number | null;
  /** Elo personnel du joueur pour le thème choisi (s'il n'est plus provisoire). */
  myLevel: number | null;
  poolSize: number | null;
  loadError: string | null;
  best: BestScore | null;
  basics: Puzzle[];
  /** Identifiants des positions « Bases » déjà réussies. */
  basicsDone: Set<string>;
  /** Tests de maîtrise par thème (groupe → bilan). */
  exams: Record<string, ExamRecord>;
  onExam: (group: string) => void;
  /** Entretien des acquis : nombre de Bases réussies à rejouer aujourd'hui. */
  maintenance: number;
  onMaintenance: () => void;
  onMode: (m: HomeMode) => void;
  onTheme: (t: ThemeChoice) => void;
  onStartRating: (r: number | null) => void;
  onStart: () => void;
  onTrain: (index: number) => void;
  /** Conseil : famille de finales la plus faible du joueur (Elo). */
  weakness: { family: string; label: string; elo: number } | null;
  onWeakness: (family: string) => void;
  /** Espace entraîneur : composer une série à partager par lien. */
  onCoach: () => void;
  /** Leçons guidées (démonstrations commentées). */
  lessons: { id: string; title: string }[];
  onLesson: (id: string) => void;
  /** Exercice « Gain, nulle ou perte ? » (mêmes positions que le mode technique). */
  onJudgeQuiz: () => void;
  /** Mode technique : nombre de positions ≤ 7 pièces pour le thème, et lancement. */
  techniqueCount: number | null;
  /** Série de jours d'entraînement (joueur sélectionné). */
  streak: { current: number; best: number; playedToday: boolean } | null;
  /** Puzzle du jour : résultat du joueur aujourd'hui (null = pas encore joué). */
  daily: { rating: number; title: string; result: boolean | null } | null;
  onDaily: () => void;
  /** Défi de la semaine (10 positions communes). */
  challenge: { played: number; solved: number; total: number } | null;
  onChallenge: () => void;
  onTechnique: () => void;
}

const subChip = (active: boolean) =>
  `rounded-lg px-2.5 py-1 text-sm transition disabled:opacity-30 ${active ? 'bg-amber-500 text-stone-900' : 'bg-stone-800/70 text-stone-200 hover:bg-stone-700'}`;

function Count({ n }: { n?: number }) {
  return <span className="ml-1 text-xs opacity-60 tabular-nums">{n ?? 0}</span>;
}

const TRAIN_TABS: { id: TrainTab; label: string; icon: IconName }[] = [
  { id: 'bases', label: 'Bases', icon: 'book' },
  { id: 'lecons', label: 'Leçons', icon: 'cap' },
  { id: 'technique', label: 'Technique', icon: 'tool' },
  { id: 'jugement', label: 'Jugement', icon: 'scale' },
  { id: 'entraineur', label: 'Entraîneur', icon: 'board' },
];

const chip = (active: boolean) =>
  `rounded-full px-3 py-1.5 text-sm font-semibold transition ${active ? 'bg-amber-500 text-stone-900' : 'bg-stone-800 text-stone-200 hover:bg-stone-700'}`;

/** Départ légèrement sous l'Elo personnel (échauffement), arrondi à 50. */
const myStart = (elo: number) => Math.max(400, Math.round((elo - 100) / 50) * 50);

export function HomeScreen(p: Props) {
  const rush = p.mode !== 'training';
  const [sound, setSound] = useState(isSoundOn);
  const [board, setBoard] = useState<BoardTheme>(() => getSettings().boardTheme);
  const [trainTab, setTrainTab] = useState<TrainTab>(() => getSettings().trainingTab);
  const pickTrainTab = (t: TrainTab) => {
    setTrainTab(t);
    setSetting('trainingTab', t);
  };
  const pickBoard = (t: BoardTheme) => {
    setBoard(t);
    setSetting('boardTheme', t);
    applyBoardTheme(t);
  };
  return (
    <div className={`mx-auto max-w-5xl px-4 ${p.compact ? 'py-4' : 'py-8'}`}>
      <header className="mb-6 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className={`font-extrabold text-stone-50 ${p.compact ? 'text-2xl' : 'text-2xl sm:text-4xl'}`}>
            <img src="icons/icon-192.png" alt="" width="40" height="40" className="mr-2 inline-block h-8 w-8 rounded-lg align-[-0.2em] sm:h-10 sm:w-10" />
            <span className="sm:hidden">Endgame Rush</span>
            <span className="hidden sm:inline">Chess Endgame Rush</span>
          </h1>
          {!p.compact && (
            <p className="mt-2 hidden text-stone-400 sm:block">Finales de parties réelles, jugées coup par coup (table de finales et Stockfish).</p>
          )}
        </div>
        <div className="flex shrink-0 flex-nowrap justify-end gap-2">
        {!p.compact && <InstallButton />}
        {p.onLeaderboard && !p.compact && (
          <button
            type="button"
            onClick={p.onLeaderboard}
            className="rounded-lg bg-stone-800 px-3 py-2 text-sm font-semibold text-stone-100 hover:bg-stone-700"
            title="Classement des joueurs"
            aria-label="Classement des joueurs"
          >
            <Icon name="trophy" className="h-5 w-5" />
          </button>
        )}
        <button
          type="button"
          onClick={() => p.onProgress(true)}
          className="rounded-lg bg-stone-800 px-3 py-2 text-sm font-semibold text-stone-100 hover:bg-stone-700"
          title="Ma progression (statistiques, Elo, badges)"
          aria-label="Ma progression"
        >
          <Icon name="chart" className="h-5 w-5" />
        </button>
        <ProfileMenu players={p.players} playerId={p.playerId} accountEmail={p.accountEmail} onSelect={p.onSelectPlayer} onManage={() => p.onProgress(false)} />
        <button
          type="button"
          onClick={() => {
            setSoundOn(!sound);
            setSound(!sound);
          }}
          className="rounded-lg bg-stone-800 px-3 py-2 text-lg hover:bg-stone-700"
          aria-label={sound ? 'Couper le son' : 'Activer le son'}
          title={sound ? 'Couper le son' : 'Activer le son'}
        >
          <Icon name={sound ? 'volume' : 'mute'} className="h-5 w-5" />
        </button>
        </div>
      </header>

      {!p.compact && p.weakness && (
        <section className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-sky-500/40 bg-sky-500/10 p-4">
          <p className="text-sm text-stone-200">
            <Icon name="target" className="h-4 w-4 text-sky-300" /> <strong>Ton point faible :</strong> {p.weakness.label.toLowerCase()} (Elo {p.weakness.elo}). Quelques séries ciblées feront
            monter ta moyenne.
          </p>
          <button
            type="button"
            onClick={() => p.onWeakness(p.weakness!.family)}
            className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-bold text-stone-900 hover:bg-sky-400"
          >
            <Icon name="bolt" className="h-4 w-4" /> Storm sur ce thème
          </button>
        </section>
      )}

      {!p.compact && (p.daily || p.streak || p.challenge) && (
        <section className="mb-4 flex flex-wrap items-center gap-3">
          {p.streak && (
            <span
              className={`rounded-full px-3 py-1.5 text-sm font-bold ${p.streak.current > 0 ? 'bg-orange-500/20 text-orange-300' : 'bg-stone-800 text-stone-400'}`}
              title={`Meilleure série : ${p.streak.best} jour(s)`}
            >
              <Icon name="flame" className="h-4 w-4" /> {p.streak.current} jour{p.streak.current > 1 ? 's' : ''} d’affilée
              {!p.streak.playedToday && p.streak.current > 0 && ' · joue aujourd’hui pour la prolonger'}
            </span>
          )}
          {p.daily && (
            <button
              type="button"
              onClick={p.onDaily}
              className="rounded-full bg-stone-800 px-3 py-1.5 text-sm font-semibold text-stone-100 hover:bg-stone-700"
              title={p.daily.title}
            >
              <Icon name="pin" className="h-4 w-4" /> Puzzle du jour (Elo {p.daily.rating}){' '}
              {p.daily.result === null ? '→ à jouer' : p.daily.result ? '✅ réussi' : '❌ raté (à revoir)'}
            </button>
          )}
          {p.challenge && (
            <button
              type="button"
              onClick={p.onChallenge}
              className="rounded-full bg-sky-500/20 px-3 py-1.5 text-sm font-semibold text-sky-100 hover:bg-sky-500/30"
              title="Les mêmes 10 finales pour tout le monde, du lundi au dimanche ; seule la première tentative compte"
            >
              <Icon name="flag" className="h-4 w-4" /> Défi de la semaine :{' '}
              {p.challenge.played === 0
                ? '10 finales → à jouer'
                : p.challenge.played < p.challenge.total
                  ? `${p.challenge.played}/${p.challenge.total} → continuer`
                  : `✅ ${p.challenge.solved}/${p.challenge.total} réussies`}
            </button>
          )}
        </section>
      )}

      {p.review && p.review.total > 0 && (
        <section className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4">
          <div>
            <div className="font-bold text-stone-50">
              <Icon name="refresh" className="h-4 w-4 text-amber-300" /> Révision des erreurs :{' '}
              {p.review.spaced
                ? `${p.review.due} à revoir aujourd’hui`
                : `${p.review.total} erreur${p.review.total > 1 ? 's' : ''} à retravailler`}
            </div>
            <div className="text-xs text-stone-400">
              {p.review.spaced
                ? `Répétition espacée : un puzzle raté revient après 1, 3, 7 puis 14 jours ; acquis après 4 réussites. ${p.review.total} en cours.`
                : 'Toutes vos erreurs non acquises, dans un ordre varié.'}
            </div>
            <label className="mt-2 flex items-center gap-2 text-xs text-stone-300">
              <input type="checkbox" checked={p.review.spaced} onChange={(e) => p.onSpaced(e.target.checked)} />
              Répétition espacée
            </label>
          </div>
          <button
            type="button"
            disabled={p.review.due === 0}
            onClick={p.onReview}
            className="rounded-lg bg-amber-500 px-4 py-2 font-bold text-stone-900 hover:bg-amber-400 disabled:opacity-40"
          >
            {p.review.due === 0 ? 'Rien à revoir aujourd’hui' : <><Icon name="play" className="h-4 w-4" /> Réviser</>}
          </button>
        </section>
      )}

      <section className="grid gap-3 sm:grid-cols-3">
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => p.onMode(m.id)}
            className={`rounded-xl p-4 text-left transition ${p.mode === m.id ? 'bg-amber-500 text-stone-900' : 'bg-stone-800 text-stone-100 hover:bg-stone-700'}`}
          >
            <div className="flex items-center gap-2 text-2xl font-black">
              <Icon name={m.icon} className="h-6 w-6" /> {m.title}
            </div>
            <div className={`mt-1 text-sm ${p.mode === m.id ? 'text-stone-800' : 'text-stone-400'}`}>{m.text}</div>
          </button>
        ))}
      </section>

      {rush ? (
        <section className="mt-6 flex flex-col gap-5">
          <div>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-stone-400">Thème</h2>
            <div className="flex flex-wrap gap-2">
              {THEMES.map((t) => (
                <button key={t.id} type="button" className={chip(p.theme === t.id)} onClick={() => p.onTheme(t.id)}>
                  {t.icon && <Icon name={t.icon} className="mr-1 h-4 w-4" />}
                  {t.label}
                </button>
              ))}
            </div>
            {p.theme !== 'mix' && p.theme !== 'bases' && (
              <div className="mt-3 flex flex-wrap gap-2 border-l-2 border-stone-700 pl-3" aria-label="Sous-thèmes">
                <button type="button" className={subChip(p.sub === 'all')} onClick={() => p.onSub('all')}>
                  Tous <Count n={p.counts.get(p.theme)} />
                </button>
                {SUBCATEGORIES.filter((s) => s.family === p.theme && (p.counts.get(s.id) ?? 0) >= CONFIG.minPuzzlesPerTheme).map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    title={s.title}
                    className={subChip(p.sub === s.id)}
                    onClick={() => p.onSub(s.id)}
                  >
                    <span className="text-base leading-none">{s.label}</span> <Count n={p.counts.get(s.id)} />
                  </button>
                ))}
                <button
                  type="button"
                  disabled={(p.counts.get(`${p.theme}-autres`) ?? 0) < CONFIG.minPuzzlesPerTheme}
                  className={subChip(p.sub === `${p.theme}-autres`)}
                  onClick={() => p.onSub(`${p.theme}-autres`)}
                >
                  Autres <Count n={p.counts.get(`${p.theme}-autres`)} />
                </button>
              </div>
            )}
          </div>
          <div>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-stone-400">Niveau de départ <span className="font-normal normal-case text-stone-400">(facultatif)</span></h2>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className={chip(p.startRating === null)}
                onClick={() => p.onStartRating(null)}
                title="Départ avec les exercices les plus faciles du thème ; la difficulté monte à chaque réussite"
              >
                ⬆️ Automatique
              </button>
              {CONFIG.startLevels.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  className={chip(p.startRating === l.rating)}
                  onClick={() => p.onStartRating(p.startRating === l.rating ? null : l.rating)}
                >
                  {l.label} ({l.rating})
                </button>
              ))}
              {p.myLevel !== null && (
                <button
                  type="button"
                  className={chip(p.startRating === myStart(p.myLevel))}
                  onClick={() => p.onStartRating(p.startRating === myStart(p.myLevel!) ? null : myStart(p.myLevel!))}
                  title="Départ un peu sous votre Elo personnel pour ce thème"
                >
                  <Icon name="target" className="h-4 w-4" /> Mon niveau ({myStart(p.myLevel)})
                </button>
              )}
            </div>
          </div>
          {/* Sur téléphone, « Jouer » reste collé en bas de l'écran. */}
          <div className="sticky bottom-0 z-10 -mx-4 flex flex-wrap items-center gap-4 border-t border-stone-800 bg-stone-900/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
            <button
              type="button"
              disabled={!p.poolSize}
              onClick={p.onStart}
              className="rounded-xl bg-amber-500 px-8 py-4 text-xl font-black text-stone-900 hover:bg-amber-400 disabled:opacity-40"
            >
              <Icon name="play" className="h-5 w-5" /> Jouer
            </button>
            <span className="text-sm text-stone-400">
              {p.loadError ?? (p.poolSize === null ? 'Chargement des finales…' : `${p.poolSize} finales disponibles`)}
              {p.best && ` · Record : ${p.best.score} (${p.best.date})`}
            </span>
          </div>
        </section>
      ) : (
        <>
        <div role="tablist" aria-label="Entraînement" className="mt-6 flex flex-wrap gap-2 border-b border-stone-800 pb-3">
          {TRAIN_TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={trainTab === t.id}
              onClick={() => pickTrainTab(t.id)}
              className={chip(trainTab === t.id)}
            >
              <Icon name={t.icon} className="mr-1 h-4 w-4" />
              {t.label}
            </button>
          ))}
        </div>
        {trainTab === 'bases' && (
          <>
        <h2 className="mt-6 text-lg font-bold text-stone-50">
          <Icon name="book" className="h-5 w-5 text-amber-300" /> Bases (positions de référence){' '}
          <span className="text-sm font-semibold text-stone-400">
            · {p.basics.filter((b) => p.basicsDone.has(b.id)).length}/{p.basics.length} réussies
          </span>
        </h2>
        <p className="mt-1 text-sm text-stone-400">
          Les classiques à connaître, thème par thème et du plus simple au plus difficile, à jouer jusqu’au bout contre la table de
          finales. « Suivant » enchaîne dans cet ordre. Quand un thème te semble acquis, passe son test : tout réussir du premier
          coup, sans indice, le valide.
        </p>
        {p.maintenance > 0 && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3">
            <p className="text-sm text-stone-200">
              <Icon name="refresh" className="h-4 w-4 text-emerald-300" /> <strong>Entretien des acquis :</strong> {p.maintenance} position{p.maintenance > 1 ? 's' : ''} réussie
              {p.maintenance > 1 ? 's' : ''} il y a un moment, à rejouer pour ne pas l’oublier (après 7, 21, 60 puis 120 jours).
            </p>
            <button type="button" onClick={p.onMaintenance} className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-bold text-stone-900 hover:bg-emerald-400">
              <Icon name="play" className="h-4 w-4" /> Rejouer
            </button>
          </div>
        )}
        {BASICS_GROUPS.map((g, gi) => {
          const items = g.ids.map((id) => p.basics.find((b) => b.id === id)).filter((b): b is Puzzle => !!b);
          const done = items.filter((b) => p.basicsDone.has(b.id)).length;
          const exam = p.exams[g.id];
          // Ouvert par défaut : le premier thème pas encore terminé.
          const firstOpen = BASICS_GROUPS.findIndex((x) => x.ids.some((id) => !p.basicsDone.has(id)));
          return (
            <details key={g.id} open={gi === (firstOpen < 0 ? 0 : firstOpen)} className="mt-3 rounded-xl bg-stone-800/40 p-3">
              <summary className="cursor-pointer select-none font-semibold text-stone-100">
                {g.label} <span className="text-sm text-stone-400">· {done}/{items.length}{done === items.length ? ' ✅' : ''}</span>
                {exam?.passedAt ? (
                  <span className="ml-2 rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-bold text-emerald-300" title={`Test réussi le ${new Date(exam.passedAt).toLocaleDateString('fr-FR')}`}>
                    <Icon name="medal" className="h-3.5 w-3.5" /> maîtrisé
                  </span>
                ) : exam ? (
                  <span className="ml-2 text-xs text-stone-400">· test : {exam.best}/{exam.total}</span>
                ) : null}
              </summary>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => p.onExam(g.id)}
                  className="rounded-lg border border-amber-500/60 px-3 py-1.5 text-sm font-semibold text-amber-200 hover:bg-amber-500/10"
                  title="Toutes les positions du thème d'affilée, sans indice ; seule la 1re tentative compte"
                >
                  <Icon name="cap" className="h-4 w-4" /> {exam?.passedAt ? 'Repasser le test' : 'Passer le test'} ({items.length} positions)
                </button>
              </div>
              <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((b) => (
                  <li key={b.id}>
                    <button
                      type="button"
                      onClick={() => p.onTrain(p.basics.indexOf(b))}
                      className="flex h-full w-full flex-col gap-2 rounded-xl bg-stone-800 p-4 text-left transition hover:bg-stone-700"
                    >
                      <span className="font-semibold text-stone-50">
                        {p.basicsDone.has(b.id) && <span title="Déjà réussie">✅ </span>}
                        {b.title}
                      </span>
                      <span className="text-lg text-stone-300" aria-label={materialSymbols(b.fen, sideToMove(b.fen)).label}>
                        {materialSymbols(b.fen, sideToMove(b.fen)).text}
                      </span>
                      <span className="mt-auto flex flex-wrap gap-2 text-xs font-semibold">
                        <span className={`rounded-full px-2 py-0.5 ${b.objective === 'win' ? 'bg-amber-500 text-stone-900' : 'bg-sky-500 text-stone-900'}`}>
                          {b.objective === 'win' ? 'Gagner' : 'Tenir la nulle'}
                        </span>
                        <span className="rounded-full bg-stone-900 px-2 py-0.5 text-stone-300">{LEVEL_LABEL[b.level]}</span>
                        <span className="rounded-full bg-stone-900 px-2 py-0.5 text-stone-300">{sideToMove(b.fen) === 'w' ? 'Blancs' : 'Noirs'}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </details>
          );
        })}
          </>
        )}
        {trainTab === 'lecons' && (
          <section className="mt-4 flex flex-col gap-3 rounded-xl bg-stone-800/60 p-4">
          <h2 className="text-lg font-bold text-stone-50"><Icon name="cap" className="h-5 w-5 text-amber-300" /> Leçons guidées</h2>
          <p className="text-sm text-stone-400">Les classiques expliqués coup par coup, puis à toi de les jouer.</p>
          <div className="flex flex-wrap gap-2">
            {p.lessons.map((l) => (
              <button key={l.id} type="button" onClick={() => p.onLesson(l.id)} className="rounded-lg bg-stone-700 px-3 py-2 text-sm font-semibold text-stone-100 hover:bg-stone-600">
                {l.title}
              </button>
            ))}
          </div>
        </section>
        )}
        {trainTab === 'technique' && (
        <section className="mt-4 flex flex-col gap-3 rounded-xl bg-stone-800/60 p-4">
          <h2 className="text-lg font-bold text-stone-50"><Icon name="tool" className="h-5 w-5 text-amber-300" /> Technique : jouer jusqu’au bout</h2>
          <p className="text-sm text-stone-400">
            Une position de partie réelle (7 pièces ou moins), sans chrono, à mener jusqu’au mat — ou à tenir 20 coups quand
            l’objectif est la nulle. Chaque coup est jugé par la table de finales.
          </p>
          <div className="flex flex-wrap gap-2">
            {THEMES.filter((t) => t.id !== 'bases').map((t) => (
              <button key={t.id} type="button" className={chip(p.theme === t.id)} onClick={() => p.onTheme(t.id)}>
                {t.icon && <Icon name={t.icon} className="mr-1 h-4 w-4" />}
                {t.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={!p.techniqueCount}
              onClick={p.onTechnique}
              className="rounded-xl bg-amber-500 px-6 py-3 font-black text-stone-900 hover:bg-amber-400 disabled:opacity-40"
            >
              <Icon name="play" className="h-4 w-4" /> Position au hasard
            </button>
            <span className="text-sm text-stone-400">
              {p.techniqueCount === null ? 'Chargement…' : `${p.techniqueCount} positions disponibles`}
            </span>
          </div>
        </section>
        )}
        {trainTab === 'jugement' && (
        <section className="mt-4 flex flex-col gap-3 rounded-xl bg-stone-800/60 p-4">
          <h2 className="text-lg font-bold text-stone-50"><Icon name="scale" className="h-5 w-5 text-amber-300" /> Gain, nulle ou perte ?</h2>
          <p className="text-sm text-stone-400">
            10 positions : annonce le résultat avec le meilleur jeu, sans jouer. La table de finales corrige. Idéal pour savoir
            quand simplifier vers une finale.
          </p>
          <button
            type="button"
            disabled={!p.techniqueCount}
            onClick={p.onJudgeQuiz}
            className="self-start rounded-xl bg-amber-500 px-6 py-3 font-black text-stone-900 hover:bg-amber-400 disabled:opacity-40"
          >
            <Icon name="play" className="h-4 w-4" /> Série de 10
          </button>
        </section>
        )}
        {trainTab === 'entraineur' && (
        <section className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-stone-700 p-4">
          <p className="text-sm text-stone-300">
            <Icon name="board" className="h-5 w-5 text-amber-300" /> <strong>Entraîneur ?</strong> Compose une série de positions, envoie-la par lien ou imprime-la en fiche, et garde tes séries dans ta bibliothèque.
          </p>
          <button type="button" onClick={p.onCoach} className="rounded-lg bg-stone-700 px-4 py-2 text-sm font-semibold text-stone-100 hover:bg-stone-600">
            Créer une série
          </button>
        </section>
        )}
        </>
      )}

      {!p.compact && (
        <>
        <section className="mt-8 flex flex-wrap items-center gap-2 text-sm" aria-label="Couleurs de l'échiquier">
          <span className="text-stone-400"><Icon name="palette" className="h-4 w-4" /> Échiquier :</span>
          {BOARD_THEMES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => pickBoard(t.id)}
              aria-pressed={board === t.id}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 font-semibold ${board === t.id ? 'bg-amber-500 text-stone-900' : 'bg-stone-800 text-stone-200 hover:bg-stone-700'}`}
            >
              <span
                aria-hidden="true"
                className="inline-block h-3.5 w-3.5 rounded-sm"
                style={{ background: `linear-gradient(135deg, ${t.light} 50%, ${t.dark} 50%)` }}
              />
              {t.label}
            </button>
          ))}
        </section>
        <footer className="mt-10 text-xs text-stone-400">
          Positions de parties réelles : base de puzzles Lichess (licence CC0). Jugement : table de finales Syzygy (API Lichess)
          et Stockfish. Échiquier : chessground (Lichess). Logiciel libre sous licence GPL v3.
          <div className="mt-2 flex flex-wrap gap-4">
            <button type="button" onClick={p.onPrivacy} className="text-sky-400 hover:underline">
              <Icon name="lock" className="h-4 w-4" /> Données personnelles
            </button>
            {SOURCE_URL && (
              <a href={SOURCE_URL} target="_blank" rel="noreferrer" className="text-sky-400 hover:underline">
                <Icon name="code" className="h-4 w-4" /> Code source (GPL v3)
              </a>
            )}
          </div>
        </footer>
        </>
      )}
    </div>
  );
}
