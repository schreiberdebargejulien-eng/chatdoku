import { createRng, regionAdjacency, shuffle, type PuzzleLayout } from '../game-engine';

/** Medium pastel region colours (vivid enough to read, never harsh). `name` is used in hints ("la région Menthe"). */
export interface RegionColor {
  readonly name: string;
  readonly fill: string;
  /** Slightly deeper tone for highlights. */
  readonly deep: string;
}

export const REGION_COLORS: readonly RegionColor[] = [
  { name: 'Pêche', fill: '#F7B994', deep: '#E0915F' },
  { name: 'Menthe', fill: '#A3DDB9', deep: '#6BBF8C' },
  { name: 'Lavande', fill: '#BDB3EE', deep: '#8F80DA' },
  { name: 'Citron', fill: '#F3DE84', deep: '#D8BC45' },
  { name: 'Ciel', fill: '#9DCBF0', deep: '#5FA6DD' },
  { name: 'Rose', fill: '#F4AFC4', deep: '#E07D9C' },
  { name: 'Sauge', fill: '#C9DB9F', deep: '#9DB666' },
  { name: 'Ardoise', fill: '#B7C1D1', deep: '#8593AB' },
  { name: 'Lilas', fill: '#DDB1E6', deep: '#BC7FCB' },
  { name: 'Lagon', fill: '#8FD8CF', deep: '#4FB8AB' },
];

function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Approximate perceptual distance ("redmean" formula) between two colours. */
export function colorDistance(a: string, b: string): number {
  const [r1, g1, b1] = rgb(a);
  const [r2, g2, b2] = rgb(b);
  const rm = (r1 + r2) / 2;
  const dr = r1 - r2;
  const dg = g1 - g2;
  const db = b1 - b2;
  return Math.sqrt((2 + rm / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rm) / 256) * db * db);
}

/**
 * Assigns a distinct colour to each region, keeping neighbouring regions as far
 * apart as possible on the colour wheel. Deterministic per puzzle seed.
 */
export function assignRegionColors(layout: PuzzleLayout, seed: number): RegionColor[] {
  const adj = regionAdjacency(layout);
  const rng = createRng(seed ^ 0x5bd1e995);
  let best: number[] = [];
  let bestScore = -Infinity;
  for (let attempt = 0; attempt < 400; attempt++) {
    const perm = shuffle(rng, REGION_COLORS.map((_, i) => i)).slice(0, layout.size);
    let score = 0;
    adj.forEach((neighbours, r) => {
      for (const n of neighbours) {
        if (n <= r) continue;
        const d = colorDistance(
          (REGION_COLORS[perm[r] as number] as RegionColor).deep,
          (REGION_COLORS[perm[n] as number] as RegionColor).deep,
        );
        score += Math.min(d, 160) - (d < 90 ? 400 : 0);
      }
    });
    if (score > bestScore) {
      bestScore = score;
      best = perm;
    }
  }
  return best.map((i) => REGION_COLORS[i] as RegionColor);
}

/** "la région Menthe" */
export function regionDisplayName(color: RegionColor | undefined, id: number): string {
  return color ? `la région ${color.name}` : `la région n°${id + 1}`;
}
