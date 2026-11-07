/**
 * Core data structures of the Chatdoku engine.
 * The engine is pure TypeScript: no DOM, no React, fully deterministic.
 */

/** A cell index in a row-major N×N grid: index = r * N + c. */
export type CellIndex = number;

export interface Coord {
  readonly r: number;
  readonly c: number;
}

export type DifficultyLevel = 'easy' | 'medium' | 'hard' | 'expert';

/** Region layout: `regions[i]` is the region id (0..N-1) of cell i. */
export type RegionMap = readonly number[];

export interface PuzzleLayout {
  readonly size: number;
  readonly regions: RegionMap;
}

export interface DifficultyReport {
  /** Hardest technique tier needed (1 = trivial … 5 = trial & error). */
  readonly maxTier: number;
  /** Weighted sum of every deduction needed to finish the grid. */
  readonly score: number;
  /** Normalised 0–100 rating, comparable between grid sizes. */
  readonly rating: number;
  /** Number of logical steps of the solving path. */
  readonly steps: number;
  /** Number of cats deducible from the empty grid with the simplest techniques. */
  readonly initialEasyPlacements: number;
  /** Count of steps by technique. */
  readonly techniques: Readonly<Record<string, number>>;
  /** True if the human-style logic solver completes the grid without guessing. */
  readonly solvedByLogic: boolean;
  readonly level: DifficultyLevel;
}

export interface Puzzle extends PuzzleLayout {
  readonly id: string;
  readonly seed: number;
  /** `solution[r]` = column of the cat in row r. */
  readonly solution: readonly number[];
  readonly difficulty: DifficultyLevel;
  readonly report: DifficultyReport;
}
