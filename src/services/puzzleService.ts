import {
  generatePuzzle,
  randomSeed,
  verifyPuzzle,
  DIFFICULTY_LEVELS,
  type DifficultyLevel,
  type Puzzle,
} from '../game-engine';
import { readJSON, writeJSON } from '../persistence/storage';
import type { GenerateRequest, GenerateResponse } from '../workers/generator.worker';

/**
 * Puzzles are generated off the main thread in a Web Worker, and one puzzle per
 * difficulty is kept ready in storage so a new game starts instantly, even
 * offline.
 */

const POOL_KEY = 'chatdoku.pool.v1';
type Pool = Partial<Record<DifficultyLevel, Puzzle>>;

let worker: Worker | null = null;
let nextId = 1;
const pending = new Map<number, { resolve: (p: Puzzle) => void; reject: (e: Error) => void }>();
const inFlight = new Map<DifficultyLevel, Promise<Puzzle>>();
/** Puzzles already handed to the player: never put them back in the pool. */
const claimed = new Set<string>();

function getWorker(): Worker | null {
  if (worker) return worker;
  if (typeof Worker === 'undefined') return null;
  try {
    worker = new Worker(new URL('../workers/generator.worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (event: MessageEvent<GenerateResponse>) => {
      const res = event.data;
      const entry = pending.get(res.id);
      if (!entry) return;
      pending.delete(res.id);
      if (res.ok) entry.resolve(res.puzzle);
      else entry.reject(new Error(res.error));
    };
    worker.onerror = () => {
      for (const [, entry] of pending) entry.reject(new Error('worker error'));
      pending.clear();
      worker = null;
    };
    return worker;
  } catch {
    return null;
  }
}

function generateInWorker(level: DifficultyLevel): Promise<Puzzle> {
  const existing = inFlight.get(level);
  if (existing) return existing;
  const seed = randomSeed();
  const w = getWorker();
  const promise = new Promise<Puzzle>((resolve, reject) => {
    if (!w) {
      // Fallback: main thread (still correct, just blocking).
      setTimeout(() => {
        try {
          resolve(generatePuzzle(level, { seed }));
        } catch (e) {
          reject(e as Error);
        }
      }, 0);
      return;
    }
    const id = nextId++;
    pending.set(id, { resolve, reject });
    w.postMessage({ id, level, seed } satisfies GenerateRequest);
  }).finally(() => inFlight.delete(level));
  inFlight.set(level, promise);
  return promise;
}

function readPool(): Pool {
  return readJSON<Pool>(POOL_KEY, {});
}

function writePool(pool: Pool): void {
  writeJSON(POOL_KEY, pool);
}

/** Fills the pool for every difficulty that has no puzzle ready. */
export async function warmPool(): Promise<void> {
  for (const level of DIFFICULTY_LEVELS) {
    if (readPool()[level]) continue;
    try {
      const puzzle = await generateInWorker(level);
      const pool = readPool();
      if (!pool[level] && !claimed.has(puzzle.id)) writePool({ ...pool, [level]: puzzle });
    } catch {
      /* will retry next time */
    }
  }
}

/** Returns a fresh, verified puzzle of the requested difficulty. */
export async function getPuzzle(level: DifficultyLevel): Promise<Puzzle> {
  const pool = readPool();
  const ready = pool[level];
  if (ready) {
    const rest = { ...pool };
    delete rest[level];
    writePool(rest);
    if (verifyPuzzle(ready)) {
      claimed.add(ready.id);
      void warmPool();
      return ready;
    }
  }
  let puzzle = await generateInWorker(level);
  // Final gate on the main thread: never show an ambiguous grid.
  for (let i = 0; i < 3 && !verifyPuzzle(puzzle); i++) puzzle = await generateInWorker(level);
  claimed.add(puzzle.id);
  const after = readPool();
  if (after[level]?.id === puzzle.id) {
    delete after[level];
    writePool(after);
  }
  void warmPool();
  return puzzle;
}
