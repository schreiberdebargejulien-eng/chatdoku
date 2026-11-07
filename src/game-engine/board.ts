import type { CellIndex, Coord } from './types';

export const MIN_SIZE = 4;
export const MAX_SIZE = 12;

export function assertSize(size: number): void {
  if (!Number.isInteger(size) || size < MIN_SIZE || size > MAX_SIZE) {
    throw new Error(`Invalid grid size ${size}`);
  }
}

export function toIndex(size: number, r: number, c: number): CellIndex {
  return r * size + c;
}

export function toCoord(size: number, index: CellIndex): Coord {
  return { r: Math.floor(index / size), c: index % size };
}

export function rowOf(size: number, index: CellIndex): number {
  return Math.floor(index / size);
}

export function colOf(size: number, index: CellIndex): number {
  return index % size;
}

export function inBounds(size: number, r: number, c: number): boolean {
  return r >= 0 && c >= 0 && r < size && c < size;
}

const DIRS8: ReadonlyArray<readonly [number, number]> = [
  [-1, -1], [-1, 0], [-1, 1],
  [0, -1], [0, 1],
  [1, -1], [1, 0], [1, 1],
];
const DIRS4: ReadonlyArray<readonly [number, number]> = [
  [-1, 0], [0, -1], [0, 1], [1, 0],
];

const cache8 = new Map<number, CellIndex[][]>();
const cache4 = new Map<number, CellIndex[][]>();

function buildNeighbors(size: number, dirs: ReadonlyArray<readonly [number, number]>): CellIndex[][] {
  const out: CellIndex[][] = [];
  for (let i = 0; i < size * size; i++) {
    const r = rowOf(size, i);
    const c = colOf(size, i);
    const list: CellIndex[] = [];
    for (const [dr, dc] of dirs) {
      if (inBounds(size, r + dr, c + dc)) list.push(toIndex(size, r + dr, c + dc));
    }
    out.push(list);
  }
  return out;
}

/** The (up to) 8 cells touching `index` horizontally, vertically or diagonally. */
export function neighbors8(size: number, index: CellIndex): readonly CellIndex[] {
  let table = cache8.get(size);
  if (!table) {
    table = buildNeighbors(size, DIRS8);
    cache8.set(size, table);
  }
  return table[index] ?? [];
}

/** The (up to) 4 orthogonal neighbours of `index`. */
export function neighbors4(size: number, index: CellIndex): readonly CellIndex[] {
  let table = cache4.get(size);
  if (!table) {
    table = buildNeighbors(size, DIRS4);
    cache4.set(size, table);
  }
  return table[index] ?? [];
}

export function areTouching(size: number, a: CellIndex, b: CellIndex): boolean {
  if (a === b) return false;
  return (
    Math.abs(rowOf(size, a) - rowOf(size, b)) <= 1 &&
    Math.abs(colOf(size, a) - colOf(size, b)) <= 1
  );
}

export function rowCells(size: number, r: number): CellIndex[] {
  return Array.from({ length: size }, (_, c) => toIndex(size, r, c));
}

export function colCells(size: number, c: number): CellIndex[] {
  return Array.from({ length: size }, (_, r) => toIndex(size, r, c));
}

/** Converts a solution expressed as `cols[r]` into cell indices. */
export function solutionToCells(size: number, cols: readonly number[]): CellIndex[] {
  return cols.map((c, r) => toIndex(size, r, c));
}

export function cellsToSolution(size: number, cells: readonly CellIndex[]): number[] {
  const cols = new Array<number>(size).fill(-1);
  for (const cell of cells) cols[rowOf(size, cell)] = colOf(size, cell);
  return cols;
}
