import { createRng, regionAdjacency, shuffle, type PuzzleLayout } from '../game-engine';

/** Soft, low-saturation region colours. `name` is used in hints ("la région Menthe"). */
export interface RegionColor {
  readonly name: string;
  readonly fill: string;
  /** Slightly deeper tone for highlights. */
  readonly deep: string;
}

export const REGION_COLORS: readonly RegionColor[] = [
  { name: 'Pêche', fill: '#F9D9C2', deep: '#EDB48C' },
  { name: 'Menthe', fill: '#CFEBD9', deep: '#93CFA9' },
  { name: 'Lavande', fill: '#DDD6F3', deep: '#AFA2E0' },
  { name: 'Citron', fill: '#F5EDB8', deep: '#E3D277' },
  { name: 'Ciel', fill: '#D0E4F5', deep: '#94BFE5' },
  { name: 'Rose', fill: '#F7D3DD', deep: '#E9A1B5' },
  { name: 'Sauge', fill: '#DFE6CB', deep: '#B7C890' },
  { name: 'Ardoise', fill: '#DEE2E8', deep: '#A9B2C0' },
  { name: 'Lilas', fill: '#EBD5EE', deep: '#CFA2D6' },
  { name: 'Lagon', fill: '#C9EAE7', deep: '#86CFC8' },
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
