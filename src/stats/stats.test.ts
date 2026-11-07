import { describe, expect, it } from 'vitest';
import { averageMistakes, averageWinTime, createStats, formatTime, recordResult, type GameResult } from './stats';

const win = (over: Partial<GameResult> = {}): GameResult => ({ outcome: 'won', level: 'easy', timeMs: 60_000, mistakes: 0, hints: 0, ...over });

describe('Statistiques', () => {
  it('enregistre victoires, défaites, séries et moyennes', () => {
    let s = createStats();
    s = recordResult(s, win({ timeMs: 90_000, mistakes: 1 })).stats;
    s = recordResult(s, win({ timeMs: 30_000 })).stats;
    s = recordResult(s, { ...win(), outcome: 'lost', mistakes: 3 }).stats;
    expect(s.played).toBe(3);
    expect(s.wins).toBe(2);
    expect(s.losses).toBe(1);
    expect(s.bestTimeMs).toBe(30_000);
    expect(averageWinTime(s)).toBe(60_000);
    expect(averageMistakes(s)).toBeCloseTo(4 / 3);
    expect(s.currentStreak).toBe(0);
    expect(s.bestStreak).toBe(2);
  });
  it('débloque les succès une seule fois', () => {
    let s = createStats();
    const first = recordResult(s, win());
    expect(first.unlocked).toEqual(expect.arrayContaining(['first-win', 'flawless', 'no-hint']));
    s = first.stats;
    expect(recordResult(s, win()).unlocked).not.toContain('first-win');
  });
  it('succès expert, 5 parties, 10 victoires, série de 5', () => {
    let s = createStats();
    const all = new Set<string>();
    for (let i = 0; i < 10; i++) {
      const r = recordResult(s, win({ level: i === 9 ? 'expert' : 'medium', mistakes: 1, hints: 1 }));
      r.unlocked.forEach((u) => all.add(u));
      s = r.stats;
    }
    expect([...all]).toEqual(expect.arrayContaining(['five-games', 'ten-wins', 'first-expert', 'streak-5']));
    expect(all.has('flawless')).toBe(false);
  });
  it('signale un nouveau record', () => {
    const s = recordResult(createStats(), win({ timeMs: 50_000 })).stats;
    expect(recordResult(s, win({ timeMs: 40_000 })).newBest).toBe(true);
    expect(recordResult(s, win({ timeMs: 70_000 })).newBest).toBe(false);
  });
  it('formate le temps', () => {
    expect(formatTime(65_000)).toBe('01:05');
    expect(formatTime(3_725_000)).toBe('1:02:05');
    expect(formatTime(null)).toBe('—');
  });
});
