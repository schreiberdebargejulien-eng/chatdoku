import { describe, expect, it } from 'vitest';
import { toIndex } from '../board';
import { layoutFromAscii } from '../regions';
import { countSolutions, findSolution, hasUniqueSolution, solve } from '../solver';
import { isValidSolution } from '../validator';

const unique = layoutFromAscii(['AAAB', 'ACCB', 'DCCB', 'DDCB']);
const multiple = layoutFromAscii(['AABB', 'AABB', 'CCDD', 'CCDD']);
const impossible = layoutFromAscii(['AAAB', 'ACCB', 'DDCB', 'DDDB']);

// A hand-checked 8×8 grid.
const eight = layoutFromAscii([
  'AAABBBBB',
  'AACCCBBB',
  'ACCDDDBE',
  'FCCDDEEE',
  'FFGGDEEE',
  'FFGGHHEE',
  'FGGGHHHE',
  'FFGHHHHH',
]);

describe('Solveur', () => {
  it('trouve la solution unique', () => {
    const res = solve(unique, { limit: 2 });
    expect(res.count).toBe(1);
    expect(res.solutions[0]).toEqual([1, 3, 0, 2]);
    expect(hasUniqueSolution(unique)).toBe(true);
  });
  it('détecte une grille avec plusieurs solutions', () => {
    expect(countSolutions(multiple)).toBe(2);
    expect(hasUniqueSolution(multiple)).toBe(false);
    const res = solve(multiple, { limit: 10 });
    expect(res.count).toBe(2);
    for (const s of res.solutions) expect(isValidSolution(multiple, s)).toBe(true);
  });
  it('détecte une grille sans solution', () => {
    expect(countSolutions(impossible)).toBe(0);
    expect(findSolution(impossible)).toBeNull();
  });
  it('respecte la limite de comptage', () => {
    expect(solve(multiple, { limit: 1 }).count).toBe(1);
  });
  it('tient compte des chats imposés', () => {
    expect(findSolution(multiple, [toIndex(4, 0, 1)])).toEqual([1, 3, 0, 2]);
    expect(findSolution(multiple, [toIndex(4, 0, 2)])).toEqual([2, 0, 3, 1]);
    // An illegal given (touching) makes the grid impossible.
    expect(solve(multiple, { givens: [0, 5] }).count).toBe(0);
  });
  it('tient compte des cases exclues', () => {
    expect(solve(multiple, { excluded: [toIndex(4, 0, 1)], limit: 5 }).count).toBe(1);
  });
  it('toutes les solutions trouvées sont valides', () => {
    const res = solve(eight, { limit: 50 });
    expect(res.count).toBeGreaterThan(0);
    for (const s of res.solutions) expect(isValidSolution(eight, s)).toBe(true);
  });
  it('compte exactement les solutions d’une grille sans régions contraignantes', () => {
    // 4×4 with 4 vertical stripes: only rows/cols/adjacency constrain → 2 solutions.
    expect(solve(layoutFromAscii(['ABCD', 'ABCD', 'ABCD', 'ABCD']), { limit: 10 }).count).toBe(2);
  });
  it('est déterministe', () => {
    expect(solve(eight, { limit: 50 }).solutions).toEqual(solve(eight, { limit: 50 }).solutions);
  });
});
