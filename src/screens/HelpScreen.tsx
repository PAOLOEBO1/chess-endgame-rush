// Guide de l'application : chaque fonctionnalité en quelques lignes, avec un
// bouton pour l'essayer tout de suite.

import { Icon, type IconName } from '../components/Icon';
import type { TrainTab } from '../services/settings';

export type GuideTarget =
  | { kind: 'mode'; mode: 'storm' | 'streak' }
  | { kind: 'training'; tab: TrainTab }
  | { kind: 'screen'; screen: 'progress' | 'stats' | 'leaderboard' | 'coach' };

interface Section {
  icon: IconName;
  title: string;
  who?: string;
  points: string[];
  go?: { label: string; target: GuideTarget };
}

const SECTIONS: { group: string; items: Section[] }[] = [
  {
    group: 'Jouer',
    items: [
      {
        icon: 'bolt',
        title: 'Storm',
        points: [
          '3 minutes pour résoudre un maximum de finales tirées de parties réelles.',
          'Chaque réussite ajoute du temps et fait monter la difficulté ; une erreur en retire.',
          'Choisis un thème (pions, tours, dames…), un motif si tu veux (zugzwang, pion avancé, coup calme…) et un niveau de départ.',
          'Un chrono par exercice mesure ton temps de réflexion : il est enregistré avec chaque tentative.',
          'Tu joues toute la partie avec la même couleur, celle du premier exercice : l’échiquier ne se retourne jamais.',
        ],
        go: { label: 'Lancer un Storm', target: { kind: 'mode', mode: 'storm' } },
      },
      {
        icon: 'flame',
        title: 'Streak',
        points: [
          'Sans chrono : la difficulté monte à chaque réussite, la série s’arrête à la première erreur.',
          'Comme en Storm, tu gardes la même couleur du début à la fin.',
        ],
        go: { label: 'Lancer un Streak', target: { kind: 'mode', mode: 'streak' } },
      },
      {
        icon: 'flag',
        title: 'Course entre amis',
        points: [
          'Depuis l’accueil, « Course entre amis » crée un salon : envoie le lien à tes amis (jusqu’à 10 joueurs), chacun choisit un pseudo.',
          'L’organisateur (le premier arrivé) lance le départ : après 5 secondes, tout le monde joue pendant 3 minutes les mêmes finales, dans le même ordre, avec la même couleur.',
          'Chaque réussite vaut un point ; une erreur fait perdre 10 secondes. Le classement se met à jour en direct, et l’organisateur peut relancer une nouvelle course avec les mêmes amis.',
          'Il faut une connexion Internet. Rien n’est enregistré : les pseudos et scores disparaissent à la fermeture du salon.',
        ],
      },
      {
        icon: 'pin',
        title: 'Puzzle du jour et défi de la semaine',
        points: [
          'Le même puzzle pour tout le monde chaque jour, et 10 finales communes du lundi au dimanche.',
          'Seule la première tentative compte : idéal pour se comparer au club.',
        ],
      },
    ],
  },
  {
    group: 'Apprendre',
    items: [
      {
        icon: 'book',
        title: 'Bases',
        points: [
          '30 positions de référence (Lucena, Philidor, opposition, mats de base…) à jouer jusqu’au bout contre la table de finales.',
          'Indices en 3 étapes (le plan, la pièce, le coup) ; « Jouer l’autre camp » pour défendre.',
          'Test de maîtrise par thème (badge 🏅) ; les positions réussies reviennent après 7, 21, 60 puis 120 jours.',
        ],
        go: { label: 'Ouvrir les Bases', target: { kind: 'training', tab: 'bases' } },
      },
      {
        icon: 'cap',
        title: 'Leçons guidées',
        points: ['13 classiques expliqués coup par coup, puis à rejouer soi-même.'],
        go: { label: 'Voir les leçons', target: { kind: 'training', tab: 'lecons' } },
      },
      {
        icon: 'tool',
        title: 'Technique',
        points: ['Une position réelle de 7 pièces au plus, à convertir jusqu’au mat (ou à tenir 20 coups), sans chrono.'],
        go: { label: 'S’entraîner', target: { kind: 'training', tab: 'technique' } },
      },
      {
        icon: 'scale',
        title: 'Gain, nulle ou perte ?',
        points: ['Annoncer le résultat sans jouer : pour savoir quand simplifier vers une finale.'],
        go: { label: 'Faire une série', target: { kind: 'training', tab: 'jugement' } },
      },
      {
        icon: 'search',
        title: 'Analyse libre',
        points: [
          'Colle une position (FEN) ou ouvre une partie que tu viens de jouer (bouton « Analyser »).',
          'Pour chaque coup : gagne (mat en N), nulle ou perd, d’après la table de finales ; Stockfish au-delà de 7 pièces.',
        ],
        go: { label: 'Ouvrir l’analyse', target: { kind: 'training', tab: 'analyse' } },
      },
      {
        icon: 'refresh',
        title: 'Révision des erreurs',
        points: ['Chaque position ratée revient le lendemain, puis à 3, 7 et 14 jours, jusqu’à ce qu’elle soit acquise.'],
      },
    ],
  },
  {
    group: 'Progresser',
    items: [
      {
        icon: 'chart',
        title: 'Ma progression',
        points: [
          'Elo par type de finale, records, badges, point faible conseillé.',
          '« Tes types d’erreurs » : gain laissé échapper, pat, méthode trop lente… avec un conseil ciblé.',
        ],
        go: { label: 'Voir ma progression', target: { kind: 'screen', screen: 'stats' } },
      },
      {
        icon: 'cloud',
        title: 'Compte et profil',
        points: [
          'Sans compte, tout reste sur l’appareil. Avec un compte gratuit, ton profil ☁ te suit sur tous tes appareils.',
          'Clique sur ton nom en haut à droite pour changer de joueur.',
        ],
        go: { label: 'Profils et compte', target: { kind: 'screen', screen: 'progress' } },
      },
      {
        icon: 'trophy',
        title: 'Classement',
        points: ['Défi de la semaine, Elo, Storm et puzzles de la semaine. Participation volontaire, sous un pseudo.'],
        go: { label: 'Voir le classement', target: { kind: 'screen', screen: 'leaderboard' } },
      },
    ],
  },
  {
    group: 'Entraîneurs et clubs',
    items: [
      {
        icon: 'library',
        title: 'Exercices de mes groupes',
        who: 'Entraîneur (compte nécessaire)',
        points: [
          'Importe tes exercices en PGN : tes élèves les jouent en Storm et en Streak (thème « Entraîneur »), du plus facile au plus difficile.',
          'En-tête [Theme "Opposition"] : tes élèves peuvent travailler un motif précis.',
          'Partage par un code ou un lien ; chaque import remplace la base du groupe. Tu peux avoir jusqu’à 10 groupes (classes, niveaux…), chacun avec son code, son PGN, ses devoirs et son suivi.',
          'Suivi des élèves qui l’acceptent (pseudo) : fiche de chaque élève (Elo sur ta base et sa courbe, réussite, temps médian, plafond de difficulté, motifs faibles, types d’erreurs), carte du groupe par motif, alerte d’inactivité, export CSV.',
          'Fiche de chaque exercice (réussite, temps, erreurs fréquentes) et recalibrage de son Elo d’après les résultats réels.',
          'Devoirs : « réussir N exercices de tel motif avant telle date » ; l’élève le voit dans « Aujourd’hui », tu suis qui l’a terminé.',
        ],
        go: { label: 'Espace entraîneur', target: { kind: 'screen', screen: 'coach' } },
      },
      {
        icon: 'link',
        title: 'Séries par lien et fiche imprimable',
        who: 'Entraîneur',
        points: ['Quelques positions choisies, envoyées par lien ou imprimées ; l’élève renvoie son résultat en un clic.'],
        go: { label: 'Créer une série', target: { kind: 'screen', screen: 'coach' } },
      },
      {
        icon: 'board',
        title: 'Rejoindre le groupe de son entraîneur',
        who: 'Élève (sans compte)',
        points: [
          'Ouvre le lien reçu, ou choisis le thème « Entraîneur » et entre le code du groupe.',
          'Ton entraîneur peut avoir plusieurs groupes, chacun avec son code : tu es dans un seul groupe à la fois.',
          'Pour changer de groupe, ouvre le lien du nouveau groupe (ton suivi dans l’ancien n’est effacé que si tu acceptes de partager avec le nouveau), ou touche « Quitter le groupe » (cela efface ton suivi chez ton entraîneur) puis entre le nouveau code.',
        ],
      },
    ],
  },
];

const TIPS = [
  'Jouer au clavier : tape le coup en notation anglaise (Rd8, e4, Kd2) sous l’échiquier.',
  'Promotion d’un pion : une colonne de pièces (dame, cavalier, tour, fou) apparaît sur la case d’arrivée ; touche la pièce voulue, ou touche ailleurs pour annuler.',
  'Installer l’appli : bouton « Installer » dans l’en-tête, ou « Ajouter à l’écran d’accueil » du navigateur.',
  'Hors ligne : l’appli fonctionne sans connexion ; ce que tu joues est envoyé au retour du réseau.',
  'Réglages (roue dentée en haut à droite) : son, apparence claire ou sombre, grand affichage pour projeter au club, couleurs de l’échiquier, répétition espacée.',
];

export function HelpScreen({ onHome, onGo }: { onHome: () => void; onGo: (target: GuideTarget) => void }) {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-stone-50">
          <Icon name="help" className="h-6 w-6 text-amber-300" /> Guide de l’application
        </h1>
        <button type="button" onClick={onHome} className="text-sm text-stone-400 hover:text-stone-100">
          ← Accueil
        </button>
      </div>
      <p className="text-stone-300">
        Gambix entraîne aux finales d’échecs : des parties réelles jugées coup par coup par la table de finales (résultat exact
        jusqu’à 7 pièces) et Stockfish. Voici tout ce que tu peux y faire.
      </p>
      <nav aria-label="Sommaire" className="flex flex-wrap gap-2">
        {SECTIONS.map((g) => (
          <a key={g.group} href={`#guide-${g.group}`} className="rounded-full bg-stone-800 px-3 py-1 text-sm font-semibold text-stone-200 hover:bg-stone-700">
            {g.group}
          </a>
        ))}
      </nav>

      {SECTIONS.map((g) => (
        <section key={g.group} id={`guide-${g.group}`} className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-400">{g.group}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {g.items.map((s) => (
              <article key={s.title} className="flex flex-col gap-2 rounded-xl bg-stone-800/70 p-4">
                <h3 className="flex items-center gap-2 font-bold text-stone-50">
                  <Icon name={s.icon} className="h-5 w-5 text-amber-300" /> {s.title}
                </h3>
                {s.who && <p className="text-xs font-semibold text-sky-300">{s.who}</p>}
                <ul className="flex list-disc flex-col gap-1 pl-5 text-sm text-stone-300">
                  {s.points.map((pt) => (
                    <li key={pt}>{pt}</li>
                  ))}
                </ul>
                {s.go && (
                  <button
                    type="button"
                    onClick={() => onGo(s.go!.target)}
                    className="mt-auto self-start rounded-lg bg-stone-700 px-3 py-1.5 text-sm font-semibold text-stone-100 hover:bg-stone-600"
                  >
                    {s.go.label} →
                  </button>
                )}
              </article>
            ))}
          </div>
        </section>
      ))}

      <section className="rounded-xl border border-stone-700 p-4">
        <h2 className="mb-2 font-bold text-stone-50">Astuces</h2>
        <ul className="flex list-disc flex-col gap-1 pl-5 text-sm text-stone-300">
          {TIPS.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
