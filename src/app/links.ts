// Liens reçus à l'ouverture (#groupe=…, #course=…, #serie=…) et options d'intégration dans un autre site.
// Lus une seule fois, au chargement de l'appli.

import { cloudEnabled } from '../services/cloud';
import { parseRaceCode } from '../core/race';
import { decodeSeries, type Series } from '../core/series';
import type { Puzzle } from '../core/types';
import { readEmbedOptions } from '../embed';
import { BASICS, classify } from './catalog';

export const embed = readEmbedOptions();

/** Groupe d'entraîneur reçu par lien (#groupe=CODE), lu une fois au chargement. */
export const GROUP_LINK = typeof window === 'undefined' ? null : (/^#groupe=([A-Za-z0-9]{8})$/.exec(window.location.hash)?.[1]?.toUpperCase() ?? null);

/** Course entre amis reçue par lien (#course=CODE), lue une fois au chargement. */
export const RACE_LINK = typeof window === 'undefined' || !cloudEnabled ? null : parseRaceCode(window.location.hash);

/** Série d'entraîneur reçue par lien (#serie=…), lue une fois au chargement. */
export const SERIES: Series | null = typeof window === 'undefined' ? null : decodeSeries(window.location.hash, (id) => BASICS.some((b) => b.id === id));
export const SERIES_PUZZLES: Puzzle[] = (SERIES?.items ?? []).map((it, i) =>
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
