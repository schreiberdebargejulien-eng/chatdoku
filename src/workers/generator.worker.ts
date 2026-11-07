/// <reference lib="webworker" />
import { generatePuzzle, verifyPuzzle, type DifficultyLevel, type Puzzle } from '../game-engine';

export interface GenerateRequest {
  readonly id: number;
  readonly level: DifficultyLevel;
  readonly seed: number;
}

export type GenerateResponse =
  | { readonly id: number; readonly ok: true; readonly puzzle: Puzzle }
  | { readonly id: number; readonly ok: false; readonly error: string };

self.onmessage = (event: MessageEvent<GenerateRequest>) => {
  const { id, level, seed } = event.data;
  try {
    let s = seed;
    for (let i = 0; i < 5; i++) {
      const puzzle = generatePuzzle(level, { seed: s });
      if (verifyPuzzle(puzzle)) {
        (self as unknown as Worker).postMessage({ id, ok: true, puzzle } satisfies GenerateResponse);
        return;
      }
      s = (s * 1664525 + 1013904223) >>> 0;
    }
    throw new Error('verification failed');
  } catch (err) {
    (self as unknown as Worker).postMessage({ id, ok: false, error: String(err) } satisfies GenerateResponse);
  }
};
