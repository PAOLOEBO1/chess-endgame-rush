// Synchronisation des données d'entraînement avec le compte en ligne :
// tests de maîtrise du profil relié et bibliothèque de séries d'entraîneur.
// Fusion sans perte (voir core/userData), puis envoi si quelque chose a changé.

import { mergeExams, mergeSeries, sanitizeExams, sanitizeSeries } from '../core/userData';
import { cloudEnabled, getCloud } from './cloud';
import { getSettings, setSetting } from './settings';
import { playerOfUser } from './sync';

/** Événement émis quand des données venues du compte ont changé les réglages locaux. */
export const USER_DATA_EVENT = 'endgame-rush:user-data';

let running: Promise<void> | null = null;
let timer: number | undefined;

async function syncOnce(): Promise<void> {
  if (!cloudEnabled) return;
  const cloud = await getCloud();
  if (!cloud) return;
  const { data } = await cloud.auth.getSession();
  const userId = data.session?.user.id;
  const pid = userId ? playerOfUser(userId) : null;
  if (!userId || !pid) return;
  const { data: row, error } = await cloud.from('user_data').select('exams, series').maybeSingle();
  if (error) throw error;
  const s = getSettings();
  const localExams = s.exams[pid] ?? {};
  const remoteExams = sanitizeExams(row?.exams);
  const remoteSeries = sanitizeSeries(row?.series);
  const exams = mergeExams(localExams, remoteExams);
  const series = mergeSeries(s.seriesLibrary, remoteSeries, Date.now());
  const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
  if (!same(exams, localExams) || !same(series, s.seriesLibrary)) {
    setSetting('exams', { ...getSettings().exams, [pid]: exams });
    setSetting('seriesLibrary', series);
    window.dispatchEvent(new Event(USER_DATA_EVENT));
  }
  if (!row || !same(exams, remoteExams) || !same(series, remoteSeries)) {
    const { error: e2 } = await cloud.from('user_data').upsert({ exams, series, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
    if (e2) throw e2;
  }
}

/** Synchronise maintenant (une seule à la fois). Erreurs : à gérer par l'appelant. */
export function syncUserData(): Promise<void> {
  running ??= syncOnce().finally(() => {
    running = null;
  });
  return running;
}

/** Après une modification locale : envoi groupé quelques secondes plus tard, erreurs ignorées (renvoi à la prochaine synchro). */
export function scheduleUserDataSync(): void {
  if (!cloudEnabled) return;
  window.clearTimeout(timer);
  timer = window.setTimeout(() => {
    syncUserData().catch((e) => console.warn('[compte en ligne] données d’entraînement : envoi différé', e));
  }, 2_000);
}
