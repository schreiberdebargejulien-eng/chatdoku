import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { getCollection } from '../cats/collections';
import { Board } from '../components/Board';
import { MessageBar } from '../components/MessageBar';
import { ConfirmModal, GameOverModal, PauseModal, VictoryModal } from '../components/overlays';
import { Toolbar } from '../components/Toolbar';
import { RuleChips, StatusRow, TopBar } from '../components/TopBar';
import { blockedOf } from '../game/gameLogic';
import type { GestureIntent } from '../input/gestureEngine';
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

/** Single dispatcher from gesture intents to store actions. */
function dispatchIntents(intents: readonly GestureIntent[]): void {
  const s = useGameStore.getState();
  for (const it of intents) {
    switch (it.type) {
      case 'cross-down':
        s.strokeStart(it.cell);
        break;
      case 'stroke':
        s.strokeExtend(it.cells);
        break;
      case 'cross-off':
        s.crossOff(it.cell);
        break;
      case 'double':
        s.doubleTap(it.cell);
        break;
      case 'end':
        s.gestureEnd();
        break;
    }
  }
}

export function GameScreen({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  const game = useGameStore((s) => s.game);
  const settings = useGameStore((s) => s.settings);
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
    const id = window.setTimeout(() => store().dismissFeedback(), feedback.kind === 'error' ? 3000 : 2000);
    return () => window.clearTimeout(id);
  }, [feedback, store]);

  const puzzle = game?.puzzle;
  const marks = game?.marks;
  const colors = useMemo(() => (puzzle ? assignRegionColors(puzzle, puzzle.seed) : []), [puzzle]);
  const blocked = useMemo(() => (game ? blockedOf(game) : new Set<CellIndex>()), [marks, puzzle]); // eslint-disable-line react-hooks/exhaustive-deps
  const collection = getCollection(settings.collection);
  const onIntents = useCallback((intents: readonly GestureIntent[]) => dispatchIntents(intents), []);

  if (!game) return null;
  const playing = game.status === 'playing';
  const placed = game.marks.reduce((n, m) => n + (m === 'cat' ? 1 : 0), 0);

  return (
    <div className="flex h-full flex-col">
      <TopBar
        level={game.puzzle.difficulty}
        size={game.puzzle.size}
        elapsedMs={game.elapsedMs}
        onBack={() => onNavigate('home')}
        onPause={() => store().pause()}
      />
      <RuleChips />
      <StatusRow placed={placed} total={game.puzzle.size} lives={game.lives} />
      <div ref={ref} className="flex min-h-0 flex-1 items-center justify-center px-3">
        <div style={{ width: side || '100%', maxWidth: 560 }}>
          <Board
            game={game}
            colors={colors}
            collection={collection}
            blocked={blocked}
            showBlocked={settings.showBlocked}
            feedback={feedback}
            hintView={hintView}
            hidden={paused}
            doubleTapMs={settings.doubleTapMs}
            onIntents={onIntents}
          />
        </div>
      </div>
      <MessageBar
        feedback={feedback}
        hintView={hintView}
        onCloseHint={() => store().closeHint()}
        onMoreHint={() => store().requestHint()}
        onDismiss={() => store().dismissFeedback()}
      />
      <Toolbar onUndo={() => store().undo()} onHint={() => store().requestHint()} canUndo={playing && game.history.length > 0} hintsUsed={game.hintsUsed} />

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
        <VictoryModal game={game} outcome={outcome} onNext={() => void store().startNewGame(game.puzzle.difficulty)} onHome={() => onNavigate('home')} />
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
