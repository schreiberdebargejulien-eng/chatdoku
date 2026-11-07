import type { DifficultyLevel } from '../game-engine';

export type AchievementId =
  | 'first-win'
  | 'flawless'
  | 'five-games'
  | 'ten-wins'
  | 'first-expert'
  | 'no-hint'
  | 'streak-5';

export interface AchievementDef {
  readonly id: AchievementId;
  readonly title: string;
  readonly description: string;
  readonly emoji: string;
}

export const ACHIEVEMENTS: readonly AchievementDef[] = [
  { id: 'first-win', title: 'Premier ronron', description: 'Remporter une première victoire.', emoji: '🐾' },
  { id: 'flawless', title: 'Patte de velours', description: 'Gagner une partie sans aucune erreur.', emoji: '✨' },
  { id: 'five-games', title: 'Habitué du panier', description: 'Terminer 5 parties.', emoji: '🧺' },
  { id: 'ten-wins', title: 'Chat de gouttière', description: 'Remporter 10 victoires.', emoji: '🏆' },
  { id: 'first-expert', title: 'Maître des chats', description: 'Gagner une partie Expert.', emoji: '👑' },
  { id: 'no-hint', title: 'Instinct félin', description: 'Gagner sans utiliser d’indice.', emoji: '🧠' },
  { id: 'streak-5', title: 'Sept vies', description: 'Enchaîner 5 victoires.', emoji: '🔥' },
];

export interface LevelStats {
  readonly played: number;
  readonly wins: number;
  readonly bestTimeMs: number | null;
  readonly totalWinTimeMs: number;
}

export interface Stats {
  readonly played: number;
  readonly wins: number;
  readonly losses: number;
  readonly bestTimeMs: number | null;
  readonly totalWinTimeMs: number;
  readonly totalMistakes: number;
  readonly totalHints: number;
  readonly currentStreak: number;
  readonly bestStreak: number;
  readonly byLevel: Readonly<Record<DifficultyLevel, LevelStats>>;
  /** Unlock timestamp per achievement. */
  readonly achievements: Readonly<Partial<Record<AchievementId, number>>>;
}

const emptyLevel: LevelStats = { played: 0, wins: 0, bestTimeMs: null, totalWinTimeMs: 0 };

export function createStats(): Stats {
  return {
    played: 0,
    wins: 0,
    losses: 0,
    bestTimeMs: null,
    totalWinTimeMs: 0,
    totalMistakes: 0,
    totalHints: 0,
    currentStreak: 0,
    bestStreak: 0,
    byLevel: { easy: emptyLevel, medium: emptyLevel, hard: emptyLevel, expert: emptyLevel },
    achievements: {},
  };
}

export interface GameResult {
  readonly outcome: 'won' | 'lost';
  readonly level: DifficultyLevel;
  readonly timeMs: number;
  readonly mistakes: number;
  readonly hints: number;
}

export interface RecordOutcome {
  readonly stats: Stats;
  readonly unlocked: AchievementId[];
  readonly newBest: boolean;
}

const minTime = (a: number | null, b: number): number => (a === null ? b : Math.min(a, b));

export function recordResult(stats: Stats, result: GameResult, now = Date.now()): RecordOutcome {
  const won = result.outcome === 'won';
  const lvl = stats.byLevel[result.level] ?? emptyLevel;
  const levelBefore = lvl.bestTimeMs;
  const byLevel = {
    ...stats.byLevel,
    [result.level]: {
      played: lvl.played + 1,
      wins: lvl.wins + (won ? 1 : 0),
      bestTimeMs: won ? minTime(lvl.bestTimeMs, result.timeMs) : lvl.bestTimeMs,
      totalWinTimeMs: lvl.totalWinTimeMs + (won ? result.timeMs : 0),
    },
  };
  const currentStreak = won ? stats.currentStreak + 1 : 0;
  const next: Stats = {
    ...stats,
    played: stats.played + 1,
    wins: stats.wins + (won ? 1 : 0),
    losses: stats.losses + (won ? 0 : 1),
    bestTimeMs: won ? minTime(stats.bestTimeMs, result.timeMs) : stats.bestTimeMs,
    totalWinTimeMs: stats.totalWinTimeMs + (won ? result.timeMs : 0),
    totalMistakes: stats.totalMistakes + result.mistakes,
    totalHints: stats.totalHints + result.hints,
    currentStreak,
    bestStreak: Math.max(stats.bestStreak, currentStreak),
    byLevel,
  };

  const earned: AchievementId[] = [];
  if (won) earned.push('first-win');
  if (won && result.mistakes === 0) earned.push('flawless');
  if (next.played >= 5) earned.push('five-games');
  if (next.wins >= 10) earned.push('ten-wins');
  if (won && result.level === 'expert') earned.push('first-expert');
  if (won && result.hints === 0) earned.push('no-hint');
  if (currentStreak >= 5) earned.push('streak-5');
  const unlocked = earned.filter((id) => stats.achievements[id] === undefined);
  const achievements = { ...stats.achievements };
  for (const id of unlocked) achievements[id] = now;

  return {
    stats: { ...next, achievements },
    unlocked,
    newBest: won && (levelBefore === null || result.timeMs < levelBefore),
  };
}

export function averageWinTime(stats: Stats): number | null {
  return stats.wins > 0 ? stats.totalWinTimeMs / stats.wins : null;
}

export function averageMistakes(stats: Stats): number {
  return stats.played > 0 ? stats.totalMistakes / stats.played : 0;
}

export function winRate(stats: Stats): number {
  return stats.played > 0 ? stats.wins / stats.played : 0;
}

export function formatTime(ms: number | null): string {
  if (ms === null || !Number.isFinite(ms)) return '—';
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}
