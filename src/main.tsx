import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { App } from './App';
import { requestPersistentStorage } from './persistence/storage';
import { warmPool } from './services/puzzleService';

// iOS Safari ignores user-scalable=no: block pinch zoom ourselves.
document.addEventListener('gesturestart', (e) => e.preventDefault(), { passive: false });
// Double-tap zoom is disabled by `touch-action: manipulation` (see index.css).

requestPersistentStorage();

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Prepare one puzzle per difficulty in the background (worker).
const idle = (window as unknown as { requestIdleCallback?: (cb: () => void) => void }).requestIdleCallback;
(idle ?? ((cb: () => void) => setTimeout(cb, 800)))(() => void warmPool());
