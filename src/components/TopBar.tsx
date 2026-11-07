import { motion } from 'framer-motion';
import { DIFFICULTY_LABELS, type DifficultyLevel } from '../game-engine';
import { MAX_LIVES } from '../game/gameLogic';
import { formatTime } from '../stats/stats';
import { CLASSIC_COLLECTION } from '../cats/collections';
import { CatArt } from '../cats/CatArt';
import { Heart, IconBack, IconPause } from './icons';
import { IconButton } from './ui';

export function Hearts({ lives }: { lives: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${lives} vie${lives > 1 ? 's' : ''} sur ${MAX_LIVES}`} role="status">
      {Array.from({ length: MAX_LIVES }, (_, i) => {
        const filled = i < lives;
        return (
          <motion.span
            key={i}
            initial={false}
            animate={filled ? { scale: 1, rotate: 0 } : { scale: [1.35, 0.85, 1], rotate: [0, -12, 8, 0] }}
            transition={{ duration: 0.4 }}
            className="grid place-items-center"
          >
            <Heart filled={filled} />
          </motion.span>
        );
      })}
    </div>
  );
}

export function TopBar({ level, size, elapsedMs, onBack, onPause }: { level: DifficultyLevel; size: number; elapsedMs: number; onBack: () => void; onPause: () => void }) {
  return (
    <header className="grid h-14 shrink-0 grid-cols-[1fr_auto_1fr] items-center px-2">
      <div className="flex items-center">
        <IconButton label="Retour à l’accueil" onClick={onBack}>
          <IconBack size={26} />
        </IconButton>
      </div>
      <div className="flex flex-col items-center leading-tight">
        <span className="font-rounded text-[13px] font-bold tracking-wide text-muted uppercase">
          {DIFFICULTY_LABELS[level]} · {size}×{size}
        </span>
        <span className="tabular font-rounded text-[19px] font-extrabold tracking-tight" aria-label="Chronomètre">
          {formatTime(elapsedMs)}
        </span>
      </div>
      <div className="flex justify-end">
        <IconButton label="Pause" onClick={onPause}>
          <IconPause size={24} />
        </IconButton>
      </div>
    </header>
  );
}

const RULES = ['1 chat / couleur', '1 chat / ligne & colonne', 'Jamais collés'];

/** Permanent reminder of the rules, as compact chips. */
export function RuleChips() {
  return (
    <div className="no-scrollbar flex shrink-0 justify-center-safe gap-1.5 overflow-x-auto px-3 pb-2">
      {RULES.map((r) => (
        <span key={r} className="shrink-0 rounded-xl bg-white/80 px-2.5 py-1.5 text-[12px] font-semibold whitespace-nowrap text-ink-soft ring-1 ring-sand-deep/60">
          {r}
        </span>
      ))}
    </div>
  );
}

/** Cats placed counter + lives. */
export function StatusRow({ placed, total, lives }: { placed: number; total: number; lives: number }) {
  const cat = CLASSIC_COLLECTION.cats[1];
  return (
    <div className="flex shrink-0 items-center justify-center gap-3 pb-2.5">
      <div className="flex h-10 items-center gap-2 rounded-full bg-white px-3.5 shadow-soft" aria-label={`${placed} chats placés sur ${total}`}>
        <span className="size-7">{cat && <CatArt cat={cat} />}</span>
        <span className="tabular font-rounded text-[18px] font-extrabold">
          <span className="text-good-deep">{placed}</span>
          <span className="text-muted">/{total}</span>
        </span>
      </div>
      <div className="flex h-10 items-center rounded-full bg-white px-3 shadow-soft">
        <Hearts lives={lives} />
      </div>
    </div>
  );
}
