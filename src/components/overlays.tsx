import { motion } from 'framer-motion';
import { useMemo } from 'react';
import { DIFFICULTY_LABELS } from '../game-engine';
import { CLASSIC_COLLECTION } from '../cats/collections';
import { CatArt } from '../cats/CatArt';
import type { GameState } from '../game/gameLogic';
import { ACHIEVEMENTS, formatTime } from '../stats/stats';
import type { Outcome } from '../store/gameStore';
import { Button, Modal } from './ui';
import { IconHome, IconPlay, IconRestart } from './icons';

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-1 flex-col items-center rounded-2xl bg-white px-2 py-2.5 shadow-soft">
      <span className="tabular font-rounded text-[20px] font-extrabold">{value}</span>
      <span className="text-[11.5px] font-semibold text-muted">{label}</span>
    </div>
  );
}

function Confetti() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 22 }, (_, i) => ({
        x: (i / 22) * 100 + (Math.sin(i * 7.1) * 4),
        d: 0.2 + ((i * 37) % 10) / 14,
        c: ['#F2A65A', '#9FD8B0', '#F3A8A6', '#AFA2E0', '#F5E08A', '#94BFE5'][i % 6] as string,
        r: (i * 47) % 360,
      })),
    [],
  );
  return (
    <div className="pointer-events-none absolute inset-x-0 -top-4 h-44 overflow-hidden" aria-hidden>
      {pieces.map((p, i) => (
        <motion.span
          key={i}
          className="absolute top-0 h-3 w-2 rounded-[2px]"
          style={{ left: `${p.x}%`, background: p.c }}
          initial={{ y: -20, rotate: p.r, opacity: 1 }}
          animate={{ y: 180, rotate: p.r + 260, opacity: 0 }}
          transition={{ duration: 1.8, delay: p.d, ease: 'easeIn' }}
        />
      ))}
    </div>
  );
}

export function VictoryModal({
  game,
  outcome,
  onNext,
  onHome,
}: {
  game: GameState;
  outcome: Outcome | null;
  onNext: () => void;
  onHome: () => void;
}) {
  const cats = CLASSIC_COLLECTION.cats;
  const unlocked = (outcome?.unlocked ?? []).map((id) => ACHIEVEMENTS.find((a) => a.id === id)).filter(Boolean);
  return (
    <Modal open dismissible={false} labelledBy="victory-title">
      <Confetti />
      <div className="relative flex flex-col items-center text-center">
        <div className="-mt-16 mb-2 flex items-end">
          {[cats[0], cats[4], cats[2]].map((cat, i) => (
            <motion.div
              key={cat?.id}
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.15 + i * 0.1, type: 'spring', stiffness: 300, damping: 16 }}
              className={i === 1 ? 'size-24' : 'size-16'}
            >
              {cat && <CatArt cat={cat} mood="happy" />}
            </motion.div>
          ))}
        </div>
        <h2 id="victory-title" className="font-rounded text-[30px] font-black tracking-tight">
          Bravo !
        </h2>
        <p className="mt-0.5 text-[15px] text-ink-soft">Chaque chat a trouvé sa place.</p>
        {outcome?.newBest && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.5, type: 'spring' }}
            className="mt-2 rounded-full bg-orange-soft px-3 py-1 text-[13px] font-bold text-orange-deep"
          >
            Nouveau record · {DIFFICULTY_LABELS[game.puzzle.difficulty]}
          </motion.span>
        )}
        <div className="mt-4 flex w-full gap-2">
          <StatPill label="Temps" value={formatTime(game.elapsedMs)} />
          <StatPill label="Erreurs" value={String(game.mistakes)} />
          <StatPill label="Indices" value={String(game.hintsUsed)} />
        </div>
        {unlocked.length > 0 && (
          <div className="mt-3 w-full space-y-2">
            {unlocked.map((a) => (
              <motion.div
                key={a?.id}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.7 }}
                className="flex items-center gap-3 rounded-2xl bg-good-soft px-3 py-2 text-left"
              >
                <span className="text-2xl">{a?.emoji}</span>
                <span>
                  <span className="block text-[14px] font-bold">Succès débloqué : {a?.title}</span>
                  <span className="block text-[12.5px] text-ink-soft">{a?.description}</span>
                </span>
              </motion.div>
            ))}
          </div>
        )}
        <div className="mt-5 w-full space-y-3">
          <Button onClick={onNext} icon={<IconPlay size={20} />}>
            Nouvelle partie
          </Button>
          <Button variant="secondary" onClick={onHome} icon={<IconHome size={20} />}>
            Accueil
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export function GameOverModal({ onRetry, onNew, onHome }: { onRetry: () => void; onNew: () => void; onHome: () => void }) {
  const cat = CLASSIC_COLLECTION.cats[3];
  return (
    <Modal open dismissible={false} labelledBy="over-title">
      <div className="flex flex-col items-center text-center">
        <motion.div initial={{ rotate: -8, y: 10 }} animate={{ rotate: [0, -4, 4, 0], y: 0 }} transition={{ duration: 0.8 }} className="-mt-16 mb-2 size-24">
          {cat && <CatArt cat={cat} mood="sad" />}
        </motion.div>
        <h2 id="over-title" className="font-rounded text-[28px] font-black tracking-tight">
          Plus de vies…
        </h2>
        <p className="mt-1 text-[15px] text-ink-soft">Les chats se sont un peu bousculés. On retente ?</p>
        <div className="mt-6 w-full space-y-3">
          <Button onClick={onRetry} icon={<IconRestart size={20} />}>
            Recommencer cette grille
          </Button>
          <Button variant="secondary" onClick={onNew} icon={<IconPlay size={20} />}>
            Nouvelle grille
          </Button>
          <Button variant="ghost" onClick={onHome} icon={<IconHome size={20} />}>
            Retour à l’accueil
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export function PauseModal({
  open,
  onResume,
  onRestart,
  onClearCrosses,
  onHome,
  onRules,
}: {
  open: boolean;
  onResume: () => void;
  onRestart: () => void;
  onClearCrosses: () => void;
  onHome: () => void;
  onRules: () => void;
}) {
  return (
    <Modal open={open} onClose={onResume} labelledBy="pause-title">
      <h2 id="pause-title" className="font-rounded mb-1 text-center text-[26px] font-black tracking-tight">
        Pause
      </h2>
      <p className="mb-5 text-center text-[14px] text-muted">Les chats font la sieste en attendant.</p>
      <div className="space-y-3">
        <Button onClick={onResume} icon={<IconPlay size={20} />}>
          Reprendre
        </Button>
        <Button variant="secondary" onClick={onClearCrosses}>
          Effacer toutes les croix
        </Button>
        <Button variant="secondary" onClick={onRules}>
          Comment jouer
        </Button>
        <div className="flex gap-3">
          <Button variant="danger" onClick={onRestart} icon={<IconRestart size={18} />}>
            Recommencer
          </Button>
          <Button variant="ghost" onClick={onHome} icon={<IconHome size={18} />}>
            Accueil
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export function ConfirmModal({
  open,
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal open={open} onClose={onCancel} labelledBy="confirm-title">
      <h2 id="confirm-title" className="font-rounded text-center text-[22px] font-black tracking-tight">
        {title}
      </h2>
      <p className="mt-2 mb-5 text-center text-[15px] text-ink-soft">{message}</p>
      <div className="flex gap-3">
        <Button variant="secondary" onClick={onCancel}>
          Annuler
        </Button>
        <Button variant="danger" onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
