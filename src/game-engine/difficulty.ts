import { logicSolve, type LogicStep } from './logic';
import type { DifficultyLevel, DifficultyReport, PuzzleLayout } from './types';

export const DIFFICULTY_LEVELS: readonly DifficultyLevel[] = ['easy', 'medium', 'hard', 'expert'];

export const DIFFICULTY_LABELS: Readonly<Record<DifficultyLevel, string>> = {
  easy: 'Facile',
  medium: 'Moyen',
  hard: 'Difficile',
  expert: 'Expert',
};

export interface DifficultyProfile {
  readonly sizes: readonly number[];
  /** Accepted range for the hardest technique tier. */
  readonly minTier: number;
  readonly maxTier: number;
  /** Accepted range for the 0–100 rating. */
  readonly minRating: number;
  readonly maxRating: number;
  /** Region growth style: 0 = compact blobs, 1 = very irregular shapes. */
  readonly irregularity: number;
  /** Smallest region allowed. */
  readonly minRegionSize: number;
}

/**
 * Target profiles. Difficulty is not only the grid size: it is driven by the
 * hardest deduction required and by the amount of reasoning (rating).
 */
export const DIFFICULTY_PROFILES: Readonly<Record<DifficultyLevel, DifficultyProfile>> = {
  easy: { sizes: [8], minTier: 1, maxTier: 2, minRating: 0, maxRating: 29, irregularity: 0.15, minRegionSize: 2 },
  medium: { sizes: [9], minTier: 2, maxTier: 3, minRating: 30, maxRating: 49, irregularity: 0.45, minRegionSize: 2 },
  hard: { sizes: [9, 10], minTier: 3, maxTier: 4, minRating: 50, maxRating: 69, irregularity: 0.7, minRegionSize: 3 },
  expert: { sizes: [10], minTier: 4, maxTier: 5, minRating: 70, maxRating: 100, irregularity: 0.9, minRegionSize: 3 },
};

/** Base rating of the hardest technique tier (index = tier). */
const TIER_BASE = [0, 0, 10, 30, 50, 70, 90];

function classify(rating: number): DifficultyLevel {
  if (rating >= 70) return 'expert';
  if (rating >= 50) return 'hard';
  if (rating >= 30) return 'medium';
  return 'easy';
}

/** Rates the steps of a logical solving path. */
export function rateSteps(size: number, steps: readonly LogicStep[], solved: boolean): Omit<DifficultyReport, 'initialEasyPlacements'> {
  const techniques: Record<string, number> = {};
  let score = 0;
  let maxTier = 1;
  for (const step of steps) {
    techniques[step.technique] = (techniques[step.technique] ?? 0) + 1;
    score += step.weight;
    maxTier = Math.max(maxTier, step.tier);
  }
  if (!solved) maxTier = 6;
  // Score of advanced reasoning, normalised by grid size. The easiest steps
  // (singles) barely count: what matters is how hard the reader must think.
  const hardWork = steps.reduce((acc, s) => acc + (s.tier === 1 ? 0 : s.weight), 0);
  const volume = Math.min(20, (hardWork / size) * 3);
  const rating = Math.max(0, Math.min(100, Math.round((TIER_BASE[maxTier] ?? 90) + volume)));
  return {
    maxTier,
    score,
    rating,
    steps: steps.length,
    techniques,
    solvedByLogic: solved,
    level: classify(rating),
  };
}

/** Full difficulty evaluation of a layout (assumed to have a unique solution). */
export function evaluateDifficulty(layout: PuzzleLayout): DifficultyReport {
  const { solved, steps } = logicSolve(layout, 5);
  // Initial accessibility: how many cats can be found with the simplest
  // techniques only, starting from the empty grid.
  const easy = logicSolve(layout, 2);
  const initialEasyPlacements = easy.state.cats.length;
  const base = rateSteps(layout.size, steps, solved);
  // Few easy entry points makes a grid noticeably harder.
  const accessPenalty = Math.round((1 - initialEasyPlacements / layout.size) * 8);
  const rating = Math.min(100, base.rating + accessPenalty);
  return { ...base, rating, level: classify(rating), initialEasyPlacements };
}

export function matchesProfile(report: DifficultyReport, level: DifficultyLevel): boolean {
  const p = DIFFICULTY_PROFILES[level];
  return (
    report.solvedByLogic &&
    report.maxTier >= p.minTier &&
    report.maxTier <= p.maxTier &&
    report.rating >= p.minRating &&
    report.rating <= p.maxRating
  );
}

/** Distance of a report to a profile, used to keep the closest grid when time is up. */
export function profileDistance(report: DifficultyReport, level: DifficultyLevel): number {
  const p = DIFFICULTY_PROFILES[level];
  if (!report.solvedByLogic) return 1000;
  const tierGap = report.maxTier < p.minTier ? p.minTier - report.maxTier : Math.max(0, report.maxTier - p.maxTier);
  const ratingGap =
    report.rating < p.minRating ? p.minRating - report.rating : Math.max(0, report.rating - p.maxRating);
  return tierGap * 20 + ratingGap;
}
