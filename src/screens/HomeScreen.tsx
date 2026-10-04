import type { MotifChoice } from '../core/motifs';
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
import { useState, type ReactNode } from 'react';
import type { BestScore } from '../services/highScores';
import { SettingsMenu } from '../components/SettingsMenu';
import { getSettings, setSetting, type TrainTab } from '../services/settings';

export type HomeMode = RushMode | 'training';
export type ThemeChoice = 'mix' | 'bases' | 'pions' | 'tours' | 'dames' | 'fous' | 'cavaliers' | 'mixte' | 'entraineur';

export const THEMES: { id: ThemeChoice; label: string; icon?: IconName }[] = [
  { id: 'mix', label: 'Mix', icon: 'dice' },
  { id: 'pions', label: '♟ Pions' },
  { id: 'tours', label: '♜ Tours' },
  { id: 'dames', label: '♛ Dames' },
  { id: 'fous', label: '♝ Fous' },
  { id: 'cavaliers', label: '♞ Cavaliers' },
  { id: 'mixte', label: '⚖ Mixtes' },
  { id: 'bases', label: 'Bases', icon: 'book' },
  { id: 'entraineur', label: 'Entraîneur', icon: 'board' },
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

type HomeProps = Props;

interface Props {
  /** Affichage compact (intégration dans un site). */
  compact?: boolean;
  mode: HomeMode;
  theme: ThemeChoice;
  /** Sous-thème (id) ou 'all'. */
  sub: string;
  /** Nombre de finales disponibles par sous-thème (id → n) et par famille. */
  counts: Map<string, number>;
  /** Motifs disponibles pour le thème choisi, et motif choisi ('all' = tous). */
  motifs: MotifChoice[];
  motif: string;
  onMotif: (id: string) => void;
  /** Devoirs en cours du groupe d'entraîneur rejoint. */
  homework: { id: string; title: string; due: string; daysLeft: number; goal: number; done: number }[];
  onHomework: (id: string) => void;
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
  onLegal: () => void;
  /** Guide de l'application. */
  onHelp: () => void;
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
  /** Course entre amis par lien (absent sans compte en ligne configuré). */
  onRace?: () => void;
  onTrain: (index: number) => void;
  /** Conseil : famille de finales la plus faible du joueur (Elo). */
  weakness: { family: string; label: string; elo: number } | null;
  onWeakness: (family: string) => void;
  /** Espace entraîneur : composer une série à partager par lien. */
  onCoach: (tab?: 'groupe' | 'suivi' | 'series') => void;
  /** Analyse libre d'une position. */
  onAnalysis: () => void;
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
  /** Groupe d'entraîneur rejoint (thème « Entraîneur ») : null si aucun. */
  coachGroup: { name: string; count: number; updatedAt: string; code: string } | null;
  /** Rejoindre un groupe par son code ; renvoie un message d'erreur ou null. */
  onJoinGroup: (code: string) => Promise<string | null>;
  onLeaveGroup: () => void;
  /** Suivi par l'entraîneur : pseudo sous lequel l'élève partage ses résultats (null : pas de partage). */
  coachTracking: { pseudo: string } | null;
  /** L'élève est suivi dans un AUTRE groupe que celui affiché (partager ici effacerait ce suivi). */
  coachElsewhere: boolean;
  shareDeclined: boolean;
  onShare: (pseudo: string) => Promise<string | null>;
  onDeclineShare: () => void;
  onStopShare: () => void;
}

function TrackingBox({
  tracking,
  elsewhere,
  declined,
  onShare,
  onDecline,
  onStop,
}: {
  tracking: { pseudo: string } | null;
  elsewhere: boolean;
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
        <Icon name="chart" className="h-3.5 w-3.5 text-emerald-300" /> Ton entraîneur suit tes résultats sur ses exercices, sous le pseudo{' '}
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
        Tes résultats ne sont pas partagés avec ton entraîneur.{' '}
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
        <strong>Partager tes résultats avec ton entraîneur ?</strong> Il verra, sous ton pseudo seulement, tes scores sur ses exercices
        (Storm, Streak, réussite, exercices ratés) pour t’aider à progresser. Personne d’autre ne les voit ; tu peux arrêter à tout moment.
      </p>
      {elsewhere && (
        <p className="rounded-lg bg-amber-500/15 px-3 py-2 text-amber-200" role="note">
          Tu es actuellement suivi dans un autre groupe. Si tu partages ici, ton suivi dans l’ancien groupe sera effacé (seulement une fois
          l’inscription ici réussie).
        </p>
      )}
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

function CoachGroupBox({
  group,
  tracked,
  onJoin,
  onLeave,
}: {
  group: HomeProps['coachGroup'];
  /** Les résultats de l'élève sont suivis par l'entraîneur : quitter les efface. */
  tracked: boolean;
  onJoin: HomeProps['onJoinGroup'];
  onLeave: () => void;
}) {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  if (group) {
    return (
      <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl border border-stone-700 p-3 text-sm text-stone-200">
        <span className="min-w-0 flex-1">
          <Icon name="board" className="h-4 w-4 text-amber-300" /> Groupe <strong>« {group.name} »</strong> · {group.count} exercice{group.count > 1 ? 's' : ''},
          du plus facile au plus difficile
          {group.updatedAt && <span className="text-stone-400"> · mis à jour le {new Date(group.updatedAt).toLocaleDateString('fr-FR')}</span>}
        </span>
        {confirmLeave ? (
          <span className="flex flex-wrap items-center gap-2 text-xs text-amber-200">
            Quitter efface tes résultats chez ton entraîneur. Quitter ?
            <button type="button" onClick={onLeave} className="rounded-md bg-red-600 px-2 py-1 font-semibold text-white hover:bg-red-500">
              Oui, quitter
            </button>
            <button type="button" onClick={() => setConfirmLeave(false)} className="rounded-md bg-stone-700 px-2 py-1 text-stone-100">
              Rester
            </button>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => (tracked ? setConfirmLeave(true) : onLeave())}
            className="text-xs text-stone-400 hover:text-stone-100 hover:underline"
          >
            Quitter le groupe
          </button>
        )}
      </div>
    );
  }
  return (
    <form
      className="mt-3 flex flex-col gap-2 rounded-xl border border-amber-500/50 bg-amber-500/10 p-3 text-sm text-stone-200"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(await onJoin(code));
        setBusy(false);
      }}
    >
      <p>
        Les exercices choisis par <strong>ton entraîneur</strong>. Entre le code de ton groupe (8 caractères), ou ouvre le lien qu’il t’a
        envoyé.
      </p>
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
      </div>
      {error && <p className="text-red-300">{error}</p>}
    </form>
  );
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
  { id: 'analyse', label: 'Analyse', icon: 'search' },
  { id: 'entraineur', label: 'Entraîneur', icon: 'board' },
];

const chip = (active: boolean) =>
  `rounded-full px-3 py-1.5 text-sm font-semibold transition ${active ? 'bg-amber-500 text-stone-900' : 'bg-stone-800 text-stone-200 hover:bg-stone-700'}`;

/** Départ légèrement sous l'Elo personnel (échauffement), arrondi à 50. */
const myStart = (elo: number) => Math.max(400, Math.round((elo - 100) / 50) * 50);

/** Une ligne de la carte « Aujourd'hui » : icône, texte, action. */
function TodayRow({ icon, tone = 'text-amber-300', children, action }: { icon: IconName; tone?: string; children: ReactNode; action?: ReactNode }) {
  return (
    <li className="flex items-center justify-between gap-3 py-2">
      <span className="flex min-w-0 items-start gap-2 text-sm text-stone-200">
        <Icon name={icon} className={`mt-0.5 h-4 w-4 shrink-0 ${tone}`} />
        <span>{children}</span>
      </span>
      {action}
    </li>
  );
}

const todayBtn = (primary = false) =>
  `shrink-0 rounded-lg px-3 py-1.5 text-sm font-bold ${primary ? 'bg-amber-500 text-stone-900 hover:bg-amber-400' : 'bg-stone-700 text-stone-100 hover:bg-stone-600'}`;

/** Ce qu'il y a à faire aujourd'hui, en une seule carte (révision, puzzle du jour, défi, point faible). */
function TodayCard({ p }: { p: Props }) {
  const review = p.review && p.review.total > 0 ? p.review : null;
  if (!review && !p.daily && !p.challenge && !p.weakness && !p.streak && !p.homework.length) return null;
  const streak = p.streak;
  return (
    <section aria-labelledby="today-title" className="mb-6 rounded-xl border border-stone-700 bg-stone-800/50 px-4 pb-2 pt-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="today-title" className="text-sm font-semibold uppercase tracking-wide text-stone-400">
          <Icon name="calendar" className="h-4 w-4" /> Aujourd’hui
        </h2>
        {streak && (
          <span
            className={`rounded-full px-3 py-1 text-xs font-bold ${streak.current > 0 ? 'bg-orange-500/20 text-orange-300' : 'bg-stone-800 text-stone-400'}`}
            title={`Meilleure série : ${streak.best} jour(s)`}
          >
            <Icon name="flame" className="h-3.5 w-3.5" /> {streak.current} jour{streak.current > 1 ? 's' : ''} d’affilée
            {!streak.playedToday && streak.current > 0 && ' · joue pour la prolonger'}
          </span>
        )}
      </div>
      <ul className="divide-y divide-stone-700/60">
        {p.homework.map((hw) => (
          <TodayRow
            key={hw.id}
            icon="board"
            action={
              hw.done >= hw.goal ? (
                <span className="flex items-center gap-1 text-sm font-semibold text-emerald-300">
                  <Icon name="check" className="h-4 w-4" /> fait
                </span>
              ) : (
                <button type="button" onClick={() => p.onHomework(hw.id)} className={todayBtn(true)}>
                  Faire
                </button>
              )
            }
          >
            <strong>Devoir : {hw.title}</strong>{' '}
            <span className="text-stone-400">
              · {hw.done}/{hw.goal} réussis · avant le {new Date(`${hw.due}T12:00:00`).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
            </span>
          </TodayRow>
        ))}
        {review && (
          <TodayRow
            icon="refresh"
            action={
              review.due > 0 ? (
                <button type="button" onClick={p.onReview} className={todayBtn(true)}>
                  Réviser
                </button>
              ) : (
                <span className="text-xs text-stone-400">rien à revoir aujourd’hui</span>
              )
            }
          >
            <strong>Révision des erreurs :</strong>{' '}
            {review.spaced ? `${review.due} à revoir` : `${review.total} à retravailler`}
            <span className="text-stone-400"> · {review.total} en cours</span>
          </TodayRow>
        )}
        {p.daily && (
          <TodayRow
            icon="pin"
            tone="text-sky-300"
            action={
              p.daily.result === null ? (
                <button type="button" onClick={p.onDaily} className={todayBtn()} title={p.daily.title}>
                  Jouer
                </button>
              ) : (
                <span className={`flex items-center gap-1 text-sm font-semibold ${p.daily.result ? 'text-emerald-300' : 'text-red-300'}`}>
                  <Icon name={p.daily.result ? 'check' : 'cross'} className="h-4 w-4" /> {p.daily.result ? 'réussi' : 'raté, à revoir'}
                </span>
              )
            }
          >
            <strong>Puzzle du jour</strong> <span className="text-stone-400">· Elo {p.daily.rating}</span>
          </TodayRow>
        )}
        {p.challenge && (
          <TodayRow
            icon="flag"
            tone="text-sky-300"
            action={
              p.challenge.played < p.challenge.total ? (
                <button type="button" onClick={p.onChallenge} className={todayBtn()}>
                  {p.challenge.played === 0 ? 'Jouer' : 'Continuer'}
                </button>
              ) : (
                <span className="flex items-center gap-1 text-sm font-semibold text-emerald-300">
                  <Icon name="check" className="h-4 w-4" /> {p.challenge.solved}/{p.challenge.total} réussies
                </span>
              )
            }
          >
            <strong>Défi de la semaine</strong>{' '}
            <span className="text-stone-400">
              · {p.challenge.played}/{p.challenge.total} jouées<span className="hidden sm:inline">, mêmes finales pour tout le monde</span>
            </span>
          </TodayRow>
        )}
        {p.weakness && (
          <TodayRow
            icon="target"
            tone="text-sky-300"
            action={
              <button type="button" onClick={() => p.onWeakness(p.weakness!.family)} className={todayBtn()}>
                Storm ciblé
              </button>
            }
          >
            <strong>Point faible :</strong> {p.weakness.label.toLowerCase()} <span className="text-stone-400">· Elo {p.weakness.elo}</span>
          </TodayRow>
        )}
      </ul>
    </section>
  );
}

/** Navigation basse (téléphone) : accueil, progression, classement, guide. */
function BottomNav({ p }: { p: Props }) {
  const item = 'flex flex-1 flex-col items-center gap-0.5 py-2 text-xs font-semibold text-stone-300 hover:text-stone-50';
  return (
    <nav
      aria-label="Navigation principale"
      className="fixed inset-x-0 bottom-0 z-20 flex border-t border-stone-800 bg-stone-900/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden"
    >
      <button type="button" className={`${item} text-amber-300`} aria-current="page" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
        <Icon name="home" className="h-5 w-5" /> Accueil
      </button>
      <button type="button" className={item} onClick={() => p.onProgress(true)}>
        <Icon name="chart" className="h-5 w-5" /> Progrès
      </button>
      {p.onLeaderboard && (
        <button type="button" className={item} onClick={p.onLeaderboard}>
          <Icon name="trophy" className="h-5 w-5" /> Classement
        </button>
      )}
      <button type="button" className={item} onClick={p.onHelp}>
        <Icon name="help" className="h-5 w-5" /> Guide
      </button>
    </nav>
  );
}

export function HomeScreen(p: Props) {
  const rush = p.mode !== 'training';
  const [trainTab, setTrainTab] = useState<TrainTab>(() => getSettings().trainingTab);
  const [allMotifs, setAllMotifs] = useState(false);
  const pickTrainTab = (t: TrainTab) => {
    setTrainTab(t);
    setSetting('trainingTab', t);
  };
  return (
    <div className={`mx-auto max-w-5xl px-4 ${p.compact ? 'py-4' : 'pb-24 pt-6 sm:py-8'}`}>
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
            className="hidden rounded-lg bg-stone-800 px-3 py-2 text-sm font-semibold text-stone-100 hover:bg-stone-700 sm:block"
            title="Classement des joueurs"
            aria-label="Classement des joueurs"
          >
            <Icon name="trophy" className="h-5 w-5" />
          </button>
        )}
        <button
          type="button"
          onClick={() => p.onProgress(true)}
          className={`${p.compact ? '' : 'hidden sm:block'} rounded-lg bg-stone-800 px-3 py-2 text-sm font-semibold text-stone-100 hover:bg-stone-700`}
          title="Ma progression (statistiques, Elo, badges)"
          aria-label="Ma progression"
        >
          <Icon name="chart" className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={p.onHelp}
          className={`${p.compact ? '' : 'hidden sm:block'} rounded-lg bg-stone-800 px-3 py-2 text-sm font-semibold text-stone-100 hover:bg-stone-700`}
          title="Guide de l’application"
          aria-label="Guide de l’application"
        >
          <Icon name="help" className="h-5 w-5" />
        </button>
        <ProfileMenu players={p.players} playerId={p.playerId} accountEmail={p.accountEmail} onSelect={p.onSelectPlayer} onManage={() => p.onProgress(false)} />
        <SettingsMenu spaced={p.review?.spaced} onSpaced={p.review ? p.onSpaced : undefined} />
        </div>
      </header>

      {!p.compact && <TodayCard p={p} />}
      {p.compact && p.review && p.review.due > 0 && (
        <button type="button" onClick={p.onReview} className="mb-4 rounded-lg bg-amber-500 px-4 py-2 font-bold text-stone-900 hover:bg-amber-400">
          <Icon name="refresh" className="h-4 w-4" /> Réviser mes erreurs ({p.review.due})
        </button>
      )}

      <section className="grid grid-cols-3 gap-2 sm:gap-3" aria-label="Mode de jeu">
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => p.onMode(m.id)}
            aria-pressed={p.mode === m.id}
            className={`rounded-xl p-3 text-left transition sm:p-4 ${p.mode === m.id ? 'bg-amber-500 text-stone-900' : 'bg-stone-800 text-stone-100 hover:bg-stone-700'}`}
          >
            <div className="flex flex-col items-center gap-1 text-sm font-black sm:flex-row sm:gap-2 sm:text-2xl">
              <Icon name={m.icon} className="h-6 w-6" /> {m.title}
            </div>
            <div className={`mt-1 hidden text-sm sm:block ${p.mode === m.id ? 'text-stone-800' : 'text-stone-400'}`}>{m.text}</div>
          </button>
        ))}
      </section>

      {rush ? (
        <section className="mt-6 flex flex-col gap-5">
          <div>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-stone-400">Thème</h2>
            <div className="flex flex-wrap gap-2">
              {THEMES.map((t) => (
                <button key={t.id} type="button" className={chip(p.theme === t.id)} aria-pressed={p.theme === t.id} onClick={() => p.onTheme(t.id)}>
                  {t.icon && <Icon name={t.icon} className="mr-1 h-4 w-4" />}
                  {t.label}
                </button>
              ))}
            </div>
            {p.theme === 'entraineur' && <CoachGroupBox group={p.coachGroup} tracked={p.coachTracking !== null} onJoin={p.onJoinGroup} onLeave={p.onLeaveGroup} />}
            {p.theme === 'entraineur' && p.coachGroup && (
              <TrackingBox tracking={p.coachTracking} elsewhere={p.coachElsewhere} declined={p.shareDeclined} onShare={p.onShare} onDecline={p.onDeclineShare} onStop={p.onStopShare} />
            )}
            {p.theme !== 'mix' && p.theme !== 'bases' && p.theme !== 'entraineur' && (
              <div className="mt-3 flex flex-wrap gap-2 border-l-2 border-stone-700 pl-3" aria-label="Sous-thèmes">
                <button type="button" className={subChip(p.sub === 'all')} aria-pressed={p.sub === 'all'} onClick={() => p.onSub('all')}>
                  Tous <Count n={p.counts.get(p.theme)} />
                </button>
                {SUBCATEGORIES.filter((s) => s.family === p.theme && (p.counts.get(s.id) ?? 0) >= CONFIG.minPuzzlesPerTheme).map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    title={s.title}
                    className={subChip(p.sub === s.id)} aria-pressed={p.sub === s.id}
                    onClick={() => p.onSub(s.id)}
                  >
                    <span className="text-base leading-none">{s.label}</span> <Count n={p.counts.get(s.id)} />
                  </button>
                ))}
                <button
                  type="button"
                  disabled={(p.counts.get(`${p.theme}-autres`) ?? 0) < CONFIG.minPuzzlesPerTheme}
                  className={subChip(p.sub === `${p.theme}-autres`)} aria-pressed={p.sub === `${p.theme}-autres`}
                  onClick={() => p.onSub(`${p.theme}-autres`)}
                >
                  Autres <Count n={p.counts.get(`${p.theme}-autres`)} />
                </button>
              </div>
            )}
          </div>
          {p.motifs.length > 0 && (
            <div>
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-stone-400">
                Motif <span className="font-normal normal-case text-stone-400">(facultatif)</span>
              </h2>
              <div className="flex flex-wrap gap-2" aria-label="Motifs">
                <button type="button" className={subChip(p.motif === 'all')} aria-pressed={p.motif === 'all'} onClick={() => p.onMotif('all')}>
                  Tous
                </button>
                {(allMotifs ? p.motifs : p.motifs.filter((m, i) => i < 6 || m.id === p.motif)).map((m) => (
                  <button key={m.id} type="button" className={subChip(p.motif === m.id)} aria-pressed={p.motif === m.id} onClick={() => p.onMotif(m.id)}>
                    {m.label} <Count n={m.n} />
                  </button>
                ))}
                {p.motifs.length > 6 && (
                  <button type="button" className="rounded-lg px-2.5 py-1 text-sm font-semibold text-sky-400 hover:underline" aria-expanded={allMotifs} onClick={() => setAllMotifs((v) => !v)}>
                    {allMotifs ? 'Moins' : `Plus (${p.motifs.length - 6})`}
                  </button>
                )}
              </div>
            </div>
          )}
          <div>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-stone-400">Niveau de départ <span className="font-normal normal-case text-stone-400">(facultatif)</span></h2>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className={chip(p.startRating === null)} aria-pressed={p.startRating === null}
                onClick={() => p.onStartRating(null)}
                title="Départ avec les exercices les plus faciles du thème ; la difficulté monte à chaque réussite"
              >
                Automatique
              </button>
              {CONFIG.startLevels.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  className={chip(p.startRating === l.rating)} aria-pressed={p.startRating === l.rating}
                  onClick={() => p.onStartRating(p.startRating === l.rating ? null : l.rating)}
                >
                  {l.label} ({l.rating})
                </button>
              ))}
              {p.myLevel !== null && (
                <button
                  type="button"
                  className={chip(p.startRating === myStart(p.myLevel))} aria-pressed={p.startRating === myStart(p.myLevel)}
                  onClick={() => p.onStartRating(p.startRating === myStart(p.myLevel!) ? null : myStart(p.myLevel!))}
                  title="Départ un peu sous votre Elo personnel pour ce thème"
                >
                  <Icon name="target" className="h-4 w-4" /> Mon niveau ({myStart(p.myLevel)})
                </button>
              )}
            </div>
          </div>
          {/* Sur téléphone, « Jouer » reste collé en bas de l'écran. */}
          <div className={`sticky ${p.compact ? 'bottom-0' : 'bottom-16'} z-10 -mx-4 flex flex-wrap items-center gap-4 border-t border-stone-800 bg-stone-900/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none`}>
            <button
              type="button"
              disabled={!p.poolSize}
              onClick={p.onStart}
              className="rounded-xl bg-amber-500 px-8 py-4 text-xl font-black text-stone-900 hover:bg-amber-400 disabled:opacity-40"
            >
              <Icon name="play" className="h-5 w-5" /> Jouer
            </button>
            {p.onRace && (
              <button
                type="button"
                onClick={p.onRace}
                className="rounded-xl border border-sky-500/60 px-5 py-4 text-lg font-bold text-sky-300 hover:bg-sky-500/10"
                title="Crée une course : tes amis la rejoignent par un lien et jouent les mêmes finales"
              >
                <Icon name="flag" className="h-5 w-5" /> Course entre amis
              </button>
            )}
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
                {g.label} <span className="text-sm text-stone-400">· {done}/{items.length}</span>{done === items.length && <Icon name="check" className="ml-1 h-4 w-4 text-emerald-300" label="thème terminé" />}
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
                        {p.basicsDone.has(b.id) && <Icon name="check" className="mr-1 h-4 w-4 text-emerald-300" label="déjà réussie" />}
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
            {THEMES.filter((t) => t.id !== 'bases' && t.id !== 'entraineur').map((t) => (
              <button key={t.id} type="button" className={chip(p.theme === t.id)} aria-pressed={p.theme === t.id} onClick={() => p.onTheme(t.id)}>
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
        {trainTab === 'analyse' && (
        <section className="mt-4 flex flex-col gap-3 rounded-xl bg-stone-800/60 p-4">
          <h2 className="text-lg font-bold text-stone-50"><Icon name="search" className="h-5 w-5 text-amber-300" /> Analyse libre</h2>
          <p className="text-sm text-stone-400">
            Colle la position d’une de tes parties (FEN), joue les coups des deux camps : la table de finales donne le résultat exact de
            chaque coup (jusqu’à 7 pièces), Stockfish évalue au-delà. Après une position ratée, le bouton « Analyser » l’ouvre ici.
          </p>
          <button type="button" onClick={p.onAnalysis} className="self-start rounded-xl bg-amber-500 px-6 py-3 font-black text-stone-900 hover:bg-amber-400">
            <Icon name="search" className="h-5 w-5" /> Ouvrir l’analyse
          </button>
        </section>
        )}
        {trainTab === 'entraineur' && (
        <section className="mt-4 grid gap-3 sm:grid-cols-2">
          <button type="button" onClick={() => p.onCoach('groupe')} className="flex flex-col gap-2 rounded-xl border border-amber-500/50 bg-amber-500/10 p-4 text-left hover:bg-amber-500/20">
            <span className="text-lg font-bold text-stone-50">
              <Icon name="library" className="h-5 w-5 text-amber-300" /> Exercices de mon groupe
            </span>
            <span className="text-sm text-stone-300">
              Importe tes exercices en PGN : tes élèves les jouent en Storm et en Streak (thème « Entraîneur »), du plus facile au plus
              difficile. Compte nécessaire.
            </span>
            <span className="mt-auto text-sm font-semibold text-amber-300">Importer mes PGN →</span>
          </button>
          <button type="button" onClick={() => p.onCoach('series')} className="flex flex-col gap-2 rounded-xl border border-stone-700 p-4 text-left hover:bg-stone-800">
            <span className="text-lg font-bold text-stone-50">
              <Icon name="link" className="h-5 w-5 text-amber-300" /> Séries par lien
            </span>
            <span className="text-sm text-stone-300">Choisis quelques positions, envoie-les par lien ou imprime la fiche ; tes élèves te renvoient leur résultat.</span>
            <span className="mt-auto text-sm font-semibold text-amber-300">Créer une série →</span>
          </button>
        </section>
        )}
        </>
      )}

      {!p.compact && (
        <>
        <footer className="mt-10 text-xs text-stone-400">
          Positions de parties réelles : base de puzzles Lichess (licence CC0). Jugement : table de finales Syzygy (API Lichess)
          et Stockfish. Échiquier : chessground (Lichess). Logiciel libre sous licence GPL v3.
          <div className="mt-2 flex flex-wrap gap-4">
            <button type="button" onClick={p.onPrivacy} className="text-sky-400 hover:underline">
              <Icon name="lock" className="h-4 w-4" /> Données personnelles
            </button>
            <button type="button" onClick={p.onLegal} className="text-sky-400 hover:underline">
              <Icon name="scale" className="h-4 w-4" /> Mentions légales
            </button>
            <a href="presentation.html" className="text-sky-400 hover:underline">
              <Icon name="book" className="h-4 w-4" /> Présentation de l’appli
            </a>
            {SOURCE_URL && (
              <a href={SOURCE_URL} target="_blank" rel="noreferrer" className="text-sky-400 hover:underline">
                <Icon name="code" className="h-4 w-4" /> Code source (GPL v3)
              </a>
            )}
          </div>
        </footer>
        </>
      )}
      {!p.compact && <BottomNav p={p} />}
    </div>
  );
}
