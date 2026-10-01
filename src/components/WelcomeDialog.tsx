// Présentation au premier lancement : 3 écrans courts, passables à tout moment.

import { useEffect, useRef, useState } from 'react';

const STEPS = [
  {
    icon: '♔',
    title: 'Bienvenue sur Endgame Rush',
    text: 'Des finales de vraies parties, jugées coup par coup par la table de finales (le résultat exact) et Stockfish.',
    items: ['⚡ Storm : 3 minutes, un maximum de finales', '🔥 Streak : la série s’arrête à la première erreur', '📚 Entraînement : Bases, leçons guidées, technique, sans chrono'],
  },
  {
    icon: '👆',
    title: 'Jouer un coup',
    text: 'Fais glisser la pièce, ou touche-la puis touche la case d’arrivée. Sur ordinateur, tu peux aussi taper le coup (ex. Rd2, e4).',
    items: ['La difficulté monte à chaque réussite', 'Une erreur ? L’appli montre le bon coup et la réponse qui punit', 'Besoin d’aide à l’entraînement ? Les indices viennent un par un'],
  },
  {
    icon: '👤',
    title: 'Tes progrès',
    text: 'Tes parties sont enregistrées sur cet appareil. Un compte gratuit, facultatif, les retrouve sur tous tes appareils.',
    items: ['📈 Ton Elo par type de finale', '🏁 Le défi de la semaine, le même pour tous', '🏆 Le classement du club, si tu le souhaites'],
  },
];

export function WelcomeDialog({ onClose, onGuide }: { onClose: () => void; onGuide?: () => void }) {
  const [step, setStep] = useState(0);
  const first = useRef<HTMLButtonElement>(null);
  const s = STEPS[step];
  const last = step === STEPS.length - 1;
  useEffect(() => {
    first.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [step, onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="welcome-title">
      <div className="w-full max-w-md rounded-2xl bg-stone-800 p-6 text-stone-100 shadow-xl">
        <p className="text-4xl" aria-hidden="true">
          {s.icon}
        </p>
        <h2 id="welcome-title" className="mt-2 text-xl font-extrabold">
          {s.title}
        </h2>
        <p className="mt-2 text-sm text-stone-300">{s.text}</p>
        <ul className="mt-3 space-y-1 text-sm text-stone-200">
          {s.items.map((it) => (
            <li key={it}>{it}</li>
          ))}
        </ul>
        <div className="mt-5 flex items-center justify-between">
          <div className="flex gap-1.5" aria-label={`Étape ${step + 1} sur ${STEPS.length}`}>
            {STEPS.map((_, i) => (
              <span key={i} className={`h-2 w-2 rounded-full ${i === step ? 'bg-amber-500' : 'bg-stone-600'}`} />
            ))}
          </div>
          <div className="flex gap-2">
            {last && onGuide && (
              <button type="button" onClick={onGuide} className="rounded-lg px-3 py-2 text-sm text-sky-300 hover:text-sky-200">
                Voir le guide
              </button>
            )}
            {!last && (
              <button type="button" onClick={onClose} className="rounded-lg px-3 py-2 text-sm text-stone-300 hover:text-stone-100">
                Passer
              </button>
            )}
            <button
              ref={first}
              type="button"
              onClick={() => (last ? onClose() : setStep(step + 1))}
              className="rounded-lg bg-amber-500 px-4 py-2 font-bold text-stone-900 hover:bg-amber-400"
            >
              {last ? 'C’est parti !' : 'Suivant →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
