import { colOf, neighbors8, rowOf } from './board';
import type { CellIndex, PuzzleLayout } from './types';

/**
 * Human-style deduction engine. It solves a grid the way a player would, one
 * explainable step at a time. It powers both the difficulty evaluation and
 * the hint system.
 */

export type UnitKind = 'row' | 'column' | 'region';

export interface UnitRef {
  readonly kind: UnitKind;
  readonly index: number;
}

export type Technique =
  /** A unit has a single possible cell left. */
  | 'single'
  /** All the candidates of a unit lie in one other unit. */
  | 'confinement'
  /** A cat on this cell would leave another unit without any possible cell. */
  | 'blocker'
  /** k units whose candidates fit exactly in k other units. */
  | 'subset'
  /** Assuming a cat here leads to a contradiction. */
  | 'trial';

export const TECHNIQUE_TIER: Readonly<Record<Technique, number>> = {
  single: 1,
  confinement: 2,
  blocker: 2,
  subset: 3, // 4 when k >= 3
  trial: 5,
};

export interface LogicStep {
  readonly technique: Technique;
  readonly tier: number;
  readonly weight: number;
  /** Cell where a cat is deduced (technique `single`). */
  readonly place?: CellIndex;
  /** Cells proven impossible by this step. */
  readonly eliminate: readonly CellIndex[];
  /** Units at the origin of the reasoning. */
  readonly sources: readonly UnitRef[];
  /** Units in which cells are eliminated (confinement / subset). */
  readonly targets: readonly UnitRef[];
  /** Hypothetical cell examined (blocker / trial). */
  readonly pivot?: CellIndex;
  /** Unit that would end up empty (blocker / trial). */
  readonly victim?: UnitRef;
}

const KINDS: readonly UnitKind[] = ['row', 'column', 'region'];

/** Static unit tables for a layout, shared between states. */
export class UnitTables {
  readonly size: number;
  readonly layout: PuzzleLayout;
  /** cells[kind][index] */
  readonly cells: Record<UnitKind, CellIndex[][]>;
  /** row ∪ column ∪ region ∪ 8-neighbourhood of each cell, minus itself. */
  readonly shadow: CellIndex[][];

  constructor(layout: PuzzleLayout) {
    const { size, regions } = layout;
    this.size = size;
    this.layout = layout;
    this.cells = {
      row: Array.from({ length: size }, () => []),
      column: Array.from({ length: size }, () => []),
      region: Array.from({ length: size }, () => []),
    };
    for (let i = 0; i < size * size; i++) {
      this.cells.row[rowOf(size, i)]?.push(i);
      this.cells.column[colOf(size, i)]?.push(i);
      this.cells.region[regions[i] as number]?.push(i);
    }
    this.shadow = [];
    for (let i = 0; i < size * size; i++) {
      const set = new Set<CellIndex>();
      for (const kind of KINDS) for (const x of this.cells[kind][this.unitOf(kind, i)] ?? []) set.add(x);
      for (const n of neighbors8(size, i)) set.add(n);
      set.delete(i);
      this.shadow.push([...set]);
    }
  }

  unitOf(kind: UnitKind, cell: CellIndex): number {
    if (kind === 'row') return rowOf(this.size, cell);
    if (kind === 'column') return colOf(this.size, cell);
    return this.layout.regions[cell] as number;
  }
}

export class LogicState {
  readonly t: UnitTables;
  /** 1 = a cat may still go there. */
  readonly cand: Uint8Array;
  readonly cats: CellIndex[];

  constructor(t: UnitTables, cand?: Uint8Array, cats?: CellIndex[]) {
    this.t = t;
    this.cand = cand ? new Uint8Array(cand) : new Uint8Array(t.size * t.size).fill(1);
    this.cats = cats ? [...cats] : [];
  }

  static fromLayout(layout: PuzzleLayout): LogicState {
    return new LogicState(new UnitTables(layout));
  }

  clone(): LogicState {
    return new LogicState(this.t, this.cand, this.cats);
  }

  get size(): number {
    return this.t.size;
  }

  hasCat(cell: CellIndex): boolean {
    return this.cats.includes(cell);
  }

  /** Places a cat and removes every cell it rules out. Returns false if illegal. */
  place(cell: CellIndex): boolean {
    if (this.cand[cell] !== 1 || this.hasCat(cell)) return false;
    this.cats.push(cell);
    this.cand[cell] = 0;
    for (const x of this.t.shadow[cell] ?? []) this.cand[x] = 0;
    return true;
  }

  eliminate(cells: readonly CellIndex[]): void {
    for (const c of cells) this.cand[c] = 0;
  }

  unitSatisfied(kind: UnitKind, index: number): boolean {
    return this.cats.some((cat) => this.t.unitOf(kind, cat) === index);
  }

  candidatesOf(kind: UnitKind, index: number): CellIndex[] {
    return (this.t.cells[kind][index] ?? []).filter((x) => this.cand[x] === 1);
  }

  isComplete(): boolean {
    return this.cats.length === this.size;
  }

  /** True if some unit without a cat has no possible cell left. */
  isContradiction(): boolean {
    for (const kind of KINDS) {
      for (let u = 0; u < this.size; u++) {
        if (!this.unitSatisfied(kind, u) && this.candidatesOf(kind, u).length === 0) return true;
      }
    }
    return false;
  }

  apply(step: LogicStep): void {
    if (step.place !== undefined) this.place(step.place);
    this.eliminate(step.eliminate);
  }

  openUnits(kind: UnitKind): number[] {
    const out: number[] = [];
    for (let u = 0; u < this.size; u++) if (!this.unitSatisfied(kind, u)) out.push(u);
    return out;
  }
}

// ---------------------------------------------------------------------------
// Techniques
// ---------------------------------------------------------------------------

function findSingle(s: LogicState): LogicStep | null {
  // Regions first: it is the most natural reading for a player.
  for (const kind of ['region', 'row', 'column'] as const) {
    for (const u of s.openUnits(kind)) {
      const cands = s.candidatesOf(kind, u);
      if (cands.length === 1) {
        return {
          technique: 'single',
          tier: 1,
          weight: 1,
          place: cands[0] as CellIndex,
          eliminate: [],
          sources: [{ kind, index: u }],
          targets: [],
        };
      }
    }
  }
  return null;
}

const PAIRS: ReadonlyArray<readonly [UnitKind, UnitKind]> = [
  ['region', 'row'],
  ['region', 'column'],
  ['row', 'region'],
  ['column', 'region'],
  ['row', 'column'],
  ['column', 'row'],
];

function* combinations(items: readonly number[], k: number, start = 0, acc: number[] = []): Generator<number[]> {
  if (acc.length === k) {
    yield [...acc];
    return;
  }
  for (let i = start; i <= items.length - (k - acc.length); i++) {
    acc.push(items[i] as number);
    yield* combinations(items, k, i + 1, acc);
    acc.pop();
  }
}

/**
 * Generalised confinement: if k open units of kind A have all their candidates
 * inside k units of kind B, those B units' cats belong to the A units, so any
 * other candidate of the B units is impossible. k = 1 is a "confinement",
 * k >= 2 a "subset".
 */
function findSubset(s: LogicState, k: number): LogicStep | null {
  for (const [a, b] of PAIRS) {
    const openA = s.openUnits(a);
    if (openA.length <= k) continue;
    const candByUnit = new Map<number, CellIndex[]>();
    for (const u of openA) candByUnit.set(u, s.candidatesOf(a, u));
    for (const combo of combinations(openA, k)) {
      const bUnits = new Set<number>();
      const inside = new Set<CellIndex>();
      let overflow = false;
      for (const u of combo) {
        for (const x of candByUnit.get(u) ?? []) {
          bUnits.add(s.t.unitOf(b, x));
          inside.add(x);
          if (bUnits.size > k) {
            overflow = true;
            break;
          }
        }
        if (overflow) break;
      }
      if (overflow || bUnits.size !== k) continue;
      const eliminate: CellIndex[] = [];
      for (const bu of bUnits) {
        for (const x of s.candidatesOf(b, bu)) if (!inside.has(x)) eliminate.push(x);
      }
      if (eliminate.length === 0) continue;
      const technique: Technique = k === 1 ? 'confinement' : 'subset';
      return {
        technique,
        tier: k === 1 ? 2 : k === 2 ? 3 : 4,
        weight: k === 1 ? 2 : 3 + 2 * k,
        eliminate,
        sources: combo.map((index) => ({ kind: a, index })),
        targets: [...bUnits].sort((x, y) => x - y).map((index) => ({ kind: b, index })),
      };
    }
  }
  return null;
}

function findBlocker(s: LogicState): LogicStep | null {
  const { t } = s;
  const n = s.size * s.size;
  const open: UnitRef[] = [];
  for (const kind of KINDS) for (const index of s.openUnits(kind)) open.push({ kind, index });
  const candsByOpen = open.map((u) => s.candidatesOf(u.kind, u.index));
  for (let c = 0; c < n; c++) {
    if (s.cand[c] !== 1) continue;
    const shadow = new Set(t.shadow[c]);
    for (let i = 0; i < open.length; i++) {
      const unit = open[i] as UnitRef;
      if (t.unitOf(unit.kind, c) === unit.index) continue;
      const cands = candsByOpen[i] as CellIndex[];
      if (cands.length > 0 && cands.every((x) => shadow.has(x))) {
        return {
          technique: 'blocker',
          tier: 2,
          weight: 3,
          eliminate: [c],
          sources: [unit],
          targets: [],
          pivot: c,
          victim: unit,
        };
      }
    }
  }
  return null;
}

/** Propagates with the techniques up to `maxTier` (without trial). Returns false on contradiction. */
function propagate(s: LogicState, maxTier: number): boolean {
  for (let guard = 0; guard < 400; guard++) {
    if (s.isContradiction()) return false;
    if (s.isComplete()) return true;
    const step = nextStep(s, maxTier, false);
    if (!step) return true;
    s.apply(step);
  }
  return true;
}

function findTrial(s: LogicState): LogicStep | null {
  // Try cells of the tightest units first: that is how a player would test.
  const order: CellIndex[] = [];
  const seen = new Set<CellIndex>();
  const units: { ref: UnitRef; cands: CellIndex[] }[] = [];
  for (const kind of KINDS) {
    for (const index of s.openUnits(kind)) units.push({ ref: { kind, index }, cands: s.candidatesOf(kind, index) });
  }
  units.sort((x, y) => x.cands.length - y.cands.length);
  for (const u of units) for (const c of u.cands) if (!seen.has(c)) {
    seen.add(c);
    order.push(c);
  }
  for (const c of order) {
    const probe = s.clone();
    probe.place(c);
    const ok = propagate(probe, 3);
    if (!ok) {
      let victim: UnitRef | undefined;
      for (const kind of KINDS) {
        for (const index of probe.openUnits(kind)) {
          if (probe.candidatesOf(kind, index).length === 0) {
            victim = { kind, index };
            break;
          }
        }
        if (victim) break;
      }
      return {
        technique: 'trial',
        tier: 5,
        weight: 10,
        eliminate: [c],
        sources: [],
        targets: [],
        pivot: c,
        ...(victim ? { victim } : {}),
      };
    }
  }
  return null;
}

/**
 * Finds the easiest available deduction, or null if the techniques up to
 * `maxTier` are not enough.
 */
export function nextStep(s: LogicState, maxTier = 5, allowTrial = true): LogicStep | null {
  const single = findSingle(s);
  if (single) return single;
  if (maxTier < 2) return null;
  const conf = findSubset(s, 1);
  if (conf) return conf;
  const blocker = findBlocker(s);
  if (blocker) return blocker;
  if (maxTier < 3) return null;
  const pair = findSubset(s, 2);
  if (pair) return pair;
  if (maxTier < 4) return null;
  const maxK = Math.max(...KINDS.map((k) => s.openUnits(k).length)) - 1;
  for (let k = 3; k <= maxK; k++) {
    const sub = findSubset(s, k);
    if (sub) return sub;
  }
  if (maxTier < 5 || !allowTrial) return null;
  return findTrial(s);
}

export interface LogicSolveResult {
  readonly solved: boolean;
  readonly steps: LogicStep[];
  readonly state: LogicState;
}

/** Solves as far as possible with human techniques. */
export function logicSolve(layout: PuzzleLayout, maxTier = 5, givens: readonly CellIndex[] = []): LogicSolveResult {
  const state = LogicState.fromLayout(layout);
  for (const g of givens) state.place(g);
  const steps: LogicStep[] = [];
  for (let guard = 0; guard < 2000; guard++) {
    if (state.isComplete() || state.isContradiction()) break;
    const step = nextStep(state, maxTier);
    if (!step) break;
    steps.push(step);
    state.apply(step);
  }
  return { solved: state.isComplete() && !state.isContradiction(), steps, state };
}
