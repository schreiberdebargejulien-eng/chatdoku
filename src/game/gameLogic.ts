import {
  blockedCells,
  checkPlacement,
  isSolved,
  solutionToCells,
  type CellIndex,
  type Puzzle,
  type RuleId,
} from '../game-engine';

/**
 * Gameplay layer: pure functions over a serialisable GameState.
 * No React here, so every rule of the game loop is unit-tested.
 */

export const MAX_LIVES = 3;

export type CellMark = 'empty' | 'cross' | 'cat';
export type GameStatus = 'playing' | 'won' | 'lost';

export interface HistoryEdit {
  readonly cell: CellIndex;
  readonly from: CellMark;
  readonly to: CellMark;
}

export interface GameState {
  readonly puzzle: Puzzle;
  readonly marks: readonly CellMark[];
  readonly lives: number;
  readonly mistakes: number;
  readonly hintsUsed: number;
  readonly elapsedMs: number;
  readonly status: GameStatus;
  /** Undo stack; each entry is one player gesture (possibly several cells). */
  readonly history: readonly (readonly HistoryEdit[])[];
  /** Erroneous placements already charged, so a double tap never costs twice. */
  readonly chargedErrors: readonly string[];
  /** Cells whose cat was revealed by a hint. */
  readonly revealed: readonly CellIndex[];
  readonly startedAt: number;
}

export interface GameSettings {
  /** A legal cat that is not part of the unique solution also costs a life. */
  readonly strictMode: boolean;
  /** Automatically cross out cells ruled out by a newly placed cat. */
  readonly autoCross: boolean;
}

export const DEFAULT_SETTINGS: GameSettings = { strictMode: true, autoCross: false };

export type ErrorReason = RuleId | 'wrong';

export type GameEvent =
  | { readonly type: 'ignored' }
  | { readonly type: 'cross'; readonly cell: CellIndex; readonly on: boolean }
  | { readonly type: 'cat'; readonly cell: CellIndex }
  | { readonly type: 'removed'; readonly cell: CellIndex }
  | {
      readonly type: 'error';
      readonly cell: CellIndex;
      readonly reasons: readonly ErrorReason[];
      readonly message: string;
      /** Cats causing the conflict (to highlight). */
      readonly conflicts: readonly CellIndex[];
      /** False when this exact error had already been charged. */
      readonly charged: boolean;
      readonly gameOver: boolean;
    }
  | { readonly type: 'won'; readonly cell: CellIndex };

export interface Transition {
  readonly state: GameState;
  readonly event: GameEvent;
}

export const WRONG_MESSAGE = 'Ce chat ne peut pas aller ici : la grille deviendrait impossible à terminer.';

export function createGame(puzzle: Puzzle, now = Date.now()): GameState {
  return {
    puzzle,
    marks: new Array<CellMark>(puzzle.size * puzzle.size).fill('empty'),
    lives: MAX_LIVES,
    mistakes: 0,
    hintsUsed: 0,
    elapsedMs: 0,
    status: 'playing',
    history: [],
    chargedErrors: [],
    revealed: [],
    startedAt: now,
  };
}

export function catsOf(state: Pick<GameState, 'marks'>): CellIndex[] {
  const out: CellIndex[] = [];
  state.marks.forEach((m, i) => {
    if (m === 'cat') out.push(i);
  });
  return out;
}

export function crossesOf(state: Pick<GameState, 'marks'>): CellIndex[] {
  const out: CellIndex[] = [];
  state.marks.forEach((m, i) => {
    if (m === 'cross') out.push(i);
  });
  return out;
}

export function blockedOf(state: GameState): Set<CellIndex> {
  return blockedCells(state.puzzle, catsOf(state));
}

function isSolutionCell(puzzle: Puzzle, cell: CellIndex): boolean {
  return puzzle.solution[Math.floor(cell / puzzle.size)] === cell % puzzle.size;
}

function withEdits(state: GameState, edits: HistoryEdit[], record = true): GameState {
  if (edits.length === 0) return state;
  const marks = [...state.marks];
  for (const e of edits) marks[e.cell] = e.to;
  return { ...state, marks, history: record ? [...state.history, edits] : state.history };
}

function finishIfSolved(state: GameState): GameState {
  const cats = catsOf(state);
  if (cats.length === state.puzzle.size && isSolved(state.puzzle, cats)) return { ...state, status: 'won' };
  return state;
}

/** Attempts to place a cat on `cell`. Illegal or (strict) wrong cats are refused and cost one life. */
export function placeCat(state: GameState, cell: CellIndex, settings: GameSettings = DEFAULT_SETTINGS): Transition {
  if (state.status !== 'playing') return { state, event: { type: 'ignored' } };
  if (state.marks[cell] === 'cat') return { state, event: { type: 'ignored' } };
  const cats = catsOf(state);
  const check = checkPlacement(state.puzzle, cats, cell);
  let reasons: ErrorReason[] = [];
  let message = '';
  let conflicts: CellIndex[] = [];
  if (!check.ok) {
    reasons = check.violations.map((v) => v.rule);
    message = check.message ?? '';
    conflicts = [...new Set(check.violations.flatMap((v) => v.conflictingCats))];
  } else if (settings.strictMode && !isSolutionCell(state.puzzle, cell)) {
    reasons = ['wrong'];
    message = WRONG_MESSAGE;
  }

  if (reasons.length > 0) {
    // One erroneous gesture = one life at most, even if several rules are
    // broken; and the same erroneous placement in the same position is never
    // charged twice (double taps, repeated events…).
    const key = `${cell}@${cats.join(',')}`;
    const charged = !state.chargedErrors.includes(key);
    const lives = charged ? state.lives - 1 : state.lives;
    const gameOver = lives <= 0;
    const next: GameState = {
      ...state,
      lives: Math.max(0, lives),
      mistakes: charged ? state.mistakes + 1 : state.mistakes,
      chargedErrors: charged ? [...state.chargedErrors, key] : state.chargedErrors,
      status: gameOver ? 'lost' : state.status,
    };
    return { state: next, event: { type: 'error', cell, reasons, message, conflicts, charged, gameOver } };
  }

  const edits: HistoryEdit[] = [{ cell, from: state.marks[cell] as CellMark, to: 'cat' }];
  if (settings.autoCross) {
    const blocked = blockedCells(state.puzzle, [...cats, cell]);
    for (const b of blocked) if (state.marks[b] === 'empty') edits.push({ cell: b, from: 'empty', to: 'cross' });
  }
  const next = finishIfSolved(withEdits(state, edits));
  return { state: next, event: next.status === 'won' ? { type: 'won', cell } : { type: 'cat', cell } };
}

/** Whether the player may take a cat back (never for cats proven correct in strict mode). */
export function canRemoveCat(state: GameState, cell: CellIndex, settings: GameSettings = DEFAULT_SETTINGS): boolean {
  if (state.status !== 'playing' || state.marks[cell] !== 'cat') return false;
  if (state.revealed.includes(cell)) return false;
  return !settings.strictMode || !isSolutionCell(state.puzzle, cell);
}

export function removeCat(state: GameState, cell: CellIndex, settings: GameSettings = DEFAULT_SETTINGS): Transition {
  if (!canRemoveCat(state, cell, settings)) return { state, event: { type: 'ignored' } };
  return { state: withEdits(state, [{ cell, from: 'cat', to: 'empty' }]), event: { type: 'removed', cell } };
}

/** Sets or clears a cross. Crosses are free annotations: they never cost a life. */
export function setCross(state: GameState, cell: CellIndex, on: boolean): Transition {
  if (state.status !== 'playing') return { state, event: { type: 'ignored' } };
  const cur = state.marks[cell];
  if (cur === 'cat') return { state, event: { type: 'ignored' } };
  if ((cur === 'cross') === on) return { state, event: { type: 'ignored' } };
  return {
    state: withEdits(state, [{ cell, from: cur as CellMark, to: on ? 'cross' : 'empty' }]),
    event: { type: 'cross', cell, on },
  };
}

export function toggleCross(state: GameState, cell: CellIndex): Transition {
  return setCross(state, cell, state.marks[cell] !== 'cross');
}

/**
 * Paints crosses over several cells as a single undoable gesture (drag).
 * With `merge`, the edits join the last undo entry (a stroke in progress).
 * Cats are never touched.
 */
export function paintCrosses(state: GameState, cells: readonly CellIndex[], on: boolean, merge = false): GameState {
  if (state.status !== 'playing') return state;
  const edits: HistoryEdit[] = [];
  const seen = new Set<CellIndex>();
  for (const cell of cells) {
    if (seen.has(cell)) continue;
    seen.add(cell);
    const cur = state.marks[cell] as CellMark;
    if (cur === 'cat' || (cur === 'cross') === on) continue;
    edits.push({ cell, from: cur, to: on ? 'cross' : 'empty' });
  }
  if (merge && edits.length > 0 && state.history.length > 0) {
    const marks = [...state.marks];
    for (const e of edits) marks[e.cell] = e.to;
    const history = [...state.history];
    history[history.length - 1] = [...(history[history.length - 1] as readonly HistoryEdit[]), ...edits];
    return { ...state, marks, history };
  }
  return withEdits(state, edits);
}

/**
 * Double tap on a cell. `revertFirstTap` undoes the effect of the first tap of
 * the double tap (a cross that appeared or disappeared) so that it leaves no
 * trace. Then:
 *  - on a cat: removes it when allowed;
 *  - otherwise: tries to place a cat. An invalid cat costs one life (at most)
 *    and the cell is crossed out, since it is now known to be impossible.
 */
export function doubleTap(
  state: GameState,
  cell: CellIndex,
  settings: GameSettings = DEFAULT_SETTINGS,
  revertFirstTap = false,
): Transition {
  if (state.status !== 'playing') return { state, event: { type: 'ignored' } };
  let base = revertFirstTap ? undo(state) : state;
  if (base.marks[cell] === 'cat') return removeCat(base, cell, settings);
  const t = placeCat(base, cell, settings);
  if (t.event.type === 'error') {
    base = t.state;
    const crossed = base.status === 'playing' ? setCross(base, cell, true).state : base;
    return { state: crossed, event: t.event };
  }
  return t;
}

/** Clears every cross (one undoable gesture). */
export function clearCrosses(state: GameState): GameState {
  return paintCrosses(state, crossesOf(state), false);
}

/** Undoes the last gesture. Lives are never given back. */
export function undo(state: GameState): GameState {
  if (state.status !== 'playing' || state.history.length === 0) return state;
  const last = state.history[state.history.length - 1] as readonly HistoryEdit[];
  const marks = [...state.marks];
  for (let i = last.length - 1; i >= 0; i--) {
    const e = last[i] as HistoryEdit;
    if (state.revealed.includes(e.cell)) return state;
    marks[e.cell] = e.from;
  }
  return { ...state, marks, history: state.history.slice(0, -1) };
}

/** Applies the action of a level 3 hint. */
export function applyHintAction(state: GameState, action: { place?: CellIndex; remove?: CellIndex }): GameState {
  if (state.status !== 'playing') return state;
  let next = state;
  if (action.remove !== undefined) {
    const from = next.marks[action.remove] as CellMark;
    if (from !== 'empty') next = withEdits(next, [{ cell: action.remove, from, to: 'empty' }], false);
  }
  if (action.place !== undefined && next.marks[action.place] !== 'cat') {
    next = withEdits(next, [{ cell: action.place, from: next.marks[action.place] as CellMark, to: 'cat' }], false);
    next = { ...next, revealed: [...next.revealed, action.place] };
    next = finishIfSolved(next);
  }
  return next;
}

export function countHint(state: GameState): GameState {
  return { ...state, hintsUsed: state.hintsUsed + 1 };
}

export function tick(state: GameState, deltaMs: number): GameState {
  if (state.status !== 'playing' || deltaMs <= 0) return state;
  // Cap a single tick so a suspended tab does not add hours.
  return { ...state, elapsedMs: state.elapsedMs + Math.min(deltaMs, 5000) };
}

export function solutionCells(state: GameState): CellIndex[] {
  return solutionToCells(state.puzzle.size, state.puzzle.solution);
}

export function progress(state: GameState): number {
  return catsOf(state).length / state.puzzle.size;
}

/** Stable signature of the board, used to escalate hint levels. */
export function boardSignature(state: GameState): string {
  return state.marks.map((m) => (m === 'cat' ? 'c' : m === 'cross' ? 'x' : '.')).join('');
}
