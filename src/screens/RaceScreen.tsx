// Course entre amis : salon (lien à partager), compte à rebours, 1 min 30 sur les MÊMES
// finales pour tous, piste et classement en direct (inspiré de Lichess Puzzle Racer).
// Points : 1 par bon coup + bonus de combo ; une erreur vide le combo et coûte du temps.
// Rien n'est enregistré côté serveur.

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Icon } from '../components/Icon';
import { PuzzleRunner, type PuzzleEnd } from '../components/PuzzleRunner';
import { ComboBar, RaceTrack } from '../components/race/RaceTrack';
import type { ErrorType } from '../core/errorTypes';
import type { SolveInfo } from '../core/history';
import {
  RACE_COUNTDOWN_MS,
  RACE_DURATION_MS,
  RACE_MAX_PLAYERS,
  RACE_PENALTY_MS,
  RACE_SKIPS,
  cleanRaceName,
  comboBonus,
  nextRaceCode,
  rankPlayers,
  raceColor,
  raceHost,
  raceLink,
  raceSequence,
  type RacePlayer,
} from '../core/race';
import type { Puzzle } from '../core/types';
import type { MoveJudge } from '../services/moveJudge';
import { joinRace, type RaceLink, type RaceStatus } from '../services/raceChannel';

interface Props {
  code: string;
  /** Finales Lichess (les mêmes chez tout le monde) ; null = pas encore chargées. */
  pool: Puzzle[] | null;
  judge: MoveJudge;
  /** Pseudo proposé (nom du joueur de l'appareil). */
  defaultName: string;
  onAttempt?: (puzzle: Puzzle, success: boolean, error?: ErrorType, info?: SolveInfo) => void;
  /** Revanche : course suivante de la chaîne (même code pour tous). */
  onAgain: (code: string) => void;
  /** Arrivée par « Revanche » : on entre directement dans le salon avec le pseudo déjà choisi. */
  autoJoin?: boolean;
  onHome: () => void;
}

const NAME_KEY = 'endgameRush:v1:raceName';
const readName = (fallback: string) => {
  try {
    return window.localStorage.getItem(NAME_KEY) || fallback;
  } catch {
    return fallback;
  }
};
const saveName = (name: string) => {
  try {
    window.localStorage.setItem(NAME_KEY, name);
  } catch {
    /* stockage indisponible : sans conséquence */
  }
};
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const clock = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};
const randomId = () => Math.random().toString(36).slice(2, 12);

type Phase = 'name' | 'lobby' | 'countdown' | 'playing' | 'over';

export function RaceScreen({ code, pool, judge, defaultName, onAttempt, onAgain, autoJoin = false, onHome }: Props) {
  const [name, setName] = useState(() => cleanRaceName(readName(defaultName)));
  const [phase, setPhase] = useState<Phase>('name');
  const [status, setStatus] = useState<RaceStatus>('connecting');
  const [players, setPlayers] = useState<RacePlayer[]>([]);
  const [refused, setRefused] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const me = useRef({ id: randomId(), joinedAt: 0 });
  const link = useRef<RaceLink | null>(null);
  const playersRef = useRef<RacePlayer[]>([]);
  const phaseRef = useRef<Phase>('name');
  phaseRef.current = phase;
  const checked = useRef(false);

  // --- Course (jeu) -------------------------------------------------------------
  const sequence = useMemo(() => (pool ? raceSequence(pool, code) : []), [pool, code]);
  const [startAt, setStartAt] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [index, setIndex] = useState(0);
  const [current, setCurrent] = useState<Puzzle | null>(null);
  const [score, setScore] = useState(0);
  const [errors, setErrors] = useState(0);
  const [penalty, setPenalty] = useState(0);
  const [combo, setCombo] = useState(0);
  const [solved, setSolved] = useState(0);
  /** Message éclair près du chrono : « +2 » (bonus de combo) ou « −5 s » (erreur). */
  const [pop, setPop] = useState<{ text: string; good: boolean; id: number } | null>(null);
  const comboRef = useRef(0);
  const [skipsLeft, setSkipsLeft] = useState(RACE_SKIPS);
  const [skipRequest, setSkipRequest] = useState(0);
  const [problem, setProblem] = useState<string | null>(null);
  const scoreRef = useRef(0);
  const errorsRef = useRef(0);
  const indexRef = useRef(0);

  const host = raceHost(players);
  const isHost = host === me.current.id;
  const endsAt = startAt + RACE_DURATION_MS - penalty;

  // Connexion au salon, une fois le pseudo validé.
  const join = useCallback(
    async (chosen: string) => {
      const clean = cleanRaceName(chosen);
      if (!clean) return;
      saveName(clean);
      setName(clean);
      setStatus('connecting');
      me.current.joinedAt = Date.now();
      setPhase('lobby');
      try {
        link.current = await joinRace(code, { id: me.current.id, name: clean, joinedAt: me.current.joinedAt }, {
          onStatus: setStatus,
          onPlayers: (list) => {
            playersRef.current = list;
            setPlayers(list);
            if (!checked.current && list.some((p) => p.id === me.current.id)) {
              checked.current = true;
              const others = list.filter((p) => p.id !== me.current.id);
              if (others.some((p) => p.started)) setRefused('Cette course est déjà lancée. Tu peux rejoindre la suivante : tes amis y arriveront en cliquant « Revanche ».');
              else if (others.length >= RACE_MAX_PLAYERS) setRefused(`Ce salon est complet (${RACE_MAX_PLAYERS} joueurs).`);
              else if (others.some((p) => p.name.toLowerCase() === clean.toLowerCase())) setRefused('Ce pseudo est déjà pris dans ce salon : choisis-en un autre.');
            }
          },
          onStart: (by) => {
            // Seul l'organisateur (le plus ancien du salon) peut lancer la course.
            if (by === raceHost(playersRef.current) && phaseRef.current === 'lobby') begin();
          },
          // Revanche à la Lichess : chacun clique quand il veut, plus de départ forcé par l'organisateur.
          onAgain: () => undefined,
        });
      } catch (e) {
        setStatus('error');
        setProblem(e instanceof Error ? e.message : String(e));
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- begin et onAgain lus au moment de l'évènement
    [code],
  );

  useEffect(() => () => link.current?.close(), []);

  // Revanche : pas de nouvelle saisie du pseudo.
  const autoJoined = useRef(false);
  useEffect(() => {
    if (autoJoin && pool && !autoJoined.current && cleanRaceName(name)) {
      autoJoined.current = true;
      void join(name);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- une seule fois, dès que les finales sont chargées
  }, [autoJoin, pool]);

  // Pseudo refusé : on quitte proprement le salon.
  useEffect(() => {
    if (refused) {
      link.current?.close();
      link.current = null;
    }
  }, [refused]);

  function begin() {
    const at = Date.now() + RACE_COUNTDOWN_MS;
    setStartAt(at);
    setNow(Date.now());
    link.current?.update({ started: true });
    setPhase('countdown');
  }

  const launch = () => {
    link.current?.start();
    begin();
  };

  // Horloge : compte à rebours, puis départ, puis fin du temps.
  useEffect(() => {
    if (phase !== 'countdown' && phase !== 'playing') return;
    const id = window.setInterval(() => setNow(Date.now()), 200);
    return () => window.clearInterval(id);
  }, [phase]);

  // Préparation de la position `i` : tirée dans la suite commune, vérifiée (table ou moteur).
  const prepare = useCallback(
    async (from: number): Promise<{ puzzle: Puzzle; at: number } | null> => {
      for (let i = from; i < sequence.length; i++) {
        const candidate = sequence[i];
        try {
          // Vérification bornée à 6 s : sans réponse (réseau lent), on garde la position
          // (finale Lichess déjà classée) plutôt que de laisser l'échiquier figé.
          const ok = await Promise.race([
            judge.check(candidate.fen, candidate.objective),
            new Promise<boolean>((r) => setTimeout(() => r(true), 6_000)),
          ]);
          if (ok) {
            judge.prefetch(candidate.fen, { objective: candidate.objective, previousUci: [], solution: candidate.solution });
            return { puzzle: candidate, at: i };
          }
        } catch {
          /* position impossible à vérifier sur cet appareil : on passe à la suivante */
        }
      }
      return null;
    },
    [sequence, judge],
  );

  // Pendant le compte à rebours, on prépare la première position.
  useEffect(() => {
    if (phase !== 'countdown' || current || !sequence.length) return;
    let cancelled = false;
    void prepare(0).then((r) => {
      if (cancelled) return;
      if (!r) return setProblem('Aucune position disponible pour cette course.');
      indexRef.current = r.at + 1;
      setIndex(r.at);
      setCurrent(r.puzzle);
    });
    return () => {
      cancelled = true;
    };
  }, [phase, current, sequence, prepare]);

  useEffect(() => {
    if (phase === 'countdown' && now >= startAt && current) setPhase('playing');
  }, [phase, now, startAt, current]);

  // Fin du temps.
  useEffect(() => {
    if (phase === 'playing' && now >= endsAt) {
      setPhase('over');
      link.current?.update({ done: true, score: scoreRef.current, errors: errorsRef.current });
    }
  }, [phase, now, endsAt]);

  const flashPop = (text: string, good: boolean) => {
    const id = Date.now();
    setPop({ text, good, id });
    window.setTimeout(() => setPop((p) => (p?.id === id ? null : p)), 1200);
  };

  // Bon coup : 1 point, le combo monte ; bonus aux paliers 5 / 12 / 20 / 30 (puis tous les 10).
  const onGoodMove = useCallback(() => {
    if (phaseRef.current !== 'playing') return;
    comboRef.current += 1;
    const bonus = comboBonus(comboRef.current);
    scoreRef.current += 1 + bonus;
    setCombo(comboRef.current);
    setScore(scoreRef.current);
    if (bonus) flashPop(`+${bonus} combo`, true);
    link.current?.update({ score: scoreRef.current, errors: errorsRef.current });
  }, []);

  const onEnd = useCallback(
    async (end: PuzzleEnd, error?: ErrorType, info?: SolveInfo) => {
      if (!current || phaseRef.current !== 'playing') return;
      if (end !== 'skipped') {
        onAttempt?.(current, end === 'solved', error, info);
        if (end === 'solved') {
          setSolved((n) => n + 1);
        } else {
          // Erreur : combo vidé (comme Lichess Racer) et temps retiré.
          errorsRef.current += 1;
          comboRef.current = 0;
          setCombo(0);
          setErrors(errorsRef.current);
          setPenalty((p) => p + RACE_PENALTY_MS);
          flashPop(`−${RACE_PENALTY_MS / 1000} s`, false);
        }
        link.current?.update({ score: scoreRef.current, errors: errorsRef.current });
      }
      await sleep(end === 'solved' ? 350 : 1500);
      if (phaseRef.current !== 'playing') return;
      const next = await prepare(indexRef.current);
      if (phaseRef.current !== 'playing') return;
      if (!next) {
        setPhase('over'); // toutes les positions jouées
        link.current?.update({ done: true, score: scoreRef.current, errors: errorsRef.current });
        return;
      }
      indexRef.current = next.at + 1;
      setIndex(next.at);
      setCurrent(next.puzzle);
    },
    [current, onAttempt, prepare],
  );

  const ranking = rankPlayers(players);
  const url = raceLink(typeof window === 'undefined' ? '' : window.location.origin, code);
  const share = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Course de finales', text: 'Viens courir avec moi sur Gambix !', url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied('Lien copié : colle-le dans un message à tes amis.');
    } catch {
      setCopied('Copie impossible : recopie le lien ci-dessous.');
    }
  };

  // --- Affichage ----------------------------------------------------------------
  const shell = (children: ReactNode) => <div className="mx-auto max-w-2xl px-4 py-8">{children}</div>;
  const back = (
    <button type="button" onClick={onHome} className="text-sm text-stone-400 hover:text-stone-100">
      ← Accueil
    </button>
  );

  if (refused) {
    return shell(
      <div className="flex flex-col gap-4 rounded-xl bg-stone-800 p-5">
        <p className="text-amber-300"><Icon name="warning" className="h-5 w-5" /> {refused}</p>
        <div className="flex gap-3">
          {refused.startsWith('Cette course') && (
            <button type="button" className="rounded-lg bg-amber-500 px-4 py-2 font-bold text-stone-900" onClick={() => onAgain(nextRaceCode(code))}>
              Rejoindre la course suivante
            </button>
          )}
          {refused.startsWith('Ce pseudo') && (
            <button type="button" className="rounded-lg bg-amber-500 px-4 py-2 font-bold text-stone-900" onClick={() => { checked.current = false; setRefused(null); setPhase('name'); }}>
              Changer de pseudo
            </button>
          )}
          <button type="button" className="rounded-lg bg-stone-700 px-4 py-2 font-semibold text-stone-100" onClick={onHome}>Accueil</button>
        </div>
      </div>,
    );
  }

  if (phase === 'name') {
    return shell(
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-extrabold text-stone-50"><Icon name="flag" className="h-6 w-6 text-amber-300" /> Course entre amis</h1>
          {back}
        </div>
        <p className="text-stone-300">
          Tout le monde joue les <strong>mêmes finales</strong>, dans le même ordre et avec la même couleur, pendant <strong>1 min 30</strong>.
          Chaque bon coup vaut un point ; enchaîner les bons coups remplit la barre de combo et rapporte des bonus (+1 à 5 d’affilée, +2 à 12, +3 à 20, +4 à 30).
          Une erreur vide la barre et coûte {RACE_PENALTY_MS / 1000} secondes. Joker : tu peux passer {RACE_SKIPS === 1 ? 'un coup' : `${RACE_SKIPS} coups`} par course (sans point, combo conservé).
          Tu vois les autres avancer en direct sur la piste.
        </p>
        <form
          className="flex flex-col gap-3 rounded-xl bg-stone-800 p-4"
          onSubmit={(e) => {
            e.preventDefault();
            void join(name);
          }}
        >
          <label htmlFor="race-name" className="text-sm font-semibold text-stone-200">Ton pseudo dans la course</label>
          <input
            id="race-name"
            value={name}
            maxLength={20}
            onChange={(e) => setName(e.target.value)}
            className="rounded-lg border border-stone-600 bg-stone-900 px-3 py-2 text-stone-50"
            placeholder="Ex. Camille"
          />
          <button type="submit" disabled={!cleanRaceName(name) || !pool} className="rounded-lg bg-amber-500 px-4 py-2 font-bold text-stone-900 hover:bg-amber-400 disabled:opacity-40">
            {pool ? 'Entrer dans le salon' : 'Chargement des finales…'}
          </button>
          <p className="text-xs text-stone-400">
            Ton pseudo n’est visible que des joueurs du salon et n’est enregistré nulle part. Les finales jouées comptent dans ta progression.
          </p>
        </form>
      </div>,
    );
  }

  const board = (
    <div className="flex flex-col gap-2">
      {ranking.map((p) => (
        <div key={p.id} className={`flex items-center gap-2 rounded-lg px-3 py-2 ${p.id === me.current.id ? 'bg-amber-500/15 ring-1 ring-amber-500/50' : 'bg-stone-800'}`}>
          <span className="w-6 text-center font-black text-amber-300 tabular-nums">{p.rank}</span>
          <span className="flex-1 truncate font-semibold text-stone-100">
            {p.name}
            {p.id === host && <span className="ml-2 text-xs font-normal text-sky-300">organisateur</span>}
          </span>
          <span className="text-xs text-stone-400">{p.errors > 0 ? `${p.errors} err.` : ''}{p.done ? ' · fini' : ''}</span>
          <span className="w-8 text-right text-xl font-black text-stone-50 tabular-nums">{p.id === me.current.id ? score : p.score}</span>
        </div>
      ))}
    </div>
  );

  if (phase === 'lobby') {
    return shell(
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-extrabold text-stone-50"><Icon name="flag" className="h-6 w-6 text-amber-300" /> Salon {code}</h1>
          {back}
        </div>
        {status === 'error' && (
          <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300" role="alert">
            {problem ?? 'Connexion au salon impossible. Vérifie ta connexion Internet, puis reviens à l’accueil et réessaie.'}
          </p>
        )}
        <div className="flex flex-col gap-3 rounded-xl bg-stone-800 p-4">
          <p className="text-sm text-stone-300">Envoie ce lien à tes amis : ils arrivent dans ce salon.</p>
          <input readOnly value={url} onFocus={(e) => e.currentTarget.select()} aria-label="Lien de la course" className="rounded-lg border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-stone-100" />
          <button type="button" onClick={() => void share()} className="self-start rounded-lg bg-sky-500 px-4 py-2 font-bold text-stone-900 hover:bg-sky-400">
            <Icon name="link" className="h-4 w-4" /> Partager le lien
          </button>
          {copied && <p className="text-sm text-emerald-300" role="status">{copied}</p>}
        </div>
        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-stone-400">Dans le salon ({players.length}/{RACE_MAX_PLAYERS})</h2>
          {status === 'connecting' ? <p className="text-stone-400">Connexion…</p> : board}
        </section>
        {isHost ? (
          <button type="button" disabled={status !== 'ready' || !pool} onClick={launch} className="rounded-xl bg-amber-500 px-6 py-3 text-lg font-black text-stone-900 hover:bg-amber-400 disabled:opacity-40">
            <Icon name="play" className="h-5 w-5" /> Lancer la course
          </button>
        ) : (
          <p className="text-stone-300" role="status">En attente du départ, donné par l’organisateur…</p>
        )}
        <p className="text-xs text-stone-400">Couleur de la course : {raceColor(code) === 'w' ? 'les Blancs' : 'les Noirs'} pour tout le monde. L’organisateur est le premier arrivé dans le salon.</p>
      </div>,
    );
  }

  if (phase === 'countdown') {
    return shell(
      <div className="flex flex-col items-center gap-4 text-center">
        <p className="text-stone-300">La course commence dans</p>
        <div className="text-8xl font-black text-amber-400 tabular-nums" data-testid="race-countdown">{Math.max(0, Math.ceil((startAt - now) / 1000))}</div>
        <p className="text-stone-400">Tu joues les {raceColor(code) === 'w' ? 'Blancs' : 'Noirs'}. Les finales sont les mêmes pour tous.</p>
        {problem && <p className="text-amber-300">{problem}</p>}
      </div>,
    );
  }

  const left = Math.max(0, endsAt - now);
  const over = phase === 'over';
  const mineRank = ranking.find((p) => p.id === me.current.id)?.rank;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-3 px-3 py-3 lg:px-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:gap-6">
        {/* Bandeau de hauteur fixe au-dessus de l'échiquier (téléphone) : rien ne le fait grandir pendant la course. */}
        <aside className="flex w-full flex-col gap-2 lg:order-2 lg:max-w-sm">
          <div className="flex items-stretch gap-2">
            <div className="flex-1 rounded-xl bg-stone-800 px-3 py-2 text-center">
              <div className="text-4xl font-black leading-tight text-amber-400 tabular-nums sm:text-5xl" data-testid="score">{score}</div>
              <div className="text-[11px] uppercase tracking-wide text-stone-400">Points</div>
            </div>
            <div className="relative flex-1 rounded-xl bg-stone-800 px-3 py-2 text-center">
              <div className={`text-4xl font-black leading-tight tabular-nums sm:text-5xl ${left < 15_000 ? 'text-red-400' : 'text-stone-50'}`} data-testid="timer">{clock(left)}</div>
              <div className="text-[11px] uppercase tracking-wide text-stone-400">Temps</div>
              {pop && (
                <span key={pop.id} className={`pointer-events-none absolute -top-2 right-1 rounded-md px-1.5 text-sm font-black ${pop.good ? 'bg-emerald-500 text-stone-900' : 'bg-red-500 text-white'}`} role="status">
                  {pop.text}
                </span>
              )}
            </div>
            <div className="flex-1 rounded-xl bg-stone-800 px-3 py-2 text-center">
              <div className="text-4xl font-black leading-tight text-red-300 tabular-nums sm:text-5xl">{errors}</div>
              <div className="text-[11px] uppercase tracking-wide text-stone-400">Erreurs</div>
            </div>
          </div>
          <div className="flex items-stretch gap-2">
            <div className="flex-1"><ComboBar combo={combo} /></div>
            {!over && (
              <button
                type="button"
                disabled={skipsLeft <= 0}
                onClick={() => setSkipRequest((n) => n + 1)}
                title="L’appli joue le bon coup à ta place : pas de point, mais ton combo est conservé. Une fois par course."
                className="rounded-xl bg-sky-600 px-3 text-sm font-bold text-white hover:bg-sky-500 disabled:bg-stone-800 disabled:text-stone-500"
                data-testid="race-skip"
              >
                Passer<br /><span className="text-xs font-normal">{skipsLeft > 0 ? `${skipsLeft} joker` : 'utilisé'}</span>
              </button>
            )}
          </div>
          {over ? (
            <div className="flex flex-col gap-3 rounded-xl bg-stone-800 p-4" data-testid="race-result">
              <h2 className="text-xl font-bold text-stone-50"><Icon name="trophy" className="h-5 w-5 text-amber-300" /> Course terminée !</h2>
              <p className="text-stone-200">
                <strong className="text-2xl text-amber-400">{score}</strong> point{score > 1 ? 's' : ''} · {solved} finale{solved > 1 ? 's' : ''} réussie{solved > 1 ? 's' : ''}
                {mineRank ? <> · ton classement : <strong>{mineRank}/{ranking.length}</strong></> : null}
              </p>
              {board}
              <p className="text-sm text-stone-400">Les autres joueurs terminent à quelques secondes près : le classement se complète tout seul.</p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => onAgain(nextRaceCode(code))}
                  className="flex-1 rounded-lg bg-amber-500 px-4 py-2 font-bold text-stone-900 hover:bg-amber-400"
                >
                  ↻ Revanche
                </button>
                <button type="button" onClick={onHome} className="flex-1 rounded-lg bg-stone-700 px-4 py-2 font-semibold text-stone-100 hover:bg-stone-600">Accueil</button>
              </div>
              <p className="text-xs text-stone-400">« Revanche » emmène tout le monde dans la même course suivante, sans nouveau lien. Le premier arrivé donne le départ.</p>
            </div>
          ) : (
            <button type="button" onClick={onHome} className="hidden self-start text-sm text-stone-400 hover:text-stone-100 lg:block">Abandonner</button>
          )}
        </aside>
        <div className="mx-auto w-full lg:order-1" style={{ maxWidth: 'min(100%, calc(100dvh - 260px), 720px)' }}>
          {current && (
            <PuzzleRunner key={`${current.id}-${index}`} puzzle={current} active={!over} judge={judge} onEnd={onEnd} onGoodMove={onGoodMove} skipRequest={skipRequest} onSkipUsed={() => setSkipsLeft((n) => Math.max(0, n - 1))} />
          )}
        </div>
      </div>
      {/* Piste des joueurs SOUS l'échiquier (comme Lichess) : ses changements ne déplacent pas l'échiquier. */}
      <RaceTrack players={players} meId={me.current.id} myScore={score} />
      {!over && (
        <button type="button" onClick={onHome} className="self-start text-sm text-stone-400 hover:text-stone-100 lg:hidden">Abandonner</button>
      )}
    </div>
  );
}
