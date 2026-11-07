import { AnimatePresence, motion, MotionConfig } from 'framer-motion';
import { useRef } from 'react';
import { GameScreen } from './screens/GameScreen';
import { HomeScreen } from './screens/HomeScreen';
import { RulesScreen } from './screens/RulesScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { StatsScreen } from './screens/StatsScreen';
import { useGameStore, type Screen } from './store/gameStore';

export function App() {
  const screen = useGameStore((s) => s.screen);
  const setScreen = useGameStore((s) => s.setScreen);
  const previous = useRef<Screen>('home');

  const navigate = (next: Screen) => {
    previous.current = screen;
    if (screen === 'game' && next !== 'game') useGameStore.getState().pause();
    if (next === 'game') useGameStore.getState().resume();
    setScreen(next);
  };
  const back = () => {
    const target = previous.current === 'game' && useGameStore.getState().game ? 'game' : 'home';
    previous.current = 'home';
    if (target === 'game') {
      setScreen('game');
      useGameStore.getState().pause();
    } else setScreen('home');
  };

  return (
    <MotionConfig reducedMotion="user">
      <div className="app-shell">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={screen}
            className="min-h-0 flex-1"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
          >
            {screen === 'home' && <HomeScreen onNavigate={navigate} />}
            {screen === 'game' && <GameScreen onNavigate={navigate} />}
            {screen === 'stats' && <StatsScreen onBack={back} />}
            {screen === 'settings' && <SettingsScreen onBack={back} />}
            {screen === 'rules' && <RulesScreen onBack={back} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </MotionConfig>
  );
}
