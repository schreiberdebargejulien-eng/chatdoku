import { describe, expect, it } from 'vitest';
import { describeRegionPosition, isConnected, layoutFromAscii, validateRegions } from '../regions';

describe('Régions', () => {
  it('valide une carte correcte', () => {
    expect(validateRegions(layoutFromAscii(['AAAB', 'ACCB', 'DCCB', 'DDCB'])).valid).toBe(true);
  });
  it('rejette une région non connexe', () => {
    const res = validateRegions(layoutFromAscii(['ABAB', 'CCDD', 'CCDD', 'CCDD']));
    expect(res.valid).toBe(false);
  });
  it('rejette un nombre de régions différent de N', () => {
    const res = validateRegions({ size: 4, regions: new Array(16).fill(0) });
    expect(res.valid).toBe(false);
    expect(res.errors.some((e) => e.includes('empty'))).toBe(true);
  });
  it('rejette des identifiants hors bornes', () => {
    expect(validateRegions({ size: 4, regions: new Array(16).fill(7) }).valid).toBe(false);
  });
  it('la connexité est orthogonale (pas diagonale)', () => {
    expect(isConnected(3, [0, 4])).toBe(false);
    expect(isConnected(3, [0, 1, 4])).toBe(true);
  });
  it('décrit la position d’une région', () => {
    const l = layoutFromAscii(['AABB', 'AABB', 'CCDD', 'CCDD']);
    expect(describeRegionPosition(l, 0)).toBe('en haut à gauche');
    expect(describeRegionPosition(l, 3)).toBe('en bas à droite');
  });
});
