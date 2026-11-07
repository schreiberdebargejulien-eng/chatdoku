import { colOf, neighbors8, rowOf } from './board';
import type { CellIndex, PuzzleLayout } from './types';

export interface SolveOptions {
  /** Stop after this many solutions (2 is enough to prove uniqueness). Default 2. */
  readonly limit?: number;
  /** Cats imposed before solving. */
  readonly givens?: readonly CellIndex[];
  /** Cells on which a cat is forbidden. */
  readonly excluded?: readonly CellIndex[];
  /** Safety net on explored nodes. Default 2 000 000. */
  readonly maxNodes?: number;
}

export interface SolveResult {
  /** Number of solutions found (capped by `limit`). */
  readonly count: number;
  /** Solutions as `cols[r]`. */
  readonly solutions: number[][];
  /** Search nodes explored. */
  readonly nodes: number;
  /** True if the search stopped because of `maxNodes`. */
  readonly aborted: boolean;
}

/**
 * Exact solver: depth-first backtracking with constraint propagation and the
 * MRV heuristic. Units are the N rows, N columns and N regions; at each node
 * the unsatisfied unit with the fewest remaining candidate cells is branched on
 * (a unit with 0 candidates is a dead end, one with 1 is a forced move).
 *
 * Placing a cat blocks its row, column, region and its 8 neighbours, so every
 * explored state respects the four rules by construction.
 */
export function solve(layout: PuzzleLayout, options: SolveOptions = {}): SolveResult {
  const { size, regions } = layout;
  const limit = options.limit ?? 2;
  const maxNodes = options.maxNodes ?? 2_000_000;
  const cellCount = size * size;
  const unitCount = size * 3;

  const unitCells: CellIndex[][] = Array.from({ length: unitCount }, () => []);
  const cellUnits: [number, number, number][] = [];
  for (let i = 0; i < cellCount; i++) {
    const r = rowOf(size, i);
    const c = colOf(size, i);
    const g = regions[i] as number;
    unitCells[r]?.push(i);
    unitCells[size + c]?.push(i);
    unitCells[2 * size + g]?.push(i);
    cellUnits.push([r, size + c, 2 * size + g]);
  }

  // Cells blocked when a cat sits on `cell` (row ∪ column ∪ region ∪ neighbours).
  const shadow: CellIndex[][] = [];
  for (let i = 0; i < cellCount; i++) {
    const set = new Set<CellIndex>();
    for (const u of cellUnits[i] as number[]) for (const x of unitCells[u] as CellIndex[]) set.add(x);
    for (const n of neighbors8(size, i)) set.add(n);
    set.delete(i);
    shadow.push([...set]);
  }

  const block = new Int16Array(cellCount);
  const unitDone = new Uint8Array(unitCount);
  const cats: CellIndex[] = [];
  const solutions: number[][] = [];
  let nodes = 0;
  let aborted = false;

  for (const x of options.excluded ?? []) block[x] = (block[x] as number) + 1;

  const place = (cell: CellIndex): void => {
    for (const x of shadow[cell] as CellIndex[]) block[x] = (block[x] as number) + 1;
    for (const u of cellUnits[cell] as number[]) unitDone[u] = 1;
    cats.push(cell);
  };
  const unplace = (cell: CellIndex): void => {
    for (const x of shadow[cell] as CellIndex[]) block[x] = (block[x] as number) - 1;
    for (const u of cellUnits[cell] as number[]) unitDone[u] = 0;
    cats.pop();
  };

  for (const g of options.givens ?? []) {
    if (block[g] !== 0) {
      return { count: 0, solutions: [], nodes: 0, aborted: false };
    }
    place(g);
  }

  const search = (): void => {
    if (solutions.length >= limit || aborted) return;
    nodes++;
    if (nodes > maxNodes) {
      aborted = true;
      return;
    }
    let bestUnit = -1;
    let bestCount = Infinity;
    for (let u = 0; u < unitCount; u++) {
      if (unitDone[u]) continue;
      let count = 0;
      for (const x of unitCells[u] as CellIndex[]) if (block[x] === 0) count++;
      if (count < bestCount) {
        bestCount = count;
        bestUnit = u;
        if (count === 0) return; // dead end
      }
    }
    if (bestUnit === -1) {
      if (cats.length === size) {
        const cols = new Array<number>(size);
        for (const cat of cats) cols[rowOf(size, cat)] = colOf(size, cat);
        solutions.push(cols);
      }
      return;
    }
    for (const x of unitCells[bestUnit] as CellIndex[]) {
      if (block[x] !== 0) continue;
      place(x);
      search();
      unplace(x);
      if (solutions.length >= limit || aborted) return;
    }
  };

  search();
  return { count: solutions.length, solutions, nodes, aborted };
}

/** Number of solutions, capped at `limit` (default 2). */
export function countSolutions(layout: PuzzleLayout, limit = 2): number {
  return solve(layout, { limit }).count;
}

export function hasUniqueSolution(layout: PuzzleLayout): boolean {
  const res = solve(layout, { limit: 2 });
  return !res.aborted && res.count === 1;
}

/** First solution found, or null when the grid is impossible. */
export function findSolution(layout: PuzzleLayout, givens: readonly CellIndex[] = []): number[] | null {
  return solve(layout, { limit: 1, givens }).solutions[0] ?? null;
}
