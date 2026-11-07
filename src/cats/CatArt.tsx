import { memo, useId } from 'react';
import type { CatDesign } from './catTypes';

interface CatArtProps {
  readonly cat: CatDesign;
  readonly size?: number | string;
  readonly className?: string;
  /** Eyes closed in a smile (victory, sleeping…). */
  readonly mood?: 'normal' | 'happy' | 'sad';
  readonly title?: string;
}

const HEADS = {
  round: 'M50 23C74 23 90 37 90 58C90 79 72 91 50 91C28 91 10 79 10 58C10 37 26 23 50 23Z',
  slim: 'M50 24C72 24 86 38 86 58C86 78 70 91 50 91C30 91 14 78 14 58C14 38 28 24 50 24Z',
  fluffy:
    'M50 22C58 22 63 25 69 27C76 28 80 33 84 38C89 42 91 48 91 55C93 61 91 67 88 72C86 78 81 82 75 86C69 90 60 92 50 92C40 92 31 90 25 86C19 82 14 78 12 72C9 67 7 61 9 55C9 48 11 42 16 38C20 33 24 28 31 27C37 25 42 22 50 22Z',
} as const;

const EARS = {
  normal: { outer: 'M15 47C12 33 13 18 19 9C21 6 25 6 27 8L46 26Z', inner: 'M20 38C19 29 20 20 23 15L37 27Z' },
  small: { outer: 'M18 42C16 33 17 24 22 18C24 16 27 16 29 18L42 29Z', inner: 'M22 36C21 30 22 25 25 22L35 30Z' },
  large: { outer: 'M18 50C10 34 8 14 13 4C15 1 19 1 22 3L46 28Z', inner: 'M22 41C17 30 16 17 18 10L37 29Z' },
} as const;

function mirror(path: string): string {
  // Mirrors a path made only of absolute M/C/L/Z commands around x = 50.
  return path.replace(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g, (_, x: string, y: string) => `${100 - Number(x)} ${y}`);
}

function withSpaces(path: string): string {
  return path.replace(/([MCLZ])/g, ' $1 ').replace(/(\d)-/g, '$1 -').replace(/\s+/g, ' ').trim();
}

const normalize = (p: string): string =>
  withSpaces(p).replace(/(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)/g, '$1 $2');

function Eyes({ cat, mood }: { cat: CatDesign; mood: 'normal' | 'happy' | 'sad' }) {
  const style = mood === 'happy' ? 'happy' : cat.eyes;
  const dark = '#2B2624';
  if (mood === 'sad') {
    return (
      <g stroke={dark} strokeWidth="3.4" strokeLinecap="round" fill="none">
        <path d="M29 58Q35 54 41 58" />
        <path d="M59 58Q65 54 71 58" />
      </g>
    );
  }
  if (style === 'happy') {
    return (
      <g stroke={dark} strokeWidth="3.6" strokeLinecap="round" fill="none">
        <path d="M28 58Q35 50 42 58" />
        <path d="M58 58Q65 50 72 58" />
      </g>
    );
  }
  if (style === 'sleepy') {
    return (
      <g stroke={dark} strokeWidth="3.4" strokeLinecap="round" fill="none">
        <path d="M28 56Q35 62 42 56" />
        <path d="M58 56Q65 62 72 56" />
      </g>
    );
  }
  if (style === 'iris') {
    return (
      <g>
        {[35, 65].map((x) => (
          <g key={x}>
            <ellipse cx={x} cy="56" rx="7.6" ry="8.6" fill={cat.iris ?? '#B8D46A'} stroke={dark} strokeWidth="1.6" />
            <ellipse cx={x} cy="56.5" rx="3" ry="6.6" fill={dark} />
            <circle cx={x + 2.6} cy="52.4" r="2.2" fill="#fff" />
          </g>
        ))}
      </g>
    );
  }
  return (
    <g>
      {[35, 65].map((x) => (
        <g key={x}>
          <ellipse cx={x} cy="56" rx="6.4" ry="7.6" fill={dark} />
          <circle cx={x + 2.2} cy="52.8" r="2.4" fill="#fff" />
          <circle cx={x - 2} cy="59" r="1" fill="#fff" opacity="0.7" />
        </g>
      ))}
    </g>
  );
}

function CatArtBase({ cat, size = '100%', className, mood = 'normal', title }: CatArtProps) {
  const uid = useId().replace(/:/g, '');
  const clip = `head-${uid}`;
  const head = HEADS[cat.head];
  const ears = EARS[cat.ears];
  const leftEar = normalize(ears.outer);
  const rightEar = mirror(leftEar);
  const leftInner = normalize(ears.inner);
  const rightInner = mirror(leftInner);
  const [p1, p2] = cat.patternColors ?? [];
  const pointColor = cat.pattern === 'points' ? p1 : undefined;

  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={className}
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      <defs>
        <clipPath id={clip}>
          <path d={head} />
        </clipPath>
      </defs>
      {/* Soft contact shadow */}
      <ellipse cx="50" cy="93" rx="28" ry="4" fill="#292929" opacity="0.08" />
      {/* Ears */}
      <g strokeLinejoin="round">
        <path d={leftEar} fill={pointColor ?? (cat.pattern === 'calico' ? p1 : cat.fur)} stroke={cat.line} strokeWidth="3" />
        <path d={rightEar} fill={pointColor ?? (cat.pattern === 'calico' ? p2 : cat.fur)} stroke={cat.line} strokeWidth="3" />
        <path d={leftInner} fill={cat.innerEar} />
        <path d={rightInner} fill={cat.innerEar} />
      </g>
      {/* Head */}
      <path d={head} fill={cat.fur} />
      <g clipPath={`url(#${clip})`}>
        {cat.pattern === 'tabby' && p1 && (
          <g stroke={p1} strokeWidth="4.2" strokeLinecap="round" fill="none" opacity="0.9">
            <path d="M50 25V37" />
            <path d="M40 27L42.5 36" />
            <path d="M60 27L57.5 36" />
            <path d="M9 52L21 55" />
            <path d="M9 61L20 62" />
            <path d="M91 52L79 55" />
            <path d="M91 61L80 62" />
          </g>
        )}
        {cat.pattern === 'calico' && p1 && p2 && (
          <g>
            <path d="M6 20H44C46 30 40 38 30 44C22 49 14 50 6 48Z" fill={p1} />
            <path d="M94 20H62C58 28 62 37 72 41C80 44 88 43 94 40Z" fill={p2} />
            <path d="M80 78C86 76 92 78 94 82V96H74C74 88 76 80 80 78Z" fill={p1} opacity="0.9" />
          </g>
        )}
        {cat.pattern === 'points' && p1 && (
          <g>
            <ellipse cx="50" cy="69" rx="21" ry="17" fill={p1} opacity="0.85" />
            <ellipse cx="50" cy="62" rx="13" ry="13" fill={p1} opacity="0.5" />
          </g>
        )}
        {cat.pattern === 'blaze' && p1 && <path d="M43 24C46 40 47 52 50 60C53 52 54 40 57 24Z" fill={p1} />}
        {/* Muzzle */}
        {cat.muzzle !== cat.fur && cat.pattern !== 'points' && (
          <ellipse cx="50" cy="72" rx="17" ry="12" fill={cat.muzzle} />
        )}
        {/* Bottom shading for volume */}
        <ellipse cx="50" cy="100" rx="48" ry="16" fill={cat.line} opacity="0.12" />
        {cat.wrinkles && (
          <g stroke={cat.line} strokeWidth="1.8" strokeLinecap="round" fill="none" opacity="0.55">
            <path d="M40 33Q50 29 60 33" />
            <path d="M42 39Q50 36 58 39" />
          </g>
        )}
      </g>
      <path d={head} fill="none" stroke={cat.line} strokeWidth="3" strokeLinejoin="round" />
      {/* Cheeks */}
      <ellipse cx="24" cy="70" rx="6" ry="3.6" fill={cat.blush ?? '#F4A3A8'} opacity="0.45" />
      <ellipse cx="76" cy="70" rx="6" ry="3.6" fill={cat.blush ?? '#F4A3A8'} opacity="0.45" />
      <Eyes cat={cat} mood={mood} />
      {/* Nose & mouth */}
      <path d="M45.5 65.5Q50 63 54.5 65.5Q53 69.5 50 70.5Q47 69.5 45.5 65.5Z" fill={cat.nose} />
      <path
        d={mood === 'sad' ? 'M44 78Q50 73 56 78' : 'M50 70.5Q50 75 45.5 75.8M50 70.5Q50 75 54.5 75.8'}
        stroke="#2B2624"
        strokeWidth="2.2"
        strokeLinecap="round"
        fill="none"
      />
      {/* Whiskers */}
      <g stroke={cat.fur === '#FFFFFF' || cat.fur === '#FFFCF6' ? '#BDB4A8' : '#FFFFFF'} strokeWidth="1.4" strokeLinecap="round" opacity="0.8">
        <path d="M21 66L6 63" />
        <path d="M21 70L7 72" />
        <path d="M79 66L94 63" />
        <path d="M79 70L93 72" />
      </g>
    </svg>
  );
}

export const CatArt = memo(CatArtBase);
