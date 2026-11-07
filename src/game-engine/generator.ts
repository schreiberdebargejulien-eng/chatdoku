import { neighbors4, solutionToCells, toIndex } from './board';
import {
  DIFFICULTY_PROFILES,
  evaluateDifficulty,
  matchesProfile,
  profileDistance,
} from './difficulty';
import { createRng, pick, randInt, shuffle, type Rng } from './random';
import { isConnected, validateRegions } from './regions';
import { solve } from './solver';
import type { CellIndex, DifficultyLevel, DifficultyReport, Puzzle, PuzzleLayout } from './types';
import { isValidSolution } from './validator';

/**
 * Random valid cat placement: a permutation (one cat per row and column)
 * where cats on consecutive rows are at least 2 columns apart (no touching).
 */
export function randomCatPlacement(size: number, rng: Rng): number[] {
  const cols: number[] = [];
  const used = new Set<number>();
  const rec = (r: number): boolean => {
    if (r === size) return true;
    const options = shuffle(rng, Array.from({ length: size }, (_, i) => i));
    for (const c of options) {
      if (used.has(c)) continue;
      const prev = cols[r - 1];
      if (prev !== undefined && Math.abs(prev - c) <= 1) continue;
      cols.push(c);
      used.add(c);
      if (rec(r + 1)) return true;
      cols.pop();
      used.delete(c);
    }
    return false;
  };
  if (!rec(0)) throw new Error(`No placement for size ${size}`);
  return cols;
}

/**
 * Grows N connected regions from the N cats of the planned solution. Each
 * region therefore contains exactly one solution cat by construction.
 * `irregularity` 0 → compact, rounded regions; 1 → snaky, irregular ones.
 */
export function growRegions(
  size: number,
  seeds: readonly CellIndex[],
  rng: Rng,
  irregularity: number,
): number[] {
  const regions = new Array<number>(size * size).fill(-1);
  const sizes = new Array<number>(size).fill(1);
  seeds.forEach((cell, id) => {
    regions[cell] = id;
  });
  let remaining = size * size - size;
  // Random "appetite" per region gives natural size variety.
  const appetite = Array.from({ length: size }, () => 0.5 + rng() * (0.6 + irregularity * 1.8));

  while (remaining > 0) {
    // Frontier: (region, cell) pairs.
    const frontier: { reg: number; cell: CellIndex; weight: number }[] = [];
    for (let i = 0; i < regions.length; i++) {
      if (regions[i] !== -1) continue;
      const seen = new Set<number>();
      for (const n of neighbors4(size, i)) {
        const reg = regions[n] as number;
        if (reg === -1 || seen.has(reg)) continue;
        seen.add(reg);
        let same = 0;
        for (const m of neighbors4(size, i)) if (regions[m] === reg) same++;
        // Compactness: favour cells hugging the region; irregular: favour tips.
        const shape = irregularity < 0.5 ? same ** (2 - irregularity * 2) : (1 / same) ** ((irregularity - 0.5) * 3);
        const balance = (appetite[reg] as number) / (sizes[reg] as number) ** (1.2 - irregularity * 0.8);
        frontier.push({ reg, cell: i, weight: Math.max(1e-6, shape * balance) });
      }
    }
    if (frontier.length === 0) break;
    const total = frontier.reduce((a, f) => a + f.weight, 0);
    let roll = rng() * total;
    let chosen = frontier[frontier.length - 1] as (typeof frontier)[number];
    for (const f of frontier) {
      roll -= f.weight;
      if (roll <= 0) {
        chosen = f;
        break;
      }
    }
    regions[chosen.cell] = chosen.reg;
    sizes[chosen.reg] = (sizes[chosen.reg] as number) + 1;
    remaining--;
  }
  return regions;
}

function regionSizes(size: number, regions: readonly number[]): number[] {
  const out = new Array<number>(size).fill(0);
  for (const r of regions) out[r] = (out[r] as number) + 1;
  return out;
}

/**
 * Makes the planned solution the only one. While another solution exists,
 * one of its cats (not part of the planned solution) is moved into a
 * neighbouring region: that region then holds two cats of the alternative
 * solution, which kills it, while the planned solution stays valid.
 */
export function enforceUniqueness(
  size: number,
  regions: number[],
  planned: readonly number[],
  rng: Rng,
  minRegionSize: number,
  maxIterations = 150,
): boolean {
  const plannedCells = new Set(solutionToCells(size, planned));
  const plannedKey = planned.join(',');

  /** Can `cell` leave its region without breaking it? */
  const canLeave = (cell: CellIndex, sizes: number[]): boolean => {
    if (plannedCells.has(cell)) return false;
    const from = regions[cell] as number;
    if ((sizes[from] as number) - 1 < minRegionSize) return false;
    const rest: CellIndex[] = [];
    regions.forEach((reg, i) => {
      if (reg === from && i !== cell) rest.push(i);
    });
    return isConnected(size, rest);
  };
  const targetsOf = (cell: CellIndex): number[] => {
    const from = regions[cell] as number;
    const targets = new Set<number>();
    for (const n of neighbors4(size, cell)) {
      const reg = regions[n] as number;
      if (reg !== from) targets.add(reg);
    }
    return [...targets];
  };

  for (let it = 0; it < maxIterations; it++) {
    const res = solve({ size, regions }, { limit: 4, maxNodes: 200_000 });
    if (res.aborted) return false;
    const others = res.solutions.filter((s) => s.join(',') !== plannedKey);
    if (others.length === 0) return res.count === 1;
    const sizes = regionSizes(size, regions);
    const moves: { cell: CellIndex; to: number }[] = [];
    for (const alt of others) {
      alt.forEach((c, r) => {
        const cell = toIndex(size, r, c);
        if (!canLeave(cell, sizes)) return;
        for (const to of targetsOf(cell)) moves.push({ cell, to });
      });
      if (moves.length > 0) break;
    }
    if (moves.length === 0) {
      // Stuck: perturb the border between two regions and keep searching.
      for (let i = 0; i < size * size; i++) {
        const targets = targetsOf(i);
        if (targets.length > 0 && canLeave(i, sizes)) for (const to of targets) moves.push({ cell: i, to });
      }
      if (moves.length === 0) return false;
    }
    const move = pick(rng, moves);
    regions[move.cell] = move.to;
  }
  return false;
}

export interface GenerateOptions {
  readonly seed: number;
  /** Grid size; defaults to a size allowed by the difficulty profile. */
  readonly size?: number;
  /** Maximum number of candidate grids examined. */
  readonly maxAttempts?: number;
}

export interface GeneratedLayout {
  readonly layout: PuzzleLayout;
  readonly solution: number[];
}

/** One random uniquely-solvable layout (no difficulty targeting). */
export function generateUniqueLayout(
  size: number,
  rng: Rng,
  irregularity = 0.5,
  minRegionSize = 2,
): GeneratedLayout {
  for (let attempt = 0; attempt < 500; attempt++) {
    const solution = randomCatPlacement(size, rng);
    const regions = growRegions(size, solutionToCells(size, solution), rng, irregularity);
    if (regions.includes(-1)) continue;
    if (Math.min(...regionSizes(size, regions)) < minRegionSize) continue;
    if (!enforceUniqueness(size, regions, solution, rng, minRegionSize)) continue;
    const layout = { size, regions };
    if (!validateRegions(layout).valid || !isValidSolution(layout, solution)) continue;
    return { layout, solution };
  }
  throw new Error(`Unable to generate a ${size}×${size} layout`);
}

/**
 * Generates a puzzle of the requested difficulty with exactly one solution
 * that can be found by pure logic (no guessing). Deterministic for a seed.
 */
export function generatePuzzle(level: DifficultyLevel, options: GenerateOptions): Puzzle {
  const profile = DIFFICULTY_PROFILES[level];
  const rng = createRng(options.seed);
  const size = options.size ?? (profile.sizes[randInt(rng, profile.sizes.length)] as number);
  const maxAttempts = options.maxAttempts ?? 40;

  let best: { gen: GeneratedLayout; report: DifficultyReport; dist: number } | null = null;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const gen = generateUniqueLayout(size, rng, profile.irregularity, profile.minRegionSize);
    const report = evaluateDifficulty(gen.layout);
    if (!report.solvedByLogic) continue;
    const dist = profileDistance(report, level);
    if (!best || dist < best.dist) best = { gen, report, dist };
    if (matchesProfile(report, level)) break;
  }
  if (!best) {
    // Extremely unlikely: fall back to any logic-solvable grid.
    for (;;) {
      const gen = generateUniqueLayout(size, rng, 0.3, 2);
      const report = evaluateDifficulty(gen.layout);
      if (report.solvedByLogic) {
        best = { gen, report, dist: 0 };
        break;
      }
    }
  }

  // Canonical region ids: numbered in reading order of their first cell.
  const { layout, solution } = canonicalize(best.gen);
  return {
    id: `${level}-${size}-${options.seed.toString(36)}`,
    seed: options.seed,
    size,
    regions: layout.regions,
    solution,
    difficulty: level,
    report: best.report,
  };
}

function canonicalize(gen: GeneratedLayout): GeneratedLayout {
  const map = new Map<number, number>();
  const regions = gen.layout.regions.map((r) => {
    if (!map.has(r)) map.set(r, map.size);
    return map.get(r) as number;
  });
  return { layout: { size: gen.layout.size, regions }, solution: gen.solution };
}

/** Final safety gate: never hand an invalid or ambiguous puzzle to the UI. */
export function verifyPuzzle(puzzle: Puzzle): boolean {
  const layout = { size: puzzle.size, regions: puzzle.regions };
  if (!validateRegions(layout).valid) return false;
  if (!isValidSolution(layout, puzzle.solution)) return false;
  const res = solve(layout, { limit: 2 });
  return !res.aborted && res.count === 1 && (res.solutions[0] as number[]).join(',') === puzzle.solution.join(',');
}
