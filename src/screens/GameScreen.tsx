import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { getCollection } from '../cats/collections';
import { Board } from '../components/Board';
import { MessageBar } from '../components/MessageBar';
import { ConfirmModal, GameOverModal, PauseModal, VictoryModal } from '../components/overlays';
import { Toolbar } from '../components/Toolbar';
import { TopBar } from '../components/TopBar';
import { blockedOf } from '../game/gameLogic';
import { hasProgress, useGameStore, type Screen } from '../store/gameStore';
import { assignRegionColors } from '../theme/palette';
import type { CellIndex } from '../game-engine';

/** Keeps the grid square and as large as the free space allows. */
function useFitSquare() {
  const ref = useRef<HTMLDivElement>(null);
  const [side, setSide] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const r = el.getBoundingClientRect();
      setSide(Math.floor(Math.min(r.width, r.height)));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return { ref, side };
}

export function GameScreen({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  const game = useGameStore((s) => s.game);
  const settings = useGameStore((s) => s.settings);
  const tool = useGameStore((s) => s.tool);
  const selected = useGameStore((s) => s.selected);
  const paused = useGameStore((s) => s.paused);
  const feedback = useGameStore((s) => s.feedback);
  const hintView = useGameStore((s) => s.hintView);
  const outcome = useGameStore((s) => s.outcome);
  const loading = useGameStore((s) => s.loading);
  const store = useGameStore.getState;
  const { ref, side } = useFitSquare();
  const [confirmRestart, setConfirmRestart] = useState(false);

  // Timer: counts only while the game is visible, running and not paused.
  const running = !!game && game.status === 'playing' && !paused;
  const gameKey = game ? `${game.puzzle.id}@${game.startedAt}` : '';
  useEffect(() => {
    if (!running) return;
    let last = performance.now();
    const id = window.setInterval(() => {
      const now = performance.now();
      if (document.visibilityState === 'visible') store().tick(now - last);
      last = now;
    }, 1000);
    return () => window.clearInterval(id);
  }, [running, gameKey, store]);

  // Leaving the app pauses the game.
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === 'hidden') store().pause();
    };
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', onHide);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', onHide);
    };
  }, [store]);

  // Messages fade away on their own.
  useEffect(() => {
    if (!feedback) return;
    const id = window.setTimeout(() => store().dismissFeedback(), feedback.kind === 'error' ? 3200 : 2200);
    return () => window.clearTimeout(id);
  }, [feedback, store]);

  const colors = useMemo(() => (game ? assignRegionColors(game.puzzle, game.puzzle.seed) : []), [game?.puzzle]);
  const blocked = useMemo(() => (game ? blockedOf(game) : new Set<CellIndex>()), [game?.marks, game?.puzzle]);
  const collection = getCollection(settings.collection);

  const onTap = useCallback(
    (cell: CellIndex) => {
      const s = store();
      if (s.settings.inputMode === 'quick' || s.selected === cell) {
        s.selectCell(cell);
        s.act(s.tool, cell);
      } else {
        s.selectCell(cell);
      }
    },
    [store],
  );

  const onTool = useCallback(
    (t: 'cat' | 'cross') => {
      const s = store();
      if (s.selected !== null && s.settings.inputMode === 'select') s.act(t);
      else s.setTool(t);
    },
    [store],
  );

  if (!game) return null;
  const playing = game.status === 'playing';

  return (
    <div className="flex h-full flex-col">
      <TopBar
        level={game.puzzle.difficulty}
        size={game.puzzle.size}
        elapsedMs={game.elapsedMs}
        lives={game.lives}
        onBack={() => onNavigate('home')}
      />
      <div ref={ref} className="flex min-h-0 flex-1 items-center justify-center px-3 pt-1">
        <div style={{ width: side || '100%', maxWidth: 560 }}>
          <Board
            game={game}
            colors={colors}
            collection={collection}
            blocked={blocked}
            showBlocked={settings.showBlocked}
            selected={selected}
            feedback={feedback}
            hintView={hintView}
            hidden={paused}
            crossDrag={tool === 'cross' || settings.inputMode === 'quick'}
            onTap={onTap}
            onPaint={(cells, on) => store().paint(cells, on)}
          />
        </div>
      </div>
      <MessageBar
        placed={game.marks.filter((m) => m === 'cat').length}
        total={game.puzzle.size}
        feedback={feedback}
        hintView={hintView}
        onCloseHint={() => store().closeHint()}
        onMoreHint={() => store().requestHint()}
        onDismiss={() => store().dismissFeedback()}
      />
      <Toolbar
        tool={tool}
        onTool={onTool}
        onErase={() => store().erase()}
        onUndo={() => store().undo()}
        onHint={() => store().requestHint()}
        onPause={() => store().pause()}
        canUndo={playing && game.history.length > 0}
        hintsUsed={game.hintsUsed}
      />

      <PauseModal
        open={paused && playing && !confirmRestart}
        onResume={() => store().resume()}
        onRestart={() => (hasProgress(game) ? setConfirmRestart(true) : store().restartGame())}
        onClearCrosses={() => {
          store().clearAllCrosses();
          store().resume();
        }}
        onHome={() => onNavigate('home')}
        onRules={() => onNavigate('rules')}
      />
      <ConfirmModal
        open={confirmRestart}
        title="Recommencer ?"
        message="La partie en cours sera comptée comme une défaite."
        confirmLabel="Recommencer"
        onCancel={() => setConfirmRestart(false)}
        onConfirm={() => {
          setConfirmRestart(false);
          store().restartGame();
        }}
      />
      {game.status === 'won' && (
        <VictoryModal
          game={game}
          outcome={outcome}
          onNext={() => void store().startNewGame(game.puzzle.difficulty)}
          onHome={() => onNavigate('home')}
        />
      )}
      {game.status === 'lost' && (
        <GameOverModal
          onRetry={() => store().restartGame()}
          onNew={() => void store().startNewGame(game.puzzle.difficulty)}
          onHome={() => onNavigate('home')}
        />
      )}
      {loading && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-cream/70 backdrop-blur-sm">
          <span className="font-rounded text-[17px] font-bold text-ink-soft">Préparation de la grille…</span>
        </div>
      )}
    </div>
  );
}
