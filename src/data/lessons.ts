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
  {
    id: 'lecon-reti',
    title: 'L’étude de Réti : la diagonale magique',
    fen: '7K/8/k1P5/7p/8/8/8/8 w - - 0 1',
    intro:
      'Le pion h file vers h1 et le roi blanc semble bien trop loin ; le pion c6, lui, paraît perdu. Le secret : une marche en diagonale qui poursuit deux buts à la fois.',
    steps: [
      { uci: 'h8g7', comment: 'En diagonale : le roi se rapproche du pion h ET de son propre pion c6.' },
      { uci: 'h5h4', comment: 'Le pion noir fonce.' },
      { uci: 'g7f6', comment: 'Toujours en diagonale : le roi menace d’aller soutenir c6 tout en suivant le pion h.' },
      { uci: 'a6b6', comment: 'Les Noirs courent prendre c6. Si 2…h3 plutôt, 3.Ke7 h2 4.c7 Kb7 5.Kd7 : les deux pions font dame, nulle.' },
      { uci: 'f6e5', comment: 'Encore la diagonale : le roi reste à portée de c6 et du pion h.' },
      { uci: 'b6c6', comment: 'Le pion c6 tombe…' },
      { uci: 'e5f4', comment: '…mais le roi blanc est maintenant dans le carré du pion h.' },
      { uci: 'h4h3', comment: 'Le pion avance.' },
      { uci: 'f4g3', comment: 'Le roi le rattrape.' },
      { uci: 'h3h2', comment: 'Dernier espoir.' },
      { uci: 'g3h2', comment: 'Pion pris : roi contre roi, nulle.' },
    ],
    summary: 'Pour le roi, une diagonale est aussi courte qu’une ligne droite : cherche le chemin qui sert deux buts à la fois.',
    practiceId: 'bases-reti',
  },
  {
    id: 'lecon-trait',
    title: 'Le trait décide : contourner le roi',
    fen: '8/2k5/1p6/1P1K4/8/8/8/8 w - - 0 1',
    intro:
      'Pions bloqués en b5 et b6. Avec les Noirs au trait, ce serait nul. Avec les Blancs au trait, le roi blanc contourne le roi noir et gagne le pion b6.',
    steps: [
      { uci: 'd5e6', comment: 'Le roi s’écarte du pion pour contourner le roi noir par la 6e rangée.' },
      { uci: 'c7b8', comment: 'Le roi noir ne peut pas garder à la fois d6 et c6.' },
      { uci: 'e6d6', comment: 'Le roi blanc s’approche de c6.' },
      { uci: 'b8a8', comment: 'Les Noirs attendent.' },
      { uci: 'd6c6', comment: 'Case clé : le pion b6 est attaqué.' },
      { uci: 'a8b8', comment: 'Le roi noir ne peut plus le défendre.' },
      { uci: 'c6b6', comment: 'Pion gagné, et le roi blanc est devant son pion.' },
      { uci: 'b8c8', comment: 'Le roi noir tente de bloquer.' },
      { uci: 'b6a7', comment: 'Le roi blanc contrôle b8 et libère le chemin du pion.' },
      { uci: 'c8c7', comment: 'Le roi noir revient.' },
      { uci: 'b5b6', comment: 'Le pion avance avec échec.' },
      { uci: 'c7c6', comment: 'Il s’écarte.' },
      { uci: 'b6b7', comment: 'Plus rien ne l’arrête.' },
      { uci: 'c6c7', comment: 'Trop tard.' },
      { uci: 'b7b8q', comment: 'Dame, avec échec : gagné.' },
    ],
    summary: 'En finale de pions, le trait peut tout changer (zugzwang). Avant de pousser un pion, regarde si ton roi peut contourner le roi adverse.',
    practiceId: 'bases-trait-decide',
  },
  {
    id: 'lecon-vancura',
    title: 'Défense Vancura : les échecs latéraux',
    fen: 'R7/6k1/P4r2/8/8/2K5/8/8 b - - 0 1',
    intro:
      'Tu défends avec les Noirs contre un pion de tour en 6e. Ta tour attaque le pion par le côté, depuis f6 ; la tour blanche, coincée devant son pion en a8, ne peut pas le protéger. Ton roi reste en g7 ou h7.',
    steps: [
      { uci: 'f6f3', comment: 'Le roi blanc veut s’approcher du pion : échec par le côté pour l’en empêcher.' },
      { uci: 'c3d4', comment: 'Il s’avance quand même.' },
      { uci: 'f3f6', comment: 'La tour revient aussitôt attaquer le pion a6.' },
      { uci: 'd4c4', comment: 'Nouvel essai.' },
      { uci: 'f6f4', comment: 'Échec latéral, encore.' },
      { uci: 'c4b5', comment: 'Le roi s’approche du pion.' },
      { uci: 'f4f5', comment: 'Les échecs continuent, rangée après rangée.' },
      { uci: 'b5c6', comment: 'Il cherche un abri.' },
      { uci: 'f5f6', comment: 'Échec, et la tour attaque de nouveau a6.' },
      { uci: 'c6c7', comment: 'Le roi monte.' },
      { uci: 'f6f7', comment: 'Échec sur la 7e rangée.' },
      { uci: 'c7b6', comment: 'Il redescend.' },
      { uci: 'f7f6', comment: 'Et ainsi de suite : aucun abri pour le roi blanc, nulle.' },
    ],
    summary: 'Vancura : la tour attaque le pion de tour par le côté ; quand le roi adverse approche, échecs latéraux puis retour sur la rangée du pion.',
    practiceId: 'bases-vancura',
  },
  {
    id: 'lecon-tour-fou',
    title: 'Tour contre fou : le mauvais coin',
    fen: '7k/2R5/5K2/8/8/8/8/b7 w - - 0 1',
    intro:
      'Tour contre fou, c’est nul si le roi défenseur se réfugie dans le coin de la couleur OPPOSÉE à son fou. Ici le fou est sur cases noires et le roi en h8, case noire : c’est le mauvais coin.',
    steps: [
      { uci: 'f6g6', comment: 'Le roi prend l’opposition et menace Rc8 mat.' },
      { uci: 'a1f6', comment: 'Le fou vient se placer pour couvrir la 8e rangée…' },
      { uci: 'c7c8', comment: 'Échec quand même.' },
      { uci: 'f6d8', comment: 'Seule parade : le fou s’interpose…' },
      { uci: 'c8d8', comment: '…et il est pris, avec mat.' },
    ],
    summary: 'Avec le fou, fuis vers le coin de la couleur opposée à ton fou : dans l’autre coin, le mat arrive vite.',
    practiceId: 'bases-tour-fou-mauvais-coin',
  },
  {
    id: 'lecon-roi-6e',
    title: 'Le roi sur la 6e rangée',
    fen: '4k3/8/4K3/8/4P3/8/8/8 w - - 0 1',
    intro:
      'Roi et pion contre roi. Le roi blanc est déjà sur la 6e rangée, devant son pion : c’est gagné, que les Blancs aient l’opposition ou non. Il suffit de ne pas se presser.',
    steps: [
      { uci: 'e6f6', comment: 'Le roi s’écarte d’un pas pour laisser passer le pion, en gardant e7 et f7.' },
      { uci: 'e8d7', comment: 'Les Noirs tentent de rester près de la case de promotion.' },
      { uci: 'e4e5', comment: 'Le pion avance, protégé par son roi.' },
      { uci: 'd7e8', comment: 'Le roi noir se remet devant le pion.' },
      { uci: 'f6e6', comment: 'Opposition : les rois se font face et c’est aux Noirs de céder.' },
      { uci: 'e8d8', comment: 'Seule façon de rester près du pion.' },
      { uci: 'e6f7', comment: 'Le roi blanc prend le contrôle de e7 et e8 : la voie est libre.' },
      { uci: 'd8d7', comment: 'Les Noirs reviennent au contact…' },
      { uci: 'e5e6', comment: '…le pion avance avec échec.' },
      { uci: 'd7d6', comment: 'Le roi noir ne peut pas le prendre : il est protégé.' },
      { uci: 'e6e7', comment: 'Le pion atteint la 7e rangée, toujours protégé.' },
      { uci: 'd6d7', comment: 'Les Noirs surveillent e8…' },
      { uci: 'e7e8q', comment: '…mais la case est défendue par le roi blanc : la dame naît. Gagné.' },
    ],
    summary: 'Roi sur la 6e rangée devant son pion (hors pion de tour) : c’est toujours gagné. Prends l’opposition, contrôle la case devant le pion, puis pousse.',
    practiceId: 'bases-roi-6e',
  },
  {
    id: 'lecon-pion-eloigne',
    title: 'Le pion passé éloigné',
    fen: '8/8/3k4/6p1/P2K2P1/8/8/8 w - - 0 1',
    intro:
      'Les Blancs ont un pion de plus, loin de l’autre aile : le pion a4. Il ne gagnera pas seul, mais il va attirer le roi noir loin du centre de l’action.',
    steps: [
      { uci: 'a4a5', comment: 'Le pion éloigné court : le roi noir doit s’en occuper.' },
      { uci: 'd6c6', comment: 'Le roi noir doit rester dans le carré du pion a5 (a5-d5-d8-a8).' },
      { uci: 'd4e5', comment: 'Le roi blanc part aussitôt vers l’autre aile.' },
      { uci: 'c6b5', comment: 'Le roi noir mord à l’hameçon…' },
      { uci: 'e5f5', comment: 'Le roi blanc arrive sur le pion g5.' },
      { uci: 'b5a5', comment: 'Le pion a5 tombe, mais le roi noir est maintenant en a5, très loin.' },
      { uci: 'f5g5', comment: 'Le pion g5 tombe aussi : le pion g4 est passé et le roi noir ne peut pas revenir à temps.' },
      { uci: 'a5b6', comment: 'Trop tard.' },
      { uci: 'g5f6', comment: 'Le roi blanc accompagne son pion.' },
      { uci: 'b6c7', comment: 'Les Noirs reviennent…' },
      { uci: 'g4g5', comment: 'Le pion avance.' },
      { uci: 'c7d7', comment: '…toujours trop lentement.' },
      { uci: 'g5g6', comment: 'Encore un pas.' },
      { uci: 'd7e8', comment: 'Le roi noir essaie d’atteindre f8.' },
      { uci: 'g6g7', comment: 'Le roi blanc contrôle f7 : le pion va à dame au coup suivant.' },
    ],
    summary: 'Un pion passé éloigné sert d’appât : le roi adverse doit aller le prendre, et ton roi gagne pendant ce temps les pions de l’autre aile.',
    practiceId: 'bases-pion-eloigne',
  },
  {
    id: 'lecon-dame-pion',
    title: 'Dame contre pion en 7e',
    fen: '8/8/8/8/1K6/8/3pk3/7Q w - - 0 1',
    intro:
      'Le pion noir est à un pas de la promotion. La méthode : par des échecs et des clouages, obliger le roi noir à se mettre DEVANT son pion. Chaque fois, ton roi gagne un temps pour s’approcher.',
    steps: [
      { uci: 'h1g2', comment: 'Échec : la dame se rapproche avec gain de temps.' },
      { uci: 'e2d3', comment: 'Le roi noir reste près de son pion.' },
      { uci: 'g2f3', comment: 'Encore un échec, qui garde un œil sur d1.' },
      { uci: 'd3c2', comment: 'Le roi protège la case de promotion.' },
      { uci: 'f3c3', comment: 'Échec, la dame est protégée par le roi b4.' },
      { uci: 'c2d1', comment: 'Pour garder son pion (en b1, il tomberait), le roi noir doit se mettre devant lui : il bloque sa propre promotion.' },
      { uci: 'b4c4', comment: 'Le temps gagné : le roi blanc se rapproche.' },
      { uci: 'd1e2', comment: 'Le roi noir sort pour libérer d1.' },
      { uci: 'c3d3', comment: 'Échec, protégé par le roi c4.' },
      { uci: 'e2e1', comment: 'Le roi recule.' },
      { uci: 'd3e3', comment: 'Échec encore.' },
      { uci: 'e1f1', comment: 'Si le roi va en d1, on recommence le même manège avec un nouveau pas du roi blanc.' },
      { uci: 'e3d2', comment: 'Le pion tombe : dame contre roi, gagné.' },
    ],
    summary: 'Dame contre pion en 7e (pion du centre ou de cavalier) : échecs et clouages pour forcer le roi devant son pion, puis un pas du roi. On répète jusqu’à prendre le pion.',
    practiceId: 'bases-dame-contre-pion',
  },
  {
    id: 'lecon-mauvais-fou',
    title: 'Fou de la mauvaise couleur',
    fen: '8/3k4/8/PK6/8/2B5/8/8 b - - 0 1',
    intro:
      'Pion de tour et fou : tu défends. La case de promotion a8 est blanche, le fou blanc ne va que sur les cases noires. Si ton roi atteint a8, personne ne pourra l’en chasser.',
    steps: [
      { uci: 'd7c7', comment: 'Cap sur le coin a8.' },
      { uci: 'b5a6', comment: 'Le roi blanc essaie de barrer la route.' },
      { uci: 'c7b8', comment: 'Trop tard : le roi noir est déjà à côté du coin.' },
      { uci: 'a6b6', comment: 'Le roi blanc contrôle b7 et a7…' },
      { uci: 'b8a8', comment: '…le roi entre dans le coin.' },
      { uci: 'a5a6', comment: 'Le pion avance.' },
      { uci: 'a8b8', comment: 'Le roi fait la navette entre a8 et b8.' },
      { uci: 'a6a7', comment: 'Échec du pion…' },
      { uci: 'b8a8', comment: '…retour en a8, devant le pion.' },
      { uci: 'c3e5', comment: 'Le fou contrôle b8 : les Noirs ne sont pas en échec mais n’ont plus aucun coup. Pat : nulle. Les autres essais des Blancs ne font pas mieux.' },
    ],
    summary: 'Pion de tour avec un fou qui ne contrôle pas la case de promotion : le roi défenseur va dans le coin et c’est nul.',
    practiceId: 'bases-mauvais-fou',
  },
  {
    id: 'lecon-dame-tour',
    title: 'Dame contre tour : l’attaque double',
    fen: '8/8/8/2k5/8/8/1r6/3QK3 w - - 0 1',
    intro:
      'Dame contre tour, c’est en général une longue technique. Mais une tour éloignée de son roi est souvent à la merci d’une attaque double : un échec qui l’attaque en même temps.',
    steps: [
      { uci: 'd1c1', comment: 'Échec au roi, et la dame attaque la tour b2 en même temps.' },
      { uci: 'c5d5', comment: 'Le roi doit parer l’échec. Interposer la tour en c2 ne sert à rien : elle serait prise.' },
      { uci: 'c1b2', comment: 'La tour tombe : dame contre roi, un mat de base.' },
    ],
    summary: 'Avant la longue technique, cherche l’échec qui attaque aussi la tour : une tour loin de son roi se perd souvent ainsi.',
    practiceId: 'bases-dame-tour-enfilade',
  },
];
