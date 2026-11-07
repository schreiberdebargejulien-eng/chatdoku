import { motion } from 'framer-motion';
import { useState } from 'react';
import { DIFFICULTY_LABELS, DIFFICULTY_LEVELS, type DifficultyLevel } from '../game-engine';
import { CLASSIC_COLLECTION } from '../cats/collections';
import { CatArt } from '../cats/CatArt';
import { Button, IconButton, Modal } from '../components/ui';
import { ConfirmModal } from '../components/overlays';
import { IconChart, IconGear, IconHelp, IconPlay } from '../components/icons';
import { catsOf } from '../game/gameLogic';
import { formatTime } from '../stats/stats';
import { hasProgress, useGameStore, type Screen } from '../store/gameStore';

const LEVEL_INFO: Record<DifficultyLevel, { grid: string; text: string; dots: number }> = {
  easy: { grid: '8×8', text: 'Régions lisibles, déductions évidentes.', dots: 1 },
  medium: { grid: '9×9', text: 'Il faut combiner plusieurs contraintes.', dots: 2 },
  hard: { grid: '9×9 · 10×10', text: 'Régions complexes, raisonnements en chaîne.', dots: 3 },
  expert: { grid: '10×10', text: 'Peu d’évidences : analyse profonde.', dots: 4 },
};

export function Logo() {
  return (
    <div className="relative inline-block">
      <svg viewBox="0 0 60 22" className="absolute -top-[22px] left-[2px] h-[24px] w-auto" aria-hidden>
        <path d="M4 21L9 3L20 17Z" fill="#292929" />
        <path d="M8 16L10 8L15 14Z" fill="#F2A65A" />
        <path d="M30 21L36 3L44 18Z" fill="#292929" />
        <path d="M34 16L36.5 8L40 15Z" fill="#F2A65A" />
      </svg>
      <h1 className="font-rounded text-[54px] leading-none font-black tracking-[-0.04em]">
        Chat<span className="text-orange">doku</span>
      </h1>
    </div>
  );
}

function HeroCats() {
  const cats = CLASSIC_COLLECTION.cats;
  // Positions in % of the hero width so it scales down on small phones.
  const layout = [
    { cat: cats[1], x: 14, bottom: 6, s: 24, r: -10 },
    { cat: cats[6], x: 31, bottom: 14, s: 28, r: -4 },
    { cat: cats[0], x: 50, bottom: 20, s: 34, r: 0 },
    { cat: cats[4], x: 69, bottom: 14, s: 28, r: 5 },
    { cat: cats[2], x: 86, bottom: 6, s: 24, r: 10 },
  ];
  return (
    <div className="relative mx-auto aspect-[330/170] w-[min(330px,88vw)]" aria-hidden>
      <div className="absolute inset-x-[6%] bottom-[2%] h-[22%] rounded-[50%] bg-sand" />
      {layout.map(({ cat, x, bottom, s, r }, i) => (
        <motion.div
          key={cat?.id}
          className="absolute"
          style={{ width: `${s}%`, aspectRatio: '1', left: `${x - s / 2}%`, bottom: `${bottom}%`, zIndex: i === 2 ? 2 : 1 }}
          initial={{ y: 40, opacity: 0, scale: 0.6, rotate: r }}
          animate={{ y: [0, -5, 0], opacity: 1, scale: 1, rotate: r }}
          transition={{
            opacity: { delay: 0.1 + i * 0.08, duration: 0.3 },
            scale: { delay: 0.1 + i * 0.08, type: 'spring', stiffness: 260, damping: 14 },
            y: { delay: 0.6 + i * 0.25, duration: 2.6, repeat: Infinity, ease: 'easeInOut' },
          }}
        >
          {cat && <CatArt cat={cat} />}
        </motion.div>
      ))}
    </div>
  );
}

export function HomeScreen({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  const game = useGameStore((s) => s.game);
  const loading = useGameStore((s) => s.loading);
  const loadError = useGameStore((s) => s.loadError);
  const stats = useGameStore((s) => s.stats);
  const startNewGame = useGameStore((s) => s.startNewGame);
  const continueGame = useGameStore((s) => s.continueGame);
  const [picker, setPicker] = useState(false);
  const [confirm, setConfirm] = useState<DifficultyLevel | null>(null);
  const canContinue = !!game && game.status === 'playing';

  const choose = (level: DifficultyLevel) => {
    if (hasProgress(game)) {
      setPicker(false);
      setConfirm(level);
      return;
    }
    void startNewGame(level);
  };

  return (
    <div className="flex h-full flex-col">
      <header className="flex h-14 shrink-0 items-center justify-end gap-1 px-3">
        <IconButton label="Comment jouer" onClick={() => onNavigate('rules')}>
          <IconHelp />
        </IconButton>
        <IconButton label="Statistiques" onClick={() => onNavigate('stats')}>
          <IconChart />
        </IconButton>
        <IconButton label="Paramètres" onClick={() => onNavigate('settings')}>
          <IconGear />
        </IconButton>
      </header>

      <main className="flex min-h-0 flex-1 flex-col items-center justify-center px-6 text-center">
        <HeroCats />
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }} className="mt-7">
          <Logo />
        </motion.div>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.65 }}
          className="font-rounded mt-3 text-[18px] font-semibold text-ink-soft"
        >
          Chaque chat à sa place.
        </motion.p>
      </main>

      <motion.footer
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.75, type: 'spring', stiffness: 200, damping: 22 }}
        className="mx-auto w-full max-w-md shrink-0 space-y-3 px-6 pb-6"
      >
        <Button onClick={() => setPicker(true)} icon={<IconPlay size={20} />}>
          Nouvelle partie
        </Button>
        {canContinue && game && (
          <Button variant="secondary" onClick={continueGame}>
            <span className="flex flex-col items-center leading-tight">
              <span>Continuer</span>
              <span className="text-[12.5px] font-semibold text-muted">
                {DIFFICULTY_LABELS[game.puzzle.difficulty]} · {formatTime(game.elapsedMs)} · {catsOf(game).length}/{game.puzzle.size} chats
              </span>
            </span>
          </Button>
        )}
        {stats.played > 0 && (
          <p className="pt-1 text-center text-[13px] text-muted">
            {stats.wins} victoire{stats.wins > 1 ? 's' : ''} · série {stats.currentStreak}
          </p>
        )}
      </motion.footer>

      <Modal open={picker} onClose={() => setPicker(false)} labelledBy="pick-title">
        <h2 id="pick-title" className="font-rounded mb-4 text-center text-[24px] font-black tracking-tight">
          Choisis ta difficulté
        </h2>
        <div className="space-y-2.5">
          {DIFFICULTY_LEVELS.map((level, i) => {
            const info = LEVEL_INFO[level];
            const best = stats.byLevel[level]?.bestTimeMs ?? null;
            const busy = loading === level;
            return (
              <motion.button
                key={level}
                type="button"
                disabled={!!loading}
                onClick={() => choose(level)}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex w-full items-center gap-3 rounded-2xl bg-white p-3.5 text-left shadow-[0_4px_0_0_var(--color-sand-deep)] ring-1 ring-sand-deep/50 transition active:translate-y-[3px] active:shadow-[0_1px_0_0_var(--color-sand-deep)] disabled:opacity-60"
              >
                <span className="flex w-10 shrink-0 flex-wrap justify-center gap-1">
                  {Array.from({ length: 4 }, (_, d) => (
                    <span key={d} className={`size-2.5 rounded-full ${d < info.dots ? 'bg-orange' : 'bg-sand-deep'}`} />
                  ))}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline gap-2">
                    <span className="font-rounded text-[18px] font-extrabold">{DIFFICULTY_LABELS[level]}</span>
                    <span className="text-[13px] font-semibold text-muted">{info.grid}</span>
                  </span>
                  <span className="block text-[13px] leading-snug text-ink-soft">{info.text}</span>
                </span>
                <span className="shrink-0 text-right text-[12px] font-semibold text-muted">
                  {busy ? (
                    <motion.span
                      className="inline-block size-5 rounded-full border-[3px] border-orange border-t-transparent"
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
                    />
                  ) : best !== null ? (
                    <>
                      Record
                      <br />
                      <span className="tabular text-[14px] text-ink">{formatTime(best)}</span>
                    </>
                  ) : null}
                </span>
              </motion.button>
            );
          })}
        </div>
        {loadError && <p className="mt-3 text-center text-[14px] font-semibold text-bad-deep">{loadError}</p>}
      </Modal>

      <ConfirmModal
        open={confirm !== null}
        title="Abandonner la partie ?"
        message="Ta partie en cours sera comptée comme une défaite."
        confirmLabel="Nouvelle partie"
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          const level = confirm;
          setConfirm(null);
          if (level) void startNewGame(level);
        }}
      />
    </div>
  );
}
