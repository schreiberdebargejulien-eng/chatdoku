import { colOf, neighbors4, rowOf } from './board';
import type { CellIndex, PuzzleLayout, RegionMap } from './types';

export interface RegionValidation {
  readonly valid: boolean;
  readonly errors: string[];
}

/** Lists the cells of every region: result[regionId] = cells. */
export function regionCellLists(layout: PuzzleLayout): CellIndex[][] {
  const lists: CellIndex[][] = Array.from({ length: layout.size }, () => []);
  layout.regions.forEach((reg, i) => {
    lists[reg]?.push(i);
  });
  return lists;
}

/** True if `cells` form a single orthogonally connected component. */
export function isConnected(size: number, cells: readonly CellIndex[]): boolean {
  if (cells.length === 0) return false;
  const set = new Set(cells);
  const seen = new Set<CellIndex>([cells[0] as CellIndex]);
  const stack: CellIndex[] = [cells[0] as CellIndex];
  while (stack.length > 0) {
    const cur = stack.pop() as CellIndex;
    for (const n of neighbors4(size, cur)) {
      if (set.has(n) && !seen.has(n)) {
        seen.add(n);
        stack.push(n);
      }
    }
  }
  return seen.size === set.size;
}

/**
 * Structural validation of a region map:
 *  - one region id per cell, ids in 0..N-1,
 *  - exactly N non-empty regions,
 *  - every region orthogonally connected.
 */
export function validateRegions(layout: PuzzleLayout): RegionValidation {
  const { size, regions } = layout;
  const errors: string[] = [];
  if (regions.length !== size * size) {
    errors.push(`Expected ${size * size} cells, got ${regions.length}`);
    return { valid: false, errors };
  }
  for (let i = 0; i < regions.length; i++) {
    const reg = regions[i] as number;
    if (!Number.isInteger(reg) || reg < 0 || reg >= size) {
      errors.push(`Cell ${i} has invalid region id ${reg}`);
    }
  }
  if (errors.length > 0) return { valid: false, errors };
  const lists = regionCellLists(layout);
  lists.forEach((cells, id) => {
    if (cells.length === 0) errors.push(`Region ${id} is empty`);
    else if (!isConnected(size, cells)) errors.push(`Region ${id} is not connected`);
  });
  return { valid: errors.length === 0, errors };
}

/**
 * Builds a layout from ASCII art, one string per row, one character per region.
 * Handy for tests and hand-made tutorials, e.g. ["AAB", "ACB", "CCB"].
 */
export function layoutFromAscii(rows: readonly string[]): PuzzleLayout {
  const size = rows.length;
  const ids = new Map<string, number>();
  const regions: number[] = [];
  for (const row of rows) {
    const chars = [...row.replace(/\s+/g, '')];
    if (chars.length !== size) throw new Error(`Row "${row}" must have ${size} cells`);
    for (const ch of chars) {
      if (!ids.has(ch)) ids.set(ch, ids.size);
      regions.push(ids.get(ch) as number);
    }
  }
  return { size, regions };
}

export type VerticalZone = 'haut' | 'milieu' | 'bas';
export type HorizontalZone = 'gauche' | 'centre' | 'droite';

/** Human description of where a region lies on the grid ("en haut à gauche"…). */
export function describeRegionPosition(layout: PuzzleLayout, regionId: number): string {
  const cells = regionCellLists(layout)[regionId] ?? [];
  if (cells.length === 0) return 'sur la grille';
  let sr = 0;
  let sc = 0;
  for (const cell of cells) {
    sr += rowOf(layout.size, cell);
    sc += colOf(layout.size, cell);
  }
  const ar = sr / cells.length / (layout.size - 1);
  const ac = sc / cells.length / (layout.size - 1);
  const v: VerticalZone = ar < 0.36 ? 'haut' : ar > 0.64 ? 'bas' : 'milieu';
  const h: HorizontalZone = ac < 0.36 ? 'gauche' : ac > 0.64 ? 'droite' : 'centre';
  if (v === 'milieu' && h === 'centre') return 'au centre';
  if (v === 'milieu') return `à ${h === 'gauche' ? 'gauche' : 'droite'}`;
  if (h === 'centre') return `en ${v}`;
  return `en ${v} à ${h}`;
}

/** Regions that touch each other orthogonally (used for colour assignment). */
export function regionAdjacency(layout: PuzzleLayout): Set<number>[] {
  const adj = Array.from({ length: layout.size }, () => new Set<number>());
  layout.regions.forEach((reg, i) => {
    for (const n of neighbors4(layout.size, i)) {
      const other = layout.regions[n] as number;
      if (other !== reg) adj[reg]?.add(other);
    }
  });
  return adj;
}

export function cloneRegions(regions: RegionMap): number[] {
  return [...regions];
}
