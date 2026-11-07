import { motion, useAnimationControls } from 'framer-motion';
import { memo, useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import type { CellIndex } from '../game-engine';
import { catForRegion } from '../cats/collections';
import type { CatCollection, CatDesign } from '../cats/catTypes';
import { CatArt } from '../cats/CatArt';
import type { RegionColor } from '../theme/palette';
import type { CellMark, GameState } from '../game/gameLogic';
import type { Feedback, HintView } from '../store/gameStore';

interface BoardProps {
  readonly game: GameState;
  readonly colors: readonly RegionColor[];
  readonly collection: CatCollection;
  readonly blocked: ReadonlySet<CellIndex>;
  readonly showBlocked: boolean;
  readonly selected: CellIndex | null;
  readonly feedback: Feedback | null;
  readonly hintView: HintView | null;
  readonly hidden: boolean;
  readonly crossDrag: boolean;
  readonly onTap: (cell: CellIndex) => void;
  readonly onPaint: (cells: CellIndex[], on: boolean) => void;
}

interface CellProps {
  readonly mark: CellMark;
  readonly color: RegionColor;
  readonly cat: CatDesign;
  readonly blocked: boolean;
  readonly selected: boolean;
  readonly hintCell: boolean;
  /** Faded out while a hint spotlights other cells (keeps region colours true). */
  readonly dimmed: boolean;
  /** Feedback id when this cell is the faulty one (0 otherwise), to replay the flash. */
  readonly error: number;
  readonly conflict: number;
  readonly preview: boolean | null;
  readonly won: boolean;
  readonly revealed: boolean;
  readonly delay: number;
}

const CrossGlyph = ({ ghost }: { ghost?: boolean }) => (
  <svg viewBox="0 0 24 24" className={`absolute inset-0 m-auto size-[46%] ${ghost ? 'opacity-35' : 'opacity-60'}`} aria-hidden>
    <path d="M6 6l12 12M18 6L6 18" stroke="#292929" strokeWidth="3.2" strokeLinecap="round" />
  </svg>
);

const Cell = memo(function Cell(p: CellProps) {
  const showCross = p.preview === true || (p.mark === 'cross' && p.preview !== false);
  return (
    <div className="relative" style={{ background: p.color.fill }}>
      {p.dimmed && <div className="absolute inset-0 z-[1] bg-cream/60" />}
      {p.blocked && p.mark === 'empty' && !showCross && (
        <div className="absolute inset-0 bg-ink/[0.06]">
          <span className="absolute top-1/2 left-1/2 size-[10%] min-h-1 min-w-1 -translate-1/2 rounded-full bg-ink/20" />
        </div>
      )}
      {showCross && <CrossGlyph ghost={p.preview !== null} />}
      {p.mark === 'cat' && (
        <motion.div
          className="absolute inset-[6%]"
          initial={{ scale: 0.3, opacity: 0, y: 4 }}
          animate={
            p.won
              ? { scale: [1, 1.18, 1], opacity: 1, y: [0, -6, 0], transition: { delay: p.delay, duration: 0.5 } }
              : { scale: 1, opacity: 1, y: 0 }
          }
          transition={{ type: 'spring', stiffness: 520, damping: 20 }}
        >
          <CatArt cat={p.cat} mood={p.won ? 'happy' : 'normal'} />
          {p.revealed && <span className="absolute -top-[6%] -right-[6%] size-[24%] rounded-full border-2 border-white bg-orange" />}
        </motion.div>
      )}
      {p.conflict > 0 && (
        <motion.div
          key={`c${p.conflict}`}
          className="absolute inset-[4%] rounded-[30%] border-[3px] border-bad-deep"
          initial={{ opacity: 0, scale: 1.3 }}
          animate={{ opacity: [0, 1, 0.6, 1], scale: 1 }}
          transition={{ duration: 0.5 }}
        />
      )}
      {p.error > 0 && (
        <motion.div
          key={`e${p.error}`}
          className="absolute inset-0 bg-bad"
          initial={{ opacity: 0.9 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 1.1, ease: 'easeOut' }}
        />
      )}
      {p.hintCell && <div className="hint-pulse absolute inset-[5%] z-[2] rounded-[28%] border-[3px] border-orange-deep" />}
      {p.selected && (
        <motion.div
          layoutId="selection"
          className="absolute inset-[3%] rounded-[24%] border-[3px] border-orange shadow-[0_0_0_3px_rgba(242,166,90,0.25)]"
          transition={{ type: 'spring', stiffness: 700, damping: 40 }}
        />
      )}
    </div>
  );
});

function useBorders(size: number, regions: readonly number[]) {
  return useMemo(() => {
    let thick = '';
    let thin = '';
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const i = r * size + c;
        if (c < size - 1) {
          const seg = `M${c + 1} ${r}V${r + 1}`;
          if (regions[i] !== regions[i + 1]) thick += seg;
          else thin += seg;
        }
        if (r < size - 1) {
          const seg = `M${c} ${r + 1}H${c + 1}`;
          if (regions[i] !== regions[i + size]) thick += seg;
          else thin += seg;
        }
      }
    }
    return { thick, thin };
  }, [size, regions]);
}

export function Board(props: BoardProps) {
  const { game, colors, collection, blocked, showBlocked, selected, feedback, hintView, hidden, crossDrag, onTap, onPaint } = props;
  const { puzzle, marks } = game;
  const N = puzzle.size;
  const ref = useRef<HTMLDivElement>(null);
  const controls = useAnimationControls();
  const borders = useBorders(N, puzzle.regions);
  const drag = useRef<{ start: CellIndex; last: CellIndex; on: boolean; cells: CellIndex[]; painting: boolean; id: number } | null>(null);
  const [preview, setPreview] = useState<{ cells: Set<CellIndex>; on: boolean } | null>(null);

  // Shake the grid on a charged error.
  useEffect(() => {
    if (feedback?.kind === 'error' && feedback.charged) {
      void controls.start({ x: [0, -7, 7, -5, 5, -2, 0], transition: { duration: 0.42 } });
    }
  }, [feedback, controls]);

  const cellAt = useCallback(
    (clientX: number, clientY: number): CellIndex | null => {
      const el = ref.current;
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      const c = Math.floor(((clientX - rect.left) / rect.width) * N);
      const r = Math.floor(((clientY - rect.top) / rect.height) * N);
      if (r < 0 || c < 0 || r >= N || c >= N) return null;
      return r * N + c;
    },
    [N],
  );

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (hidden || game.status !== 'playing') return;
    const cell = cellAt(e.clientX, e.clientY);
    if (cell === null) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { start: cell, last: cell, on: marks[cell] !== 'cross', cells: [cell], painting: false, id: e.pointerId };
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId || !crossDrag) return;
    const cell = cellAt(e.clientX, e.clientY);
    if (cell === null || cell === d.last) return;
    d.last = cell;
    d.painting = true;
    if (!d.cells.includes(cell)) d.cells.push(cell);
    setPreview({ cells: new Set(d.cells.filter((c) => marks[c] !== 'cat')), on: d.on });
  };

  const onPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    drag.current = null;
    setPreview(null);
    if (!d || d.id !== e.pointerId) return;
    if (d.painting) onPaint(d.cells, d.on);
    else onTap(d.start);
  };

  const onPointerCancel = () => {
    drag.current = null;
    setPreview(null);
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
  const catsOrder = useMemo(() => {
    const order = new Map<CellIndex, number>();
    let k = 0;
    marks.forEach((m, i) => {
      if (m === 'cat') order.set(i, k++);
    });
    return order;
  }, [marks]);

  return (
    <motion.div animate={controls} className="relative aspect-square w-full">
      <div
        ref={ref}
        role="grid"
        aria-label={`Grille ${N} par ${N}`}
        className="board-surface relative size-full overflow-hidden rounded-[18px] bg-sand shadow-soft ring-[2.5px] ring-ink"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onContextMenu={(e) => e.preventDefault()}
      >
        <div
          className="isolate grid size-full transition-[filter] duration-300"
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
                color={colors[reg] as RegionColor}
                cat={catForRegion(collection, reg, puzzle.seed)}
                blocked={showBlocked && blocked.has(i)}
                selected={selected === i && !won}
                hintCell={hintCells.has(i)}
                dimmed={hintUnitCells.size > 0 && !hintUnitCells.has(i) && !hintCells.has(i)}
                error={feedback?.kind === 'error' && feedback.cell === i ? feedback.id : 0}
                conflict={conflicts.has(i) ? (feedback?.id ?? 0) : 0}
                preview={preview && preview.cells.has(i) ? preview.on : null}
                won={won}
                revealed={game.revealed.includes(i)}
                delay={(catsOrder.get(i) ?? 0) * 0.07}
              />
            );
          })}
        </div>
        <svg
          viewBox={`0 0 ${N} ${N}`}
          preserveAspectRatio="none"
          className="pointer-events-none absolute inset-0 size-full"
          aria-hidden
          style={{ opacity: hidden ? 0.25 : 1 }}
        >
          <path d={borders.thin} stroke="#292929" strokeOpacity="0.13" strokeWidth="1" vectorEffect="non-scaling-stroke" fill="none" />
          <path
            d={borders.thick}
            stroke="#292929"
            strokeWidth="2.6"
            strokeLinecap="square"
            vectorEffect="non-scaling-stroke"
            fill="none"
          />
        </svg>
      </div>
    </motion.div>
  );
}
