import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { MemberProgress } from '../src/core/coachProgress';
import type { CoachItem } from '../src/core/coachSet';
import {
  applyRecalibration,
  attemptsCsv,
  baseRating,
  csvField,
  entriesOf,
  exerciseSheets,
  groupHeatmap,
  inactiveStudents,
  studentSheet,
  studentsCsv,
  suggestRating,
} from '../src/core/coachStats';
import { dueInfo, groupHomework, homeworkGoal, homeworkIndices, myHomeworkDone, newHomeworkId, sanitizeHomework, type Homework } from '../src/core/homework';

const FEN = '8/8/8/4k3/8/8/8/3QK3 w - - 0 1';
const item = (r: number, th?: string[], e = false): CoachItem => ({ f: FEN, s: ['d1d7'], r, o: 'w', t: `Ex ${r}`, ...(th ? { th } : {}), ...(e ? { e: 1 as const } : {}) });
const items = [item(800, ['Opposition']), item(1000, ['Opposition']), item(1200, ['Mat']), item(1400, ['Mat']), item(1600)];
const res = (day: number, d: { i: number; ok: boolean; ms?: number; w?: string; e?: 'loses' | 'slow' }[], v = 'V') => ({
  t: `2026-10-${String(day).padStart(2, '0')}T10:00:00Z`, mode: 'storm' as const, score: 0, errors: 0, played: d.length, failed: [], v, d,
});
const members: MemberProgress[] = [
  { id: 'a', pseudo: 'Léo', joined: '', lastSeen: '', results: [
    res(1, [{ i: 0, ok: true, ms: 4000 }, { i: 1, ok: true, ms: 6000 }, { i: 2, ok: false, w: 'a1a8', e: 'loses' }]),
    res(2, [{ i: 2, ok: true, ms: 9000 }, { i: 3, ok: false, w: 'h1h8', e: 'slow' }, { i: 0, ok: true, ms: 2000 }]),
    res(1, [{ i: 4, ok: true }], 'ANCIENNE'),
  ] },
  { id: 'b', pseudo: 'Zoé', joined: '', lastSeen: '', results: [res(3, [{ i: 0, ok: false, w: 'a1a8', e: 'loses' }, { i: 1, ok: false }, { i: 2, ok: false, w: 'a1a8' }])] },
  { id: 'c', pseudo: 'Max', joined: '', lastSeen: '', results: [] },
];

test('fiche élève : version actuelle seulement, réussite, temps, plafond, motifs, erreurs', () => {
  assert.equal(entriesOf(members[0], 'V').length, 6);
  const s = studentSheet(members[0], items, 'V');
  assert.equal(s.tries, 6);
  assert.equal(s.success, 4 / 6);
  assert.equal(s.medianMs, 5000);
  assert.deepEqual(s.bands.map((b) => [b.band, b.n, b.ok]), [[800, 2, 2], [1000, 1, 1], [1200, 2, 1], [1400, 1, 0]]);
  assert.equal(s.ceiling, null); // aucune tranche n'a encore 3 tentatives
  const more = { ...members[0], results: [...members[0].results, res(4, [{ i: 0, ok: true }, { i: 2, ok: true }, { i: 2, ok: true }])] };
  assert.equal(studentSheet(more, items, 'V').ceiling, 1200); // 1200–1399 : 3/4
  assert.deepEqual(s.motifs.map((m) => [m.label, m.n, m.ok]), [['Mat', 3, 1], ['Opposition', 3, 3]]);
  assert.deepEqual(s.errors.map((e) => e.type), ['loses', 'slow']);
  assert.deepEqual(s.missed[0], { index: 2, misses: 1 });
});

test('Elo sur la base : 1re tentative de chaque exercice, courbe par partie', () => {
  const r = baseRating(entriesOf(members[0], 'V'), items);
  assert.equal(r.games, 4); // exercices 0, 1, 2, 3 (0 et 2 rejoués : ignorés)
  assert.equal(r.history.length, 2); // une valeur par partie
  assert.ok(r.provisional);
  const zoe = baseRating(entriesOf(members[1], 'V'), items);
  assert.ok(zoe.r < r.r);
});

test('recalibrage : performance mêlée à l’Elo actuel, seuils de tentatives et d’écart', () => {
  assert.equal(suggestRating(1000, [{ opp: 1500, ok: true }]), null); // trop peu de tentatives
  const allFail = Array.from({ length: 10 }, () => ({ opp: 1500, ok: false }));
  assert.equal(suggestRating(1000, allFail), Math.round(((1000 * 5 + 1900 * 10) / 15) / 10) * 10);
  const even = Array.from({ length: 10 }, (_, i) => ({ opp: 1000, ok: i % 2 === 0 }));
  assert.equal(suggestRating(1000, even), null); // écart < 50
  const sheets = exerciseSheets(members, items, 'V');
  assert.deepEqual(sheets.get(2)?.wrong, [{ uci: 'a1a8', n: 2 }]);
  assert.deepEqual(sheets.get(0)?.failedBy, ['Zoé']);
  assert.equal(sheets.get(0)?.students, 2);
  const fake = new Map([[1, { ...sheets.get(1)!, suggested: 1250 }]]);
  const { items: next, changed } = applyRecalibration([item(800), item(1000, undefined, true)], fake);
  assert.equal(changed, 1);
  assert.deepEqual(next[1], { f: FEN, s: ['d1d7'], r: 1250, o: 'w', t: 'Ex 1000' });
});

test('carte du groupe : motifs si la base en a, sinon tranches', () => {
  const h = groupHeatmap(members, items, 'V');
  assert.equal(h.kind, 'motifs');
  assert.deepEqual(h.columns.map((c) => c.label), ['Mat', 'Opposition']);
  assert.deepEqual(h.rows[1].cells, [{ n: 1, ok: 0 }, { n: 2, ok: 0 }]);
  assert.deepEqual(h.rows[2].cells, [null, null]);
  const plain = groupHeatmap(members, items.map(({ th: _t, ...x }) => x), 'V');
  assert.equal(plain.kind, 'tranches');
  assert.equal(plain.columns[0].label, '800–999');
});

test('inactivité et export CSV (séparateur ;, BOM, formules neutralisées)', () => {
  const now = Date.parse('2026-10-20T10:00:00Z');
  assert.deepEqual(inactiveStudents(members, now).map((x) => [x.pseudo, x.days]), [['Max', null], ['Léo', 18], ['Zoé', 17]]);
  assert.equal(csvField('=SOMME(A1)'), "'=SOMME(A1)");
  assert.equal(csvField('a;b'), '"a;b"');
  assert.equal(csvField(-5), '-5');
  const s = studentsCsv(members, items, 'V');
  assert.ok(s.startsWith('﻿Élève;Elo sur la base'));
  assert.equal(s.trim().split('\r\n').length, 4);
  const a = attemptsCsv(members, items, 'V');
  assert.equal(a.trim().split('\r\n').length, 10);
  assert.match(a, /Léo;2026-10-01;Storm;3;Ex 1200;1200;non;;a1a8;/);
});

test('devoirs : validation, exercices concernés, progression élève et groupe', () => {
  const hw: Homework = { id: 'abc234', title: 'Opposition', motif: 'opposition', target: 5, due: '2026-10-02', created: '2026-09-30T00:00:00Z' };
  assert.deepEqual(sanitizeHomework([hw, { ...hw, id: 'X' }, { ...hw, target: 0 }, { ...hw, due: 'demain' }, { ...hw, title: '<>' }]), [hw]);
  assert.deepEqual(homeworkIndices(items, hw), [0, 1]);
  assert.equal(homeworkGoal(items, hw), 2);
  assert.deepEqual(homeworkIndices(items, { ...hw, motif: undefined, from: 2, to: 3 }), [1, 2]);
  const t = (d: string) => Date.parse(d);
  const mine = [
    { t: t('2026-10-01T10:00:00Z'), p: 'c-ABCDEFGH-1', ok: true },
    { t: t('2026-10-01T11:00:00Z'), p: 'c-ABCDEFGH-1', ok: true },
    { t: t('2026-09-01T10:00:00Z'), p: 'c-ABCDEFGH-2', ok: true }, // avant le devoir
    { t: t('2026-10-01T10:00:00Z'), p: 'c-ABCDEFGH-3', ok: true }, // hors motif
  ];
  assert.equal(myHomeworkDone(mine, hw, items, 'ABCDEFGH'), 1);
  const g = groupHomework(members, hw, items, 'V');
  assert.deepEqual(g.map((x) => [x.pseudo, x.done, x.reached]), [['Léo', 2, true], ['Zoé', 0, false], ['Max', 0, false]]);
  assert.deepEqual(dueInfo(hw, t('2026-10-01T12:00:00')), { late: false, daysLeft: 2 });
  assert.equal(dueInfo(hw, t('2026-10-03T12:00:00')).late, true);
  assert.match(newHomeworkId(), /^[a-z2-9]{8}$/);
});
