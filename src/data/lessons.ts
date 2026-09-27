// Leçons guidées : une position classique rejouée coup par coup, chaque coup
// commenté. Coups en UCI (sans ambiguïté) ; la notation affichée est calculée.
// Textes originaux. Légalité de chaque ligne vérifiée par tests/lessons.test.ts.

export interface LessonStep {
  uci: string;
  comment: string;
}

export interface Lesson {
  id: string;
  title: string;
  fen: string;
  /** Ce qu'il faut voir avant le premier coup. */
  intro: string;
  steps: LessonStep[];
  /** À retenir. */
  summary: string;
  /** Position « Bases » pour s'entraîner ensuite. */
  practiceId: string;
}

export const LESSONS: Lesson[] = [
  {
    id: 'lecon-carre',
    title: 'La règle du carré',
    fen: '7k/8/8/8/p7/8/8/4K3 w - - 0 1',
    intro:
      'Le pion noir file vers a1. Trace le carré qui va du pion à sa case de promotion (a4-d4-d1-a1) : si le roi blanc peut y entrer, il rattrape le pion.',
    steps: [
      { uci: 'e1d2', comment: 'Le roi entre dans le carré (d2 est à l’intérieur de a1-d4-d1). Le pion est rattrapé.' },
      { uci: 'a4a3', comment: 'Le pion avance : son carré rétrécit (a3-c3-c1-a1), le roi y est toujours.' },
      { uci: 'd2c2', comment: 'Le roi reste dans le carré en se rapprochant de a1.' },
      { uci: 'a3a2', comment: 'Plus qu’une case avant la promotion.' },
      { uci: 'c2b2', comment: 'Le roi contrôle a1 : la dame qui naîtra sera prise.' },
      { uci: 'a2a1q', comment: 'Promotion forcée…' },
      { uci: 'b2a1', comment: '…et la dame disparaît aussitôt. Roi contre roi : nulle.' },
    ],
    summary: 'Avant de courir, compte : si ton roi peut entrer dans le carré du pion, il le rattrape. Sinon, cherche autre chose.',
    practiceId: 'bases-regle-du-carre',
  },
  {
    id: 'lecon-opposition',
    title: 'L’opposition et le temps de réserve',
    fen: '8/8/4k3/8/4K3/8/4P3/8 w - - 0 1',
    intro:
      'Les rois se font face : c’est l’opposition. Avec le trait, les Blancs devraient céder du terrain… mais leur pion, resté en e2, peut perdre un temps.',
    steps: [
      { uci: 'e2e3', comment: 'Le temps de réserve : le pion avance d’une case et c’est maintenant aux Noirs de bouger.' },
      { uci: 'e6d6', comment: 'Le roi noir doit s’écarter d’un côté.' },
      { uci: 'e4f5', comment: 'Débordement : le roi blanc passe par l’autre côté pour gagner du terrain.' },
      { uci: 'd6e7', comment: 'Les Noirs reviennent devant le pion.' },
      { uci: 'f5e5', comment: 'Le roi blanc s’installe devant son pion, sur la 5e rangée.' },
      { uci: 'e7f7', comment: 'Les Noirs ne peuvent pas garder toutes les cases.' },
      { uci: 'e5d6', comment: 'Le roi atteint la 6e rangée : les cases clés du pion sont conquises, le gain est assuré.' },
      { uci: 'f7f6', comment: 'Les Noirs attendent.' },
      { uci: 'e3e4', comment: 'Le pion avance maintenant, protégé par son roi.' },
      { uci: 'f6f7', comment: 'Le roi noir recule.' },
      { uci: 'e4e5', comment: 'Le pion suit.' },
      { uci: 'f7e8', comment: 'Les Noirs se placent devant le pion.' },
      { uci: 'd6e6', comment: 'Opposition prise : le roi noir doit céder.' },
      { uci: 'e8f8', comment: 'Seul coup possible de ce côté.' },
      { uci: 'e6d7', comment: 'Le roi blanc contrôle e7 et e8 : plus rien n’arrête le pion.' },
      { uci: 'f8f7', comment: 'Les Noirs tentent de revenir.' },
      { uci: 'e5e6', comment: 'Avec échec.' },
      { uci: 'f7f8', comment: 'Le roi noir recule.' },
      { uci: 'e6e7', comment: 'Encore un échec.' },
      { uci: 'f8f7', comment: 'Trop tard.' },
      { uci: 'e7e8q', comment: 'Dame, avec échec : gagné.' },
    ],
    summary:
      'Roi et pion contre roi : amène ton roi DEVANT ton pion, sur la 6e rangée si possible. Un coup de pion d’attente peut te rendre l’opposition.',
    practiceId: 'bases-opposition-attaque',
  },
  {
    id: 'lecon-lucena',
    title: 'Position de Lucena : construire le pont',
    fen: '1K1k4/1P6/8/8/8/8/r7/2R5 w - - 0 1',
    intro:
      'Le pion est en 7e, le roi blanc devant lui, le roi noir coupé par la tour c1. Problème : le roi blanc ne peut pas sortir sans subir d’échecs sur les colonnes. Solution : le « pont ».',
    steps: [
      { uci: 'c1d1', comment: 'D’abord, un échec pour éloigner encore le roi noir.' },
      { uci: 'd8e7', comment: 'Le roi noir s’écarte (en c7, il bloquerait moins bien).' },
      { uci: 'd1d4', comment: 'La clé : la tour monte en 4e rangée. Elle servira de bouclier (le « pont »).' },
      { uci: 'a2a1', comment: 'Les Noirs attendent en gardant la colonne a.' },
      { uci: 'b8c7', comment: 'Le roi blanc sort de sa cachette.' },
      { uci: 'a1c1', comment: 'Échecs par l’arrière…' },
      { uci: 'c7b6', comment: '…le roi se rapproche de sa tour.' },
      { uci: 'c1b1', comment: 'Encore un échec.' },
      { uci: 'b6c6', comment: 'Le roi continue sa descente vers la 4e rangée.' },
      { uci: 'b1c1', comment: 'Échec.' },
      { uci: 'c6b5', comment: 'Encore un pas.' },
      { uci: 'c1b1', comment: 'Dernier échec…' },
      { uci: 'd4b4', comment: '…la tour s’interpose : le pont est construit. Plus d’échec, le pion va à dame.' },
    ],
    summary: 'Lucena : coupe le roi adverse, place ta tour en 4e rangée, sors ton roi, puis interpose la tour pour arrêter les échecs.',
    practiceId: 'bases-lucena',
  },
  {
    id: 'lecon-philidor',
    title: 'Position de Philidor : défendre',
    fen: '4k3/7R/r7/3PK3/8/8/8/8 b - - 0 1',
    intro:
      'Tu défends avec les Noirs. Ton roi est devant le pion, ta tour sur la 6e rangée empêche le roi blanc d’y monter. C’est la défense la plus sûre des finales de tours.',
    steps: [
      { uci: 'a6b6', comment: 'Attendre sur la 6e rangée : le roi blanc ne peut pas avancer.' },
      { uci: 'd5d6', comment: 'Pour progresser, les Blancs doivent pousser le pion… qui ne peut plus abriter leur roi.' },
      { uci: 'b6b1', comment: 'Le moment clé : la tour file au fond, pour donner des échecs par l’arrière.' },
      { uci: 'e5e6', comment: 'Le roi blanc menace le mat en h8.' },
      { uci: 'b1e1', comment: 'Échec ! Le roi blanc n’a aucun abri.' },
      { uci: 'e6d5', comment: 'Il recule.' },
      { uci: 'e1d1', comment: 'Échec.' },
      { uci: 'd5c6', comment: 'Il tente un autre côté.' },
      { uci: 'd1c1', comment: 'Échec encore : les échecs ne s’arrêtent pas, c’est nulle.' },
    ],
    summary:
      'Philidor : tour sur la 6e rangée tant que le pion n’y est pas ; dès qu’il y arrive, tour au fond et échecs par l’arrière.',
    practiceId: 'bases-philidor',
  },
];
