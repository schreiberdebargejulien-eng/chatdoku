import { describe, expect, it } from 'vitest';
import { generatePuzzle, regionAdjacency } from '../game-engine';
import { CLASSIC_COLLECTION, catForRegion } from '../cats/collections';
import { assignRegionColors, colorDistance } from './palette';

describe('Couleurs des régions', () => {
  it('attribue une couleur distincte à chaque région, de façon déterministe', () => {
    for (const level of ['easy', 'expert'] as const) {
      const p = generatePuzzle(level, { seed: 11 });
      const colors = assignRegionColors(p, p.seed);
      expect(new Set(colors.map((c) => c.name)).size).toBe(p.size);
      expect(assignRegionColors(p, p.seed)).toEqual(colors);
      // Neighbouring regions avoid the closest pairs of colours on average.
      const adj = regionAdjacency(p);
      let min = Infinity;
      adj.forEach((ns, r) => ns.forEach((n) => (min = Math.min(min, colorDistance(colors[r]!.deep, colors[n]!.deep)))));
      expect(min).toBeGreaterThan(40);
    }
  }, 30_000);
});

describe('Chats', () => {
  it('neuf chats différents dans la collection classique', () => {
    expect(new Set(CLASSIC_COLLECTION.cats.map((c) => c.id)).size).toBe(9);
  });
  it('un chat par région, tous différents sur une grille 9×9', () => {
    const ids = Array.from({ length: 9 }, (_, r) => catForRegion(CLASSIC_COLLECTION, r, 5).id);
    expect(new Set(ids).size).toBe(9);
  });
});
