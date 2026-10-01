// Icônes vectorielles de l'interface (tracés originaux, 24 × 24, trait = couleur du texte).
// Nettes à toutes les tailles et identiques sur tous les appareils, contrairement aux emojis.

type Shape = { d?: string; circle?: [number, number, number]; rect?: [number, number, number, number, number]; fill?: boolean };

const ICONS = {
  trophy: [{ d: 'M8 4h8v6a4 4 0 0 1-8 0z' }, { d: 'M8 6H5v1a3 3 0 0 0 3 3M16 6h3v1a3 3 0 0 1-3 3' }, { d: 'M12 14v4M8 21h8M9 18h6' }],
  chart: [{ d: 'M4 4v16h16' }, { d: 'M7 15l4-4 3 3 5-6' }],
  user: [{ circle: [12, 8, 4] }, { d: 'M4 21a8 8 0 0 1 16 0' }],
  volume: [{ d: 'M4 9v6h4l5 4V5L8 9z' }, { d: 'M16.5 9a4 4 0 0 1 0 6M19 6.5a8 8 0 0 1 0 11' }],
  mute: [{ d: 'M4 9v6h4l5 4V5L8 9z' }, { d: 'M17 9.5l5 5M22 9.5l-5 5' }],
  bolt: [{ d: 'M13 2L4 14h7l-1 8 9-12h-7z' }],
  flame: [{ d: 'M12 22c4 0 7-3 7-7 0-4-3-6-4-10-2 2-3 4-3 6-1-1-2-2-2-4-2 2-5 5-5 8 0 4 3 7 7 7z' }],
  book: [{ d: 'M5 5a2 2 0 0 1 2-2h12v15H7a2 2 0 0 0-2 2z' }, { d: 'M5 20a2 2 0 0 0 2 2h12v-4' }],
  cap: [{ d: 'M2 9l10-5 10 5-10 5z' }, { d: 'M6 11v5c3 2.5 9 2.5 12 0v-5M22 9v5' }],
  tool: [{ d: 'M14 4a5 5 0 0 0-4.5 7L3 17.5V21h3.5l6.5-6.5A5 5 0 0 0 20 10l-3 1-2-2 1-3z' }],
  scale: [{ d: 'M12 4v16M8 20h8M4 7h16' }, { d: 'M6 7l-3 6a3 3 0 0 0 6 0zM18 7l-3 6a3 3 0 0 0 6 0z' }],
  board: [{ rect: [3, 4, 18, 12, 1.5] }, { d: 'M8 21l4-5 4 5M7 9h6M7 12h9' }],
  play: [{ d: 'M7 4l13 8-13 8z', fill: true }],
  link: [{ d: 'M10 14a4 4 0 0 0 6 0l3-3a4 4 0 0 0-6-6l-1 1' }, { d: 'M14 10a4 4 0 0 0-6 0l-3 3a4 4 0 0 0 6 6l1-1' }],
  printer: [{ d: 'M7 9V3h10v6' }, { d: 'M7 17H4v-8h16v8h-3' }, { rect: [7, 14, 10, 7, 0.5] }],
  save: [{ d: 'M5 3h11l4 4v14H4V3z' }, { d: 'M8 3v5h7V3M7 21v-7h10v7' }],
  target: [{ circle: [12, 12, 9] }, { circle: [12, 12, 5] }, { circle: [12, 12, 1.2], fill: true }],
  refresh: [{ d: 'M20 12a8 8 0 1 1-2.4-5.7' }, { d: 'M20 4v5h-5' }],
  pin: [{ d: 'M12 21s7-6 7-12a7 7 0 0 0-14 0c0 6 7 12 7 12z' }, { circle: [12, 9, 2.5] }],
  flag: [{ d: 'M5 21V4M5 4h13l-2.5 4 2.5 4H5' }],
  palette: [
    { d: 'M12 3a9 9 0 0 0 0 18c1.5 0 2-1 2-2 0-1.5-1.5-2-.5-3.3.6-.7 1.6-.7 2.5-.7h1a4 4 0 0 0 4-4c0-4.4-4-8-9-8z' },
    { circle: [7.5, 11, 1.2], fill: true },
    { circle: [10, 7, 1.2], fill: true },
    { circle: [14.5, 7, 1.2], fill: true },
  ],
  lock: [{ rect: [5, 11, 14, 10, 2] }, { d: 'M8 11V8a4 4 0 0 1 8 0v3' }],
  dice: [{ rect: [4, 4, 16, 16, 3] }, { circle: [9, 9, 1.3], fill: true }, { circle: [15, 15, 1.3], fill: true }, { circle: [12, 12, 1.3], fill: true }],
  medal: [{ circle: [12, 15, 6] }, { d: 'M8 3l2.5 6.5M16 3l-2.5 6.5M12 12.5v5' }],
  library: [{ d: 'M4 4h4v16H4zM10 4h4v16h-4z' }, { d: 'M16 5l3.5-1 2 15.5-3.5 1z' }],
  plus: [{ d: 'M12 5v14M5 12h14' }],
  code: [{ d: 'M8 7l-5 5 5 5M16 7l5 5-5 5' }],
  cloud: [{ d: 'M7 18h10a4 4 0 0 0 .5-8A6 6 0 0 0 6 9.5 4.3 4.3 0 0 0 7 18z' }],
  search: [{ circle: [11, 11, 6] }, { d: 'M20 20l-4.5-4.5' }],
  timer: [{ circle: [12, 13, 8] }, { d: 'M12 9v4l2.5 2.5M10 2h4M12 2v3' }],
  settings: [{ circle: [12, 12, 3] }, { d: 'M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1' }],
  projector: [{ rect: [2, 7, 20, 10, 2] }, { circle: [15, 12, 2.5] }, { d: 'M6 11h3M7 17l-1 3M17 17l1 3' }],
  home: [{ d: 'M3 11l9-7 9 7' }, { d: 'M5 10v10h5v-6h4v6h5V10' }],
  check: [{ d: 'M5 12.5l4.5 4.5L19 7.5' }],
  cross: [{ d: 'M6 6l12 12M18 6L6 18' }],
  calendar: [{ rect: [3, 5, 18, 16, 2] }, { d: 'M3 10h18M8 3v4M16 3v4' }],
  users: [{ circle: [9, 8, 3.5] }, { d: 'M2.5 20a6.5 6.5 0 0 1 13 0' }, { d: 'M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6.5 6.5 0 0 1 3.5 6' }],
  bulb: [{ d: 'M9 18h6M10 21h4' }, { d: 'M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z' }],
  shield: [{ d: 'M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6z' }],
  arrowRight: [{ d: 'M4 12h15M13 6l6 6-6 6' }],
  undo: [{ d: 'M4 9h11a5 5 0 0 1 0 10H8' }, { d: 'M8 5L4 9l4 4' }],
  upload: [{ d: 'M12 16V4M7 9l5-5 5 5' }, { d: 'M4 16v4h16v-4' }],
  send: [{ d: 'M3 11l18-8-8 18-2-8z' }],
  edit: [{ d: 'M4 20h4L19 9l-4-4L4 16z' }, { d: 'M13 7l4 4' }],
  trash: [{ d: 'M4 7h16M10 11v6M14 11v6' }, { d: 'M6 7l1 13h10l1-13M9 7V4h6v3' }],
  eye: [{ d: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z' }, { circle: [12, 12, 3] }],
  eyeOff: [{ d: 'M3 3l18 18' }, { d: 'M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4M6.6 6.6C3.8 8.4 2 12 2 12s3.5 7 10 7a9.8 9.8 0 0 0 5.4-1.6' }, { d: 'M9.9 9.9a3 3 0 0 0 4.2 4.2' }],
  phone: [{ rect: [7, 2, 10, 20, 2] }, { d: 'M11 18h2' }],
  keyboard: [{ rect: [2, 6, 20, 12, 2] }, { d: 'M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10' }],
  warning: [{ d: 'M12 3l10 18H2z' }, { d: 'M12 10v4' }, { circle: [12, 17.5, 1], fill: true }],
  party: [{ d: 'M4 20l4-12 8 8z' }, { d: 'M14 4l1 2M19 9l2-1M17 3l-1 3M20 13l-2-1' }],
  help: [{ circle: [12, 12, 9] }, { d: 'M9.5 9.5a2.5 2.5 0 0 1 4.9.7c0 1.7-2.4 2.1-2.4 3.8' }, { circle: [12, 17, 1.1], fill: true }],
} satisfies Record<string, Shape[]>;

export type IconName = keyof typeof ICONS;

interface Props {
  name: IconName;
  className?: string;
  /** Texte pour les lecteurs d'écran ; absent = icône décorative. */
  label?: string;
}

export function Icon({ name, className = 'h-5 w-5', label }: Props) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`inline-block shrink-0 align-[-0.15em] ${className}`}
      aria-hidden={label ? undefined : true}
      role={label ? 'img' : undefined}
      aria-label={label}
      focusable="false"
    >
      {(ICONS[name] as Shape[]).map((s, i) => {
        const paint = s.fill ? { fill: 'currentColor', stroke: 'none' } : {};
        if (s.circle) return <circle key={i} cx={s.circle[0]} cy={s.circle[1]} r={s.circle[2]} {...paint} />;
        if (s.rect) return <rect key={i} x={s.rect[0]} y={s.rect[1]} width={s.rect[2]} height={s.rect[3]} rx={s.rect[4]} {...paint} />;
        return <path key={i} d={s.d} {...paint} />;
      })}
    </svg>
  );
}
