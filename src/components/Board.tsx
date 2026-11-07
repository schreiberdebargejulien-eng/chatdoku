import { memo, useEffect, useMemo, useRef, type PointerEvent as ReactPointerEvent } from 'react';
import type { CellIndex } from '../game-engine';
import { catForRegion } from '../cats/collections';
import type { CatCollection, CatDesign } from '../cats/catTypes';
import { CatArt } from '../cats/CatArt';
import type { RegionColor } from '../theme/palette';
import type { CellMark, GameState } from '../game/gameLogic';
import type { Feedback, HintView } from '../store/gameStore';
import { GestureEngine, type GestureIntent, type GridPoint } from '../input/gestureEngine';
import { armGhostClickGuard, installGhostClickGuard } from '../input/ghostClick';

interface BoardProps {
  readonly game: GameState;
  readonly colors: readonly RegionColor[];
  readonly collection: CatCollection;
  readonly blocked: ReadonlySet<CellIndex>;
  readonly showBlocked: boolean;
  readonly feedback: Feedback | null;
  readonly hintView: HintView | null;
  readonly hidden: boolean;
  readonly doubleTapMs: number;
  readonly onIntents: (intents: readonly GestureIntent[]) => void;
}

/** Bit flags: which sides of a cell are region borders. */
const TOP = 1;
const RIGHT = 2;
const BOTTOM = 4;
const LEFT = 8;
/** Half of the cream gap between two regions (px). */
const GAP = 1.6;
const RADIUS = '24%';

interface CellProps {
  readonly mark: CellMark;
  readonly fill: string;
  readonly edges: number;
  readonly cat: CatDesign;
  readonly blocked: boolean;
  readonly dimmed: boolean;
  readonly hintCell: boolean;
  /** Feedback id when this cell is the faulty one (0 otherwise): replays the animation. */
  readonly errorKey: number;
  readonly conflictKey: number;
  readonly won: boolean;
  readonly revealed: boolean;
  readonly delay: number;
}

const CrossGlyph = memo(function CrossGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="x-draw pointer-events-none absolute inset-0 m-auto size-[44%]" aria-hidden>
      <path d="M6 6l12 12" pathLength={1} stroke="#2E2A27" strokeOpacity="0.62" strokeWidth="3.4" strokeLinecap="round" fill="none" />
      <path d="M18 6L6 18" pathLength={1} stroke="#2E2A27" strokeOpacity="0.62" strokeWidth="3.4" strokeLinecap="round" fill="none" />
    </svg>
  );
});

const Cell = memo(function Cell(p: CellProps) {
  const e = p.edges;
  const tile = {
    top: e & TOP ? GAP : 0,
    right: e & RIGHT ? GAP : 0,
    bottom: e & BOTTOM ? GAP : 0,
    left: e & LEFT ? GAP : 0,
    borderTopLeftRadius: e & TOP && e & LEFT ? RADIUS : 0,
    borderTopRightRadius: e & TOP && e & RIGHT ? RADIUS : 0,
    borderBottomRightRadius: e & BOTTOM && e & RIGHT ? RADIUS : 0,
    borderBottomLeftRadius: e & BOTTOM && e & LEFT ? RADIUS : 0,
    background: p.fill,
  } as const;
  return (
    <div className="relative">
      <div key={p.errorKey} className={`absolute inset-0 ${p.errorKey ? 'cell-shake' : ''}`}>
        <div className="absolute overflow-hidden" style={tile}>
          {p.blocked && p.mark === 'empty' && (
            // A discreet dot only: a veil would make regions look two-toned.
            <span className="fade-in absolute top-1/2 left-1/2 size-[12%] min-h-[5px] min-w-[5px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#2E2A27]/30" />
          )}
          {p.errorKey > 0 && <div className="err-flash absolute inset-0 bg-bad-deep" />}
        </div>
        {p.mark === 'cross' && <CrossGlyph />}
        {p.mark === 'cat' && (
          <div className="cat-pop absolute inset-[7%]">
            <div className={p.won ? 'cat-cheer size-full' : 'size-full'} style={p.won ? { animationDelay: `${p.delay}s` } : undefined}>
              <CatArt cat={p.cat} mood={p.won ? 'happy' : 'normal'} />
            </div>
            {p.revealed && <span className="absolute -top-[4%] -right-[4%] size-[22%] rounded-full border-2 border-white bg-orange" />}
          </div>
        )}
        {p.conflictKey > 0 && (
          <div key={p.conflictKey} className="conflict-ring absolute inset-[5%] rounded-[30%] border-[3px] border-bad-deep" />
        )}
      </div>
      {p.dimmed && <div className="absolute inset-0 bg-cream/65" />}
      {p.hintCell && <div className="hint-pulse absolute inset-[6%] rounded-[28%] border-[3px] border-orange-deep" />}
    </div>
  );
});

/** Region border flags per cell, and faint lines between cells of a same region. */
function useGeometry(size: number, regions: readonly number[]) {
  return useMemo(() => {
    const edges: number[] = [];
    let inner = '';
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const i = r * size + c;
        const g = regions[i];
        let f = 0;
        if (r === 0 || regions[i - size] !== g) f |= TOP;
        if (c === size - 1 || regions[i + 1] !== g) f |= RIGHT;
        if (r === size - 1 || regions[i + size] !== g) f |= BOTTOM;
        if (c === 0 || regions[i - 1] !== g) f |= LEFT;
        edges.push(f);
        if (c < size - 1 && regions[i + 1] === g) inner += `M${c + 1} ${r + 0.12}V${r + 0.88}`;
        if (r < size - 1 && regions[i + size] === g) inner += `M${c + 0.12} ${r + 1}H${c + 0.88}`;
      }
    }
    return { edges, inner };
  }, [size, regions]);
}

export function Board(props: BoardProps) {
  const { game, colors, collection, blocked, showBlocked, feedback, hintView, hidden, doubleTapMs, onIntents } = props;
  const { puzzle, marks } = game;
  const N = puzzle.size;
  const surface = useRef<HTMLDivElement>(null);
  const rect = useRef<DOMRect | null>(null);
  const geometry = useGeometry(N, puzzle.regions);

  // Latest marks for the gesture engine, without re-creating it.
  const marksRef = useRef(marks);
  marksRef.current = marks;
  const tapMs = useRef(doubleTapMs);
  tapMs.current = doubleTapMs;
  const engine = useMemo(
    () => new GestureEngine({ size: N, doubleTapMs: tapMs.current }, (cell) => marksRef.current[cell] ?? 'empty'),
    [N],
  );
  useEffect(() => engine.configure({ doubleTapMs }), [engine, doubleTapMs]);
  useEffect(() => engine.reset(), [engine, puzzle.id, game.startedAt]);

  // Safari iOS: swallow the compatibility click and any double-tap zoom on the
  // grid. Pointer events are the single source of truth.
  useEffect(() => {
    const el = surface.current;
    if (!el) return;
    installGhostClickGuard();
    const stop = (e: Event) => e.preventDefault();
    el.addEventListener('touchstart', stop, { passive: false });
    el.addEventListener('touchmove', stop, { passive: false });
    el.addEventListener('touchend', stop, { passive: false });
    el.addEventListener('dblclick', stop);
    return () => {
      el.removeEventListener('touchstart', stop);
      el.removeEventListener('touchmove', stop);
      el.removeEventListener('touchend', stop);
      el.removeEventListener('dblclick', stop);
    };
  }, []);

  const toGrid = (clientX: number, clientY: number): GridPoint => {
    const r = rect.current ?? (surface.current as HTMLDivElement).getBoundingClientRect();
    return { x: ((clientX - r.left) / r.width) * N, y: ((clientY - r.top) / r.height) * N };
  };

  const active = !hidden && game.status === 'playing';

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse') armGhostClickGuard(e.clientX, e.clientY);
    if (!active || (e.pointerType === 'mouse' && e.button !== 0)) return;
    rect.current = e.currentTarget.getBoundingClientRect();
    if (!engine.busy) e.currentTarget.setPointerCapture(e.pointerId);
    const out = engine.down(e.pointerId, toGrid(e.clientX, e.clientY), e.timeStamp);
    if (out.length) onIntents(out);
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!engine.busy) return;
    // Coalesced events: every intermediate position of a fast finger.
    const events = e.nativeEvent.getCoalescedEvents?.() ?? [];
    const points = events.length > 0 ? events : [e.nativeEvent];
    const out: GestureIntent[] = [];
    for (const ev of points) out.push(...engine.move(e.pointerId, toGrid(ev.clientX, ev.clientY)));
    if (out.length) onIntents(out);
  };

  const onPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse') armGhostClickGuard(e.clientX, e.clientY);
    const out = engine.up(e.pointerId, toGrid(e.clientX, e.clientY), e.timeStamp);
    rect.current = null;
    if (out.length) onIntents(out);
  };

  const onPointerCancel = (e: ReactPointerEvent<HTMLDivElement>) => {
    const out = engine.cancel(e.pointerId);
    rect.current = null;
    if (out.length) onIntents(out);
  };

  const hint = hintView?.hint;
  const hintCells = useMemo(() => new Set(hint?.cells ?? []), [hint]);
  const hintUnitCells = useMemo(() => {
    const set = new Set<CellIndex>();
    for (const u of hint?.units ?? []) {
      for (let i = 0; i < N * N; i++) {
        const match =
          u.kind === 'row' ? Math.floor(i / N) === u.index : u.kind === 'column' ? i % N === u.index : puzzle.regions[i] === u.index;
        if (match) set.add(i);
      }
    }
    return set;
  }, [hint, N, puzzle.regions]);
  const conflicts = useMemo(() => new Set(feedback?.conflicts ?? []), [feedback]);
  const won = game.status === 'won';
  const catOrder = useMemo(() => {
    const order = new Map<CellIndex, number>();
    let k = 0;
    marks.forEach((m, i) => {
      if (m === 'cat') order.set(i, k++);
    });
    return order;
  }, [marks]);
  const spotlight = hintUnitCells.size > 0 || hintCells.size > 0;

  return (
    <div className="relative aspect-square w-full">
      <div
        ref={surface}
        role="grid"
        aria-label={`Grille ${N} par ${N}`}
        className="board-surface relative size-full rounded-[20px] bg-cream p-[3px] shadow-soft"
        style={{ touchAction: 'none' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onLostPointerCapture={onPointerCancel}
        onContextMenu={(e) => e.preventDefault()}
      >
        <div
          className="relative grid size-full transition-[filter] duration-300"
          style={{
            gridTemplateColumns: `repeat(${N}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${N}, minmax(0, 1fr))`,
            filter: hidden ? 'blur(14px) saturate(0.6)' : 'none',
          }}
        >
          {marks.map((mark, i) => {
            const reg = puzzle.regions[i] as number;
            return (
              <Cell
                key={i}
                mark={mark}
                fill={(colors[reg] as RegionColor).fill}
                edges={geometry.edges[i] as number}
                cat={catForRegion(collection, reg, puzzle.seed)}
                blocked={showBlocked && blocked.has(i)}
                dimmed={spotlight && !hintUnitCells.has(i) && !hintCells.has(i)}
                hintCell={hintCells.has(i)}
                errorKey={feedback?.kind === 'error' && feedback.cell === i ? feedback.id : 0}
                conflictKey={conflicts.has(i) ? (feedback?.id ?? 0) : 0}
                won={won}
                revealed={game.revealed.includes(i)}
                delay={(catOrder.get(i) ?? 0) * 0.08}
              />
            );
          })}
          {/* Faint lines between cells of a same region: countable, never a black grid. */}
          <svg
            viewBox={`0 0 ${N} ${N}`}
            preserveAspectRatio="none"
            className="pointer-events-none absolute inset-0 size-full"
            aria-hidden
          >
            <path d={geometry.inner} stroke="#FFFFFF" strokeOpacity="0.55" strokeWidth="1" strokeLinecap="round" vectorEffect="non-scaling-stroke" fill="none" />
          </svg>
        </div>
      </div>
    </div>
  );
}
