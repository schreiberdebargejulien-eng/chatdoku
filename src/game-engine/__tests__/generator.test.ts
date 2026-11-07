import { describe, expect, it } from 'vitest';
import { solutionToCells } from '../board';
import { DIFFICULTY_LEVELS, DIFFICULTY_PROFILES, evaluateDifficulty } from '../difficulty';
import { generatePuzzle, generateUniqueLayout, randomCatPlacement, verifyPuzzle } from '../generator';
import { logicSolve } from '../logic';
import { createRng } from '../random';
import { regionCellLists, validateRegions } from '../regions';
import { solve } from '../solver';
import { isValidSolution } from '../validator';

describe('Placement aléatoire', () => {
  it('produit une permutation sans chats qui se touchent', () => {
    const rng = createRng(1);
    for (let i = 0; i < 50; i++) {
      for (const size of [8, 9, 10]) {
        const cols = randomCatPlacement(size, rng);
        expect(new Set(cols).size).toBe(size);
        for (let r = 1; r < size; r++) expect(Math.abs((cols[r] as number) - (cols[r - 1] as number))).toBeGreaterThan(1);
      }
    }
  });
});

describe('Générateur de grilles', () => {
  it('génère des grilles uniques et connexes (8, 9, 10)', () => {
    const rng = createRng(7);
    for (const size of [8, 9, 10]) {
      for (let i = 0; i < 4; i++) {
        const { layout, solution } = generateUniqueLayout(size, rng, i / 3, 2);
        expect(validateRegions(layout).valid).toBe(true);
        expect(regionCellLists(layout)).toHaveLength(size);
        expect(isValidSolution(layout, solution)).toBe(true);
        const res = solve(layout, { limit: 2 });
        expect(res.count).toBe(1);
        expect(res.solutions[0]).toEqual(solution);
      }
    }
  }, 60_000);

  it.each(DIFFICULTY_LEVELS)('génère un puzzle %s valide, unique et résoluble par la logique', (level) => {
    const puzzle = generatePuzzle(level, { seed: 1234 });
    expect(DIFFICULTY_PROFILES[level].sizes).toContain(puzzle.size);
    expect(verifyPuzzle(puzzle)).toBe(true);
    expect(puzzle.report.solvedByLogic).toBe(true);
    const sizes = regionCellLists(puzzle).map((c) => c.length);
    expect(Math.min(...sizes)).toBeGreaterThanOrEqual(DIFFICULTY_PROFILES[level].minRegionSize);
  }, 60_000);

  it('est déterministe pour une graine donnée', () => {
    const a = generatePuzzle('medium', { seed: 99 });
    const b = generatePuzzle('medium', { seed: 99 });
    expect(a.regions).toEqual(b.regions);
    expect(a.solution).toEqual(b.solution);
    expect(a.id).toBe(b.id);
  }, 60_000);

  it('les difficultés sont globalement ordonnées', () => {
    const ratings = DIFFICULTY_LEVELS.map((level) => {
      let sum = 0;
      for (let s = 0; s < 3; s++) sum += generatePuzzle(level, { seed: 500 + s }).report.rating;
      return sum / 3;
    });
    for (let i = 1; i < ratings.length; i++) expect(ratings[i]).toBeGreaterThan(ratings[i - 1] as number);
  }, 120_000);

  it('verifyPuzzle rejette un puzzle altéré', () => {
    const p = generatePuzzle('easy', { seed: 3 });
    expect(verifyPuzzle({ ...p, solution: [...p.solution].reverse() })).toBe(false);
    expect(verifyPuzzle({ ...p, regions: p.regions.map(() => 0) })).toBe(false);
  }, 60_000);
});

describe('Moteur logique', () => {
  it('chaque déduction est correcte vis-à-vis de la solution', () => {
    const rng = createRng(2024);
    for (let i = 0; i < 12; i++) {
      const size = 8 + (i % 3);
      const { layout, solution } = generateUniqueLayout(size, rng, 0.6, 2);
      const sol = new Set(solutionToCells(size, solution));
      const { steps, solved } = logicSolve(layout);
      for (const step of steps) {
        if (step.place !== undefined) expect(sol.has(step.place)).toBe(true);
        for (const e of step.eliminate) expect(sol.has(e)).toBe(false);
      }
      if (solved) {
        const report = evaluateDifficulty(layout);
        expect(report.rating).toBeGreaterThanOrEqual(0);
        expect(report.rating).toBeLessThanOrEqual(100);
      }
    }
  }, 60_000);
});
