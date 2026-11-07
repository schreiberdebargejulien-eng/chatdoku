import { areTouching, colOf, rowOf } from './board';
import type { CellIndex, PuzzleLayout } from './types';

/**
 * The four absolute rules of Chatdoku:
 *  1. one cat per region,
 *  2. one cat per row,
 *  3. one cat per column,
 *  4. two cats never touch (8-neighbourhood, across regions too).
 * Rule 5 (exactly N cats) follows from rules 1–3 on a complete grid.
 */
export type RuleId = 'row' | 'column' | 'region' | 'adjacent';

export const RULE_ORDER: readonly RuleId[] = ['row', 'column', 'region', 'adjacent'];

export interface RuleViolation {
  readonly rule: RuleId;
  /** Cats already on the board that conflict with the tested cell. */
  readonly conflictingCats: readonly CellIndex[];
}

export const RULE_MESSAGES: Readonly<Record<RuleId, string>> = {
  row: 'Cette ligne contient déjà un chat.',
  column: 'Cette colonne contient déjà un chat.',
  region: 'Cette région contient déjà un chat.',
  adjacent: 'Attention, un autre chat est trop proche !',
};

export function sameRow(size: number, a: CellIndex, b: CellIndex): boolean {
  return rowOf(size, a) === rowOf(size, b);
}

export function sameColumn(size: number, a: CellIndex, b: CellIndex): boolean {
  return colOf(size, a) === colOf(size, b);
}

export function sameRegion(layout: PuzzleLayout, a: CellIndex, b: CellIndex): boolean {
  return layout.regions[a] === layout.regions[b];
}

/** Every rule that a cat on `cell` would break, given the cats already placed. */
export function placementViolations(
  layout: PuzzleLayout,
  cats: Iterable<CellIndex>,
  cell: CellIndex,
): RuleViolation[] {
  const { size } = layout;
  const buckets: Record<RuleId, CellIndex[]> = { row: [], column: [], region: [], adjacent: [] };
  for (const cat of cats) {
    if (cat === cell) continue;
    if (sameRow(size, cat, cell)) buckets.row.push(cat);
    if (sameColumn(size, cat, cell)) buckets.column.push(cat);
    if (sameRegion(layout, cat, cell)) buckets.region.push(cat);
    if (areTouching(size, cat, cell)) buckets.adjacent.push(cat);
  }
  return RULE_ORDER.filter((rule) => buckets[rule].length > 0).map((rule) => ({
    rule,
    conflictingCats: buckets[rule],
  }));
}

/** True if a cat may legally be placed on `cell` (ignores whether it is the solution). */
export function canPlaceCat(layout: PuzzleLayout, cats: Iterable<CellIndex>, cell: CellIndex): boolean {
  return placementViolations(layout, cats, cell).length === 0;
}

/**
 * Cells where no cat can go any more because of the cats already placed
 * (same row, column, region, or touching). Cells holding a cat are excluded.
 */
export function blockedCells(layout: PuzzleLayout, cats: readonly CellIndex[]): Set<CellIndex> {
  const blocked = new Set<CellIndex>();
  const catSet = new Set(cats);
  for (let i = 0; i < layout.size * layout.size; i++) {
    if (catSet.has(i)) continue;
    if (!canPlaceCat(layout, cats, i)) blocked.add(i);
  }
  return blocked;
}
