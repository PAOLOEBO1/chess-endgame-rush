import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cleanRaceName, comboBonus, isPlausibleRaceScore, isRandomRaceName, maxRaceScore, RACE_ANONYMOUS, RACE_DURATION_MS, RACE_MAX_SCORE, comboProgress, newRaceCode, nextRaceCode, publicRace, randomRaceName, PUBLIC_MIN_WAIT_MS, PUBLIC_SLOT_MS, parseRaceCode, rankPlayers, raceColor, raceHost, raceSequence, sanitizePlayer, type RacePlayer } from '../src/core/race';
import { sideToMove } from '../src/core/fen';

const FEN_W = '8/8/8/8/8/4k3/8/4K2R w - - 0 1';
const FEN_B = '8/8/8/8/8/4k3/8/4K2R b - - 0 1';
const pool = Array.from({ length: 3000 }, (_, i) => ({ id: `p${String(i).padStart(4, '0')}`, rating: 700 + ((i * 53) % 1700), fen: i % 2 ? FEN_B : FEN_W }));

test('code : 6 caractères lisibles, lien ou saisie libre', () => {
  const c = newRaceCode();
  assert.match(c, /^[A-HJKMNP-Z2-9]{6}$/);
  assert.equal(parseRaceCode(c), c);
  assert.equal(parseRaceCode(` #course=${c.toLowerCase()} `), c);
  assert.equal(parseRaceCode('ABC12'), null);
  assert.equal(parseRaceCode('ABCDE0'), null); // 0 exclu
  assert.equal(parseRaceCode('<script>'), null);
});

test('suite : identique pour tous, même camp, difficulté croissante, sans doublon', () => {
  const a = raceSequence(pool, 'K7M2QX');
  assert.ok(a.length >= 80);
  assert.deepEqual(raceSequence([...pool].reverse(), 'K7M2QX').map((p) => p.id), a.map((p) => p.id));
  assert.equal(new Set(a.map((p) => p.id)).size, a.length);
  assert.ok(a.every((p) => sideToMove(p.fen) === raceColor('K7M2QX')));
  const first = a.slice(0, 5).reduce((s, p) => s + p.rating, 0) / 5;
  const last = a.slice(-5).reduce((s, p) => s + p.rating, 0) / 5;
  assert.ok(last > first + 800);
  assert.notDeepEqual(raceSequence(pool, 'AAAAAA').map((p) => p.id), a.map((p) => p.id));
  assert.deepEqual(raceSequence([], 'K7M2QX'), []);
});

test('pseudo et données reçues : nettoyés et bornés', () => {
  assert.equal(cleanRaceName('  Jean   <b>Luc</b>\n'), 'Jean bLuc/b');
  assert.equal(cleanRaceName('x'.repeat(50)).length, 20);
  assert.equal(sanitizePlayer('a', { name: '   ' }), null);
  assert.equal(sanitizePlayer('a', null), null);
  const p = sanitizePlayer('a', { name: 'Zoé', score: 1e9, errors: -4, joinedAt: 5, done: 'oui' })!;
  assert.deepEqual([p.score, p.errors, p.done], [RACE_MAX_SCORE, 0, false]);
});

test('classement : réussites, puis erreurs ; égalité = même rang', () => {
  const mk = (id: string, score: number, errors: number, joinedAt = 1): RacePlayer => ({ id, name: id, score, errors, joinedAt, done: false, started: false });
  const r = rankPlayers([mk('a', 10, 2), mk('b', 12, 5), mk('c', 10, 1), mk('d', 10, 1), mk('e', 3, 0)]);
  assert.deepEqual(r.map((x) => [x.id, x.rank]), [['b', 1], ['c', 2], ['d', 2], ['a', 4], ['e', 5]]);
});

test('organisateur : le plus ancien du salon', () => {
  const mk = (id: string, joinedAt: number): RacePlayer => ({ id, name: id, score: 0, errors: 0, joinedAt, done: false, started: false });
  assert.equal(raceHost([mk('b', 20), mk('a', 10)]), 'a');
  assert.equal(raceHost([mk('b', 20)]), 'b');
  assert.equal(raceHost([]), null);
});

test('combo façon Lichess Racer : +1 à 5, +2 à 12, +3 à 20, +4 à 30 puis tous les 10', () => {
  const bonuses = Array.from({ length: 61 }, (_, c) => comboBonus(c));
  assert.deepEqual(
    bonuses.map((b, c) => [c, b]).filter(([, b]) => b > 0),
    [[5, 1], [12, 2], [20, 3], [30, 4], [40, 4], [50, 4], [60, 4]],
  );
  assert.deepEqual(comboProgress(0), { reached: 0, fill: 0 });
  assert.deepEqual(comboProgress(5), { reached: 1, fill: 0 });
  assert.deepEqual(comboProgress(16), { reached: 2, fill: 0.5 });
  assert.deepEqual(comboProgress(35), { reached: 4, fill: 0.5 });
});

test('revanche : même course suivante pour tous, code valide et différent', () => {
  const next = nextRaceCode('K7M2QX');
  assert.equal(next, nextRaceCode('K7M2QX'));
  assert.notEqual(next, 'K7M2QX');
  assert.equal(parseRaceCode(next), next);
  assert.notEqual(nextRaceCode(next), next);
});

test('course publique : même salon pour tout le créneau, au moins 12 s d’attente', () => {
  const t = 1_800_000_000_000; // multiple de 30 s
  const a = publicRace(t + 1_000);
  assert.equal(a.startsAt, t + PUBLIC_SLOT_MS);
  assert.deepEqual(publicRace(t + 17_000), a); // même créneau
  const late = publicRace(t + 25_000); // moins de 12 s avant le départ : créneau suivant
  assert.equal(late.startsAt, t + 2 * PUBLIC_SLOT_MS);
  assert.notEqual(late.code, a.code);
  assert.ok(late.startsAt - (t + 25_000) >= PUBLIC_MIN_WAIT_MS);
  assert.equal(parseRaceCode(a.code), a.code);
  assert.equal(publicRace(a.startsAt).startsAt, a.startsAt + PUBLIC_SLOT_MS); // salon complet : le suivant
});

test('pseudo aléatoire : propre et court', () => {
  for (let i = 0; i < 50; i++) {
    const n = randomRaceName();
    assert.equal(cleanRaceName(n), n);
    assert.match(n, /^\p{L}+\d{2}$/u);
  }
});

test('course publique : seuls les pseudos aléatoires sont montrés', () => {
  for (let i = 0; i < 50; i++) assert.equal(isRandomRaceName(randomRaceName()), true);
  assert.equal(isRandomRaceName('LynxRusé42'), true);
  assert.equal(isRandomRaceName('Zoé'), false);
  assert.equal(isRandomRaceName('LynxRusé42 idiot'), false);
  assert.equal(isRandomRaceName('LynxRusé5'), false);
  assert.equal(sanitizePlayer('a', { name: 'Insulte' }, { publicRace: true })!.name, RACE_ANONYMOUS);
  assert.equal(sanitizePlayer('a', { name: 'HibouZen77' }, { publicRace: true })!.name, 'HibouZen77');
  assert.equal(sanitizePlayer('a', { name: 'Zoé' })!.name, 'Zoé'); // entre amis : pseudo libre
});

test('scores impossibles écartés', () => {
  assert.equal(maxRaceScore(0), 0);
  assert.equal(maxRaceScore(5), 6); // 5 coups + bonus de 1
  assert.equal(maxRaceScore(30), 40); // 30 + 1 + 2 + 3 + 4
  assert.equal(maxRaceScore(40), 54); // + 10 coups + 4
  assert.equal(RACE_MAX_SCORE, 256);
  assert.equal(isPlausibleRaceScore(0, 0), true);
  assert.equal(isPlausibleRaceScore(7, 0), true); // 3 s de marge : 6 coups possibles
  assert.equal(isPlausibleRaceScore(50, 0), false); // pas encore partie
  assert.equal(isPlausibleRaceScore(40, 15_000), true); // 36 coups possibles en 18 s
  assert.equal(isPlausibleRaceScore(120, 15_000), false);
  assert.equal(isPlausibleRaceScore(256, RACE_DURATION_MS + 60_000), true);
  assert.equal(isPlausibleRaceScore(257, RACE_DURATION_MS + 60_000), false);
});
