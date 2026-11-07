/**
 * After a touch gesture on the grid, browsers may still emit compatibility
 * mouse events (mousedown / click / dblclick), sometimes on an element that
 * appeared under the finger in the meantime (e.g. the victory dialog).
 * They are swallowed for a short time: pointer events stay the single source
 * of truth and no button can be "ghost clicked".
 */
const GHOST_MS = 450;
/** Ghost events land where the finger was; a real tap elsewhere (e.g. Undo) passes. */
const GHOST_RADIUS = 36;
let until = 0;
let gx = 0;
let gy = 0;
let installed = false;

export function armGhostClickGuard(x: number, y: number, now = performance.now()): void {
  until = now + GHOST_MS;
  gx = x;
  gy = y;
}

export function isGhost(e: { clientX: number; clientY: number }, now = performance.now()): boolean {
  return now < until && Math.hypot(e.clientX - gx, e.clientY - gy) <= GHOST_RADIUS;
}

export function installGhostClickGuard(): void {
  if (installed || typeof document === 'undefined') return;
  installed = true;
  const swallow = (e: Event) => {
    if (isGhost(e as MouseEvent)) {
      e.preventDefault();
      e.stopPropagation();
    }
  };
  for (const type of ['click', 'mousedown', 'mouseup', 'dblclick']) {
    document.addEventListener(type, swallow, { capture: true });
  }
}
