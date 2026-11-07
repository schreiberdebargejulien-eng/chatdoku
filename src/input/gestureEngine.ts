import type { CellIndex } from '../game-engine';

/**
 * Centralised touch gesture recogniser for the grid.
 *
 * It is the ONLY place where raw pointer input becomes game intents, so two
 * handlers can never fire contradictory actions. It is pure (time and
 * positions are passed in), hence fully unit-tested.
 *
 *  - Tap on an empty cell  → a cross appears immediately (on pointer down).
 *  - Tap on a crossed cell → the cross is removed (on pointer up, so that a
 *    drag starting on a cross does not erase it).
 *  - Two taps on the same cell within `doubleTapMs` → cat intent (the effect
 *    of the first tap is reverted by the store). Fires on the 2nd pointer down:
 *    no waiting, no artificial delay.
 *  - Press and slide → crosses on every cell crossed by the finger (empty cells
 *    only; cats are never touched; a slide never places a cat).
 */

export type Mark = 'empty' | 'cross' | 'cat';

/** Pointer position in grid units: x = column, y = row (fractional). */
export interface GridPoint {
  readonly x: number;
  readonly y: number;
}

export type GestureIntent =
  /** Finger down on an empty cell: cross it now (opens a stroke). */
  | { readonly type: 'cross-down'; readonly cell: CellIndex }
  /** Cells newly crossed by the sliding finger, in order. */
  | { readonly type: 'stroke'; readonly cells: readonly CellIndex[] }
  /** Tap released on a cell that held a cross: remove it. */
  | { readonly type: 'cross-off'; readonly cell: CellIndex }
  /** Double tap: cat placement (or removal). */
  | { readonly type: 'double'; readonly cell: CellIndex }
  /** The gesture is over (closes the undo group). */
  | { readonly type: 'end' };

export interface GestureConfig {
  readonly size: number;
  /** Max delay between the 1st release and the 2nd press. */
  readonly doubleTapMs: number;
}

export const DEFAULT_DOUBLE_TAP_MS = 280;

interface Active {
  readonly pointerId: number;
  readonly startCell: CellIndex;
  readonly startMark: Mark;
  readonly isDouble: boolean;
  lastCell: CellIndex;
  lastPoint: GridPoint;
  moved: boolean;
  visited: Set<CellIndex>;
}

export class GestureEngine {
  private config: GestureConfig;
  private active: Active | null = null;
  private lastTap: { cell: CellIndex; upTime: number } | null = null;

  constructor(config: GestureConfig, private readonly markOf: (cell: CellIndex) => Mark) {
    this.config = config;
  }

  configure(config: Partial<GestureConfig>): void {
    this.config = { ...this.config, ...config };
  }

  get busy(): boolean {
    return this.active !== null;
  }

  cellAt(p: GridPoint): CellIndex | null {
    const { size } = this.config;
    const c = Math.floor(p.x);
    const r = Math.floor(p.y);
    if (r < 0 || c < 0 || r >= size || c >= size) return null;
    return r * size + c;
  }

  /**
   * Every cell crossed by the segment a→b, in order (excluding a's cell).
   * Sampling every 1/8 of a cell guarantees that a fast finger skipping
   * several cells between two events never leaves a gap; cells outside the
   * grid are ignored.
   */
  cellsAlong(a: GridPoint, b: GridPoint): CellIndex[] {
    const dist = Math.hypot(b.x - a.x, b.y - a.y);
    const steps = Math.max(1, Math.ceil(dist * 8));
    const out: CellIndex[] = [];
    const start = this.cellAt(a);
    let prev = start;
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const cell = this.cellAt({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
      if (cell === null || cell === prev) {
        prev = cell ?? prev;
        continue;
      }
      prev = cell;
      if (cell !== start && !out.includes(cell)) out.push(cell);
    }
    return out;
  }

  down(pointerId: number, p: GridPoint, time: number): GestureIntent[] {
    if (this.active) return []; // a second finger is ignored
    const cell = this.cellAt(p);
    if (cell === null) return [];
    const last = this.lastTap;
    if (last && last.cell === cell && time - last.upTime <= this.config.doubleTapMs) {
      this.lastTap = null;
      this.active = {
        pointerId, startCell: cell, startMark: this.markOf(cell), isDouble: true,
        lastCell: cell, lastPoint: p, moved: false, visited: new Set([cell]),
      };
      return [{ type: 'double', cell }];
    }
    this.lastTap = null;
    const startMark = this.markOf(cell);
    this.active = {
      pointerId, startCell: cell, startMark, isDouble: false,
      lastCell: cell, lastPoint: p, moved: false, visited: new Set([cell]),
    };
    return startMark === 'empty' ? [{ type: 'cross-down', cell }] : [];
  }

  move(pointerId: number, p: GridPoint): GestureIntent[] {
    const a = this.active;
    if (!a || a.pointerId !== pointerId) return [];
    const crossed = this.cellsAlong(a.lastPoint, p);
    a.lastPoint = p;
    if (a.isDouble) return []; // the second tap of a double never draws
    const fresh = crossed.filter((c) => !a.visited.has(c));
    const here = this.cellAt(p);
    if (here !== null && here !== a.startCell) a.moved = true;
    if (crossed.length > 0) a.moved = true;
    if (here !== null) a.lastCell = here;
    for (const c of fresh) a.visited.add(c);
    return fresh.length > 0 ? [{ type: 'stroke', cells: fresh }] : [];
  }

  up(pointerId: number, p: GridPoint | null, time: number): GestureIntent[] {
    const a = this.active;
    if (!a || a.pointerId !== pointerId) return [];
    const out: GestureIntent[] = p ? this.move(pointerId, p) : [];
    this.active = null;
    if (a.isDouble) return [...out, { type: 'end' }];
    if (a.moved) {
      this.lastTap = null;
      return [...out, { type: 'end' }];
    }
    // A plain tap.
    this.lastTap = { cell: a.startCell, upTime: time };
    if (a.startMark === 'cross') out.push({ type: 'cross-off', cell: a.startCell });
    out.push({ type: 'end' });
    return out;
  }

  cancel(pointerId: number): GestureIntent[] {
    if (!this.active || this.active.pointerId !== pointerId) return [];
    this.active = null;
    this.lastTap = null;
    return [{ type: 'end' }];
  }

  reset(): void {
    this.active = null;
    this.lastTap = null;
  }
}
