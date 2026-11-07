import { describe, expect, it } from 'vitest';
import { solutionToCells } from '../board';
import { generatePuzzle } from '../generator';
import { getHint } from '../hints';

const puzzle = generatePuzzle('easy', { seed: 42 });
const solution = solutionToCells(puzzle.size, puzzle.solution);

describe('Indices', () => {
  it('niveau 1 oriente sans révéler de case', () => {
    const h = getHint({ puzzle, cats: [], crosses: [] }, 1);
    expect(h.kind).toBe('deduction');
    expect(h.cells).toHaveLength(0);
    expect(h.place).toBeUndefined();
    expect(h.units.length).toBeGreaterThan(0);
    expect(h.message.length).toBeGreaterThan(10);
  });
  it('niveau 2 montre des cases cohérentes avec la solution', () => {
    const h = getHint({ puzzle, cats: [], crosses: [] }, 2);
    expect(h.cells.length).toBeGreaterThan(0);
    if (h.technique === 'single') expect(solution).toContain(h.cells[0]);
    else for (const c of h.cells) expect(solution).not.toContain(c);
  });
  it('niveau 3 révèle une case de la solution', () => {
    const h = getHint({ puzzle, cats: [], crosses: [] }, 3);
    expect(h.place).toBeDefined();
    expect(solution).toContain(h.place);
  });
  it('signale un chat mal placé', () => {
    const wrong = [...Array(puzzle.size * puzzle.size).keys()].find((c) => !solution.includes(c)) as number;
    expect(getHint({ puzzle, cats: [wrong], crosses: [] }, 1).kind).toBe('wrong-cat');
    expect(getHint({ puzzle, cats: [wrong], crosses: [] }, 3).remove).toBe(wrong);
  });
  it('signale une croix posée sur un chat de la solution', () => {
    const h = getHint({ puzzle, cats: [], crosses: [solution[0] as number] }, 3);
    expect(h.kind).toBe('wrong-x');
    expect(h.remove).toBe(solution[0]);
  });
  it('mène à la victoire en suivant uniquement les indices de niveau 3', () => {
    const cats: number[] = [];
    for (let i = 0; i < puzzle.size; i++) {
      const h = getHint({ puzzle, cats, crosses: [] }, 3);
      expect(h.place).toBeDefined();
      cats.push(h.place as number);
    }
    expect([...cats].sort((a, b) => a - b)).toEqual([...solution].sort((a, b) => a - b));
    expect(getHint({ puzzle, cats, crosses: [] }, 1).kind).toBe('solved');
  });
  it('utilise les noms de régions fournis', () => {
    const h = getHint({ puzzle, cats: [], crosses: [], regionName: () => 'la région Pêche' }, 3);
    expect(h.message).toContain('Pêche');
  });
});
