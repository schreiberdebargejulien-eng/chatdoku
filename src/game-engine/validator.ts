import { solutionToCells } from './board';
import { regionCellLists, validateRegions } from './regions';
import { placementViolations, RULE_MESSAGES, type RuleId, type RuleViolation } from './rules';
import type { CellIndex, PuzzleLayout } from './types';

export interface PlacementCheck {
  readonly ok: boolean;
  readonly violations: readonly RuleViolation[];
  /** The rule to tell the player about first (row > column > region > adjacency). */
  readonly primaryRule: RuleId | null;
  readonly message: string | null;
}

export function checkPlacement(
  layout: PuzzleLayout,
  cats: readonly CellIndex[],
  cell: CellIndex,
): PlacementCheck {
  if (cell < 0 || cell >= layout.size * layout.size) {
    throw new Error(`Cell ${cell} out of grid`);
  }
  const violations = placementViolations(layout, cats, cell);
  const primary = violations[0]?.rule ?? null;
  return {
    ok: violations.length === 0,
    violations,
    primaryRule: primary,
    message: primary ? RULE_MESSAGES[primary] : null,
  };
}

/** Every pair of cats on the board that break a rule together. */
export function findConflicts(layout: PuzzleLayout, cats: readonly CellIndex[]): RuleViolation[] {
  const out: RuleViolation[] = [];
  cats.forEach((cat, i) => {
    const before = cats.slice(0, i);
    for (const v of placementViolations(layout, before, cat)) {
      out.push({ rule: v.rule, conflictingCats: [...v.conflictingCats, cat] });
    }
  });
  return out;
}

/** True when the cats form a complete, rule-abiding solution of the layout. */
export function isSolved(layout: PuzzleLayout, cats: readonly CellIndex[]): boolean {
  const { size } = layout;
  if (cats.length !== size) return false;
  if (new Set(cats).size !== size) return false;
  if (findConflicts(layout, cats).length > 0) return false;
  const regionsHit = new Set(cats.map((c) => layout.regions[c]));
  return regionsHit.size === size && regionCellLists(layout).every((cells) => cells.length > 0);
}

/** Validates a solution given as columns-per-row. */
export function isValidSolution(layout: PuzzleLayout, cols: readonly number[]): boolean {
  if (cols.length !== layout.size) return false;
  if (cols.some((c) => !Number.isInteger(c) || c < 0 || c >= layout.size)) return false;
  return isSolved(layout, solutionToCells(layout.size, cols));
}

export function assertValidLayout(layout: PuzzleLayout): void {
  const res = validateRegions(layout);
  if (!res.valid) throw new Error(`Invalid layout: ${res.errors.join('; ')}`);
}
