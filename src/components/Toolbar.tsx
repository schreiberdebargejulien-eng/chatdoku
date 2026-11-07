import type { ReactNode } from 'react';
import type { Tool } from '../store/gameStore';
import { IconBulb, IconCross, IconEraser, IconPause, IconPaw, IconUndo } from './icons';

function ToolButton({
  label,
  active,
  onClick,
  children,
  disabled,
  badge,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
  children: ReactNode;
  disabled?: boolean;
  badge?: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className="group flex min-w-0 flex-1 flex-col items-center gap-1 disabled:opacity-35"
    >
      <span
        className={`relative grid size-[52px] place-items-center rounded-[18px] transition-all duration-150 group-active:scale-90 ${
          active
            ? 'bg-ink text-cream shadow-[0_4px_0_0_#111]'
            : 'bg-white text-ink shadow-[0_4px_0_0_var(--color-sand-deep)] ring-1 ring-sand-deep/50'
        }`}
      >
        {children}
        {badge}
      </span>
      <span className={`text-[11.5px] font-semibold tracking-tight ${active ? 'text-ink' : 'text-ink-soft'}`}>{label}</span>
    </button>
  );
}

export function Toolbar({
  tool,
  onTool,
  onErase,
  onUndo,
  onHint,
  onPause,
  canUndo,
  hintsUsed,
}: {
  tool: Tool;
  onTool: (tool: Tool) => void;
  onErase: () => void;
  onUndo: () => void;
  onHint: () => void;
  onPause: () => void;
  canUndo: boolean;
  hintsUsed: number;
}) {
  return (
    <nav className="flex w-full items-start justify-between gap-1 px-3 pt-2 pb-3" aria-label="Outils">
      <ToolButton label="Chat" active={tool === 'cat'} onClick={() => onTool('cat')}>
        <IconPaw size={26} />
      </ToolButton>
      <ToolButton label="Croix" active={tool === 'cross'} onClick={() => onTool('cross')}>
        <IconCross size={24} />
      </ToolButton>
      <ToolButton label="Effacer" onClick={onErase}>
        <IconEraser size={24} />
      </ToolButton>
      <ToolButton label="Annuler" onClick={onUndo} disabled={!canUndo}>
        <IconUndo size={24} />
      </ToolButton>
      <ToolButton
        label="Indice"
        onClick={onHint}
        badge={
          hintsUsed > 0 ? (
            <span className="absolute -top-1.5 -right-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-orange px-1 text-[11px] font-bold text-white">
              {hintsUsed}
            </span>
          ) : undefined
        }
      >
        <IconBulb size={24} />
      </ToolButton>
      <ToolButton label="Pause" onClick={onPause}>
        <IconPause size={24} />
      </ToolButton>
    </nav>
  );
}
