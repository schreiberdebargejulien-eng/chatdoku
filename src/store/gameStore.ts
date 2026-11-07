import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getHint, type CellIndex, type DifficultyLevel, type Hint, type HintLevel } from '../game-engine';
import {
  applyHintAction,
  blockedOf,
  boardSignature,
  catsOf,
  clearCrosses,
  countHint,
  createGame,
  crossesOf,
  doubleTap,
  paintCrosses,
  setCross,
  tick,
  undo,
  DEFAULT_SETTINGS,
  type ErrorReason,
  type GameSettings,
  type GameState,
} from '../game/gameLogic';
import { createStats, recordResult, type AchievementId, type Stats } from '../stats/stats';
import { persistStorage } from '../persistence/storage';
import { getPuzzle } from '../services/puzzleService';
import { haptic, playSound, setSoundEnabled } from '../audio/sounds';
import { assignRegionColors, regionDisplayName } from '../theme/palette';

export type Screen = 'home' | 'game' | 'stats' | 'settings' | 'rules';
export interface Settings extends GameSettings {
  /** Double tap window, in ms (tunable for each player's rhythm). */
  readonly doubleTapMs: number;
  /** Shade the cells ruled out by the cats already placed. */
  readonly showBlocked: boolean;
  readonly sound: boolean;
  readonly collection: string;
}

export const DEFAULT_APP_SETTINGS: Settings = {
  ...DEFAULT_SETTINGS,
  doubleTapMs: 280,
  showBlocked: true,
  sound: true,
  collection: 'classique',
};

export interface Feedback {
  readonly id: number;
  readonly kind: 'error' | 'info';
  readonly message: string;
  readonly cell?: CellIndex;
  readonly conflicts?: readonly CellIndex[];
  readonly reasons?: readonly ErrorReason[];
  readonly charged?: boolean;
}

export interface HintView {
  readonly hint: Hint;
  readonly signature: string;
}

export interface Outcome {
  readonly gameId: string;
  readonly result: 'won' | 'lost';
  readonly unlocked: readonly AchievementId[];
  readonly newBest: boolean;
}

interface StoreState {
  screen: Screen;
  game: GameState | null;
  settings: Settings;
  stats: Stats;
  paused: boolean;
  loading: DifficultyLevel | null;
  loadError: string | null;
  feedback: Feedback | null;
  hintView: HintView | null;
  outcome: Outcome | null;
  /** Game ids whose result has already been written to the stats. */
  recorded: string[];

  setScreen: (screen: Screen) => void;
  startNewGame: (level: DifficultyLevel) => Promise<void>;
  restartGame: () => void;
  continueGame: () => void;
  /** Finger down on an empty cell: a cross appears and a stroke opens. */
  strokeStart: (cell: CellIndex) => void;
  /** Cells crossed by the sliding finger (crosses on empty cells only). */
  strokeExtend: (cells: readonly CellIndex[]) => void;
  /** Tap on a crossed cell: the cross goes away. */
  crossOff: (cell: CellIndex) => void;
  /** Double tap: cat placement or removal. */
  doubleTap: (cell: CellIndex) => void;
  /** End of a gesture (closes the undo group). */
  gestureEnd: () => void;
  undo: () => void;
  requestHint: () => void;
  closeHint: () => void;
  clearAllCrosses: () => void;
  pause: () => void;
  resume: () => void;
  tick: (ms: number) => void;
  dismissFeedback: () => void;
  updateSettings: (patch: Partial<Settings>) => void;
  resetStats: () => void;
}

let feedbackId = 1;
let loadToken = 0;
/** Undo entry of the stroke being drawn (null when no stroke is open). */
let openStroke: number | null = null;
/** History length right after the last single tap, to revert it on a double tap. */
let lastTapHistory: { cell: CellIndex; length: number } | null = null;

/** Whether the current game counts as started (abandoning it is a defeat). */
export function hasProgress(game: GameState | null): boolean {
  return !!game && game.status === 'playing' && (game.history.length > 0 || game.mistakes > 0 || game.hintsUsed > 0);
}

export const useGameStore = create<StoreState>()(
  persist(
    (set, get) => {
      /** Writes a finished game to the stats exactly once. */
      const settle = (game: GameState): void => {
        if (game.status === 'playing' || get().recorded.includes(game.puzzle.id + game.startedAt)) return;
        const res = recordResult(get().stats, {
          outcome: game.status,
          level: game.puzzle.difficulty,
          timeMs: game.elapsedMs,
          mistakes: game.mistakes,
          hints: game.hintsUsed,
        });
        set({
          stats: res.stats,
          recorded: [...get().recorded.slice(-30), game.puzzle.id + game.startedAt],
          outcome: { gameId: game.puzzle.id, result: game.status, unlocked: res.unlocked, newBest: res.newBest },
          hintView: null,
        });
        playSound(game.status === 'won' ? 'win' : 'lose');
      };

      const abandonIfStarted = (): void => {
        const { game } = get();
        if (game && hasProgress(game)) settle({ ...game, status: 'lost' });
      };

      const commit = (game: GameState): void => {
        set({ game });
        if (game.status !== 'playing') settle(game);
      };

      return {
        screen: 'home',
        game: null,
        settings: DEFAULT_APP_SETTINGS,
        stats: createStats(),
        paused: false,
        loading: null,
        loadError: null,
        feedback: null,
        hintView: null,
        outcome: null,
        recorded: [],

        setScreen: (screen) => set({ screen, ...(screen !== 'game' ? { paused: false } : {}) }),

        startNewGame: async (level) => {
          const token = ++loadToken;
          set({ loading: level, loadError: null });
          try {
            const puzzle = await getPuzzle(level);
            if (token !== loadToken) return;
            abandonIfStarted();
            set({
              game: createGame(puzzle),
              screen: 'game',
              loading: null,
              paused: false,
              feedback: null,
              hintView: null,
              outcome: null,
            });
          } catch {
            if (token === loadToken) set({ loading: null, loadError: 'Impossible de préparer la grille. Réessaie.' });
          }
        },

        restartGame: () => {
          const { game } = get();
          if (!game) return;
          abandonIfStarted();
          set({
            game: createGame(game.puzzle),
            paused: false,
            feedback: null,
            hintView: null,
            outcome: null,
            screen: 'game',
          });
        },

        continueGame: () => {
          if (get().game) set({ screen: 'game', paused: false });
        },

        strokeStart: (cell) => {
          const { game, paused } = get();
          if (!game || paused || game.status !== 'playing' || game.marks[cell] !== 'empty') return;
          const next = paintCrosses(game, [cell], true);
          openStroke = next.history.length;
          lastTapHistory = { cell, length: next.history.length };
          playSound('cross');
          set({ game: next, hintView: null });
        },

        strokeExtend: (cells) => {
          const { game, paused } = get();
          if (!game || paused || game.status !== 'playing') return;
          // Join the open stroke if it is still the last undo entry.
          const merge = openStroke !== null && openStroke === game.history.length;
          const next = paintCrosses(game, cells, true, merge);
          if (next === game) return;
          openStroke = next.history.length;
          lastTapHistory = null;
          playSound('cross');
          set({ game: next, hintView: null });
        },

        crossOff: (cell) => {
          const { game, paused } = get();
          if (!game || paused) return;
          const t = setCross(game, cell, false);
          if (t.event.type !== 'cross') return;
          lastTapHistory = { cell, length: t.state.history.length };
          playSound('tap');
          set({ game: t.state, hintView: null });
        },

        gestureEnd: () => {
          openStroke = null;
        },

        doubleTap: (cell) => {
          const { game, settings, paused } = get();
          if (!game || paused || game.status !== 'playing') return;
          const revert = lastTapHistory?.cell === cell && lastTapHistory.length === game.history.length;
          lastTapHistory = null;
          openStroke = null;
          const wasCat = game.marks[cell] === 'cat';
          const t = doubleTap(game, cell, settings, revert);
          const e = t.event;
          if (e.type === 'error') {
            set({
              feedback: {
                id: feedbackId++,
                kind: 'error',
                message: e.charged ? e.message : `${e.message} (déjà compté)`,
                cell: e.cell,
                conflicts: e.conflicts,
                reasons: e.reasons,
                charged: e.charged,
              },
            });
            if (e.charged) {
              playSound('error');
              haptic([20, 40, 20]);
            }
          } else if (e.type === 'cat' || e.type === 'won') {
            playSound('cat');
            haptic(10);
            set({ hintView: null, feedback: null });
          } else if (e.type === 'removed') {
            playSound('tap');
          } else if (wasCat) {
            set({ feedback: { id: feedbackId++, kind: 'info', message: 'Ce chat est bien à sa place : il ne bouge plus !' } });
          }
          commit(t.state);
        },

        undo: () => {
          const { game } = get();
          if (!game) return;
          const next = undo(game);
          if (next !== game) {
            openStroke = null;
            lastTapHistory = null;
            playSound('tap');
            set({ game: next, hintView: null });
          }
        },

        requestHint: () => {
          const { game, hintView, settings } = get();
          if (!game || game.status !== 'playing') return;
          const signature = boardSignature(game);
          const level = (hintView && hintView.signature === signature ? Math.min(3, hintView.hint.level + 1) : 1) as HintLevel;
          const colors = assignRegionColors(game.puzzle, game.puzzle.seed);
          const hint = getHint(
            {
              puzzle: game.puzzle,
              cats: catsOf(game),
              crosses: crossesOf(game),
              regionName: (id) => regionDisplayName(colors[id], id),
            },
            level,
          );
          let next = countHint(game);
          if (hint.level === 3 && (hint.place !== undefined || hint.remove !== undefined)) {
            next = applyHintAction(next, {
              ...(hint.place !== undefined ? { place: hint.place } : {}),
              ...(hint.remove !== undefined ? { remove: hint.remove } : {}),
            });
            if (settings.autoCross && hint.place !== undefined) {
              // Same behaviour as a manual placement.
              next = paintCrosses(next, [...blockedOf(next)], true);
            }
          }
          playSound('hint');
          lastTapHistory = null;
          set({ hintView: { hint, signature: boardSignature(next) } });
          commit(next);
        },

        closeHint: () => set({ hintView: null }),

        clearAllCrosses: () => {
          const { game } = get();
          lastTapHistory = null;
          openStroke = null;
          if (game) commit(clearCrosses(game));
        },

        pause: () => {
          if (get().game?.status === 'playing') set({ paused: true });
        },
        resume: () => set({ paused: false }),

        tick: (ms) => {
          const { game, paused } = get();
          if (!game || paused || game.status !== 'playing') return;
          set({ game: tick(game, ms) });
        },

        dismissFeedback: () => set({ feedback: null }),

        updateSettings: (patch) => {
          const settings = { ...get().settings, ...patch };
          setSoundEnabled(settings.sound);
          set({ settings });
        },

        resetStats: () => set({ stats: createStats(), recorded: [] }),
      };
    },
    {
      name: 'chatdoku.state.v1',
      version: 1,
      storage: persistStorage,
      partialize: (s) => ({
        screen: s.screen === 'game' ? 'game' : 'home',
        game: s.game,
        settings: s.settings,
        stats: s.stats,
        recorded: s.recorded,
      }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<StoreState>;
        const game = p.game ?? null;
        const { inputMode: _legacy, ...saved } = (p.settings ?? {}) as Partial<Settings> & { inputMode?: unknown };
        void _legacy;
        const settings: Settings = { ...DEFAULT_APP_SETTINGS, ...saved };
        setSoundEnabled(settings.sound);
        return {
          ...current,
          ...p,
          settings,
          stats: { ...createStats(), ...(p.stats ?? {}) },
          game,
          // Coming back to a game in progress: show it paused, timer stopped.
          screen: p.screen === 'game' && game ? 'game' : 'home',
          paused: !!game && game.status === 'playing' && p.screen === 'game',
        };
      },
    },
  ),
);
