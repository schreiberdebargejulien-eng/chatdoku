import { motion } from 'framer-motion';
import { DIFFICULTY_LABELS, type DifficultyLevel } from '../game-engine';
import { MAX_LIVES } from '../game/gameLogic';
import { formatTime } from '../stats/stats';
import { Heart, IconBack } from './icons';
import { IconButton } from './ui';

export function Hearts({ lives }: { lives: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${lives} vie${lives > 1 ? 's' : ''} sur ${MAX_LIVES}`} role="status">
      {Array.from({ length: MAX_LIVES }, (_, i) => {
        const filled = i < lives;
        return (
          <motion.span
            key={i}
            animate={filled ? { scale: 1, rotate: 0 } : { scale: [1.35, 0.85, 1], rotate: [0, -12, 8, 0] }}
            transition={{ duration: 0.45 }}
            className="grid place-items-center"
          >
            <Heart filled={filled} />
          </motion.span>
        );
      })}
    </div>
  );
}

export function TopBar({
  level,
  size,
  elapsedMs,
  lives,
  onBack,
}: {
  level: DifficultyLevel;
  size: number;
  elapsedMs: number;
  lives: number;
  onBack: () => void;
}) {
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
      <div className="flex justify-end pr-2">
        <Hearts lives={lives} />
      </div>
    </header>
  );
}
