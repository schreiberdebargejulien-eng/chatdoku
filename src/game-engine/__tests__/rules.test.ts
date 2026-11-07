import { describe, expect, it } from 'vitest';
import { toIndex } from '../board';
import { layoutFromAscii } from '../regions';
import { blockedCells, canPlaceCat, placementViolations } from '../rules';
import { checkPlacement, findConflicts, isSolved, isValidSolution } from '../validator';

// 6×6 layout, 6 regions.
const layout = layoutFromAscii([
  'AABBBC',
  'AABBCC',
  'DDBECC',
  'DDEEEF',
  'DDEEFF',
  'DDEFFF',
]);
const N = layout.size;
const at = (r: number, c: number) => toIndex(N, r, c);
const rules = (cats: number[], cell: number) => placementViolations(layout, cats, cell).map((v) => v.rule);

describe('Règle 2 — une ligne = un chat', () => {
  it('refuse deux chats sur la même ligne', () => {
    expect(rules([at(3, 0)], at(3, 5))).toEqual(['row']);
  });
});

describe('Règle 3 — une colonne = un chat', () => {
  it('refuse deux chats dans la même colonne', () => {
    expect(rules([at(0, 4)], at(5, 4))).toEqual(['column']);
  });
});

describe('Règle 1 — une région = un chat', () => {
  it('refuse deux chats dans la même région (sans autre conflit)', () => {
    // E region: (2,3) and (4,2) — different rows, columns, not touching.
    expect(rules([at(2, 3)], at(4, 2))).toEqual(['region']);
  });
});

describe('Règle 4 — interdiction de proximité', () => {
  it('refuse deux chats adjacents horizontalement', () => {
    expect(rules([at(2, 2)], at(2, 3))).toContain('adjacent');
  });
  it('refuse deux chats adjacents verticalement', () => {
    expect(rules([at(2, 2)], at(3, 2))).toContain('adjacent');
  });
  it('refuse deux chats adjacents en diagonale', () => {
    const v = rules([at(2, 2)], at(3, 3));
    expect(v).toEqual(['adjacent']);
  });
  it('s’applique entre deux régions différentes', () => {
    // (0,1) is in A, (1,2) is in B: they touch diagonally.
    expect(layout.regions[at(0, 1)]).not.toBe(layout.regions[at(1, 2)]);
    expect(rules([at(0, 1)], at(1, 2))).toEqual(['adjacent']);
  });
  it('bloque exactement les 8 cases voisines', () => {
    const blocked = blockedCells(layout, [at(2, 2)]);
    for (const [dr, dc] of [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]] as const) {
      expect(blocked.has(at(2 + dr, 2 + dc))).toBe(true);
    }
    // A cell at distance 2 in another row/column/region is free.
    expect(blocked.has(at(4, 0))).toBe(false);
    expect(blocked.has(at(2, 2))).toBe(false);
  });
  it('gère les coins de la grille', () => {
    const blocked = blockedCells(layout, [at(0, 0)]);
    expect(blocked.has(at(1, 1))).toBe(true);
    expect(canPlaceCat(layout, [at(0, 0)], at(2, 2))).toBe(true);
  });
});

describe('Placements enfreignant plusieurs règles', () => {
  it('liste toutes les règles enfreintes mais une seule règle principale', () => {
    // (1,1) vs (0,0): same region A + touching diagonally.
    const check = checkPlacement(layout, [at(0, 0)], at(1, 1));
    expect(check.ok).toBe(false);
    expect(check.violations.map((v) => v.rule)).toEqual(['region', 'adjacent']);
    expect(check.primaryRule).toBe('region');
    expect(check.message).toBe('Cette région contient déjà un chat.');
  });
  it('ligne + région + proximité', () => {
    const check = checkPlacement(layout, [at(0, 0)], at(0, 1));
    expect(check.violations.map((v) => v.rule)).toEqual(['row', 'region', 'adjacent']);
    expect(check.message).toBe('Cette ligne contient déjà un chat.');
  });
  it('accepte un placement valide', () => {
    const check = checkPlacement(layout, [at(0, 0)], at(2, 3));
    expect(check.ok).toBe(true);
    expect(check.message).toBeNull();
  });
  it('rejette une case hors grille', () => {
    expect(() => checkPlacement(layout, [], 999)).toThrow();
  });
});

describe('Validation d’une grille complète', () => {
  const four = layoutFromAscii(['AAAB', 'ACCB', 'DCCB', 'DDCB']);
  it('reconnaît une solution valide', () => {
    expect(isValidSolution(four, [1, 3, 0, 2])).toBe(true);
  });
  it('rejette une solution dont deux chats partagent une région', () => {
    expect(isValidSolution(four, [2, 0, 3, 1])).toBe(false);
  });
  it('rejette une solution incomplète ou mal formée', () => {
    expect(isValidSolution(four, [1, 3, 0])).toBe(false);
    expect(isValidSolution(four, [1, 3, 0, 9])).toBe(false);
    expect(isSolved(four, [toIndex(4, 0, 1)])).toBe(false);
  });
  it('détecte les conflits entre chats posés', () => {
    const conflicts = findConflicts(four, [toIndex(4, 0, 0), toIndex(4, 1, 1)]);
    expect(conflicts.map((c) => c.rule)).toContain('adjacent');
  });
});
