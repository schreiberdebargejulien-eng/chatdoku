import { describe, expect, it } from 'vitest';
import { generatePuzzle, getHint, neighbors8, solutionToCells, toIndex, type Puzzle } from '../../game-engine';
import {
  applyHintAction,
  canRemoveCat,
  catsOf,
  clearCrosses,
  createGame,
  crossesOf,
  MAX_LIVES,
  paintCrosses,
  placeCat,
  removeCat,
  setCross,
  tick,
  toggleCross,
  undo,
  type GameState,
} from '../gameLogic';

const puzzle: Puzzle = generatePuzzle('easy', { seed: 7 });
const N = puzzle.size;
const solution = solutionToCells(N, puzzle.solution);
const lax = { strictMode: false, autoCross: false };
const strict = { strictMode: true, autoCross: false };

/** A cell that is legal right now but not in the solution. */
function wrongButLegal(state: GameState): number {
  const cats = catsOf(state);
  for (let i = 0; i < N * N; i++) {
    if (solution.includes(i) || cats.includes(i)) continue;
    if (placeCat(state, i, lax).event.type === 'cat') return i;
  }
  throw new Error('none');
}

function playSolution(state: GameState): GameState {
  let s = state;
  for (const cell of solution) s = placeCat(s, cell, strict).state;
  return s;
}

describe('Partie : placement et victoire', () => {
  it('démarre avec 3 vies et une grille vide', () => {
    const g = createGame(puzzle);
    expect(g.lives).toBe(MAX_LIVES);
    expect(g.marks.every((m) => m === 'empty')).toBe(true);
    expect(g.status).toBe('playing');
  });
  it('gagne en plaçant la solution', () => {
    const g = playSolution(createGame(puzzle));
    expect(g.status).toBe('won');
    expect(g.lives).toBe(3);
    expect(g.mistakes).toBe(0);
  });
  it('ignore toute action après la fin de partie', () => {
    const g = playSolution(createGame(puzzle));
    expect(placeCat(g, 0).event.type).toBe('ignored');
    expect(toggleCross(g, 0).event.type).toBe('ignored');
  });
});

describe('Vies et erreurs', () => {
  const first = solution[0] as number;
  const sameRow = toIndex(N, 0, ((puzzle.solution[0] as number) + 3) % N);

  it('une erreur de règle retire une vie et refuse le chat', () => {
    const g = placeCat(createGame(puzzle), first).state;
    const t = placeCat(g, sameRow);
    expect(t.event.type).toBe('error');
    if (t.event.type !== 'error') return;
    expect(t.event.reasons).toContain('row');
    expect(t.event.message).toBe('Cette ligne contient déjà un chat.');
    expect(t.event.conflicts).toContain(first);
    expect(t.state.lives).toBe(2);
    expect(t.state.marks[sameRow]).toBe('empty');
  });

  it('une violation de plusieurs règles ne coûte qu’une vie', () => {
    const g = placeCat(createGame(puzzle), first).state;
    // A neighbour in the same row: row + adjacency (maybe region too).
    const neighbour = neighbors8(N, first).find((n) => Math.floor(n / N) === 0) as number;
    const t = placeCat(g, neighbour);
    expect(t.event.type === 'error' && t.event.reasons.length).toBeGreaterThanOrEqual(2);
    expect(t.state.lives).toBe(2);
    expect(t.state.mistakes).toBe(1);
  });

  it('un double clic ne compte jamais deux fois la même erreur', () => {
    const g = placeCat(createGame(puzzle), first).state;
    const once = placeCat(g, sameRow).state;
    const twice = placeCat(once, sameRow);
    expect(twice.state.lives).toBe(2);
    expect(twice.event.type === 'error' && twice.event.charged).toBe(false);
  });

  it('en mode strict, un chat légal mais faux coûte une vie', () => {
    const g = createGame(puzzle);
    const wrong = wrongButLegal(g);
    const t = placeCat(g, wrong, strict);
    expect(t.event.type === 'error' && t.event.reasons).toEqual(['wrong']);
    expect(t.state.lives).toBe(2);
  });

  it('en mode libre, un chat légal mais faux est accepté et retirable', () => {
    const g = createGame(puzzle);
    const wrong = wrongButLegal(g);
    const t = placeCat(g, wrong, lax);
    expect(t.event.type).toBe('cat');
    expect(canRemoveCat(t.state, wrong, lax)).toBe(true);
    expect(removeCat(t.state, wrong, lax).state.marks[wrong]).toBe('empty');
  });

  it('en mode strict, un chat correct est verrouillé', () => {
    const g = placeCat(createGame(puzzle), first, strict).state;
    expect(canRemoveCat(g, first, strict)).toBe(false);
  });

  it('perd la partie après trois erreurs', () => {
    let g = placeCat(createGame(puzzle), first).state;
    const candidates = Array.from({ length: N }, (_, c) => toIndex(N, 0, c)).filter((c) => c !== first);
    let lastEvent;
    for (const c of candidates.slice(0, 3)) {
      const t = placeCat(g, c);
      g = t.state;
      lastEvent = t.event;
    }
    expect(g.lives).toBe(0);
    expect(g.status).toBe('lost');
    expect(lastEvent?.type === 'error' && lastEvent.gameOver).toBe(true);
    expect(placeCat(g, solution[1] as number).event.type).toBe('ignored');
  });
});

describe('Croix (X)', () => {
  it('place et retire une croix sans jamais coûter de vie', () => {
    let g = createGame(puzzle);
    for (let i = 0; i < N * N; i++) g = toggleCross(g, i).state;
    expect(crossesOf(g)).toHaveLength(N * N);
    expect(g.lives).toBe(3);
    g = toggleCross(g, 5).state;
    expect(g.marks[5]).toBe('empty');
  });
  it('une croix ne bloque aucune case et ne compte pas comme chat', () => {
    let g = createGame(puzzle);
    const first = solution[0] as number;
    for (const n of neighbors8(N, first)) g = setCross(g, n, true).state;
    expect(catsOf(g)).toHaveLength(0);
    const t = placeCat(g, first);
    expect(t.event.type).toBe('cat');
  });
  it('un chat posé sur une croix la remplace', () => {
    let g = setCross(createGame(puzzle), solution[0] as number, true).state;
    g = placeCat(g, solution[0] as number).state;
    expect(g.marks[solution[0] as number]).toBe('cat');
  });
  it('impossible de poser une croix sur un chat', () => {
    const g = placeCat(createGame(puzzle), solution[0] as number).state;
    expect(setCross(g, solution[0] as number, true).event.type).toBe('ignored');
  });
  it('le glisser pose plusieurs croix en un seul geste annulable', () => {
    let g = paintCrosses(createGame(puzzle), [0, 1, 2, 2, 3], true);
    expect(crossesOf(g)).toEqual([0, 1, 2, 3]);
    expect(g.history).toHaveLength(1);
    g = undo(g);
    expect(crossesOf(g)).toEqual([]);
  });
  it('efface toutes les croix', () => {
    const g = clearCrosses(paintCrosses(createGame(puzzle), [0, 1, 2], true));
    expect(crossesOf(g)).toEqual([]);
  });
  it('les croix automatiques ne sont posées que si l’option est activée', () => {
    const off = placeCat(createGame(puzzle), solution[0] as number, strict).state;
    expect(crossesOf(off)).toHaveLength(0);
    const on = placeCat(createGame(puzzle), solution[0] as number, { strictMode: true, autoCross: true }).state;
    expect(crossesOf(on).length).toBeGreaterThan(N);
    expect(undo(on).marks.every((m) => m === 'empty')).toBe(true);
  });
});

describe('Annuler, indices, chrono', () => {
  it('annuler ne rend pas de vie', () => {
    let g = placeCat(createGame(puzzle), solution[0] as number).state;
    g = placeCat(g, toIndex(N, 0, ((puzzle.solution[0] as number) + 3) % N)).state;
    expect(g.lives).toBe(2);
    g = undo(g);
    expect(g.lives).toBe(2);
    expect(catsOf(g)).toHaveLength(0);
  });
  it('un indice de niveau 3 place un chat verrouillé', () => {
    const g = createGame(puzzle);
    const hint = getHint({ puzzle, cats: [], crosses: [] }, 3);
    const next = applyHintAction(g, { ...(hint.place !== undefined ? { place: hint.place } : {}) });
    expect(catsOf(next)).toEqual([hint.place]);
    expect(undo(next).marks).toEqual(next.marks);
  });
  it('le chrono avance seulement en jeu, avec un plafond par tick', () => {
    let g = tick(createGame(puzzle), 1000);
    expect(g.elapsedMs).toBe(1000);
    g = tick(g, 3_600_000);
    expect(g.elapsedMs).toBe(6000);
    expect(tick(playSolution(createGame(puzzle)), 1000).elapsedMs).toBe(0);
  });
});
