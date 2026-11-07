import { AnimatePresence, motion } from 'framer-motion';
import type { Feedback, HintView } from '../store/gameStore';
import { IconClose } from './icons';

const RULE_TAG: Record<string, string> = {
  row: 'Ligne',
  column: 'Colonne',
  region: 'Région',
  adjacent: 'Voisin',
  wrong: 'Logique',
};

/** Error toast and hint card, shown between the grid and the tools. */
export function MessageBar({
  feedback,
  hintView,
  onCloseHint,
  onMoreHint,
  onDismiss,
}: {
  feedback: Feedback | null;
  hintView: HintView | null;
  onCloseHint: () => void;
  onMoreHint: () => void;
  onDismiss: () => void;
}) {
  const show = feedback ? 'feedback' : hintView ? 'hint' : null;
  return (
    // Fixed height: the grid never jumps when a message appears.
    <div className="relative flex h-[104px] w-full shrink-0 items-center px-4" aria-live="polite">
      <AnimatePresence mode="wait">
        {show === null && (
          <motion.p
            key="help"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full text-center text-[13px] leading-relaxed font-semibold text-muted"
          >
            <b className="text-ink-soft">Touche</b> : croix · <b className="text-ink-soft">Double touche</b> : chat
            <br />
            <b className="text-ink-soft">Glisse</b> pour poser plusieurs croix
          </motion.p>
        )}
        {show === 'feedback' && feedback && (
          <motion.button
            type="button"
            key={`f${feedback.id}`}
            onClick={onDismiss}
            initial={{ opacity: 0, y: 10, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6 }}
            className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left shadow-soft ${
              feedback.kind === 'error' ? 'bg-bad-soft text-[#8c3532]' : 'bg-good-soft text-[#2f6b42]'
            }`}
          >
            {feedback.kind === 'error' && (
              <span className="flex shrink-0 flex-col gap-1">
                {(feedback.reasons ?? []).slice(0, 2).map((r) => (
                  <span key={r} className="rounded-full bg-white/70 px-2 py-0.5 text-[11px] font-bold tracking-wide uppercase">
                    {RULE_TAG[r] ?? r}
                  </span>
                ))}
              </span>
            )}
            <span className="text-[15px] leading-snug font-semibold">{feedback.message}</span>
          </motion.button>
        )}
        {show === 'hint' && hintView && (
          <motion.div
            key={`h${hintView.hint.level}${hintView.hint.message}`}
            initial={{ opacity: 0, y: 10, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6 }}
            className="flex w-full items-start gap-3 rounded-2xl bg-white px-4 py-2.5 shadow-soft ring-1 ring-orange/40"
          >
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex items-center gap-1.5">
                {[1, 2, 3].map((l) => (
                  <span
                    key={l}
                    className={`h-1.5 w-4 rounded-full ${l <= hintView.hint.level ? 'bg-orange' : 'bg-sand-deep'}`}
                  />
                ))}
                <span className="ml-1 text-[11px] font-bold tracking-wide text-muted uppercase">
                  {hintView.hint.level === 1 ? 'Piste' : hintView.hint.level === 2 ? 'Explication' : 'Solution'}
                </span>
                {hintView.hint.level < 3 && hintView.hint.kind !== 'solved' && (
                  <button
                    type="button"
                    onClick={onMoreHint}
                    className="ml-auto rounded-full bg-orange-soft px-2.5 py-1 text-[12.5px] font-bold text-orange-deep active:opacity-60"
                  >
                    {hintView.hint.level === 1 ? 'Explique-moi' : 'Montre-moi'}
                  </button>
                )}
              </div>
              <p className="line-clamp-4 text-[14px] leading-[1.3] font-medium text-ink">{hintView.hint.message}</p>
            </div>
            <button type="button" aria-label="Fermer l’indice" onClick={onCloseHint} className="-mt-1 -mr-2 grid size-9 shrink-0 place-items-center rounded-full text-muted active:bg-sand">
              <IconClose size={18} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
