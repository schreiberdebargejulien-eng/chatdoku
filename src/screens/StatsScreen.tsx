import { motion } from 'framer-motion';
import { useState } from 'react';
import { DIFFICULTY_LABELS, DIFFICULTY_LEVELS } from '../game-engine';
import { ScreenHeader } from '../components/ui';
import { ACHIEVEMENTS, averageMistakes, averageWinTime, formatTime, winRate } from '../stats/stats';
import { useGameStore } from '../store/gameStore';

function Tile({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-2xl p-3.5 shadow-soft ${accent ? 'bg-orange text-white' : 'bg-white'}`}>
      <div className="tabular font-rounded text-[26px] leading-none font-black tracking-tight">{value}</div>
      <div className={`mt-1.5 text-[12.5px] font-semibold ${accent ? 'text-white/85' : 'text-muted'}`}>{label}</div>
    </div>
  );
}

export function StatsScreen({ onBack }: { onBack: () => void }) {
  const stats = useGameStore((s) => s.stats);
  const [tab, setTab] = useState<'stats' | 'success'>('stats');
  const unlockedCount = ACHIEVEMENTS.filter((a) => stats.achievements[a.id] !== undefined).length;

  return (
    <div className="flex h-full flex-col">
      <ScreenHeader title="Statistiques" onBack={onBack} />
      <div className="mx-4 mb-3 grid grid-cols-2 rounded-2xl bg-sand p-1">
        {(['stats', 'success'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`relative h-10 rounded-xl text-[14px] font-bold ${tab === t ? 'text-ink' : 'text-muted'}`}
          >
            {tab === t && <motion.span layoutId="tab" className="absolute inset-0 rounded-xl bg-white shadow-soft" />}
            <span className="relative">{t === 'stats' ? 'Progression' : `Succès ${unlockedCount}/${ACHIEVEMENTS.length}`}</span>
          </button>
        ))}
      </div>
      <div className="scroll-area min-h-0 flex-1 px-4 pb-8">
        {tab === 'stats' ? (
          <>
            <div className="grid grid-cols-2 gap-2.5">
              <Tile label="Victoires" value={String(stats.wins)} accent />
              <Tile label="Parties jouées" value={String(stats.played)} />
              <Tile label="Défaites" value={String(stats.losses)} />
              <Tile label="Taux de réussite" value={`${Math.round(winRate(stats) * 100)} %`} />
              <Tile label="Meilleur temps" value={formatTime(stats.bestTimeMs)} />
              <Tile label="Temps moyen" value={formatTime(averageWinTime(stats))} />
              <Tile label="Erreurs / partie" value={averageMistakes(stats).toFixed(1)} />
              <Tile label="Indices utilisés" value={String(stats.totalHints)} />
              <Tile label="Série actuelle" value={String(stats.currentStreak)} />
              <Tile label="Meilleure série" value={String(stats.bestStreak)} />
            </div>
            <h2 className="font-rounded mt-6 mb-2 px-1 text-[17px] font-extrabold">Par difficulté</h2>
            <div className="overflow-hidden rounded-2xl bg-white shadow-soft">
              {DIFFICULTY_LEVELS.map((level, i) => {
                const l = stats.byLevel[level];
                return (
                  <div key={level} className={`flex items-center px-4 py-3 ${i > 0 ? 'border-t border-sand' : ''}`}>
                    <span className="flex-1 font-semibold">{DIFFICULTY_LABELS[level]}</span>
                    <span className="w-20 text-right text-[13px] text-muted">
                      {l.wins}/{l.played}
                    </span>
                    <span className="tabular w-20 text-right font-semibold">{formatTime(l.bestTimeMs)}</span>
                  </div>
                );
              })}
            </div>
            <p className="mt-2 px-1 text-[12px] text-muted">Victoires / parties · meilleur temps</p>
          </>
        ) : (
          <div className="space-y-2.5">
            {ACHIEVEMENTS.map((a) => {
              const at = stats.achievements[a.id];
              const done = at !== undefined;
              return (
                <div key={a.id} className={`flex items-center gap-3 rounded-2xl p-3.5 shadow-soft ${done ? 'bg-white' : 'bg-white/50'}`}>
                  <span className={`grid size-12 place-items-center rounded-2xl text-2xl ${done ? 'bg-orange-soft' : 'bg-sand grayscale opacity-50'}`}>
                    {a.emoji}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={`block font-rounded text-[16px] font-extrabold ${done ? '' : 'text-muted'}`}>{a.title}</span>
                    <span className="block text-[13px] text-ink-soft">{a.description}</span>
                  </span>
                  {done && <span className="text-[12px] font-semibold text-good-deep">{new Date(at).toLocaleDateString('fr-FR')}</span>}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
