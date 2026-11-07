import { motion, AnimatePresence } from 'framer-motion';
import type { ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-orange text-white shadow-[0_6px_0_0_var(--color-orange-deep)] active:shadow-[0_2px_0_0_var(--color-orange-deep)] active:translate-y-[4px]',
  secondary: 'bg-white text-ink shadow-[0_5px_0_0_var(--color-sand-deep)] active:shadow-[0_1px_0_0_var(--color-sand-deep)] active:translate-y-[4px] border border-sand-deep/60',
  ghost: 'bg-transparent text-ink-soft active:bg-sand/70',
  danger: 'bg-bad-soft text-bad-deep shadow-[0_5px_0_0_#efc5c3] active:shadow-[0_1px_0_0_#efc5c3] active:translate-y-[4px]',
};

export function Button({
  children,
  onClick,
  variant = 'primary',
  className = '',
  disabled,
  icon,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: Variant;
  className?: string;
  disabled?: boolean;
  icon?: ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`font-rounded flex min-h-14 w-full items-center justify-center gap-2.5 rounded-2xl px-6 text-[17px] font-bold tracking-tight transition-[transform,box-shadow] duration-100 disabled:opacity-40 ${VARIANTS[variant]} ${className}`}
    >
      {icon}
      {children}
    </button>
  );
}

export function IconButton({
  label,
  onClick,
  children,
  className = '',
}: {
  label: string;
  onClick?: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`grid size-11 place-items-center rounded-full text-ink-soft transition active:scale-90 active:bg-sand ${className}`}
    >
      {children}
    </button>
  );
}

/** Bottom sheet / centred card with a dimmed backdrop. */
export function Modal({
  open,
  onClose,
  children,
  dismissible = true,
  labelledBy,
}: {
  open: boolean;
  onClose?: () => void;
  children: ReactNode;
  dismissible?: boolean;
  labelledBy?: string;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div
            className="absolute inset-0 bg-ink/30 backdrop-blur-[3px]"
            onClick={dismissible ? onClose : undefined}
            aria-hidden
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={labelledBy}
            className="relative mx-3 mb-[calc(var(--safe-bottom)+12px)] w-full max-w-md rounded-[28px] bg-cream p-6 shadow-lift sm:mb-0"
            initial={{ y: 60, scale: 0.96, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 40, scale: 0.97, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-[31px] w-[51px] shrink-0 rounded-full transition-colors duration-200 ${checked ? 'bg-good-deep' : 'bg-sand-deep'}`}
    >
      <motion.span
        className="absolute top-[2px] left-[2px] size-[27px] rounded-full bg-white shadow-[0_3px_8px_rgba(0,0,0,0.15)]"
        animate={{ x: checked ? 20 : 0 }}
        transition={{ type: 'spring', stiffness: 600, damping: 35 }}
      />
    </button>
  );
}

export function ScreenHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-1 px-2">
      <IconButton label="Retour" onClick={onBack}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M15 5l-7 7 7 7" />
        </svg>
      </IconButton>
      <h1 className="font-rounded text-[22px] font-extrabold tracking-tight">{title}</h1>
    </header>
  );
}
