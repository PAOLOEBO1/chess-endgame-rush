// Salon de course : un canal Supabase Realtime par code (aucune table, aucune donnée enregistrée).
// Présence = la liste des joueurs avec leur score en direct ; diffusion = « départ » et « rejouer ».
// Les messages viennent d'inconnus : tout est nettoyé par sanitizePlayer avant d'être utilisé.

import { sanitizePlayer, type RacePlayer } from '../core/race';
import { getCloud } from './cloud';

export type RaceStatus = 'connecting' | 'ready' | 'error';

export interface RaceHandlers {
  onPlayers: (players: RacePlayer[]) => void;
  onStart: (by: string) => void;
  onAgain: (code: string, by: string) => void;
  onStatus: (status: RaceStatus) => void;
}

export interface RaceLink {
  /** Met à jour mon état (score, erreurs, terminé…) chez les autres. */
  update: (patch: Partial<Pick<RacePlayer, 'score' | 'errors' | 'done' | 'started'>>) => void;
  start: () => void;
  again: (code: string) => void;
  close: () => void;
}

export async function joinRace(code: string, me: { id: string; name: string; joinedAt: number }, h: RaceHandlers): Promise<RaceLink> {
  const sb = await getCloud();
  if (!sb) throw new Error('Les courses demandent la connexion au service en ligne.');
  const channel = sb.channel(`race:${code}`, { config: { presence: { key: me.id }, broadcast: { self: false } } });
  let mine: RacePlayer = { ...me, score: 0, errors: 0, done: false, started: false };
  let closed = false;
  // Envois de présence groupés : au plus un par seconde et par joueur (quota Supabase gratuit :
  // 20 messages de présence par seconde pour tout le projet). Le dernier état part toujours.
  let lastSent = 0;
  let pending: number | undefined;
  const push = () => {
    pending = undefined;
    lastSent = Date.now();
    if (!closed) void channel.track({ ...mine });
  };

  channel.on('presence', { event: 'sync' }, () => {
    if (closed) return;
    const list: RacePlayer[] = [];
    for (const [key, metas] of Object.entries(channel.presenceState())) {
      const last = (metas as unknown[])[(metas as unknown[]).length - 1];
      const p = sanitizePlayer(key, last);
      if (p) list.push(p);
    }
    h.onPlayers(list);
  });
  channel.on('broadcast', { event: 'start' }, ({ payload }) => {
    if (!closed) h.onStart(String((payload as { by?: unknown } | null)?.by ?? ''));
  });
  channel.on('broadcast', { event: 'again' }, ({ payload }) => {
    const p = payload as { by?: unknown; code?: unknown } | null;
    if (!closed && typeof p?.code === 'string') h.onAgain(p.code, String(p.by ?? ''));
  });
  channel.subscribe((status) => {
    if (closed) return;
    if (status === 'SUBSCRIBED') {
      void channel.track({ ...mine }).then(() => h.onStatus('ready'));
    } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
      h.onStatus('error');
    }
  });

  return {
    update: (patch) => {
      mine = { ...mine, ...patch };
      if (closed || pending !== undefined) return;
      // Fin de course : envoi immédiat (classement final) ; sinon une fois par seconde au plus.
      const wait = patch.done || patch.started ? 0 : Math.max(0, 1_000 - (Date.now() - lastSent));
      if (wait === 0) push();
      else pending = window.setTimeout(push, wait);
    },
    start: () => void channel.send({ type: 'broadcast', event: 'start', payload: { by: me.id } }),
    again: (next) => void channel.send({ type: 'broadcast', event: 'again', payload: { by: me.id, code: next } }),
    close: () => {
      closed = true;
      window.clearTimeout(pending);
      void channel.untrack().catch(() => undefined);
      void sb.removeChannel(channel);
    },
  };
}
