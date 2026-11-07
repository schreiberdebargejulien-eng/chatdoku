import { describe, expect, it } from 'vitest';
import { armGhostClickGuard, isGhost } from '../ghostClick';

describe('Filtre anti-clic fantôme', () => {
  it('neutralise un clic au point du toucher juste après le geste', () => {
    armGhostClickGuard(100, 200, 1000);
    expect(isGhost({ clientX: 102, clientY: 198 }, 1100)).toBe(true);
  });
  it('laisse passer un vrai tap ailleurs (bouton Annuler)', () => {
    armGhostClickGuard(100, 200, 1000);
    expect(isGhost({ clientX: 100, clientY: 700 }, 1100)).toBe(false);
  });
  it('expire après la fenêtre', () => {
    armGhostClickGuard(100, 200, 1000);
    expect(isGhost({ clientX: 100, clientY: 200 }, 1600)).toBe(false);
  });
});
