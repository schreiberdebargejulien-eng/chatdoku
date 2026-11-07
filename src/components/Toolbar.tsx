import type { ReactNode } from 'react';
import { IconBulb, IconUndo } from './icons';

function ActionButton({ label, onClick, children, disabled, badge }: { label: string; onClick: () => void; children: ReactNode; disabled?: boolean; badge?: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="relative flex h-14 flex-1 items-center justify-center gap-2 rounded-2xl bg-white text-[16px] font-bold text-ink shadow-[0_4px_0_0_var(--color-sand-deep)] ring-1 ring-sand-deep/50 transition-[transform,box-shadow] duration-100 active:translate-y-[3px] active:shadow-[0_1px_0_0_var(--color-sand-deep)] disabled:opacity-40"
    >
      {children}
      <span className="font-rounded">{label}</span>
      {badge}
    </button>
  );
}

/** Only two actions: the grid itself is the controller (tap, double tap, slide). */
export function Toolbar({ onUndo, onHint, canUndo, hintsUsed }: { onUndo: () => void; onHint: () => void; canUndo: boolean; hintsUsed: number }) {
  return (
    <nav className="flex w-full gap-3 px-4 pt-1 pb-3" aria-label="Actions">
      <ActionButton label="Annuler" onClick={onUndo} disabled={!canUndo}>
        <IconUndo size={22} />
      </ActionButton>
      <ActionButton
        label="Indice"
        onClick={onHint}
        badge={
          hintsUsed > 0 ? (
            <span className="absolute -top-2 -right-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-orange px-1 text-[11px] font-bold text-white">
              {hintsUsed}
            </span>
          ) : undefined
        }
      >
        <IconBulb size={22} />
      </ActionButton>
    </nav>
  );
}
