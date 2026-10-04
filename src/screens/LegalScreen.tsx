// Mentions légales (loi n° 2004-575 du 21 juin 2004, « LCEN »).
// Éditeur particulier non professionnel : il peut ne publier que les coordonnées de
// l'hébergeur, son identité ayant été communiquée à celui-ci (article 1-1 de la LCEN).

import { Icon } from '../components/Icon';
import { CONTACT, Section, SOURCE_URL } from './PrivacyScreen';

const UPDATED = '2 octobre 2026';

export function LegalScreen({ onHome, onPrivacy }: { onHome: () => void; onPrivacy: () => void }) {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5 px-4 py-8 text-sm leading-relaxed text-stone-300">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-stone-50">
          <Icon name="scale" className="h-6 w-6 text-amber-300" /> Mentions légales
        </h1>
        <button type="button" onClick={onHome} className="text-sm text-stone-400 hover:text-stone-100">
          ← Accueil
        </button>
      </div>
      <p className="text-stone-400">Dernière mise à jour : {UPDATED}.</p>

      <Section title="Éditeur">
        <p>
          Gambix est édité à titre non professionnel et non commercial par un particulier. Comme le permet la loi pour la
          confiance dans l’économie numérique (article 1-1), l’éditeur ne publie pas son identité : elle a été communiquée à
          l’hébergeur ci-dessous.
        </p>
        <p>
          Contact :{' '}
          {CONTACT ? (
            <a className="text-sky-400 hover:underline" href={`mailto:${CONTACT}`}>
              {CONTACT}
            </a>
          ) : (
            'adresse d’expéditeur des emails du site'
          )}
          .
        </p>
      </Section>

      <Section title="Hébergeur">
        <p>
          <strong>Cloudflare, Inc.</strong> — 101 Townsend Street, San Francisco, CA 94107, États-Unis — téléphone : +1 888 993 5273.
        </p>
        <p>
          Les comptes et les données synchronisées sont stockés par <strong>Supabase, Inc.</strong> dans une région de l’Union européenne :
          voir{' '}
          <button type="button" onClick={onPrivacy} className="text-sky-400 hover:underline">
            Données personnelles
          </button>
          .
        </p>
      </Section>

      <Section title="Propriété intellectuelle et licences">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            Code de l’application : logiciel libre sous licence GNU GPL v3
            {SOURCE_URL && (
              <>
                {' '}
                (
                <a className="text-sky-400 hover:underline" href={SOURCE_URL} target="_blank" rel="noreferrer">
                  code source
                </a>
                )
              </>
            )}
            .
          </li>
          <li>Positions d’entraînement : base de puzzles de Lichess, publiée sous licence CC0 (domaine public).</li>
          <li>Moteur d’analyse : Stockfish (licence GNU GPL v3). Résultats exacts des finales : tables Syzygy, via l’API de Lichess.</li>
          <li>Échiquier : bibliothèque chessground de Lichess (licence GNU GPL v3) et pièces « cburnett » de Colin M. L. Burnett.</li>
          <li>
            Exercices importés par un entraîneur : ils restent sous sa responsabilité, et il ne doit partager que des exercices qu’il a le
            droit de diffuser.
          </li>
        </ul>
      </Section>

      <Section title="Signaler un contenu">
        <p>
          Un contenu vous semble illicite (pseudo du classement, nom d’un groupe ou d’une série) ? Écrivez à l’adresse de contact en
          indiquant la page concernée : il sera examiné et retiré si nécessaire.
        </p>
      </Section>
    </div>
  );
}
