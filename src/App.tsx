import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { subcategoryOf } from './core/categories';
import { CONFIG, rushRules, TECHNIQUE_RULES, TRAINING_RULES } from './core/config';
import { countPieces } from './core/fen';
import { applyUci } from './core/chessRules';
import { dueNow, maintenanceDue, reviewItems } from './core/review';
import { recordExam } from './core/exam';
import type { ErrorType } from './core/errorTypes';
import { ratingsByKey } from './core/playerRating';
import { dailyPick, dayKey, dayStreak } from './core/motivation';
import { decodeSeries, type Series } from './core/series';
import { CHALLENGE_SIZE, challengePick, challengeProgress, weekKey } from './core/challenge';
import { FAMILY_LABEL, familyOf } from './core/material';
import type { Puzzle } from './core/types';
import { loadLichessPuzzles } from './data/lichessRepository';
import { BASICS_GROUPS, PUZZLES_MOCK } from './data/puzzlesMock';
import { LESSONS } from './data/lessons';
import { readEmbedOptions } from './embed';
import { GameScreen } from './screens/GameScreen';
import { HomeScreen, type HomeMode, type ThemeChoice } from './screens/HomeScreen';
import { RushScreen } from './screens/RushScreen';
import { getBest, scoreKey } from './services/highScores';
import { judge } from './services/judge';
import { tablebase } from './services/tablebaseClient';
import { stockfish } from './services/stockfish';
import { useCloudAccount } from './hooks/useCloudAccount';
import { openedFromEmailLink } from './services/cloud';
import type { Run } from './services/playerStore';
import { playerStore } from './services/players';
import { linkedUser } from './services/sync';
import { scheduleUserDataSync, USER_DATA_EVENT } from './services/userDataSync';
import { getSettings, setSetting } from './services/settings';
import { UpdateBanner } from './components/UpdateBanner';
import { WelcomeDialog } from './components/WelcomeDialog';

type Screen = { name: 'home' } | { name: 'training'; index: number } | { name: 'rush'; run: number } | { name: 'progress'; stats?: boolean } | { name: 'privacy' } | { name: 'review'; ids: string[]; index: number; maintenance?: boolean } | { name: 'technique'; id: string; n: number } | { name: 'daily' } | { name: 'leaderboard' } | { name: 'judgeQuiz' } | { name: 'lesson'; id: string } | { name: 'otherSide'; puzzle: Puzzle; index: number } | { name: 'challenge'; index: number } | { name: 'coach' } | { name: 'series' } | { name: 'seriesPlay'; index: number } | { name: 'exam'; group: string; index: number } | { name: 'examEnd'; group: string } | { name: 'analysis'; fen?: string; moves?: string[]; back?: Screen };

const embed = readEmbedOptions();

// Écrans secondaires chargés à part : l'accueil et le jeu s'affichent plus vite.
const loadProgress = () => import('./screens/ProgressScreen');
const loadPrivacy = () => import('./screens/PrivacyScreen');
const loadLeaderboard = () => import('./screens/LeaderboardScreen');
const CoachScreen = lazy(() => import('./screens/CoachScreen').then((m) => ({ default: m.CoachScreen })));
const SeriesScreen = lazy(() => import('./screens/SeriesScreen').then((m) => ({ default: m.SeriesScreen })));
const LessonScreen = lazy(() => import('./screens/LessonScreen').then((m) => ({ default: m.LessonScreen })));
const AnalysisScreen = lazy(() => import('./screens/AnalysisScreen').then((m) => ({ default: m.AnalysisScreen })));
const ExamScreen = lazy(() => import('./screens/ExamScreen').then((m) => ({ default: m.ExamScreen })));
const JudgeQuizScreen = lazy(() => import('./screens/JudgeQuizScreen').then((m) => ({ default: m.JudgeQuizScreen })));
const LeaderboardScreen = lazy(() => loadLeaderboard().then((m) => ({ default: m.LeaderboardScreen })));
const ProgressScreen = lazy(() => loadProgress().then((m) => ({ default: m.ProgressScreen })));
const PrivacyScreen = lazy(() => loadPrivacy().then((m) => ({ default: m.PrivacyScreen })));
// … puis préchargés quelques secondes après l'ouverture (et gardés pour l'usage hors ligne).
if (typeof window !== 'undefined')
  window.setTimeout(() => {
    void loadProgress().catch(() => {});
    void loadPrivacy().catch(() => {});
    void loadLeaderboard().catch(() => {});
  }, 3_000);

/** Famille et sous-catégorie calculées une fois pour toutes au chargement. */
function classify(p: Puzzle): Puzzle {
  const family = p.family ?? familyOf(p.fen);
  return { ...p, family, subcategory: subcategoryOf(p.fen, family) };
}
// Ordre du parcours conseillé (thème par thème), puis toute position non rangée.
const PARCOURS = BASICS_GROUPS.flatMap((g) => g.ids);
const rank = (id: string) => (PARCOURS.includes(id) ? PARCOURS.indexOf(id) : PARCOURS.length);
const BASICS = [...PUZZLES_MOCK].sort((a, b) => rank(a.id) - rank(b.id)).map(classify);

/**
 * Sous-thèmes exacts couverts par les « Bases » (Lucena, Philidor, dame contre
 * pion…). Les catégories fourre-tout « -autres » sont exclues : elles
 * mélangeraient des milliers de finales sans rapport avec les bases.
 */
const BASICS_SUBS = new Set(BASICS.map((p) => p.subcategory).filter((s) => s && !s.endsWith('-autres')));

/**
 * Puzzles des modes classés (Storm / Streak) : uniquement la base Lichess,
 * dont l'Elo est calculé par Lichess (Glicko-2). Les « Bases », à l'Elo
 * seulement estimé, restent réservées à l'entraînement ; le thème « Bases »
 * tire donc des puzzles Lichess de même matériel.
 */
function buildPool(theme: ThemeChoice, sub: string, lichess: Puzzle[]): Puzzle[] {
  if (theme === 'bases') return lichess.filter((p) => BASICS_SUBS.has(p.subcategory));
  if (theme === 'mix') return lichess;
  return lichess.filter((p) => p.family === theme && (sub === 'all' || p.subcategory === sub));
}

/** Série d'entraîneur reçue par lien (#serie=…), lue une fois au chargement. */
const SERIES: Series | null = typeof window === 'undefined' ? null : decodeSeries(window.location.hash, (id) => BASICS.some((b) => b.id === id));
const SERIES_PUZZLES: Puzzle[] = (SERIES?.items ?? []).map((it, i) =>
  'id' in it
    ? BASICS.find((b) => b.id === it.id)!
    : classify({
        id: `serie-${i + 1}`,
        title: it.title ?? `Position ${i + 1}`,
        fen: it.fen,
        objective: it.objective,
        collection: 'bases',
        level: 'intermediaire',
        rating: 1500,
        concept: 'Position choisie par ton entraîneur : cherche le plan avant de jouer.',
      }),
);

export default function App() {
  const [screen, setScreen] = useState<Screen>(SERIES ? { name: 'series' } : { name: 'home' });
  // Présentation au tout premier lancement (aucun profil sur l'appareil, hors intégration et lien de série).
  const [welcome, setWelcome] = useState(() => !embed.embed && !SERIES && !getSettings().welcomed && playerStore.listPlayers().length === 0);
  const closeWelcome = useCallback(() => {
    setWelcome(false);
    setSetting('welcomed', true);
  }, []);
  const [seriesResults, setSeriesResults] = useState<(boolean | null)[]>(() => SERIES_PUZZLES.map(() => null));
  // Derniers choix mémorisés (sauf réglages imposés par une intégration dans un site).
  const saved = getSettings();
  const [mode, setMode] = useState<HomeMode>(embed.mode ?? ((saved.lastMode as HomeMode | null) ?? 'storm'));
  const [theme, setTheme] = useState<ThemeChoice>((embed.theme as ThemeChoice) ?? ((saved.lastTheme as ThemeChoice | null) ?? 'mix'));
  const [sub, setSub] = useState<string>(embed.sub ?? saved.lastSub ?? 'all');
  // Niveau de départ facultatif : null = automatique (exercices les plus faciles du thème, puis ça monte).
  const [startRating, setStartRating] = useState<number | null>(embed.level ?? saved.lastStart);
  useEffect(() => {
    setSetting('lastMode', mode);
    setSetting('lastTheme', theme);
    setSetting('lastSub', sub);
    setSetting('lastStart', startRating);
  }, [mode, theme, sub, startRating]);
  const [lichess, setLichess] = useState<Puzzle[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(() => {
    // Ouverture : le profil en cours, sinon le profil relié au compte, sinon le dernier utilisé
    // (« invité » ne vaut que pour la visite en cours).
    const current = playerStore.currentPlayerId();
    if (current) return current;
    const players = playerStore.listPlayers();
    const pick = players.find((p) => linkedUser(p.id))?.id ?? playerStore.lastPlayerId() ?? (players.length === 1 ? players[0].id : null);
    if (pick) playerStore.setCurrentPlayer(pick);
    return pick;
  });

  useEffect(() => {
    loadLichessPuzzles()
      .then((list) => setLichess(list.map(classify)))
      .catch((e: unknown) => setLoadError(e instanceof Error ? e.message : String(e)));
  }, []);

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of lichess ?? []) {
      map.set(p.family!, (map.get(p.family!) ?? 0) + 1);
      map.set(p.subcategory!, (map.get(p.subcategory!) ?? 0) + 1);
    }
    return map;
  }, [lichess]);

  // Sous-thème trop pauvre (< minPuzzlesPerTheme, ex. lien ▶ ou intégration) : on joue toute la famille.
  const effSub = sub === 'all' || !lichess || (counts.get(sub) ?? 0) >= CONFIG.minPuzzlesPerTheme ? sub : 'all';
  const pool = useMemo(() => (lichess ? buildPool(theme, effSub, lichess) : null), [theme, effSub, lichess]);
  const themeKey = effSub === 'all' ? theme : `${theme}/${effSub}`;
  const autoStart = useMemo(() => {
    if (!pool?.length) return CONFIG.startLevels[0].rating;
    const min = pool.reduce((m, p) => Math.min(m, p.rating), Infinity);
    return Math.max(400, Math.floor(min / 50) * 50);
  }, [pool]);
  const effectiveStart = startRating ?? autoStart;
  // Records : « automatique » a sa propre catégorie (clé 0).
  const key = mode === 'training' ? '' : scoreKey(mode, `${playerId ?? 'invite'}|${themeKey}`, startRating ?? 0);
  const shell = (content: ReactNode) => (
    <main className="min-h-dvh bg-stone-900 text-stone-100">
      <UpdateBanner />
      <Suspense fallback={<p className="p-6 text-center text-stone-400">Chargement…</p>}>{content}</Suspense>
    </main>
  );

  const changePlayer = useCallback((id: string | null) => {
    playerStore.setCurrentPlayer(id);
    setPlayerId(id);
  }, []);

  /**
   * Premier lancement (aucun profil sur cet appareil) : un profil « Joueur » est
   * créé à la première partie, pour que rien ne soit perdu. Si des profils
   * existent et que l'invité a été choisi exprès, on respecte ce choix.
   */
  const ensurePlayer = useCallback((): string | null => {
    const current = playerStore.currentPlayerId();
    if (current) return current;
    if (playerStore.listPlayers().length > 0) return null;
    const created = playerStore.createPlayer('Joueur');
    changePlayer(created.id);
    return created.id;
  }, [changePlayer]);

  const onAttempt = useCallback(
    (puzzle: Puzzle, success: boolean, m: 'storm' | 'streak' | 'training' | 'review' | 'daily' | 'challenge', e?: ErrorType) => {
      const playerId = ensurePlayer();
      if (!playerId) return;
      playerStore.addAttempt(playerId, {
        t: Date.now(),
        m,
        p: puzzle.id,
        r: puzzle.rating,
        c: puzzle.subcategory ?? subcategoryOf(puzzle.fen),
        f: puzzle.family ?? familyOf(puzzle.fen),
        ok: success,
        ...(e ? { e } : {}),
      });
    },
    [ensurePlayer],
  );
  const onRushAttempt = useCallback((p: Puzzle, ok: boolean, e?: ErrorType) => onAttempt(p, ok, mode === 'streak' ? 'streak' : 'storm', e), [onAttempt, mode]);
  const onTrainingAttempt = useCallback((p: Puzzle, ok: boolean, e?: ErrorType) => onAttempt(p, ok, 'training', e), [onAttempt]);
  const onRunEnd = useCallback(
    (run: Omit<Run, 't'>) => {
      const id = ensurePlayer();
      if (id) playerStore.addRun(id, { t: Date.now(), ...run });
    },
    [ensurePlayer],
  );

  const account = useCloudAccount(playerStore, playerId, changePlayer);
  // Arrivée par le lien « mot de passe oublié » : ouvrir l'écran du compte.
  useEffect(() => {
    if (account.recovery || (account.message?.tone === 'error' && openedFromEmailLink)) setScreen({ name: 'progress' });
  }, [account.recovery, account.message]);

  // Puzzles des parties récentes du joueur (évités tant qu'il reste du choix).
  const recentlySeen = useMemo(
    () => new Set(playerId ? playerStore.history(playerId).attempts.slice(-1500).map((a) => a.p) : []),
    // Recalculé à chaque nouvelle partie.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [playerId, screen],
  );

  // --- Révision des erreurs -------------------------------------------------
  const puzzlesById = useMemo(() => new Map([...BASICS, ...(lichess ?? [])].map((p) => [p.id, p])), [lichess]);
  const [spaced, setSpaced] = useState(() => getSettings().spacedRepetition);
  const reviewAll = useMemo(
    () => (playerId ? reviewItems(playerStore.history(playerId).attempts).filter((i) => puzzlesById.has(i.id)) : []),
    // Recalculé à chaque changement d'écran (après une partie ou une révision).
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [playerId, puzzlesById, screen],
  );
  // --- Motivation : série de jours et puzzle du jour ----------------------------
  const motivation = useMemo(() => {
    const now = Date.now();
    const daily = dailyPick(lichess ?? [], now);
    if (!playerId) return { streak: null, daily, dailyResult: null as boolean | null };
    const acts = playerStore.history(playerId).attempts;
    const today = dayKey(now);
    const dailyTry = daily ? acts.find((a) => a.m === 'daily' && a.p === daily.id && dayKey(a.t) === today) : undefined;
    return { streak: dayStreak(acts, now), daily, dailyResult: dailyTry ? dailyTry.ok : null };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerId, lichess, screen]);
  // --- Défi de la semaine : mêmes 10 positions pour tous, 1re tentative seulement ---
  const challenge = useMemo(() => {
    const now = Date.now();
    const picks = challengePick(lichess ?? [], now);
    const acts = playerId ? playerStore.history(playerId).attempts : [];
    return { picks, week: weekKey(now), ...challengeProgress(acts, picks, now) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerId, lichess, screen]);
  const challengeRecorded = useRef(new Set<string>());
  const onChallengeAttempt = useCallback(
    (p: Puzzle, ok: boolean, e?: ErrorType) => {
      if (challenge.results.has(p.id) || challengeRecorded.current.has(p.id)) return;
      challengeRecorded.current.add(p.id);
      onAttempt(p, ok, 'challenge', e);
    },
    [challenge, onAttempt],
  );
  const dailyRecorded = useRef(false);
  const onDailyAttempt = useCallback(
    (p: Puzzle, ok: boolean, e?: ErrorType) => {
      // Seule la première tentative du jour compte.
      if (dailyRecorded.current || motivation.dailyResult !== null) return;
      dailyRecorded.current = true;
      onAttempt(p, ok, 'daily', e);
    },
    [onAttempt, motivation.dailyResult],
  );

  // --- Mode technique : positions ≤ 7 pièces jouées jusqu'au bout ------------
  const techniquePool = useMemo(
    () =>
      (lichess ?? []).filter(
        (p) => countPieces(p.fen) <= CONFIG.tablebase.maxPieces && (theme === 'mix' || theme === 'bases' || p.family === theme),
      ),
    [lichess, theme],
  );
  const techniqueSeen = useRef(new Set<string>());
  const nextTechnique = useCallback(
    (n: number) => {
      let choices = techniquePool.filter((p) => !techniqueSeen.current.has(p.id));
      if (!choices.length) {
        techniqueSeen.current = new Set();
        choices = techniquePool;
      }
      const pick = choices[Math.floor(Math.random() * choices.length)];
      if (!pick) return;
      techniqueSeen.current.add(pick.id);
      setScreen({ name: 'technique', id: pick.id, n });
    },
    [techniquePool],
  );

  // Elo personnel du thème choisi (pour le départ « mon niveau »).
  const myLevel = useMemo(() => {
    if (!playerId) return null;
    const ratings = ratingsByKey(playerStore.history(playerId).attempts);
    const key = theme === 'mix' || theme === 'bases' ? 'all' : effSub !== 'all' ? `c:${effSub}` : `f:${theme}`;
    const r = ratings.get(key);
    return r && !r.provisional ? r.r : null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerId, theme, effSub, screen]);
  // Conseil automatique : la famille de finales la plus faible (Elo le plus bas,
  // au moins 10 puzzles joués et 2 familles comparables), à retravailler en Storm.
  const weakness = useMemo(() => {
    if (!playerId) return null;
    const ratings = ratingsByKey(playerStore.history(playerId).attempts);
    const rated = (['pions', 'tours', 'dames', 'fous', 'cavaliers', 'mixte'] as const)
      .map((f) => ({ family: f, rating: ratings.get(`f:${f}`) }))
      .filter((x) => x.rating && x.rating.games >= 10);
    if (rated.length < 2) return null;
    const worst = rated.reduce((a, b) => (b.rating!.r < a.rating!.r ? b : a));
    return { family: worst.family, label: FAMILY_LABEL[worst.family], elo: worst.rating!.r };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerId, screen]);
  const reviewDue = useMemo(() => (spaced ? dueNow(reviewAll, Date.now()) : reviewAll), [reviewAll, spaced]);
  const reviewFull = useMemo(() => new Set(reviewAll.filter((i) => i.full).map((i) => i.id)), [reviewAll]);
  const reviewed = useRef(new Set<string>()); // une seule tentative comptée par puzzle et par révision
  const startReview = useCallback((ids: string[]) => {
    reviewed.current = new Set();
    // Sans répétition espacée : ordre varié.
    const list = spaced ? ids : [...ids].sort(() => Math.random() - 0.5);
    if (list.length) setScreen({ name: 'review', ids: list, index: 0 });
  }, [spaced]);
  const onReviewAttempt = useCallback(
    (p: Puzzle, ok: boolean, e?: ErrorType) => {
      if (reviewed.current.has(p.id)) return;
      reviewed.current.add(p.id);
      onAttempt(p, ok, 'review', e);
    },
    [onAttempt],
  );

  // Positions « Bases » déjà réussies (entraînement) par ce joueur.
  const basicsDone = useMemo(
    () =>
      new Set(
        playerId
          ? playerStore
              .history(playerId)
              .attempts.filter((a) => a.ok && a.p.startsWith('bases-'))
              .map((a) => a.p)
          : [],
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- recalculé au retour à l'accueil
    [playerId, screen],
  );

  // Entretien des acquis : Bases réussies à rejouer (7, 21, 60 puis 120 jours).
  const maintenance = useMemo(
    () => (playerId ? maintenanceDue(playerStore.history(playerId).attempts, PARCOURS, Date.now()).map((i) => i.id) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- recalculé au retour à l'accueil
    [playerId, screen],
  );

  // Tests de maîtrise des thèmes « Bases » (bilans gardés sur cet appareil, par profil).
  const examKey = playerId ?? 'invite';
  const [exams, setExams] = useState(() => getSettings().exams);
  useEffect(() => {
    // Bilans mis à jour depuis le compte (autre appareil).
    const reload = () => setExams(getSettings().exams);
    window.addEventListener(USER_DATA_EVENT, reload);
    return () => window.removeEventListener(USER_DATA_EVENT, reload);
  }, []);
  const [examResults, setExamResults] = useState<(boolean | null)[]>([]);
  const startExam = useCallback((group: string) => {
    const g = BASICS_GROUPS.find((x) => x.id === group);
    if (!g) return;
    setExamResults(g.ids.map(() => null));
    setScreen({ name: 'exam', group, index: 0 });
  }, []);
  const finishExam = useCallback(
    (group: string, results: (boolean | null)[]) => {
      const all = getSettings().exams;
      const mine = all[examKey] ?? {};
      const next = { ...all, [examKey]: { ...mine, [group]: recordExam(mine[group], results, Date.now()) } };
      setSetting('exams', next);
      setExams(next);
      scheduleUserDataSync();
      setScreen({ name: 'examEnd', group });
    },
    [examKey],
  );

  /**
   * « L'autre camp » : l'ordinateur joue le premier coup du camp gagnant (le meilleur
   * selon la table), puis le joueur défend la position perdue le plus longtemps possible.
   */
  const playOtherSide = useCallback(async (index: number) => {
    const base = BASICS[index];
    const uci = await judge.hint(base.fen).catch(() => null);
    const first = uci ? applyUci(base.fen, uci) : null;
    if (!first) return;
    setScreen({
      name: 'otherSide',
      index,
      puzzle: {
        ...base,
        id: `${base.id}~defense`,
        title: `${base.title} — l’autre camp`,
        fen: first.fen,
        lastMove: first.uci,
        objective: 'draw',
        resist: true,
        concept: 'Position perdue avec le meilleur jeu : à chaque coup, choisis la défense qui retarde le plus l’échéance et guette l’erreur adverse.',
      },
    });
  }, []);

  const playerName = playerStore.listPlayers().find((p) => p.id === playerId)?.name ?? null;

  if (screen.name === 'privacy') {
    return shell(<PrivacyScreen onHome={() => setScreen({ name: 'home' })} />);
  }

  if (screen.name === 'lesson') {
    const lesson = LESSONS.find((l) => l.id === screen.id);
    if (lesson) {
      return shell(
        <LessonScreen
          key={lesson.id}
          lesson={lesson}
          onHome={() => setScreen({ name: 'home' })}
          onPractice={() => {
            const index = BASICS.findIndex((b) => b.id === lesson.practiceId);
            setScreen(index >= 0 ? { name: 'training', index } : { name: 'home' });
          }}
        />,
      );
    }
  }

  if (screen.name === 'judgeQuiz') {
    return shell(<JudgeQuizScreen pool={techniquePool} tablebase={tablebase} onHome={() => setScreen({ name: 'home' })} />);
  }

  if (screen.name === 'leaderboard') {
    return shell(
      <LeaderboardScreen
        signedIn={!!account.session}
        onHome={() => setScreen({ name: 'home' })}
        onAccount={() => setScreen({ name: 'progress' })}
      />,
    );
  }

  if (screen.name === 'progress') {
    return shell(
      <ProgressScreen
        store={playerStore}
        focusStats={screen.stats}
        account={account}
        onPrivacy={() => setScreen({ name: 'privacy' })}
        playerId={playerId}
        onPlayerChange={changePlayer}
        onHome={() => setScreen({ name: 'home' })}
        onTrain={(family, subcategory, m = 'storm') => {
          setMode(m);
          setTheme(family as ThemeChoice);
          setSub(subcategory);
          setScreen({ name: 'rush', run: Date.now() });
        }}
      />,
    );
  }

  if (screen.name === 'review') {
    const id = screen.ids[screen.index];
    const puzzle = puzzlesById.get(id);
    const next = () =>
      setScreen(screen.index + 1 < screen.ids.length ? { ...screen, index: screen.index + 1 } : { name: 'home' });
    if (!puzzle) {
      next();
      return shell(null);
    }
    return shell(
      <GameScreen
        key={`${id}-${screen.index}`}
        puzzle={puzzle}
        position={{ index: screen.index, total: screen.ids.length }}
        judge={judge}
        onAnalyse={(fen, moves) => setScreen({ name: 'analysis', fen, moves, back: screen })}
        rules={reviewFull.has(id) ? (puzzle.collection === 'bases' ? TRAINING_RULES : TECHNIQUE_RULES) : puzzle.solution ? rushRules(puzzle.solution) : TRAINING_RULES}
        backLabel="← Arrêter la révision"
        header={
          screen.maintenance
            ? `🔄 Entretien des acquis · ${screen.index + 1}/${screen.ids.length} — une position déjà réussie, à rejouer pour ne pas l’oublier`
            : `🔁 Révision des erreurs · ${screen.index + 1}/${screen.ids.length} — sans chrono, la flèche montre le bon coup en cas d'erreur`
        }
        onAttempt={onReviewAttempt}
        onHome={() => setScreen({ name: 'home' })}
        onNext={next}
      />,
    );
  }

  if (screen.name === 'analysis') {
    const back = screen.back;
    return shell(
      <AnalysisScreen
        startFen={screen.fen}
        moves={screen.moves}
        tablebase={tablebase}
        engine={stockfish}
        backLabel={back ? '← Retour à la position' : '← Accueil'}
        onHome={() => setScreen(back ?? { name: 'home' })}
      />,
    );
  }

  if (screen.name === 'exam') {
    const g = BASICS_GROUPS.find((x) => x.id === screen.group);
    const puzzle = g ? BASICS.find((b) => b.id === g.ids[screen.index]) : undefined;
    if (g && puzzle) {
      const i = screen.index;
      const last = i + 1 >= g.ids.length;
      return shell(
        <GameScreen
          key={`exam-${g.id}-${i}`}
          puzzle={puzzle}
          position={{ index: i, total: g.ids.length }}
          judge={judge}
          onAnalyse={(fen, moves) => setScreen({ name: 'analysis', fen, moves, back: screen })}
          exam
          backLabel="← Abandonner le test"
          header={`🎓 Test de maîtrise — ${g.label} · ${i + 1}/${g.ids.length}`}
          onAttempt={(p, ok, e) => {
            if (examResults[i] !== null) return;
            setExamResults((r) => r.map((x, j) => (j === i ? ok : x)));
            onTrainingAttempt(p, ok, e);
          }}
          onHome={() => setScreen({ name: 'home' })}
          onNext={() => (last ? finishExam(g.id, examResults) : setScreen({ name: 'exam', group: g.id, index: i + 1 }))}
        />,
      );
    }
  }

  if (screen.name === 'examEnd') {
    const g = BASICS_GROUPS.find((x) => x.id === screen.group);
    if (g) {
      return shell(
        <ExamScreen
          label={g.label.replace(/^\S+\s/, '')}
          titles={g.ids.map((id) => BASICS.find((b) => b.id === id)?.title ?? id)}
          results={examResults}
          record={exams[examKey]?.[g.id]}
          onRetry={() => startExam(g.id)}
          onTrain={(i) => setScreen({ name: 'training', index: BASICS.findIndex((b) => b.id === g.ids[i]) })}
          onHome={() => setScreen({ name: 'home' })}
        />,
      );
    }
  }

  if (screen.name === 'coach') {
    return shell(<CoachScreen basics={BASICS} judge={judge} onHome={() => setScreen({ name: 'home' })} />);
  }

  if (screen.name === 'series' && SERIES) {
    return shell(
      <SeriesScreen
        series={SERIES}
        results={seriesResults}
        titles={SERIES_PUZZLES.map((p) => p.title)}
        onPlay={(index) => setScreen({ name: 'seriesPlay', index })}
        onHome={() => setScreen({ name: 'home' })}
      />,
    );
  }

  if (screen.name === 'seriesPlay' && SERIES_PUZZLES[screen.index]) {
    const sp = SERIES_PUZZLES[screen.index];
    const i = screen.index;
    return shell(
      <GameScreen
        key={`serie-${i}`}
        puzzle={sp}
        position={{ index: i, total: SERIES_PUZZLES.length }}
        judge={judge}
        onAnalyse={(fen, moves) => setScreen({ name: 'analysis', fen, moves, back: screen })}
        backLabel="← La série"
        header={`🧑‍🏫 ${SERIES!.name} — seule ta 1re tentative compte`}
        onAttempt={(p, ok, e) => {
          if (seriesResults[i] !== null) return;
          setSeriesResults((r) => r.map((x, j) => (j === i ? ok : x)));
          onTrainingAttempt(p, ok, e);
        }}
        onHome={() => setScreen({ name: 'series' })}
        onNext={() => setScreen({ name: 'series' })}
      />,
    );
  }

  if (screen.name === 'challenge' && challenge.picks[screen.index]) {
    const c = challenge.picks[screen.index];
    const already = challenge.results.get(c.id);
    return shell(
      <GameScreen
        key={`challenge-${c.id}`}
        puzzle={c}
        position={{ index: screen.index, total: challenge.picks.length }}
        judge={judge}
        onAnalyse={(fen, moves) => setScreen({ name: 'analysis', fen, moves, back: screen })}
        rules={rushRules(c.solution)}
        backLabel="← Accueil"
        header={`🏁 Défi de la semaine ${challenge.week.split('-S')[1]} — le même pour tous · ${
          already === undefined ? 'seule ta 1re tentative compte' : `déjà joué (${already ? 'réussi' : 'raté'}) : cet essai ne compte pas`
        }`}
        onAttempt={onChallengeAttempt}
        onHome={() => setScreen({ name: 'home' })}
        onNext={() => setScreen(screen.index + 1 < challenge.picks.length ? { name: 'challenge', index: screen.index + 1 } : { name: 'home' })}
      />,
    );
  }

  if (screen.name === 'daily' && motivation.daily) {
    const d = motivation.daily;
    return shell(
      <GameScreen
        key={`daily-${d.id}`}
        puzzle={d}
        position={{ index: 0, total: 1 }}
        judge={judge}
        onAnalyse={(fen, moves) => setScreen({ name: 'analysis', fen, moves, back: screen })}
        rules={rushRules(d.solution)}
        backLabel="← Accueil"
        header={`📌 Puzzle du jour — ${new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })} · le même pour tous`}
        onAttempt={onDailyAttempt}
        onHome={() => setScreen({ name: 'home' })}
        onNext={() => setScreen({ name: 'home' })}
      />,
    );
  }

  if (screen.name === 'technique') {
    const puzzle = puzzlesById.get(screen.id);
    if (puzzle) {
      return shell(
        <GameScreen
          key={`${puzzle.id}-${screen.n}`}
          puzzle={puzzle}
          position={{ index: screen.n, total: techniquePool.length }}
          judge={judge}
          onAnalyse={(fen, moves) => setScreen({ name: 'analysis', fen, moves, back: screen })}
          rules={TECHNIQUE_RULES}
          backLabel="← Accueil"
          header="🛠️ Technique — jouer jusqu’au bout contre la table de finales : mat, ou nulle tenue 20 coups"
          onAttempt={onTrainingAttempt}
          onHome={() => setScreen({ name: 'home' })}
          onNext={() => nextTechnique(screen.n + 1)}
        />,
      );
    }
  }

  if (screen.name === 'training') {
    return shell(
      <GameScreen
        key={BASICS[screen.index].id}
        puzzle={BASICS[screen.index]}
        position={{ index: screen.index, total: BASICS.length }}
        judge={judge}
        onAnalyse={(fen, moves) => setScreen({ name: 'analysis', fen, moves, back: screen })}
        onAttempt={onTrainingAttempt}
        onHome={() => setScreen({ name: 'home' })}
        onNext={() => setScreen(screen.index + 1 < BASICS.length ? { name: 'training', index: screen.index + 1 } : { name: 'home' })}
        onOtherSide={BASICS[screen.index].objective === 'win' ? () => void playOtherSide(screen.index) : undefined}
      />,
    );
  }

  if (screen.name === 'otherSide') {
    return shell(
      <GameScreen
        key={`${screen.puzzle.id}-${screen.puzzle.fen}`}
        puzzle={screen.puzzle}
        position={{ index: screen.index, total: BASICS.length }}
        judge={judge}
        onAnalyse={(fen, moves) => setScreen({ name: 'analysis', fen, moves, back: screen })}
        header="🛡️ L’autre camp : l’ordinateur attaque avec la meilleure méthode, défends le plus longtemps possible"
        backLabel="← Retour à la position"
        onAttempt={onTrainingAttempt}
        onHome={() => setScreen({ name: 'training', index: screen.index })}
        onNext={() => setScreen(screen.index + 1 < BASICS.length ? { name: 'training', index: screen.index + 1 } : { name: 'home' })}
      />,
    );
  }

  if (screen.name === 'rush' && pool && mode !== 'training') {
    return shell(
      <RushScreen
        key={screen.run}
        mode={mode}
        pool={pool}
        theme={themeKey}
        startRating={effectiveStart}
        scoreKey={key}
        judge={judge}
        recentlySeen={recentlySeen}
        onReview={playerId ? startReview : undefined}
        onAttempt={onRushAttempt}
        onRunEnd={onRunEnd}
        onRestart={() => setScreen({ name: 'rush', run: screen.run + 1 })}
        onHome={() => setScreen({ name: 'home' })}
        onLesson={(id) => setScreen({ name: 'lesson', id })}
        onFocusFamily={(family) => {
          setMode('storm');
          setTheme(family as ThemeChoice);
          setSub('all');
          setScreen({ name: 'rush', run: screen.run + 1 });
        }}
      />,
    );
  }

  return shell(
    <>
    {welcome && <WelcomeDialog onClose={closeWelcome} />}
    <HomeScreen
      compact={embed.embed}
      mode={mode}
      theme={theme}
      sub={sub}
      counts={counts}
      playerName={playerName}
      players={playerStore.listPlayers().map((pl) => ({ id: pl.id, name: pl.name, linked: !!account.session && linkedUser(pl.id) === account.session.user.id }))}
      playerId={playerId}
      accountEmail={account.session && !account.needMfa ? account.email : null}
      onSelectPlayer={changePlayer}
      onProgress={(stats) => setScreen({ name: 'progress', stats })}
      onPrivacy={() => setScreen({ name: 'privacy' })}
      review={playerId && lichess ? { due: reviewDue.length, total: reviewAll.length, spaced } : null}
      onReview={() => startReview(reviewDue.map((i) => i.id))}
      onSpaced={(v) => {
        setSetting('spacedRepetition', v);
        setSpaced(v);
      }}
      startRating={startRating}
      myLevel={myLevel}
      techniqueCount={lichess ? techniquePool.length : null}
      streak={motivation.streak}
      daily={motivation.daily ? { rating: motivation.daily.rating, title: motivation.daily.title, result: motivation.dailyResult } : null}
      onDaily={() => {
        dailyRecorded.current = false;
        setScreen({ name: 'daily' });
      }}
      onTechnique={() => nextTechnique(0)}
      onJudgeQuiz={() => setScreen({ name: 'judgeQuiz' })}
      onCoach={() => setScreen({ name: 'coach' })}
      onAnalysis={() => setScreen({ name: 'analysis' })}
      challenge={challenge.picks.length === CHALLENGE_SIZE ? { played: challenge.played, solved: challenge.solved, total: CHALLENGE_SIZE } : null}
      onChallenge={() => setScreen({ name: 'challenge', index: challenge.next >= 0 ? challenge.next : 0 })}
      weakness={weakness}
      onWeakness={(family) => {
        setMode('storm');
        setTheme(family as ThemeChoice);
        setSub('all');
        setScreen({ name: 'rush', run: Date.now() });
      }}
      lessons={LESSONS.map((l) => ({ id: l.id, title: l.title }))}
      onLesson={(id) => setScreen({ name: 'lesson', id })}
      poolSize={pool ? pool.length : null}
      loadError={loadError}
      best={mode === 'training' ? null : getBest(key)}
      basics={BASICS}
      basicsDone={basicsDone}
      exams={exams[examKey] ?? {}}
      onExam={startExam}
      maintenance={maintenance.length}
      onMaintenance={() => maintenance.length && setScreen({ name: 'review', ids: maintenance, index: 0, maintenance: true })}
      onMode={setMode}
      onTheme={(t) => {
        setTheme(t);
        setSub('all');
      }}
      onSub={setSub}
      onStartRating={setStartRating}
      onStart={() => setScreen({ name: 'rush', run: Date.now() })}
      onTrain={(index) => setScreen({ name: 'training', index })}
      onLeaderboard={account.enabled ? () => setScreen({ name: 'leaderboard' }) : undefined}
    />
    </>,
  );
}
